# Arquitetura A vs. Arquitetura B — Guia simplificado com Terraform (AWS Academy)

Este guia mostra como criar as duas arquiteturas do Projeto Nuvem 2026. O código completo está
no repositório (`terraform/` e `app/`); aqui explicamos **o que cada parte faz e por quê**, com
os trechos mais importantes.

---

## 1. Visão geral

```
                         ┌──────────── CAMADA DE DADOS (terraform/base) ─────────────┐
                         │  RDS Postgres (usuários, sessões, histórico)               │
                         │  S3 (base de conhecimento: plano pedagógico do curso)      │
                         └────────────────────────────▲───────────────────────────────┘
                                                      │ 5432 / leitura do S3 no boot
Arch A:  Usuário ──HTTP:80──▶ EC2 (backend + Ollama + Gemma) ─────┘

Arch B:                        ┌──▶ EC2-1 (us-east-1a) ──┐
         Usuário ──HTTP:80──▶ ALB                         ├──▶ RDS / S3
                               └──▶ EC2-2 (us-east-1b) ──┘

SSH (A e B): aluno ──22──▶ cada EC2 (só do IP do aluno)
```

| Cenário | Comando (em `terraform/compute`) | Infraestrutura de computação |
|---|---|---|
| **A** | `-var-file=a.tfvars` | 1 EC2, acesso direto pelo IP público |
| **B** | `-var-file=b.tfvars` | ALB → 2 EC2 idênticas, em AZs diferentes |
| B1 (opcional) | `-var-file=b1.tfvars` | ALB → 1 EC2 (mede só o overhead do ALB) |

Em todos os cenários, o **RDS e o S3 são os mesmos**: eles ficam na camada `base` e não são
destruídos entre A e B.

---

## 2. Por que duas camadas de Terraform

| | `terraform/base` (dados) | `terraform/compute` (computação) |
|---|---|---|
| Contém | RDS, S3, security groups `app` e `db` | EC2, ALB, security group `web` |
| Tem estado? | **Sim**: usuários, histórico, base de conhecimento | **Não**: qualquer EC2 pode ser recriada |
| Quantas vezes é criada | **Uma vez** no início | A cada cenário (A, depois B) |

Motivos:

- **Comparação justa:** A e B usam o *mesmo* banco, com os mesmos dados.
- **Tempo:** o RDS leva cerca de 10 minutos para subir. Recriar a cada cenário consumiria a sessão de 4 h.
- **Dados preservados:** destruir a arquitetura A não apaga o histórico das conversas.
- **Lição de arquitetura:** B só consegue usar 2 EC2 porque o estado saiu delas e foi para o RDS.
  O usuário pode ser atendido pela EC2-1 numa pergunta e pela EC2-2 na seguinte, e o histórico
  continua o mesmo. A página mostra qual servidor respondeu (`servidor: ip-172-31-...`).

A camada `compute` lê o que precisa da `base` (endereço do banco, nome do bucket, SG `app`)
com um `terraform_remote_state`:

```hcl
data "terraform_remote_state" "base" {
  backend = "local"
  config = {
    path = "${path.module}/../base/terraform.tfstate"
  }
}

locals {
  base = data.terraform_remote_state.base.outputs
}
```

---

## 3. O que fica de fora (de propósito)

VPC própria, subnets privadas, NAT Gateway, HTTPS, nginx, Auto Scaling, Secrets Manager e sticky
sessions. Cada peça é discutível em produção, mas nenhuma é necessária para responder à pergunta
do projeto. Usamos a **VPC default** da conta, só *lendo* suas subnets com `data` sources.

---

## 4. Pré-requisitos

1. Terraform ≥ 1.5 e AWS CLI instalados no computador do aluno.
2. Iniciar o Learner Lab (**Start Lab**) e esperar o indicador ficar verde.
3. Em **AWS Details → AWS CLI → Show**, copiar as credenciais para `~/.aws/credentials`:
   ```ini
   [default]
   aws_access_key_id=...
   aws_secret_access_key=...
   aws_session_token=...
   ```
   > ⚠️ As credenciais expiram com a sessão (4 h). Em cada nova sessão, copie de novo.
4. Em **AWS Details → Download PEM**, baixar `labsuser.pem` e rodar `chmod 400 labsuser.pem`.
5. Descobrir o próprio IP público com `curl ifconfig.me` e colocar em `ssh_cidr` nos três
   `.tfvars` (formato `200.10.20.30/32`).
6. Testar: `aws sts get-caller-identity` deve responder sem erro.

---

## 5. Estrutura de arquivos

```
app/
├── app.py                 # backend Flask: login, histórico no RDS, chamada ao Gemma
└── index.html             # página de login + chat
bases/
└── plano_pedagogico_gemma.txt   # base de conhecimento (vai para o S3)
terraform/
├── base/                  # CAMADA DE DADOS
│   ├── provider.tf
│   ├── variables.tf
│   ├── main.tf            # SGs app/db, RDS Postgres, bucket S3 + arquivo (via AWS CLI)
│   └── outputs.tf         # o que a camada compute vai ler
└── compute/               # CAMADA DE COMPUTAÇÃO
    ├── provider.tf
    ├── variables.tf       # instance_count, use_alb, ssh_cidr, modelo...
    ├── main.tf            # remote state, SG web, EC2
    ├── alb.tf             # ALB (só existe se use_alb = true)
    ├── outputs.tf         # url e comandos SSH
    ├── user_data.sh.tftpl # script de boot das EC2
    ├── a.tfvars
    ├── b.tfvars
    └── b1.tfvars
```

---

## 6. Camada de dados (`terraform/base`)

### 6.1 Security groups: o "crachá"

```hcl
# "app" não abre porta nenhuma: é um crachá que toda EC2 do chatbot recebe
resource "aws_security_group" "app" { ... }

# O banco aceita a porta 5432 SOMENTE de quem tem o crachá "app"
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
```

Por que assim: a regra não depende de IPs. Qualquer EC2 nova (a segunda instância de B, por
exemplo) ganha acesso ao banco só por receber o SG `app`.

### 6.2 RDS Postgres

```hcl
resource "aws_db_instance" "chat" {
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  db_name                = "chatbot"
  username               = "chatbot"
  password               = random_password.db.result   # gerada pelo Terraform
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false   # o banco NÃO fica exposto à internet
  skip_final_snapshot    = true    # laboratório: destruir sem snapshot
  ...
}
```

As tabelas (`users`, `sessions`, `messages`) são criadas pelo próprio backend na primeira vez
que ele sobe.

### 6.3 S3: base de conhecimento

```hcl
resource "terraform_data" "knowledge" {
  input = { bucket = "nuvem-kb-${random_id.kb.hex}", key = "conhecimento/plano_pedagogico.txt", ... }

  provisioner "local-exec" {   # cria o bucket com a AWS CLI
    command = "aws s3api create-bucket --bucket ${self.input.bucket} --region us-east-1"
  }
  provisioner "local-exec" {   # envia a base de conhecimento
    command = "aws s3 cp ${self.input.file} s3://${self.input.bucket}/${self.input.key}"
  }
  provisioner "local-exec" {   # no destroy: esvazia e remove o bucket
    when    = destroy
    command = "aws s3 rb s3://${self.input.bucket} --force"
  }
}
```

> **Por que não o recurso `aws_s3_bucket`?** Ele consulta configurações do bucket (como o
> *Object Lock*) que o Learner Lab bloqueia por política da organização (erro 403 no `apply`).
> Como o projeto não usa esses recursos, criamos o bucket pela AWS CLI, que os alunos já configuraram.

O bucket é **privado** (buckets novos já nascem com o bloqueio de acesso público ligado). As EC2 o leem com as credenciais
temporárias do `LabInstanceProfile`, sem nenhuma chave de acesso no código.

**Por que o S3 é usado só no boot:** cada EC2 baixa o arquivo uma vez e o mantém em memória.
Se cada pergunta lesse o S3, essa latência entraria na medição e acrescentaria ruído à comparação.

---

## 7. Camada de computação (`terraform/compute`)

### 7.1 A instância

```hcl
resource "aws_instance" "web" {
  count                  = var.instance_count          # 1 em A, 2 em B
  instance_type          = var.instance_type           # m5.large: o mesmo em todos os cenários
  vpc_security_group_ids = [aws_security_group.web.id, local.base.app_sg_id]
  key_name               = "vockey"                    # SSH com labsuser.pem
  iam_instance_profile   = "LabInstanceProfile"        # credenciais temporárias para o S3
  user_data              = templatefile("user_data.sh.tftpl", { ... })
  ...
}
```

Dois security groups: `web` abre as portas 80 e 22; `app` (vindo da base) libera o acesso ao RDS.

### 7.2 Regras de entrada do SG `web`

| Regra | Arch A | Arch B |
|---|---|---|
| Porta 80 | de qualquer lugar (`0.0.0.0/0`) | **só do ALB** |
| Porta 22 (SSH) | só de `var.ssh_cidr` | só de `var.ssh_cidr` |

```hcl
resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = var.ssh_cidr   # nunca 0.0.0.0/0: bots varrem a porta 22 em minutos
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}
```

### 7.3 O ALB (só em B)

Todos os recursos de `alb.tf` usam `count = var.use_alb ? 1 : 0`: em A, eles simplesmente não
existem. São 5 recursos: security group do ALB, `aws_lb`, `aws_lb_target_group` (health check em
`/`), `aws_lb_listener` (porta 80) e `aws_lb_target_group_attachment` (um por EC2). O
`idle_timeout` é de 1200 s, porque o padrão de 60 s gera erros 504 quando o modelo demora sob carga.

### 7.4 O que o user_data faz no boot (na ordem)

1. Instala Python, Flask, gunicorn e o driver do Postgres.
2. Instala o Ollama e fixa suas opções (iguais em todos os cenários): `OLLAMA_NUM_PARALLEL`,
   `LLAMA_ARG_SWA_FULL` (cache do prompt reaproveitável no Gemma 2) e `LLAMA_ARG_CACHE_RAM`
   (limita a memória do cache, senão o servidor do modelo é morto por falta de RAM).
3. Baixa o modelo `gemma2:2b` e faz uma chamada de aquecimento.
4. Grava o código da aplicação (`app.py`, `index.html`), que vai embutido e comprimido no
   próprio user_data (cerca de 8 KB; o limite da AWS é 16 KB).
5. Baixa a base de conhecimento do S3: `aws s3 cp s3://<bucket>/conhecimento/plano_pedagogico.txt`.
6. Grava `/etc/chat.env` com o endereço e a senha do banco (só o root lê).
7. **Aquecimento do cache:** envia 2 perguntas ao mesmo tempo, com o mesmo prompt de sistema da
   aplicação (uma por slot do Ollama). Leva alguns minutos, e é isso que faz as primeiras
   perguntas reais já serem rápidas.
8. **Por último**, sobe a aplicação na porta 80. Assim o health check do ALB só passa quando a
   instância está completamente pronta.

> Simplificação didática: a senha do banco passa pelo user_data, que é visível no console da EC2.
> Em produção, ela ficaria no AWS Secrets Manager.

---

## 8. O backend (`app/app.py`)

| Rota | O que faz |
|---|---|
| `GET /` | Página de login + chat |
| `POST /api/register` | Cria usuário (senha guardada com hash PBKDF2) |
| `POST /api/login` | Devolve um token, guardado na tabela `sessions` do RDS |
| `GET /api/history` | Últimas 50 mensagens do usuário |
| `POST /api/chat` | Pergunta ao chatbot (exige `Authorization: Bearer <token>`) |

Fluxo de uma pergunta em `/api/chat`:

1. Valida o token no RDS.
2. Lê do RDS as **últimas 6 mensagens** do usuário. O limite é fixo para que o custo de cada
   pergunta seja constante: conversas longas não podem ficar mais lentas e contaminar o teste.
3. Monta o prompt (base de conhecimento + histórico + pergunta) e chama o Gemma no Ollama local,
   com `temperature: 0`, `seed: 42`, `num_predict: 128` e `num_ctx: 4096`.
4. Grava a pergunta e a resposta no RDS, com o nome da EC2 que respondeu (`served_by`).
5. Devolve `reply`, `served_by`, `prompt_tokens`, `prompt_ms` e `generate_ms`, dados úteis para o relatório.

Como o token e o histórico estão no RDS, **nenhuma EC2 guarda estado**. É isso que permite ao
ALB mandar cada pergunta para qualquer instância.

Usuários de teste: no primeiro boot, o backend cria `aluno01` a `aluno20` com a senha de
`seed_password` (variável do Terraform). O teste de carga usa esses usuários.

---

## 9. Roteiro de execução

```bash
# ----- Uma vez, no início (≈10 min por causa do RDS) -----
cd terraform/base
terraform init
terraform apply

# ----- Arquitetura A -----
cd ../compute
terraform init                      # só na primeira vez
terraform apply -var-file=a.tfvars
terraform output url                # aguarde alguns minutos (~10) até a página abrir
terraform output ssh                # comando SSH da instância
# ... testes de carga, salvar resultados ...
terraform destroy -var-file=a.tfvars

# ----- Arquitetura B -----
terraform apply -var-file=b.tfvars
terraform output url                # aguarde os 2 alvos ficarem "healthy"
terraform output ssh                # um comando SSH por instância
# ... mesmos testes de carga, salvar resultados ...
terraform destroy -var-file=b.tfvars

# ----- Ao final do projeto -----
cd ../base
terraform destroy
```

**Como saber se está pronto**

- Arch A: `curl -s -o /dev/null -w "%{http_code}" $(terraform output -raw url)` retorna `200`.
- Arch B: em *EC2 → Target Groups → nuvem-tg → Targets*, os dois alvos aparecem `healthy`.

**Teste rápido da API**

```bash
URL=$(terraform output -raw url)
TOKEN=$(curl -s $URL/api/login -H 'Content-Type: application/json' \
  -d '{"username":"aluno01","password":"trocar-esta-senha"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s $URL/api/chat -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Qual a frequência mínima para ser aprovado?"}'
```

Em B, rode a última linha algumas vezes: o campo `served_by` alterna entre as duas instâncias.

---

## 10. Usando o SSH

```bash
ssh -i labsuser.pem ec2-user@<ip-da-instancia>
```

Comandos úteis dentro da instância:

| Para quê | Comando |
|---|---|
| Acompanhar o boot | `sudo tail -f /var/log/cloud-init-output.log` |
| Logs da aplicação | `sudo journalctl -u chat -f` |
| Logs do Ollama | `sudo journalctl -u ollama -f` |
| Ver o uso de CPU durante o teste | `top` (observe o processo `ollama`) |
| Ver a base de conhecimento baixada do S3 | `less /opt/chat/conhecimento.txt` |
| Consultar o RDS | `sudo dnf install -y postgresql16` e depois `psql -h <db_host> -U chatbot chatbot` |

Se o IP do aluno mudar (outra rede, 4G), atualize `ssh_cidr` no `.tfvars` e rode `terraform apply`
de novo: só a regra do security group muda, sem recriar a instância.

---

## 11. O que muda entre A e B (resumo para os alunos)

| Item | Arch A | Arch B |
|---|---|---|
| Recursos criados em `compute` | SG web + 1 EC2 | SG web + 2 EC2 + SG do ALB + ALB + target group + listener + 2 attachments |
| Ponto de entrada | IP público da EC2 | DNS do ALB |
| Porta 80 das EC2 | aberta para a internet | aberta só para o ALB |
| SSH | 1 instância | 2 instâncias, cada uma com o próprio IP |
| vCPU total para inferência | 2 | 4 |
| Banco e base de conhecimento | RDS + S3 da camada base | **os mesmos** RDS + S3 |
| Se uma EC2 cair | site fora do ar | o ALB tira a EC2 da rotação após o health check |
| Código editado entre cenários | — | **nenhum** (só o `.tfvars`) |

---

## 12. Cuidados no Learner Lab

- **Tipos de instância:** só até `large`. Use o **mesmo `instance_type`** em todos os cenários.
  Instâncias t3 usam créditos de CPU, o que pode distorcer a comparação.
- **Sessão de 4 h:** crie a base no começo da aula; planeje apply → teste → destroy de cada
  cenário dentro da mesma sessão. Se a sessão expirar, a base continua existindo (o RDS para,
  mas não é apagado) e volta quando o lab é reiniciado.
- **Orçamento:** ao terminar o projeto, `terraform destroy` em `compute` **e** em `base`.
- **Primeiro boot demorado:** Ollama e modelo levam alguns minutos. Não comece o teste antes
  da URL responder `200` (A) ou dos alvos estarem `healthy` (B).
- **Região:** o código assume `us-east-1` e as AZs `us-east-1a`/`us-east-1b`.
