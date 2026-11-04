# Quickstart — Projeto Nuvem 2026

Roteiro direto, do zero até a análise final de A e B. Os detalhes e as justificativas estão em:

- `docs/ARCH_A_vs_ARCH_B.md`: como a infraestrutura é montada;
- `docs/PLANO_TESTE_DE_CARGA.md`: como e por que o teste é feito assim.

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
| **Cliente SSH** (`ssh`, `scp`) | OpenSSH | Entrar nas EC2 e copiar arquivos |
| **Python** | ≥ 3.8 | Rodar `analisar.py` (só a biblioteca padrão) |
| Navegador | qualquer | Console da AWS e página do chatbot |

O **k6** (ferramenta de teste de carga) **não** precisa ser instalado no seu computador: ele roda
no gerador de carga (passo 3).

### macOS

```bash
# Homebrew (se ainda não tiver): https://brew.sh
brew tap hashicorp/tap
brew install hashicorp/tap/terraform awscli python
# ssh e scp já vêm no macOS
```

### Linux (Ubuntu/Debian)

```bash
# Terraform (repositório oficial da HashiCorp)
sudo apt-get update && sudo apt-get install -y gnupg curl unzip
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install -y terraform

# AWS CLI v2 (para ARM, troque x86_64 por aarch64)
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip -q awscliv2.zip && sudo ./aws/install

# Python e SSH
sudo apt-get install -y python3 openssh-client
```

Em Fedora/RHEL, troque `apt-get` por `dnf` e siga as instruções da HashiCorp para o repositório RPM.

### Windows 10/11 (PowerShell)

```powershell
winget install --id Hashicorp.Terraform -e
winget install --id Amazon.AWSCLI -e
winget install --id Python.Python.3.12 -e
# O cliente OpenSSH já vem no Windows 10/11. Se "ssh" não for reconhecido:
# Configurações → Sistema → Recursos opcionais → Adicionar "Cliente OpenSSH"
```

Feche e reabra o PowerShell depois de instalar.

### Conferir a instalação (todos os sistemas)

```bash
terraform version
aws --version
ssh -V
python3 --version     # Windows: python --version
```

---

## 2. Preparação (uma vez)

### 2.1 Obter o projeto

Copie a pasta `projeto_nuvem_2026/` para o seu computador (pelo material da disciplina ou `git clone`).

> **Windows + git:** o projeto tem um `.gitattributes` que mantém os scripts com fim de linha
> no formato do Linux. Se mesmo assim aparecer o erro `bad interpreter` ou `$'\r': command not found`
> no gerador ou nas EC2, rode lá: `sed -i 's/\r$//' arquivo.sh`.

### 2.2 Credenciais do Learner Lab (a cada sessão!)

1. AWS Academy → **Learner Lab** → **Start Lab** → espere o indicador ficar verde.
2. **AWS Details → AWS CLI → Show**: copie o bloco inteiro para o arquivo de credenciais:
   - macOS/Linux: `~/.aws/credentials`
   - Windows: `C:\Users\<você>\.aws\credentials`
   ```ini
   [default]
   aws_access_key_id=...
   aws_secret_access_key=...
   aws_session_token=...
   ```
3. Configure a região (uma vez): `aws configure set region us-east-1`
4. 💻 Teste: `aws sts get-caller-identity` deve mostrar uma conta, sem erro.

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

No **console da AWS** → EC2 → **Launch instance**:

- Nome `gerador-carga` · AMI **Amazon Linux 2023** · tipo **t3.small** · key pair **vockey**
- Rede: VPC default, subnet em **us-east-1a**, IP público habilitado
- Security group: novo, **SSH apenas de "My IP"**

Quando estiver *Running*, copie o IP público e instale o k6:

```bash
# 💻 envia os scripts de teste para o gerador
scp -i labsuser.pem -r loadtest ec2-user@<IP-GERADOR>:~/

# 💻 entra no gerador
ssh -i labsuser.pem ec2-user@<IP-GERADOR>

# 🖥️ instala o k6
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6
chmod +x ~/loadtest/rodar_cenario.sh
```

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
DURACAO=3m PASSOS="1" AQUECIMENTO=30s SENHA=<seed_password> ./rodar_cenario.sh PILOTO 1 http://<IP-EC2-A>
```

No resumo impresso, veja `latencia_chat`:

- `med` é o seu **S** (tempo de uma resposta com o servidor livre). Preencha a tabela de
  previsão da seção 6.3 do plano.
- Se `count` for **menor que 20**, use `DURACAO=5m` em **todas** as repetições (A e B).

### 3.6 Teste de carga em A — 3 repetições

Para cada `R` = 1, 2, 3 (~20 min cada):

```bash
# 💻 terminal 2: CPU da instância durante a repetição
ssh -i labsuser.pem ec2-user@<IP-EC2-A>
vmstat -t 5 | tee cpu_A_rR.txt         # deixe rodando; Ctrl+C ao fim da repetição

# 🖥️ terminal 1: o teste
SENHA=<seed_password> ./rodar_cenario.sh A R http://<IP-EC2-A>
```

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
2. Confira no console o **novo IP público** do gerador (ele muda a cada sessão).
3. Se a sua rede mudou, atualize o `ssh_cidr` nos `.tfvars`.

### 4.2 Subir a Arquitetura B

```bash
cd terraform/compute
terraform apply -var-file=b.tfvars
terraform output url     # DNS do ALB
terraform output ssh     # um comando SSH para cada uma das 2 instâncias
```

Espere os dois alvos ficarem **healthy**: console → EC2 → **Target Groups** → `nuvem-tg` → **Targets**.

**Teste de fumaça:** pela página, faça 4 ou 5 perguntas. O campo `servidor:` deve alternar
entre as duas instâncias.

### 4.3 Teste de carga em B — 3 repetições

Para cada `R` = 1, 2, 3, com a **mesma `DURACAO`** usada em A:

```bash
# 💻 terminais 2 e 3: uma coleta de CPU por instância
ssh -i labsuser.pem ec2-user@<IP-EC2-B1>
vmstat -t 5 | tee cpu_B_rR_ec2-1.txt
ssh -i labsuser.pem ec2-user@<IP-EC2-B2>
vmstat -t 5 | tee cpu_B_rR_ec2-2.txt

# 🖥️ terminal 1
SENHA=<seed_password> ./rodar_cenario.sh B R http://<DNS-DO-ALB>
```

### 4.4 Teste de falha (opcional)

```bash
# 🖥️
k6 run -e URL=http://<DNS-DO-ALB> -e SENHA=<seed_password> -e VUS=8 -e DURACAO=6m --out csv=resultados/falha.csv carga.js
```

Aos 2 minutos, pare uma das EC2 no console (**Instance state → Stop**) e observe o Target Group.
Detalhes na seção 6.6 do plano.

### 4.5 Coleta e análise final (A + B)

```bash
# 💻
scp -i labsuser.pem -r ec2-user@<IP-GERADOR>:~/loadtest/resultados loadtest/
scp -i labsuser.pem "ec2-user@<IP-EC2-B1>:~/cpu_B_*.txt" loadtest/resultados/
scp -i labsuser.pem "ec2-user@<IP-EC2-B2>:~/cpu_B_*.txt" loadtest/resultados/

cd loadtest
python3 analisar.py
```

Agora `resultados/tabela.csv` tem A e B lado a lado. Abra no Excel ou Google Sheets e faça os
gráficos e o relatório conforme as seções 8 e 9 do plano. Antes de destruir B, salve também os
prints do CloudWatch (ALB e RDS, seção 4.4 do plano).

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

E no console: EC2 → `gerador-carga` → **Instance state → Terminate**.
Confira em EC2 e RDS que nada ficou rodando: recursos esquecidos consomem o crédito do lab.

---

## 5. Consultando o banco de dados (psql)

O chatbot guarda usuários, sessões e o histórico das conversas no **RDS Postgres**. Você pode olhar esses
dados com o `psql`, mas **só de dentro de uma EC2 do chatbot**: o banco é privado e só aceita conexões de
quem tem o security group `app` (o "crachá" das EC2). Do seu computador a conexão não chega ao banco.

> **E pelo console da AWS?** O console do RDS mostra o status e os gráficos do CloudWatch (CPU, conexões),
> mas **não tem editor de SQL** para este tipo de banco. Para ver as tabelas, use o `psql` na EC2.

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
