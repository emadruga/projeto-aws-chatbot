# Quickstart — Projeto Nuvem 2026

Roteiro direto, do zero até a análise final de A e B. Os detalhes e as justificativas estão em:

- [`ESCOPO_E_ATIVIDADES.md`](ESCOPO_E_ATIVIDADES.md): etapas, instalação passo a passo por sistema (Etapa 0),
  gerador de carga e estrutura do relatório final (seção 4.5);
- [`ARCH_A_vs_ARCH_B.md`](ARCH_A_vs_ARCH_B.md): como a infraestrutura é montada;
- [`PLANO_TESTE_DE_CARGA.md`](PLANO_TESTE_DE_CARGA.md): como e por que o teste é feito assim.

Convenções deste guia:

- 💻 = comando no **seu computador**; 🖥️ = comando no **gerador de carga** (EC2, via SSH).
- `<seed_password>` é a senha dos usuários de teste `aluno01`…`aluno20` (passo 2.3).
- No Windows, use o **PowerShell**. Quando um comando muda, há uma linha específica para ele.

---

## 1. Requisitos (no seu computador)

| Ferramenta | Versão | Para quê |
|---|---|---|
| **Terraform** | ≥ 1.5 | Criar e destruir a infraestrutura |
| **AWS CLI** | v2 | Credenciais do Learner Lab e consultas à AWS |
| **Python** + `openpyxl` | ≥ 3.8 | Rodar `analisar.py` (só a biblioteca padrão) e `gerar_planilha.py` (precisa do `openpyxl`) |
| **Cliente SSH** (`ssh`, `scp`) | OpenSSH | Entrar nas EC2 e copiar arquivos |
| **Git** | 2.x | Baixar o projeto |
| Navegador | qualquer | Console da AWS e página do chatbot |

O **k6** e o **tmux** **não** são instalados no seu computador: eles vão no gerador de carga (passo 3.2).

Resumo da instalação. O passo a passo de cada item, com os erros mais comuns, está na **Etapa 0** do
[`ESCOPO_E_ATIVIDADES.md`](ESCOPO_E_ATIVIDADES.md#etapa-0--preparação).

| Ferramenta | Linux (Ubuntu/Debian) | Windows 11 (PowerShell) | macOS ([Homebrew](https://brew.sh)) |
|---|---|---|---|
| Terraform | `sudo snap install terraform --classic` | `winget install --id Hashicorp.Terraform -e` | `brew install hashicorp/tap/terraform` |
| AWS CLI | `sudo snap install aws-cli --classic` | `winget install --id Amazon.AWSCLI -e` | `brew install awscli` |
| Python | `sudo apt install -y python3` | `winget install --id Python.Python.3.12 -e` | `brew install python` |
| `openpyxl` | `sudo apt install -y python3-openpyxl` | `python -m pip install openpyxl` | `python3 -m pip install --user --break-system-packages openpyxl` |
| SSH | `sudo apt install -y openssh-client` | já vem no Windows 11 | já vem no macOS |
| Git | `sudo apt install -y git` | `winget install --id Git.Git -e` | `brew install git` |

No Windows, feche e reabra o PowerShell depois de instalar.

### Conferir a instalação

```bash
terraform version
aws --version
python3 --version                                      # Windows: python --version
python3 -c "import openpyxl; print(openpyxl.__version__)"   # Windows: python -c ...
ssh -V
git --version
```

---

## 2. Preparação (uma vez)

### 2.1 Obter o projeto

```bash
git clone https://github.com/emadruga/projeto-aws-chatbot.git
cd projeto-aws-chatbot
```

Sem Git: baixe a pasta pelo material da disciplina e descompacte.

> **Windows + git:** o projeto tem um `.gitattributes` que mantém os scripts com fim de linha
> no formato do Linux. Se mesmo assim aparecer o erro `bad interpreter` ou `$'\r': command not found`
> no gerador ou nas EC2, rode lá: `sed -i 's/\r$//' arquivo.sh`.

### 2.2 Credenciais do Learner Lab (a cada sessão!)

1. AWS Academy → **Learner Lab** → **Start Lab** → espere o indicador ficar verde.
2. **AWS Details → AWS CLI → Show**: copie o bloco inteiro para o arquivo de credenciais:
   - macOS/Linux: `~/.aws/credentials`
   - Windows: `C:\Users\<você>\.aws\credentials` (o arquivo **não** tem extensão: cuidado com o Bloco de Notas,
     que salva como `credentials.txt`; veja a Etapa 0.7 do ESCOPO)
   ```ini
   [default]
   aws_access_key_id=...
   aws_secret_access_key=...
   aws_session_token=...
   ```
3. Configure a região (uma vez): `aws configure set region us-east-1`
4. 💻 Teste: `aws sts get-caller-identity` deve mostrar `Account` e um `Arn` com `voclabs` e o **seu nome** no fim
   (ex.: `.../voclabs/user1234567=Maria_Silva`), sem erro. Os erros comuns e o que fazer estão na Etapa 0.10 do ESCOPO.

> As credenciais **expiram quando a sessão termina** (4 h). A cada nova sessão, repita os itens 1, 2 e 4.

### 2.3 Chave SSH, IP e senha dos usuários de teste

1. **AWS Details → Download PEM** → salve `labsuser.pem` na pasta do projeto.
2. Proteja a chave (o SSH recusa chaves com permissão aberta):
   ```bash
   chmod 400 labsuser.pem                                   # macOS/Linux
   ```
   ```powershell
   icacls labsuser.pem /inheritance:r                       # Windows
   icacls labsuser.pem /grant:r "$($env:USERNAME):(R)"
   ```
3. Descubra seu IP público: `curl ifconfig.me` (Windows: `curl.exe ifconfig.me`).
4. Edite `terraform/compute/a.tfvars`, `b.tfvars` e `b1.tfvars`: troque o `ssh_cidr` pelo seu IP
   com `/32` no final, e acrescente a senha dos usuários de teste:
   ```hcl
   ssh_cidr      = "200.10.20.30/32"
   seed_password = "uma-senha-sua"
   ```
   Nos mesmos arquivos estão `instance_count` (número de EC2) e `instance_type` (tipo de **todas** as EC2). Use o
   **mesmo tipo** em A e B (padrão `m5.large`); só troque o número de EC2 se o professor pedir. Os valores são
   validados: tipos de `nano` a `large`, de 1 a 15 instâncias. Também dá para passar na linha de comando:
   `terraform apply -var-file=b.tfvars -var instance_count=4`.

   **Prefixo com o seu nome.** Todos os recursos (EC2, ALB, banco, bucket, security groups) levam o seu nome como
   prefixo, lido automaticamente do `Arn` do `aws sts get-caller-identity` (o que vem depois do `=`): por exemplo,
   `user1234567=Maria_Silva` → `maria-silva` (`maria-silva-web-1`, `maria-silva-alb`...). Se o nome for muito longo, usa só o primeiro nome. Para ver ou
   trocar: `terraform output prefixo` na pasta `base`, ou `terraform apply -var prefixo=meu-nome` na `base`.
   No console, procure pelo seu nome. O gerador de carga (criado à mão) deve seguir o mesmo padrão:
   `<prefixo>-gerador-carga`.
   > Se você mudar de rede (casa, escola, 4G), atualize o `ssh_cidr` e rode `terraform apply` de novo.

---

## 3. Sessão 1 — infraestrutura fixa e Arquitetura A

### 3.1 Camada de dados (RDS + S3), uma única vez no projeto

```bash
cd terraform/base
terraform init
terraform apply          # digite "yes"; leva ~10 min por causa do RDS
```

### 3.2 Gerador de carga, uma única vez no projeto

Crie pelo **console da AWS** → EC2 → **Launch instance** (como no Módulo 4 da AWS Academy). Os detalhes de cada
campo estão em [ESCOPO, "Gerador de carga"](ESCOPO_E_ATIVIDADES.md#gerador-de-carga-passo-2).

| Campo | Valor |
|---|---|
| Name | `<prefixo>-gerador-carga` (o prefixo é o seu nome, veja a seção 2.3) |
| AMI | **Amazon Linux 2023** (64 bits, x86) |
| Instance type | **`t3.small`** |
| Key pair | **`vockey`** |
| Rede | VPC default, subnet em **us-east-1a**, IP público **habilitado** |
| Security group | novo, `<prefixo>-gerador-sg`, só **SSH (22) de "My IP"** |
| Storage | **8 GiB gp3** (o padrão) |

Quando estiver *Running* e com **2/2 checks passed**, copie o IP público, envie os scripts e instale k6 e tmux:

```bash
# 💻 envia os scripts de teste para o gerador e entra nele
scp -i labsuser.pem -r loadtest ec2-user@<IP-GERADOR>:~/
ssh -o ServerAliveInterval=30 -i labsuser.pem ec2-user@<IP-GERADOR>

# 🖥️ instala o k6 (repositório oficial da Grafana) e o tmux (repositório do Amazon Linux)
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6 tmux
chmod +x ~/loadtest/rodar_cenario.sh

# 🖥️ confere
k6 version
tmux -V
```

> **Por que `tmux`?** Uma repetição dura de 30 a 60 min. Se a conexão SSH cair, um comando comum é interrompido no
> meio; dentro do `tmux` ele continua. Use `tmux new -s teste` para abrir, `Ctrl+B` e depois `D` para sair sem
> parar nada e `tmux attach -t teste` para voltar.
> Instale o `tmux` também nas EC2 do chatbot (`sudo dnf install -y tmux`), onde o `vmstat` roda.

> **Senha dos testes:** antes de rodar, execute `export SENHA=<seed_password>` no terminal do gerador. Não use
> `SENHA=... && ./script`: com `&&` a variável não chega ao script.

### 3.3 Subir a Arquitetura A

```bash
cd ../compute            # a partir de terraform/base
terraform init
terraform apply -var-file=a.tfvars
terraform output url     # endereço do chatbot
terraform output ssh     # comando SSH da instância
```

Espere cerca de 10 minutos (o boot inclui o aquecimento do modelo) e teste até receber `200`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" $(terraform output -raw url)
# Windows: curl.exe -s -o NUL -w "%{http_code}`n" (terraform output -raw url)
```

**Teste de fumaça:** abra a URL no navegador, entre como `aluno01` (senha `<seed_password>`)
e pergunte "Quantas vagas o curso oferece?".

> Demorando mais de 15 min? Entre por SSH e veja o boot: `sudo tail -f /var/log/cloud-init-output.log`

### 3.4 Preenchimento do histórico (uma única vez no projeto)

```bash
# 🖥️ no gerador
cd ~/loadtest
k6 run -e URL=http://<IP-EC2-A> -e SENHA=<seed_password> -e VUS=16 -e ITERACOES=3 carga.js
```

### 3.5 Piloto e previsão

```bash
# 🖥️
export SENHA=<seed_password>
PASSOS="1" ./rodar_cenario.sh PILOTO 1 http://<IP-EC2-A>     # 16 perguntas; anote quanto tempo levou
```

No resumo impresso, veja `latencia_chat`:

- `med` é o seu **S** (tempo de uma resposta com o servidor livre). Preencha a tabela de
  previsão da seção 6.3 do plano.
- Todos os passos da rampa usam o mesmo número de respostas (**n = 16**): 1 usuário envia 16 perguntas, 4
  enviam 4 cada, 16 enviam 1 cada. A análise junta as 3 repetições (48 respostas por passo).

### 3.6 Teste de carga em A — 3 repetições

Para cada repetição 1, 2, 3 (troque o `1` do comando e o `r1` do nome do arquivo pelo número da repetição; reserve até **~40 min cada**; veja a seção 5 do plano):

```bash
# 💻 terminal 2: CPU da instância durante a repetição
ssh -i labsuser.pem ec2-user@<IP-EC2-A>
vmstat -t 5 | tee cpu_A_r1.txt         # deixe rodando; Ctrl+C ao fim da repetição

# 🖥️ terminal 1: o teste
./rodar_cenario.sh A 1 http://<IP-EC2-A>
```

Rode dentro do `tmux`. O script faz um aquecimento e depois os passos de 1, 4 e 16 usuários.

Não use a página do chatbot durante as medições.

### 3.7 Coletar e analisar os resultados de A

```bash
# 💻 a partir da pasta do projeto
scp -i labsuser.pem -r ec2-user@<IP-GERADOR>:~/loadtest/resultados loadtest/
scp -i labsuser.pem "ec2-user@<IP-EC2-A>:~/cpu_A_*.txt" loadtest/resultados/

cd loadtest
python3 analisar.py      # Windows: python analisar.py
```

A tabela aparece na tela e em `loadtest/resultados/tabela.csv`, já com as linhas de A.

### 3.8 Destruir A (somente a camada compute!)

```bash
cd terraform/compute
terraform destroy -var-file=a.tfvars
```

⚠️ **Não** rode `destroy` em `terraform/base` agora: o RDS e o S3 serão usados em B. O gerador também fica.
No fim do projeto, a `base` só pode ser destruída **depois** da `compute` (veja a ordem na seção 4.6).

---

## 4. Sessão 2 — Arquitetura B

### 4.1 Retomar a sessão

1. **Start Lab** e copie as **novas** credenciais (passo 2.2).
2. Se o gerador estiver *Stopped*, religue-o (**Instance state → Start**) e confira no console o **novo IP
   público** dele (ele muda a cada sessão).
3. Se a sua rede mudou, atualize o `ssh_cidr` nos `.tfvars` e a regra **My IP** do security group
   `<prefixo>-gerador-sg`.

### 4.2 Subir a Arquitetura B

```bash
cd terraform/compute
terraform apply -var-file=b.tfvars
terraform output url     # DNS do ALB
terraform output ssh     # um comando SSH para cada uma das 2 instâncias
```

Espere os dois alvos ficarem **healthy**: console → EC2 → **Target Groups** → `<prefixo>-tg` → **Targets**.

**Teste de fumaça:** pela página, faça 4 ou 5 perguntas. O campo `servidor:` deve alternar
entre as duas instâncias.

### 4.3 Teste de carga em B — 3 repetições

Para cada repetição 1, 2, 3, com **exatamente o mesmo protocolo** usado em A (n = 16 respostas por passo; 1, 4 e 16 usuários):

```bash
# 💻 terminais 2 e 3: uma coleta de CPU por instância
ssh -i labsuser.pem ec2-user@<IP-EC2-B1>
vmstat -t 5 | tee cpu_B_r1_ec2-1.txt
ssh -i labsuser.pem ec2-user@<IP-EC2-B2>
vmstat -t 5 | tee cpu_B_r1_ec2-2.txt

# 🖥️ terminal 1
./rodar_cenario.sh B 1 http://<DNS-DO-ALB>
```

### 4.4 Teste de falha (opcional)

```bash
# 🖥️
k6 run -e URL=http://<DNS-DO-ALB> -e SENHA=<seed_password> -e VUS=8 -e DURACAO=6m --out csv=resultados/falha.csv carga.js
```

Aos 2 minutos, pare uma das EC2 no console (**Instance state → Stop**) e observe o Target Group.
Detalhes na seção 6.6 do plano.

### 4.5 Coleta, planilha e relatório final (A + B)

Antes de destruir B, salve os prints do CloudWatch (ALB e RDS, seção 4.4 do plano). Depois:

```bash
# 💻
scp -i labsuser.pem -r ec2-user@<IP-GERADOR>:~/loadtest/resultados loadtest/
scp -i labsuser.pem "ec2-user@<IP-EC2-B1>:~/cpu_B_*.txt" loadtest/resultados/
scp -i labsuser.pem "ec2-user@<IP-EC2-B2>:~/cpu_B_*.txt" loadtest/resultados/

cd loadtest
python3 analisar.py          # Windows: python analisar.py        -> resultados/tabela.csv
python3 gerar_planilha.py    # Windows: python gerar_planilha.py  -> resultados/resultados.xlsx
```

Abra `resultados/resultados.xlsx` no Excel ou no LibreOffice Calc. A planilha tem uma aba por repetição
(`A_rep1` … `B_rep3`) e a aba `Agregado`, com as tabelas de A e B, os gráficos de **p50**, **p95** e **vazão** ×
usuários, as razões A ÷ B e o p95 mínimo e máximo de cada passo. Os outros dois gráficos (decomposição da latência
e CPU do `vmstat`) você monta.

O relatório final é **um PDF**, com a estrutura, as imagens e as perguntas de discussão de cada parte da planilha
descritas na [seção 4.5 do ESCOPO](ESCOPO_E_ATIVIDADES.md#45-estrutura-do-relatório-final).

### 4.6 Limpeza (fim do projeto)

⚠️ **A ordem importa: primeiro `compute`, depois `base`. Nunca o contrário.**

A camada `compute` (EC2, ALB) **depende** da `base`: as EC2 usam o security group `app` e leem o RDS e o S3
criados lá. O Terraform não consegue apagar um security group que ainda está em uso por uma EC2, e o
`destroy` da `base` trava ou falha se a `compute` ainda existir. A regra é **destruir na ordem inversa da criação**.

| Ordem | Pasta | Comando |
|---|---|---|
| 1º | `terraform/compute` | `terraform destroy -var-file=b.tfvars` (use o `.tfvars` do cenário que está no ar) |
| 2º | `terraform/base` | `terraform destroy` |

```bash
cd terraform/compute && terraform destroy -var-file=b.tfvars
cd ../base           && terraform destroy
```

Antes de começar:
- Renove as credenciais do Learner Lab (2.2). O `destroy` da `base` usa a AWS CLI para apagar o bucket S3.
- **Não apague o bucket S3 à mão** antes do `destroy`. O Terraform tentaria apagá-lo de novo, daria erro e pararia.
- **Não apague os arquivos `terraform.tfstate`** de `base/` e `compute/`. O state é local e, sem ele, o Terraform perde o controle do que existe.
- O RDS leva alguns minutos para ser removido. Os dados (usuários e histórico) são perdidos.

E no console: EC2 → `<prefixo>-gerador-carga` → **Instance state → Terminate**; depois que ele sumir, apague
também o security group `<prefixo>-gerador-sg` (EC2 → Security Groups).
Confira em EC2 e RDS que nada ficou rodando: recursos esquecidos consomem o crédito do lab.

---

## 5. Consultando o banco de dados (psql)

O chatbot guarda usuários, sessões e o histórico das conversas no **RDS Postgres**. Você pode olhar esses
dados com o `psql`, mas **só de dentro de uma EC2 do chatbot**: o banco é privado e só aceita conexões de
quem tem o security group `app` (o "crachá" das EC2). Do seu computador a conexão não chega ao banco.

> **E pelo console da AWS?** O console do RDS mostra o status e os gráficos do CloudWatch (CPU, conexões),
> mas **não tem editor de SQL** para este tipo de banco. Para ver as tabelas, use o `psql` na EC2.

> **Não consulte o banco durante uma repetição do teste de carga.** O `dnf install` e as consultas usam CPU e
> rede da EC2 que está sendo medida, e o plano manda descartar a repetição se alguém intervir. Faça isto antes
> de começar ou depois que a repetição terminar.

> **Do gerador de carga não funciona.** O security group dele (`<prefixo>-gerador-sg`) não é o `app`, e o RDS
> recusa a conexão. Use sempre uma EC2 do chatbot.

**1. Entre na EC2 e instale o cliente** (Amazon Linux 2023):

```bash
ssh -i labsuser.pem ec2-user@<IP-DA-EC2>     # o comando completo sai de: terraform output ssh
sudo dnf install -y postgresql16
```

**2. Conecte ao banco.** O endereço, o usuário e a senha ficam em `/etc/chat.env` (só o administrador lê).
Este comando lê o arquivo e conecta, sem você digitar a senha:

```bash
sudo bash -c 'set -a; . /etc/chat.env; set +a; PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"'
```

**3. Consultas úteis.** O banco tem 3 tabelas: `users`, `sessions` e `messages`.

```sql
\dt                                    -- lista as tabelas
SELECT count(*) FROM users;            -- quantos usuários existem
SELECT count(*) FROM messages;         -- quantas mensagens foram gravadas

-- quantas respostas cada EC2 deu (na Arquitetura B, mostra como o balanceador dividiu o trabalho)
SELECT served_by, count(*) FROM messages
WHERE role = 'assistant' GROUP BY served_by;

-- mensagens por usuário
SELECT u.username, count(*) FROM messages m
JOIN users u ON u.id = m.user_id GROUP BY u.username ORDER BY 1;

-- as 5 últimas mensagens
SELECT created_at, role, left(content, 60) FROM messages ORDER BY id DESC LIMIT 5;
```

Para sair do `psql`, digite `\q`.

**4. Atalho para consultas avulsas, sem abrir o `psql`.** Defina uma função uma vez na sessão SSH. Ela lê o
`/etc/chat.env` e roda **uma** consulta por chamada:

```bash
# 🖥️ na EC2 (cole uma vez; vale até fechar o SSH)
sql() { sudo bash -c 'set -a; . /etc/chat.env; set +a; PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" -c "$0"' "$1"; }

sql '\dt'
sql 'SELECT count(*) AS usuarios FROM users;'
sql 'SELECT count(*) AS mensagens FROM messages;'
sql 'SELECT count(*) AS sessoes FROM sessions;'          -- um token por login (cada usuário virtual do k6 faz um)
sql 'SELECT created_at, role, left(content, 50) FROM messages ORDER BY id DESC LIMIT 3;'
```

Para filtrar por texto (aspas simples dentro da consulta), use aspas duplas por fora:

```bash
sql "SELECT served_by, count(*) FROM messages WHERE role = 'assistant' GROUP BY 1;"
```

**O que esperar** (depois do preenchimento do histórico, do piloto e das repetições
na Arquitetura A): 3 tabelas (`messages`, `sessions`, `users`), **20 usuários** (`aluno01..aluno20`), centenas de
mensagens (metade `user`, metade `assistant`), todas com o **mesmo `served_by`** (a única EC2 de A) e uma
sessão por login. Na Arquitetura B, o `served_by` mostra a divisão entre as duas EC2.

> **Cuidado:** as consultas acima só leem. Não use `DELETE` ou `DROP` no banco compartilhado: o histórico foi
> preenchido uma vez (seção 3.4) e é o mesmo para A e B. Apagá-lo exige refazer o preenchimento.

> ⚠️ **Não consulte o banco durante as medições do teste de carga.** Isso soma trabalho ao banco e atrapalha
> a verificação de que ele não é o gargalo. Faça as consultas antes ou depois de cada repetição.

---

## 6. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `ExpiredToken` / `InvalidClientTokenId` | Credenciais da sessão anterior | Copiar as novas do AWS Details (2.2) |
| `Permission denied (publickey)` | Permissão da `labsuser.pem` ou usuário errado | `chmod 400` / `icacls`; usuário é `ec2-user` |
| SSH fica parado (timeout) | Seu IP mudou | Atualizar `ssh_cidr` e `terraform apply` |
| URL não responde depois de 15 min | Boot falhou | SSH + `sudo tail -100 /var/log/cloud-init-output.log` |
| `502`/`503` no ALB logo após o apply | Instâncias ainda não estão healthy | Esperar o Target Group |
| `Unable to read remote state` em compute | `base` ainda não foi aplicado | Rodar o passo 3.1 primeiro |
| `destroy` da `base` falha ou trava (security group em uso, `DependencyViolation`) | A `compute` ainda existe | Rodar antes `terraform destroy -var-file=<cenário>.tfvars` em `terraform/compute` |
| `login de alunoNN falhou: 401` no k6 | `SENHA` diferente do `seed_password` | Usar a mesma senha do `.tfvars` |
| Erros apenas nos passos com muitos usuários | Possível saturação (timeout de 1200 s) | Investigue; pode ser um resultado (plano, seção 7) |
| `bad interpreter` no gerador | Fim de linha do Windows | `sed -i 's/\r$//' rodar_cenario.sh` |
| Recursos com o prefixo `aluno` em vez do seu nome | O `Arn` do `aws sts get-caller-identity` não tem o nome depois do `=` | `terraform apply -var prefixo=seu-nome` na `base` (recria o RDS) |
| `ModuleNotFoundError: No module named 'openpyxl'` | `openpyxl` não instalado (ou instalado em outro Python) | Instalar conforme a seção 1 / Etapa 0.3 do ESCOPO |
| `error: externally-managed-environment` no `pip` | Linux/macOS bloqueiam o `pip` no Python do sistema | Linux: `sudo apt install -y python3-openpyxl`; macOS: o comando com `--user --break-system-packages` |
| `sem resultados agregados para ['B']` no `gerar_planilha.py` | Faltam os CSVs de B em `loadtest/resultados/` | Copiar os resultados do gerador (4.5) e rodar `analisar.py` de novo |
