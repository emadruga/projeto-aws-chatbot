# Escopo do projeto e atividades do aluno

Projeto final da disciplina **Cloud Systems Architecture** (AWS Academy Learner Lab).
Este documento diz **o que o projeto cobre**, **o que você faz em cada etapa** e **o que você entrega**.
Os slides com o mesmo conteúdo estão em [`slides/ESCOPO_E_ATIVIDADES.pptx`](slides/ESCOPO_E_ATIVIDADES.pptx).
Os comandos de cada passo estão no [`QUICKSTART.md`](QUICKSTART.md).

---

## 1. A pergunta que você vai responder

> **Qual arquitetura entrega o menor tempo de resposta ao usuário final, de forma mais consistente?**

Você responde **com dados medidos por você**, comparando duas arquiteturas AWS que rodam o mesmo chatbot
(Google Gemma 2 2B, servido pelo Ollama) sobre o Curso Técnico em Segurança Cibernética:

| Arquitetura | Caminho de uma pergunta |
|---|---|
| **A — Monolito** | Usuário → 1 EC2 (backend + Ollama + Gemma) → RDS |
| **B — Balanceada** | Usuário → ALB → 2 EC2 idênticas (us-east-1a e us-east-1b) → RDS |

O projeto é **individual**: cada aluno usa o seu próprio Learner Lab, e todos os recursos levam o seu nome como prefixo
(ex.: `maria-silva-web-1`).

---

## 2. Escopo

### Dentro do escopo

- **Serviços AWS:** EC2, ALB, RDS (PostgreSQL), S3, IAM (`LabInstanceProfile`) e VPC default.
- **Infraestrutura como código:** Terraform em duas camadas — `base` (dados: RDS, S3, security groups), criada uma vez,
  e `compute` (EC2 e ALB), que alterna entre A e B.
- **Teste de carga** com k6 a partir de uma EC2 geradora na mesma região.
- **Análise:** mediana (p50), p95, p99, desvio-padrão, CV, vazão, erros e a decomposição da latência (fila, prefill, geração).
- **Relatório** com hipóteses, método, resultados, discussão e conclusão.

### Fora do escopo

- Programar a aplicação: o código (`app/`) já vem pronto. O foco é a **arquitetura**.
- Machine learning: você não treina nem ajusta o modelo.
- Serviços extras (SageMaker, Bedrock, NAT, Auto Scaling, Secrets Manager), HTTPS, domínio próprio.
- Mudar a aplicação, o modelo ou os parâmetros do teste: isso quebraria a comparação justa.

### O que já vem pronto × o que é seu

| Já vem pronto | É trabalho seu |
|---|---|
| Backend Flask e página de chat (`app/`) | Configurar e provisionar A e B com Terraform |
| Código Terraform (`terraform/`) | Criar e preparar o gerador de carga |
| Scripts de carga e análise (`loadtest/`) | Escrever hipóteses e previsões **antes** de medir |
| Base de conhecimento (`bases/`) | Executar as medições e registrar o diário de bordo |
| Guias (`docs/`) | Montar os gráficos, interpretar e concluir |
| | Destruir tudo no fim |

---

## 3. As etapas

| Etapa | Onde | Duração aproximada |
|---|---|---|
| 0. Preparação | seu computador | 1 aula |
| 1. Sessão 1: camada base + Arquitetura A | Learner Lab | 1 sessão de 4 h |
| 2. Sessão 2: Arquitetura B | Learner Lab | 1 sessão de 4 h |
| 3. Análise | seu computador | 1 a 2 aulas |
| 4. Relatório e limpeza | seu computador + Learner Lab | 1 aula |

### Etapa 0 — Preparação

Checklist (o passo a passo de cada item, para Linux, Windows 11 e macOS, vem logo abaixo):

- [ ] 0.1 Instalar o **Terraform** (≥ 1.5).
- [ ] 0.2 Instalar a **AWS CLI** (v2).
- [ ] 0.3 Instalar o **Python 3** (≥ 3.8).
- [ ] 0.4 Conferir o **cliente SSH** (`ssh` e `scp`).
- [ ] 0.5 Instalar o **Git**.
- [ ] 0.6 Obter o projeto (`git clone`).
- [ ] 0.7 Copiar as credenciais do Learner Lab para o arquivo `credentials` (**a cada sessão!**).
- [ ] 0.8 Baixar a `labsuser.pem` e ajustar a permissão.
- [ ] 0.9 Nos `.tfvars`: o **seu** IP em `ssh_cidr` (com `/32`) e uma `seed_password` sua.
- [ ] 0.10 Conferir tudo (comandos de verificação).
- [ ] 0.11 Ler o [`PLANO_TESTE_DE_CARGA.md`](PLANO_TESTE_DE_CARGA.md), seções 1 e 2.

**Convenções:**
- **Linux:** os exemplos são para Ubuntu/Debian (`apt`). Em Fedora/RHEL, troque `apt` por `dnf`.
- **Windows 11:** use o **PowerShell** (não o Prompt de Comando). O `winget` já vem no Windows 11. Depois de cada
  instalação, **feche e reabra** o PowerShell para o comando novo ser encontrado.
- **macOS:** use o **Terminal**, com o [Homebrew](https://brew.sh) instalado:
  `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`.
  No fim, o instalador mostra 2 comandos `eval ...` para pôr o `brew` no PATH: rode-os.
- O **k6** e o **tmux** **não** são instalados no seu computador: eles vão no gerador de carga (Etapa 1).

#### 0.1 Terraform (≥ 1.5)

Cria e destrói toda a infraestrutura a partir dos arquivos em `terraform/`.

| Sistema | Instalar |
|---|---|
| Linux | `sudo snap install terraform --classic` |
| Windows 11 | `winget install --id Hashicorp.Terraform -e` |
| macOS | `brew install hashicorp/tap/terraform` |

Linux sem `snap` (ex.: Fedora): siga [developer.hashicorp.com/terraform/install](https://developer.hashicorp.com/terraform/install).

**Conferir:** `terraform version` → `Terraform v1.5` ou mais nova.

#### 0.2 AWS CLI (v2)

O Terraform usa as credenciais que a AWS CLI lê. A CLI também serve para conferir a conta e consultar recursos.

| Sistema | Instalar |
|---|---|
| Linux | `sudo snap install aws-cli --classic` |
| Windows 11 | `winget install --id Amazon.AWSCLI -e` |
| macOS | `brew install awscli` |

Linux sem `snap`: siga [docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
Não use o pacote `awscli` do `apt`: em muitas versões do Ubuntu ele ainda é a v1.

**Configurar a região (uma vez, em todos os sistemas):**
```bash
aws configure set region us-east-1
aws configure set output json
```

**Conferir:** `aws --version` → `aws-cli/2.x.x`. Se aparecer `aws-cli/1.x`, há uma versão antiga na frente no PATH:
desinstale-a.

#### 0.3 Python 3 (≥ 3.8)

Roda os dois scripts da análise (Etapa 3): o `loadtest/analisar.py`, que usa só a biblioteca padrão, e o
`loadtest/gerar_planilha.py`, que precisa do pacote **`openpyxl`** para gerar a planilha Excel (`.xlsx`).
Instale o Python e, logo depois, o `openpyxl`.

**Linux**
```bash
sudo apt install -y python3
```
O Ubuntu e o Debian quase sempre já trazem o Python 3; o comando é `python3` (não `python`).

**Windows 11**
```powershell
winget install --id Python.Python.3.12 -e
```
No Windows o comando é `python` (ou `py`), não `python3`. Se `python` abrir a **Microsoft Store** em vez de rodar,
desligue os atalhos falsos: **Configurações → Aplicativos → Configurações avançadas de aplicativos → Aliases de
execução de aplicativo** → desative `python.exe` e `python3.exe`. Reabra o PowerShell.

**macOS**
```bash
brew install python
```
Use o Python do Homebrew, não o `python3` da Apple (Xcode Command Line Tools): o `pip` da Apple é antigo e não
aceita o comando de instalação do `openpyxl` abaixo. `which python3` deve mostrar `/opt/homebrew/bin/python3`
(Mac com Apple Silicon) ou `/usr/local/bin/python3` (Mac com Intel).

**Instalar o `openpyxl`**

| Sistema | Comando |
|---|---|
| Linux | `sudo apt install -y python3-openpyxl` |
| Windows 11 | `python -m pip install openpyxl` |
| macOS | `python3 -m pip install --user --break-system-packages openpyxl` |

No Linux e no macOS, o `pip install openpyxl` puro é **bloqueado** (`error: externally-managed-environment`): o
sistema protege o Python que ele mesmo usa. No Linux, o pacote do `apt` resolve. No macOS, `--user` instala só
para o seu usuário, e `--break-system-packages` libera a instalação; para um pacote simples como o `openpyxl`,
isso não traz risco.

**Conferir:**
- `python3 --version` (Windows: `python --version`) → `Python 3.8` ou mais nova;
- `python3 -c "import openpyxl; print(openpyxl.__version__)"` (Windows: `python -c ...`) → um número de versão,
  sem `ModuleNotFoundError`.

#### 0.4 Cliente SSH (`ssh` e `scp`)

Entra nas EC2 (gerador de carga e servidores) e copia o `loadtest/` e os resultados.

**Linux**
```bash
sudo apt install -y openssh-client
```
Quase sempre já vem instalado.

**Windows 11**

O **Cliente OpenSSH** já vem no Windows 11. Se `ssh` não for reconhecido:
**Configurações → Sistema → Recursos opcionais → Exibir recursos → "Cliente OpenSSH" → Adicionar**.
Ou, no PowerShell **como administrador**:
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```
Use o `ssh` do Windows com a `labsuser.pem`. O PuTTY e a `labsuser.ppk` **não** são necessários: os guias usam
sempre `ssh` e `scp`.

**macOS**

O `ssh` e o `scp` já vêm no sistema. Nada a instalar.

**Conferir:** `ssh -V` → `OpenSSH_8.x` ou mais nova.

#### 0.5 Git

Baixa o projeto e mantém os scripts com o fim de linha certo (ver o aviso do Windows em 0.6).

| Sistema | Instalar |
|---|---|
| Linux | `sudo apt install -y git` |
| Windows 11 | `winget install --id Git.Git -e` |
| macOS | `brew install git` |

No Windows, aceite as opções padrão do instalador. No macOS, o Git também vem com as Xcode Command Line Tools
(`xcode-select --install`).

**Conferir:** `git --version` → `git version 2.x`.

#### 0.6 Obter o projeto

Em todos os sistemas, na pasta onde você quer guardar o projeto:
```bash
git clone https://github.com/emadruga/projeto-aws-chatbot.git
cd projeto-aws-chatbot
```
Sem Git: baixe a pasta pelo material da disciplina e descompacte.

> **Windows:** o arquivo `.gitattributes` faz o Git manter os scripts (`.sh`, `.tf`, `.js`, `.py`) com fim de linha
> do Linux, que é onde eles rodam. Se você copiar a pasta sem o Git, ou editar os scripts num editor que troque o fim
> de linha, e aparecer `bad interpreter` ou `$'\r': command not found` no gerador ou nas EC2, rode lá:
> `sed -i 's/\r$//' arquivo.sh`.

Para editar os `.tfvars`, qualquer editor de texto puro serve (VS Code, gedit, Bloco de Notas, TextEdit em modo
texto puro). Não use Word nem Google Docs.

#### 0.7 Credenciais do Learner Lab (a cada sessão!)

1. AWS Academy → **Learner Lab** → **Start Lab** → espere o indicador ficar **verde**.
2. **AWS Details → AWS CLI → Show**: copie o bloco inteiro (`[default]` e as **três** linhas).
3. Cole no arquivo `credentials`, **substituindo** tudo o que havia nele:

| Sistema | Arquivo | Como abrir para editar |
|---|---|---|
| Linux | `~/.aws/credentials` | `mkdir -p ~/.aws && nano ~/.aws/credentials` |
| Windows 11 | `C:\Users\<você>\.aws\credentials` | ver abaixo |
| macOS | `~/.aws/credentials` | `mkdir -p ~/.aws && nano ~/.aws/credentials` (ou `open -e ~/.aws/credentials` depois de criar com `touch`) |

No **Windows**, crie o arquivo **sem extensão** antes de abri-lo (o Bloco de Notas acrescenta `.txt` a arquivos
novos, e aí a AWS CLI não o encontra):
```powershell
New-Item -ItemType Directory -Force "$HOME\.aws" | Out-Null
New-Item -ItemType File -Force "$HOME\.aws\credentials" | Out-Null
notepad "$HOME\.aws\credentials"
```
Para conferir que não ficou `credentials.txt`: `Get-ChildItem "$HOME\.aws"`.

O conteúdo fica assim:
```ini
[default]
aws_access_key_id=...
aws_secret_access_key=...
aws_session_token=...
```

4. **Conferir:** `aws sts get-caller-identity` deve mostrar `Account` e um `Arn` com o seu nome, sem erro.
   Esse nome vira o **prefixo** de todos os seus recursos.

> As credenciais **expiram quando a sessão termina** (4 h). A cada nova sessão, repita os itens 1 a 4.
> O erro `ExpiredToken` ou `InvalidClientTokenId` quase sempre quer dizer credencial velha.

#### 0.8 Chave SSH `labsuser.pem`

1. No Learner Lab: **AWS Details → Download PEM**. Salve `labsuser.pem` na **raiz da pasta do projeto**.
   (O `.gitignore` impede que ela vá para o Git; mesmo assim, nunca a envie a ninguém.)
2. Ajuste a permissão: o SSH **recusa** chaves que outros usuários possam ler
   (erro `UNPROTECTED PRIVATE KEY FILE` ou `bad permissions`).

**Linux e macOS**
```bash
chmod 400 labsuser.pem
```
No macOS, se o navegador salvou como `labsuser.pem.txt` ou `labsuser (1).pem`, renomeie para `labsuser.pem`.

**Windows 11** (PowerShell, na pasta do projeto)
```powershell
icacls labsuser.pem /inheritance:r
icacls labsuser.pem /grant:r "$($env:USERNAME):(R)"
```
O primeiro comando remove as permissões herdadas da pasta; o segundo deixa só você com leitura. Não guarde a chave
numa pasta sincronizada (OneDrive): a sincronização pode refazer as permissões.

3. **Conferir** (com qualquer EC2 ligada, na Etapa 1): `ssh -i labsuser.pem ec2-user@<IP>` entra sem pedir senha.
   No Windows também funciona `ssh -i .\labsuser.pem ec2-user@<IP>`.

#### 0.9 IP público e `.tfvars`

1. Descubra o seu IP público:

| Sistema | Comando |
|---|---|
| Linux / macOS | `curl ifconfig.me` |
| Windows 11 | `curl.exe ifconfig.me` (no PowerShell, `curl` sem `.exe` é outro comando) |

2. Edite `terraform/compute/a.tfvars`, `b.tfvars` e `b1.tfvars`: troque `SEU.IP.PUBLICO/32` pelo seu IP **com `/32`**
   e acrescente uma senha sua para os usuários de teste `aluno01`…`aluno20`:
   ```hcl
   ssh_cidr      = "200.10.20.30/32"
   seed_password = "uma-senha-sua"
   ```
3. Não mude `instance_type` nem `instance_count` (a menos que o professor peça): a comparação depende disso.

> O IP muda quando você troca de rede (casa, escola, 4G). Se o SSH der `Connection timed out`, confira o IP de novo,
> atualize o `ssh_cidr` e rode `terraform apply` outra vez.

#### 0.10 Conferir tudo

Rode na pasta do projeto. Todos os comandos devem responder sem erro:

| Verificação | Linux / macOS | Windows 11 (PowerShell) | Esperado |
|---|---|---|---|
| Terraform | `terraform version` | `terraform version` | v1.5 ou mais nova |
| AWS CLI | `aws --version` | `aws --version` | `aws-cli/2.x` |
| Python | `python3 --version` | `python --version` | 3.8 ou mais nova |
| SSH | `ssh -V` | `ssh -V` | `OpenSSH_8.x` ou mais nova |
| Git | `git --version` | `git --version` | `git version 2.x` |
| Credenciais | `aws sts get-caller-identity` | `aws sts get-caller-identity` | conta e `Arn` com o seu nome |
| Região | `aws configure get region` | `aws configure get region` | `us-east-1` |
| Chave | `ls -l labsuser.pem` | `icacls labsuser.pem` | `-r--------` / só o seu usuário com `(R)` |
| Terraform inicializa | `cd terraform/base && terraform init` | `cd terraform\base; terraform init` | `Terraform has been successfully initialized!` |

**Teste das credenciais.** O comando é o mesmo nos 3 sistemas e deve ser repetido **no início de cada sessão**,
depois de colar as credenciais novas (0.7):
```bash
aws sts get-caller-identity
```
Credenciais OK, a resposta é parecida com esta:
```json
{
    "UserId": "AROA...:user1234567=_Student_View__Maria_Silva",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/voclabs/user1234567=_Student_View__Maria_Silva"
}
```
O `Arn` deve conter `voclabs` e terminar com o **seu** nome: é dele que o Terraform tira o prefixo dos seus recursos
(`Maria_Silva` → `maria-silva`). Se der erro:

| Erro | Causa provável | O que fazer |
|---|---|---|
| `ExpiredToken` | credenciais de uma sessão anterior | **Start Lab** e copiar o bloco de novo (0.7) |
| `InvalidClientTokenId` ou `SignatureDoesNotMatch` | bloco colado incompleto ou com espaços a mais | colar de novo as **três** linhas, sem espaços no fim |
| `Unable to locate credentials` | arquivo no lugar errado ou com outro nome (ex.: `credentials.txt`) | conferir o caminho e o nome do arquivo (0.7) |
| `Could not connect to the endpoint URL` | região errada ou sem internet | `aws configure set region us-east-1` |

Se tudo passou, você está pronto para a Etapa 1.

### Etapa 1 — Sessão 1: base e Arquitetura A

1. Digitar `terraform apply` dentro da pasta `terraform/base` (uma vez no projeto). Conferir o seu prefixo: `terraform output prefixo`.
2. Criar o gerador de carga `<prefixo>-gerador-carga` e instalar k6 e tmux (ver [Gerador de carga](#gerador-de-carga-passo-2), logo abaixo).
3. Digitar `terraform apply -var-file=a.tfvars` dentro da pasta `terraform/compute`; esperar a URL responder `200`.
4. Teste de fumaça pelo navegador: login com `aluno01` e uma pergunta.
5. Preencher o histórico (uma vez no projeto).
6. **Piloto** com 1 usuário: medir o **S** (tempo de uma resposta com o servidor livre).
7. **Antes de medir:** escrever as hipóteses e preencher a tabela de previsão (abaixo).
8. **3 repetições** de A, cada uma com `vmstat` ligado na EC2, dentro do `tmux`.
9. Prints do CloudWatch (RDS: CPU e conexões) e cópia da pasta `resultados/` para o seu computador.
10. `terraform destroy -var-file=a.tfvars` (**somente** em `compute`).

### Gerador de carga (passo 2)

O gerador é uma EC2 pequena, criada **à mão pelo console** (como na aula do Módulo 4, "Adicionando camada de
computação"), que **não** é gerenciada pelo Terraform e **não** é destruída entre A e B. Todo o teste de carga roda
nela. Crie-a uma vez só, na Sessão 1.

**1. Criar a instância.** Console → **EC2** → **Launch instance**, com estes valores:

| Campo | Valor |
|---|---|
| Name | `<prefixo>-gerador-carga` (ex.: `maria-silva-gerador-carga`) |
| AMI | **Amazon Linux 2023 AMI** (64 bits, **x86**): a primeira opção em *Quick Start → Amazon Linux* |
| Instance type | **`t3.small`** (2 vCPU, 2 GiB): o k6 é leve, 16 usuários não chegam perto do limite |
| Key pair | **`vockey`** (é a chave da `labsuser.pem`) |
| Network settings → VPC | VPC **default** |
| Subnet | a de **`us-east-1a`** |
| Auto-assign public IP | **Enable** |
| Firewall (security groups) | **Create security group**, nome `<prefixo>-gerador-sg`, com **uma** regra: SSH (22) de **My IP** |
| Configure storage | **8 GiB gp3** (o padrão): os resultados do teste ocupam poucos MB |
| Advanced details → IAM instance profile | `LabInstanceProfile` (opcional; o gerador não usa a AWS CLI) |

Não abra a porta 80 nem outras portas no gerador: ele só **faz** requisições, não as recebe. Ele alcança o chatbot
pela internet, como um usuário real.

Clique em **Launch instance** e espere *Instance state* = **Running** e *Status check* = **2/2 checks passed**.
Copie o **Public IPv4 address**.

**2. Enviar os scripts e entrar.** No seu computador, na pasta do projeto (igual nos 3 sistemas; no Windows, no
PowerShell):
```bash
scp -i labsuser.pem -r loadtest ec2-user@<IP-GERADOR>:~/
ssh -o ServerAliveInterval=30 -i labsuser.pem ec2-user@<IP-GERADOR>
```
O usuário é sempre **`ec2-user`** (padrão do Amazon Linux). Na primeira conexão, responda `yes`.

**3. Instalar k6 e tmux.** Já dentro do gerador, que usa o gerenciador de pacotes **`dnf`** do Amazon Linux 2023:
```bash
# k6: adiciona o repositório oficial da Grafana e instala
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6

# tmux: vem nos repositórios do próprio Amazon Linux
sudo dnf install -y tmux

# deixa o script de cenário executável
chmod +x ~/loadtest/rodar_cenario.sh
```

**4. Conferir:**
```bash
k6 version          # k6 v0.5x ou v1.x
tmux -V             # tmux 3.x
ls ~/loadtest       # analisar.py  carga.js  rodar_cenario.sh ...
```
Se o `dnf install` do k6 falhar, siga a seção *Fedora/CentOS* de
[grafana.com/docs/k6/latest/set-up/install-k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).

**Por que `tmux`?** Uma repetição dura de 30 a 60 min. Se a conexão SSH cair, um comando comum é interrompido no
meio; dentro do `tmux` ele continua rodando. O básico:

| Ação | Comando |
|---|---|
| Abrir uma sessão | `tmux new -s teste` |
| Sair sem parar nada | `Ctrl+B`, solte, e depois `D` |
| Voltar à sessão (mesmo depois de reconectar o SSH) | `tmux attach -t teste` |
| Listar sessões | `tmux ls` |

Instale o `tmux` também nas EC2 do chatbot (`sudo dnf install -y tmux`), onde o `vmstat` roda durante as repetições.

> **A cada sessão nova:** o gerador **para** quando a sessão do Learner Lab termina. Na sessão seguinte, se ele
> estiver *Stopped*, religue-o (EC2 → *Instance state* → *Start*): os scripts e o k6 continuam lá, mas o
> **IP público muda**. Copie o IP novo e,
> se você estiver em outra rede, atualize a regra **My IP** do security group `<prefixo>-gerador-sg`.

### Antes de medir: hipóteses e previsão

Escreva **hipóteses próprias**, testáveis e com números aproximados, sobre: como a latência de A muda com mais usuários
(e onde está o gargalo); como B se compara a A com poucos e com muitos usuários; se o ALB tem custo perceptível; se o RDS
pode virar gargalo. A partir do S, monte o **seu** modelo de previsão e justifique em 3 a 5 linhas:

| Usuários | Previsão A (1 EC2) | Previsão B (2 EC2) |
|---|---|---|
| 1 | | |
| 4 | | |
| 16 | | |

Escolha também um critério de "aceitável" (ex.: p95 até 60 s). A previsão é uma hipótese: no relatório você compara com
o que mediu e explica onde errou.

### Etapa 2 — Sessão 2: Arquitetura B

1. Renovar as credenciais; religar o gerador (a base e o histórico continuam lá).
2. `terraform apply -var-file=b.tfvars`; esperar os dois alvos `healthy` no Target Group `<prefixo>-tg`.
3. Verificar o balanceamento: o campo `servidor:` deve alternar entre as duas EC2.
4. **3 repetições** de B com **exatamente o mesmo protocolo** de A, com um `vmstat` por EC2.
5. Prints do CloudWatch (ALB e RDS) e cópia dos resultados.
6. Opcional: teste de falha (parar uma EC2 durante a carga).
7. `terraform destroy -var-file=b.tfvars`.

### Etapa 3 — Análise

1. Na pasta `loadtest/`: `python3 analisar.py` (gera `resultados/tabela.csv`) e, em seguida,
   `python3 gerar_planilha.py` (gera `resultados/resultados.xlsx`). Os detalhes estão na
   [seção 4.5](#45-estrutura-do-relatório-final).
2. Abrir a planilha e analisar cada parte dela (o que olhar em cada uma está na seção 4.5).
3. Os gráficos de **p50**, **p95** e **vazão** × usuários já vêm prontos na aba `Agregado`. Montar os outros dois:
   - decomposição da latência (fila, prefill, geração) com 1, 4 e 16 usuários, a partir da aba `Agregado`;
   - CPU ao longo do tempo (do `vmstat`), uma repetição de A e uma de B.
4. Comparar o medido com a sua previsão.

### Etapa 4 — Relatório e limpeza

Escrever o relatório final em PDF, seguindo a [seção 4.5](#45-estrutura-do-relatório-final): o que vai em cada
parte e quais imagens entram em cada uma.

Limpeza final: `terraform destroy` em `compute` **e depois** em `base`; encerrar o gerador; conferir no console
que não sobrou EC2, RDS nem load balancer com o seu prefixo.

---

## 4. O que você entrega

| # | Entrega | Quando fica pronta |
|---|---|---|
| 1 | Hipóteses e tabela de previsão (com o S do piloto) | Sessão 1, antes das repetições |
| 2 | Diário de bordo: horários, durações, anomalias, repetições descartadas | Ao longo das sessões |
| 3 | Pasta `resultados/` (CSVs do k6, `vmstat`, `tabela.csv`, `resultados.xlsx`) e `terraform output configuracao` de A e de B | Fim de cada sessão (a planilha, na análise) |
| 4 | Prints do CloudWatch (RDS em A e B; ALB em B) | Fim de cada sessão |
| 5 | Relatório final em PDF, com a análise da planilha e os 5 gráficos (seção 4.5) | Fim do projeto |
| 6 | Evidência de limpeza: print do console sem recursos com o seu prefixo | Fim do projeto |

Prazos e forma de envio: conforme o ambiente da disciplina.

### 4.5 Estrutura do Relatório Final

O relatório final é entregue como **um único arquivo PDF**, na Atividade da Sala Virtual da disciplina, com o nome `<prefixo>-servnuvem-2026-2-relatorio-final.pdf`
(ex.: `maria-silva-servnuvem-2026-2-relatorio-final.pdf`). Escreva no editor que preferir (Word, Google Docs, LibreOffice, LaTeX) e
exporte para PDF. As entregas 1, 2, 4 e 6 da tabela acima entram **dentro** do PDF, nas partes indicadas abaixo.

#### Antes de escrever: gerar a planilha e analisar os dados

Pré-requisitos: o `openpyxl` instalado (seção 0.3) e a pasta `resultados/` de A e de B copiada para dentro de
`loadtest/`.

| Sistema | Comandos (na pasta do projeto) |
|---|---|
| Linux / macOS | `cd loadtest`<br>`python3 analisar.py`<br>`python3 gerar_planilha.py` |
| Windows 11 | `cd loadtest`<br>`python analisar.py`<br>`python gerar_planilha.py` |

O `analisar.py` gera `resultados/tabela.csv`; o `gerar_planilha.py` lê esse CSV e grava
`resultados/resultados.xlsx`. Se aparecer `ModuleNotFoundError: No module named 'openpyxl'`, volte à seção 0.3.
Se aparecer `sem resultados agregados para ['B']`, faltam os CSVs de B em `resultados/`.

Abra o `resultados.xlsx` no **Excel** ou no **LibreOffice Calc**. O Google Sheets também abre, mas pode perder a
formatação dos gráficos: confira se eles aparecem. A planilha abre na aba `Agregado` e tem estas partes:

| # | Parte da planilha | Onde | O que mostra |
|---|---|---|---|
| P1 | Abas por repetição | `A_rep1` … `B_rep3` | Os 3 passos (1, 4 e 16 usuários) de cada repetição, com n = 16 respostas por passo |
| P2 | Tabelas "Cenário A" e "Cenário B" | `Agregado`, topo | As 3 repetições juntas (n = 48 por passo): p50, p95, p99, média, desvio, CV, vazão, erros e a decomposição (fila, prefill, geração) |
| P3 | Gráficos p50, p95 e vazão × usuários | `Agregado`, à direita | A e B no mesmo gráfico, a partir do bloco "Dados dos gráficos" |
| P4 | Razões "A ÷ B" | `Agregado`, abaixo dos dados dos gráficos | Quantas vezes B é melhor que A em p50, p95, desvio e vazão (acima de 1,00× = B melhor) |
| P5 | "p95 por repetição: mínimo e máximo" | `Agregado`, fim | A faixa do p95 entre as 3 repetições, para ver se A e B se sobrepõem |

Os gráficos são nativos do Excel: dá para editar títulos e cores, mas **não** altere os números. Os dois gráficos
que a planilha não traz (decomposição da latência e CPU) você monta a partir de P2 e do `vmstat`.

**Regras para todas as imagens:**
- Cada imagem tem número e legenda (ex.: *Figura 3 — p95 × número de usuários, A e B*) e é citada no texto.
  Imagem que o texto não comenta não conta.
- Prints legíveis: recorte só a área que interessa, sem a tela inteira. O **prefixo** (seu nome) deve aparecer nos
  prints do console da AWS.
- Nos prints do CloudWatch, use período de **1 minuto** e o intervalo de tempo da repetição (anotado no diário de bordo).
- Gráficos com título, nome e unidade nos eixos (ex.: "p95 (s)", "usuários simultâneos") e legenda de A e B.
- Tabelas e saídas de comando entram como **texto** (tabela ou bloco de código), não como print.

#### Capa

Título do projeto, disciplina, seu nome, o seu prefixo (`terraform output prefixo`) e a data de entrega.

#### 1. Objetivo e hipóteses

- **Escrever:** a pergunta do projeto (seção 1 deste documento); as suas hipóteses, **como foram escritas antes de
  medir** (não reescreva depois); o valor de **S** medido no piloto; a tabela de previsão (1, 4 e 16 usuários, A e B)
  com a justificativa do seu modelo em 3 a 5 linhas; o seu critério de "aceitável" (ex.: p95 até 60 s).
- **Imagens:** nenhuma.

#### 2. Arquiteturas testadas

- **Escrever:** como uma pergunta percorre A e B; a lista de recursos de cada uma (tipo e quantidade de EC2, ALB,
  RDS, S3, security groups); o custo por hora de A e de B segundo a calculadora da AWS, item a item; a saída de
  `terraform output configuracao` de A e de B, como texto.
- **Imagens:**
  - **Diagrama da Arquitetura A** e **diagrama da Arquitetura B**, desenhados por você (draw.io, Lucidchart,
    PowerPoint...), com usuário, ALB (só em B), EC2 com a zona de disponibilidade, RDS e as setas do caminho da pergunta.
  - **Print da calculadora da AWS** com o total por hora de cada arquitetura.
  - **Print da página do chatbot** respondendo a uma pergunta (teste de fumaça da Etapa 1).
  - **Print do Target Group** `<prefixo>-tg` com os **dois alvos `healthy`** (Etapa 2).
  - **Print do balanceamento:** duas respostas seguidas com o campo `servidor:` diferente.

#### 3. Método

- **Escrever:** o que foi fixado (seção 5, "Comparação justa"); a rampa (1, 4 e 16 usuários, n = 16 respostas por
  passo); as 3 repetições de cada arquitetura; a duração **real** de cada repetição; as datas e os horários das
  duas sessões; as repetições descartadas e o motivo. O **diário de bordo** completo vai no Apêndice A.
- **Imagens:** nenhuma obrigatória.

#### 4. Resultados

Apresente os dados **na ordem das partes da planilha**, descrevendo em um parágrafo curto **só o que se vê** em
cada uma. A interpretação vai na Discussão.

- **4.1 Tabelas agregadas (P2):** copie as tabelas "Cenário A" e "Cenário B" como **tabela de texto** (não print),
  com pelo menos: usuários, p50, p95, p99, CV, resp/min, erros (%), fila, prefill e geração.
- **4.2 Gráficos da planilha (P3)**, copiados como imagem (no Excel: clique no gráfico → Copiar → Colar como imagem):
  1. **Mediana (p50) × usuários** (A e B).
  2. **p95 × usuários** (A e B). É o gráfico central do projeto.
  3. **Vazão × usuários** (A e B).
- **4.3 Razões A ÷ B (P4)** e **4.4 p95 mínimo e máximo (P5):** copie as duas como tabela de texto.
- **4.5 Variação entre repetições (P1):** uma tabela curta com o p95 de cada repetição (rep1, rep2, rep3) em cada
  passo, de A e de B, tirada das abas `A_rep*` e `B_rep*`.
- **4.6 Gráficos montados por você:**
  4. **Decomposição da latência** (barras empilhadas: fila, prefill, geração) com 1, 4 e 16 usuários, A e B, a
     partir das colunas "Fila mediana", "Prefill mediano" e "Geração mediana" de P2.
  5. **CPU ao longo do tempo** (do `vmstat`, coluna `id` → CPU ocupada = 100 − `id`): uma repetição de A e uma de B
     (em B, as duas EC2).
- **4.7 CloudWatch:**
  - **prints do RDS** (`CPUUtilization` e `DatabaseConnections`): um de A e um de B;
  - **prints do ALB** (`TargetResponseTime`, `RequestCountPerTarget`, `HTTPCode_ELB_5XX_Count`): só B;
  - *(opcional)* **teste de falha:** print do Target Group com uma instância `unhealthy` e o número de requisições
    que falharam.

#### 5. Discussão

Discuta **cada parte da planilha**, citando a tabela ou a figura da parte 4 de onde vem cada número. Respostas sem
número não contam.

- **Tabelas agregadas (P2):**
  - Com 1 usuário não há fila: A e B ficam parecidos? Quanto do tempo é prefill e quanto é geração? Compare com o
    seu **S** do piloto.
  - Com 4 e 16 usuários, qual das três partes (fila, prefill, geração) mais cresceu, em A e em B? O que isso diz
    sobre onde está o gargalo?
  - Houve erros (`Erros (%)` > 0)? Em que passo, e por quê?
  - CV: qual arquitetura foi mais consistente no mesmo número de usuários? Com 1 usuário, de onde vem a variação
    que sobra?
- **Gráficos p50, p95 e vazão (P3):**
  - Onde fica o **joelho** (o ponto em que a curva de p95 "dobra para cima") de A e de B, e por quê naquele ponto?
  - A diferença entre p50 e p95 aumenta com a carga? O que isso significa para o usuário que mais espera?
  - A vazão de A para de crescer com mais usuários? E a de B? Se a vazão parou e a latência subiu, o sistema
    saturou: mais usuários só aumentam a fila.
- **Razões A ÷ B (P4):**
  - Em cada passo, quantas vezes B foi melhor (ou pior) que A? Com 2 EC2, o ideal seria perto de 2,00× com muitos
    usuários: você chegou perto? Por que não exatamente 2?
  - Com 1 usuário a razão fica perto de 1,00× (ou abaixo)? O que isso diz sobre o custo do ALB?
- **p95 mínimo e máximo (P5):** em quais passos as faixas de A e de B **não se sobrepõem**? Só nesses a diferença
  está comprovada. Onde se sobrepõem, não há diferença comprovada.
- **Variação entre repetições (P1):** alguma repetição destoou das outras? O diário de bordo explica (anomalia,
  horário, repetição refeita)?
- **Decomposição e CPU (gráficos 4 e 5):** a CPU chegou perto de 100% nos passos em que a fila cresceu? Em B, as
  duas EC2 trabalharam por igual?
- **CloudWatch:** o RDS foi gargalo (CPU e conexões)? Como você sabe? Em B, o `TargetResponseTime` do ALB bate com o
  p95 medido pelo k6?
- **Conclusões gerais:**
  - A sua previsão acertou? Onde errou, e por quê?
  - Quantos usuários cada arquitetura suporta pelo seu critério de "aceitável"?
  - O ganho de B justifica o custo extra (segunda EC2 + ALB)? Para quantos usuários?
- **Imagens:** nenhuma nova. Refira-se às figuras e tabelas da parte 4.

#### 6. Limitações e conclusão

- **Escrever:** as limitações do seu experimento (veja o PLANO, seção 10, e acrescente as suas: anomalias,
  repetições refeitas); a **resposta direta** à pergunta do projeto em 1 parágrafo, com os números que a sustentam.
- **Imagens:** nenhuma.

#### Apêndices

- **Apêndice A — Diário de bordo:** horários, durações, anomalias e repetições descartadas, como texto.
- **Apêndice B — Evidência de limpeza:** prints do console da AWS, filtrados pelo seu prefixo, **sem** EC2
  (incluindo o gerador), banco RDS nem load balancer, com a data visível.

A pasta `resultados/` (entrega 3) **não** vai dentro do PDF: é enviada à parte, conforme o ambiente da disciplina.

---

## 5. Regras do jogo

- **Comparação justa:** só a arquitetura muda. Mesma aplicação, mesmo `instance_type` (`m5.large`), mesmo RDS, mesmo
  gerador, mesmas perguntas, mesma rampa (1, 4 e 16 usuários, n = 16 respostas por passo), 3 repetições.
- **Nunca rode o teste do seu computador**: só do gerador, dentro da AWS.
- Não use a página do chatbot nem consulte o banco **durante** uma repetição: isso invalida a medição.
- Os resultados e as conclusões vêm das **suas** medições. Previsão errada não é problema; dado inventado é.
- **Segurança:** nunca faça commit de `labsuser.pem`, credenciais ou `terraform.tfstate`. Porta 22 só para o seu IP.
- **Learner Lab:** sessão de 4 h, credenciais renovadas a cada sessão, crédito limitado. Sempre `destroy` ao terminar.

## 6. Extras opcionais (só se o professor pedir)

- **B1:** ALB + 1 EC2 (`b1.tfvars`), para isolar o custo do balanceador.
- **Teste de falha em B:** parar uma EC2 durante a carga e observar a disponibilidade.
- **Mais EC2:** `terraform apply -var-file=b.tfvars -var instance_count=4`, com a sua previsão escrita antes.
