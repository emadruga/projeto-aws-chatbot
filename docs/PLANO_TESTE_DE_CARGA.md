# Plano de Teste de Carga — Arquitetura A vs. Arquitetura B

Este documento descreve **o procedimento que cada aluno executa** para medir e comparar as duas
arquiteturas do Projeto Nuvem 2026. Os scripts estão em `loadtest/`:

| Arquivo | Função |
|---|---|
| `loadtest/carga.js` | Script k6: cada usuário virtual faz login e envia perguntas ao chatbot |
| `loadtest/rodar_cenario.sh` | Roda a rampa completa (1 → 16 usuários) e salva um CSV por passo |
| `loadtest/analisar.py` | Lê todos os CSVs e gera a tabela comparativa (`resultados/tabela.csv`) |

---

## O que é o k6

O [k6](https://k6.io) é uma ferramenta de código aberto (da Grafana Labs) para **teste de carga**.
Você descreve em JavaScript o que um usuário faz, e o k6 executa esse roteiro com vários
**usuários virtuais (VUs)** ao mesmo tempo, medindo o tempo de cada requisição. No fim, gera
estatísticas (média, mediana, p95, p99, erros) e, se pedido, um CSV com cada medição. É um
programa único e leve, sem servidor nem interface gráfica, usado pela linha de comando.

Neste projeto:

- O roteiro do usuário virtual é o `loadtest/carga.js`. Cada VU faz **login** uma vez como
  `aluno01`, `aluno02`... e guarda o token; depois envia em sequência 8 **perguntas fixas** sobre o
  curso, com 1 s de pausa entre elas, e **mede** a latência total e suas partes (fila, prefill e
  geração), usando os tempos que a API devolve.
- A **rampa de concorrência** fica no `loadtest/rodar_cenario.sh`, que chama o k6 cinco vezes, com
  1, 2, 4, 8 e 16 usuários simultâneos, e salva um CSV por passo.

**Por que k6 e não ApacheBench (`ab`):** o `ab` é mais simples, mas não consegue fazer login e
reaproveitar o token, não suporta bem um POST com JSON diferente para cada usuário e não exporta
os percentis de cada passo. O nosso teste precisa dessas três coisas.

---

## 1. Pergunta e hipóteses

> **Qual arquitetura entrega o menor tempo de resposta ao usuário final, de forma mais consistente?**

Antes de medir, cada grupo registra no relatório o que **espera** observar, com justificativa.
Escreva **hipóteses próprias**, testáveis e com números aproximados, sobre:

- como a latência de A muda quando o número de usuários aumenta, e por quê (onde está o gargalo?);
- como a latência de B se compara à de A com muitos usuários e com poucos usuários;
- se o balanceador (ALB) tem custo perceptível;
- se o banco (RDS) pode virar gargalo.

As hipóteses são confirmadas ou refutadas **pelos dados**, não pela expectativa.

---

## 2. Regras para uma comparação justa

A única coisa que pode mudar entre A e B é a **arquitetura de computação**. Todo o resto é fixo:

| Item | Valor fixo | Onde está definido |
|---|---|---|
| Tipo de instância | `m5.large` | `terraform/compute/variables.tf` |
| Modelo e parâmetros | `gemma2:2b`, `temperature 0`, `seed 42`, `num_predict 128`, `num_ctx 4096` | `app/app.py` |
| Paralelismo do Ollama | 2 por instância | `num_parallel` |
| Histórico enviado ao modelo | últimas 6 mensagens | `history_messages` |
| Banco e base de conhecimento | o **mesmo** RDS e S3 da camada `base` | `terraform/base` |
| Perguntas | as mesmas 8 perguntas, na mesma ordem | `loadtest/carga.js` |
| Gerador de carga | a **mesma** EC2, na mesma região e VPC | seção 3 |
| Rampa | 1, 2, 4, 8, 16 usuários; 3 min por passo; 1 s de pausa entre perguntas | `rodar_cenario.sh` |
| Repetições | 3 por cenário | seção 6 |

⚠️ **Nunca rode o teste a partir do computador de casa ou da escola.** A latência da internet
até a Virgínia (us-east-1) e as oscilações do Wi-Fi entrariam nos dados.

---

## 3. O gerador de carga

É uma EC2 pequena, separada das arquiteturas, que **não é destruída** entre A e B.

**Criação (uma vez, pelo console):** EC2 → *Launch instance*:

- Nome: `gerador-carga`
- AMI: Amazon Linux 2023
- Tipo: `t3.small` (o k6 é leve; 16 usuários não chegam perto do limite)
- Key pair: `vockey`
- Rede: VPC default, subnet em `us-east-1a`, IP público habilitado
- Security group: novo, com **SSH apenas do "My IP"**

**Instalação do k6 e cópia dos scripts:**

```bash
# no computador do aluno
scp -i labsuser.pem -r loadtest ec2-user@<IP-DO-GERADOR>:~/

# no gerador (ssh -i labsuser.pem ec2-user@<IP-DO-GERADOR>)
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
sudo dnf install -y k6
k6 version
```

> O gerador para quando a sessão do Learner Lab termina e volta com **outro IP público** ao
> reiniciar. Confira o IP no console a cada sessão.

---

## 4. O que é medido

### 4.1 Métricas principais (k6)

| Métrica | O que significa |
|---|---|
| `latencia_chat` | Tempo total que o usuário espera pela resposta (do envio até a chegada) |
| p50 (mediana) | Metade das respostas chega em menos que isso |
| p95 / p99 | 95% / 99% das respostas chegam em menos que isso: mede o **pior caso típico** |
| desvio-padrão e **CV** | Dispersão das latências. CV = desvio ÷ média. **Menor CV = mais consistente** |
| `req_por_min` | Vazão: quantas perguntas o sistema responde por minuto |
| `erros_pct` | Respostas diferentes de HTTP 200 (inclui timeouts e 502/504 do ALB) |

**Por que p95 e não só a média:** a média esconde os usuários que esperaram muito. A pergunta do
projeto fala em consistência, e consistência se vê nos percentis altos e no CV.

### 4.2 Decomposição da latência

Cada resposta da API informa quanto tempo o modelo gastou. O `carga.js` separa a latência total
em três partes:

```
latência total  =  tempo de fila e rede  +  tempo de prefill  +  tempo de geração
                   (esperando vaga,         (modelo lendo         (modelo escrevendo
                    rede, banco)             o prompt)              a resposta)
```

Compare como cada uma das três partes se comporta quando o número de usuários aumenta.

### 4.3 Uso de CPU nas instâncias (via SSH)

O CloudWatch básico das EC2 tem um ponto a cada 5 minutos, pouco para passos de 3 minutos. Por
isso a CPU é coletada **dentro da instância**, por SSH, durante cada repetição:

```bash
ssh -i labsuser.pem ec2-user@<IP-DA-EC2>
vmstat -t 5 | tee cpu_A_r1.txt      # em B: um terminal por instância (cpu_B_r1_ec2-1.txt, ...)
# Ctrl+C ao final da repetição
```

A coluna `id` (ocioso) próxima de 0 indica CPU saturada.

### 4.4 CloudWatch (complementar)

| Serviço | Métricas | Cenário |
|---|---|---|
| ALB (`nuvem-alb`) | `TargetResponseTime`, `RequestCountPerTarget`, `HTTPCode_ELB_5XX_Count` | só B |
| RDS | `CPUUtilization`, `DatabaseConnections` | A e B (o banco é gargalo?) |

Console → CloudWatch → *Metrics* → período de **1 minuto**, intervalo da repetição. Salve um
print de cada gráfico para o relatório.

---

## 5. Orçamento de tempo

Uma repetição leva cerca de **20 minutos**: aquecimento (1 min) + 5 passos × (3 min + 30 s de pausa)
+ perguntas finalizando. A sessão do Learner Lab dura 4 horas, por isso o teste é dividido em
**duas sessões**:

| Sessão | Etapa | Tempo aproximado |
|---|---|---|
| **1** | Criar camada `base` (RDS leva ~10 min) e gerador de carga | 15 min |
| | `apply` de A e espera até ficar pronta | 15 min |
| | Teste de fumaça + preenchimento do histórico + piloto | 15 min |
| | 3 repetições em A | 60 min |
| | `destroy` de A | 5 min |
| **2** | `apply` de B e espera até os dois alvos ficarem `healthy` | 15 min |
| | Teste de fumaça + verificação do balanceamento | 10 min |
| | 3 repetições em B | 60 min |
| | Teste de falha em B (opcional) | 15 min |
| | `destroy` de B, cópia dos resultados | 10 min |

A camada `base` e o gerador **sobrevivem entre sessões**: o Learner Lab os para ao fim da
sessão e os religa no início da próxima. O histórico e os usuários continuam no RDS.

---

## 6. Procedimento

### 6.1 Preparação (sessão 1)

1. Criar a camada de dados: `cd terraform/base && terraform init && terraform apply`.
2. Criar o gerador de carga (seção 3).
3. Subir a arquitetura A: `cd ../compute && terraform init && terraform apply -var-file=a.tfvars`.
4. Esperar ficar pronta: `curl -s -o /dev/null -w "%{http_code}\n" $(terraform output -raw url)`
   deve retornar `200`.
5. **Teste de fumaça:** abrir a URL no navegador, entrar como `aluno01` e fazer uma pergunta.

### 6.2 Preenchimento do histórico (uma única vez)

No começo, os alunos de teste não têm histórico, e as primeiras perguntas seriam mais rápidas
que as seguintes. Para que todas as medições partam da mesma condição, cada um dos 16 usuários
envia 3 perguntas antes de qualquer medição (3 pares pergunta/resposta = 6 mensagens, o limite
do histórico):

```bash
# no gerador
cd ~/loadtest
k6 run -e URL=http://<IP-DA-EC2-A> -e SENHA=<seed_password> -e VUS=16 -e ITERACOES=3 carga.js
```

Como o histórico fica no RDS, **isso não precisa ser repetido em B**.

### 6.3 Piloto (calibra a duração dos passos)

```bash
DURACAO=3m PASSOS="1" AQUECIMENTO=30s SENHA=<seed_password> ./rodar_cenario.sh PILOTO 1 http://<IP-DA-EC2-A>
```

Veja o número de respostas (`count` de `latencia_chat`). Se for **menor que 20**, os percentis
com 1 usuário não são confiáveis: use `DURACAO=5m` em todas as repetições, de A **e** de B.

**Previsão antes de medir.** Anote a mediana da latência com 1 usuário: esse é o **S**, o tempo
de uma resposta com o servidor livre. A partir de S, e do que você sabe sobre a CPU, o
`OLLAMA_NUM_PARALLEL` e o número de instâncias, **monte o seu próprio modelo** para prever a latência
com 2, 4, 8 e 16 usuários em A e em B. Preencha a tabela **antes** das repetições e guarde-a para o relatório:

| Usuários | Previsão A (1 EC2) | Previsão B (2 EC2) |
|---|---|---|
| 1 | | |
| 2 | | |
| 4 | | |
| 8 | | |
| 16 | | |

Justifique o modelo em 3 a 5 linhas. Escolha também um **critério de aceitável** (por exemplo,
"p95 até 60 s") e estime quantos usuários cada arquitetura suportaria.

⚠️ Se a latência passar do timeout (300 s), as requisições falham. Isso é um resultado (o sistema
saturou), não um defeito do teste.

### 6.4 Cenário A — 3 repetições

Para cada repetição `R` = 1, 2, 3:

1. Em outro terminal, iniciar a coleta de CPU por SSH na EC2 (seção 4.3): `vmstat -t 5 | tee cpu_A_rR.txt`.
2. No gerador:
   ```bash
   SENHA=<seed_password> ./rodar_cenario.sh A R http://<IP-DA-EC2-A>
   ```
3. Interromper o `vmstat` (Ctrl+C).
4. Anotar no diário de bordo: horário de início e fim, qualquer erro ou anomalia.

Ao final: `terraform destroy -var-file=a.tfvars` (somente em `compute`!).

### 6.5 Cenário B — 3 repetições (sessão 2)

1. `terraform apply -var-file=b.tfvars` e esperar os dois alvos `healthy`
   (EC2 → Target Groups → `nuvem-tg` → Targets).
2. **Verificar o balanceamento:** faça algumas perguntas pela página. O campo
   `servidor:` deve alternar entre as duas instâncias.
3. Para cada repetição `R` = 1, 2, 3: igual ao cenário A, mas com **um terminal `vmstat` por
   instância** e a URL do ALB:
   ```bash
   SENHA=<seed_password> ./rodar_cenario.sh B R http://<DNS-DO-ALB>
   ```
4. Depois da última repetição, conferir no RDS como o ALB dividiu o trabalho (SSH numa das EC2):
   ```sql
   -- sudo dnf install -y postgresql16 ; psql -h <db_host> -U chatbot chatbot
   SELECT served_by, count(*) FROM messages
   WHERE role = 'assistant' AND created_at > now() - interval '90 minutes'
   GROUP BY served_by;
   ```
   As duas instâncias devem ter contagens parecidas.

### 6.6 Teste de falha em B (opcional, recomendado)

Mostra a diferença de **disponibilidade**, não de desempenho. Não entra na tabela de latência.

1. No gerador: `k6 run -e URL=http://<DNS-DO-ALB> -e SENHA=<seed_password> -e VUS=8 -e DURACAO=6m --out csv=resultados/falha.csv carga.js`
2. Aos **2 minutos**, parar uma das EC2: console → EC2 → *Instance state* → *Stop*.
3. Observar no console do Target Group quando a instância passa a `unhealthy`.
4. No relatório: quantas requisições falharam, por quanto tempo, e o que aconteceria em A.
5. Ao final, religar a instância (*Start*). O IP público dela muda; o ALB não se importa.

### 6.7 Coleta dos resultados

```bash
# no computador do aluno
scp -i labsuser.pem -r ec2-user@<IP-DO-GERADOR>:~/loadtest/resultados .
scp -i labsuser.pem ec2-user@<IP-DA-EC2>:~/cpu_*.txt resultados/
```

Faça a cópia **ao fim de cada sessão**: se o gerador for perdido, os dados também serão.

---

## 7. Critérios de validade

Uma repetição é **descartada e refeita** se:

- `erros_pct` > 0 em passos com 1 ou 2 usuários (algo está errado, não é efeito da carga).
  **Erros em passos com muitos usuários não invalidam a repetição** se forem timeouts por
  saturação (confira nos logs): devem ser analisados como resultado;
- o `vmstat` mostrou a instância já ocupada antes do início (`id` baixo sem carga);
- houve intervenção durante a medição (alguém usando a página, `terraform apply`, etc.);
- a sessão do Learner Lab expirou no meio.

Registre toda repetição descartada e o motivo no relatório.

---

## 8. Análise

No computador do aluno, com a pasta `resultados/` copiada para dentro de `loadtest/`:

```bash
cd loadtest
python3 analisar.py
```

O script imprime e grava `resultados/tabela.csv`, com uma linha por cenário × repetição × passo:
`n`, `p50_s`, `p95_s`, `p99_s`, `media_s`, `desvio_s`, `cv`, `req_por_min`, `erros_pct`,
`fila_med_s`, `prefill_med_s`, `geracao_med_s`. Não precisa instalar nada além do Python.

**Gráficos obrigatórios** (Excel ou Google Sheets, a partir de `tabela.csv`):

1. **p95 × número de usuários**, uma linha por cenário (A e B). Use a média das 3 repetições
   e mostre o mínimo e o máximo como barra de erro. É o gráfico central do projeto.
2. **Vazão (`req_por_min`) × número de usuários**, uma linha por cenário.
3. **Decomposição da latência** (barras empilhadas: fila, prefill, geração) para A e B com 1, 4 e 16 usuários.
4. **CPU ao longo do tempo** (a partir do `vmstat`) numa repetição de A e uma de B.

**Como ler:**

- O ponto onde a curva de p95 "dobra para cima" é o **joelho**: a carga a partir da qual o sistema
  começa a enfileirar. Compare o joelho de A com o de B.
- Se as barras de erro de A e B se sobrepõem num passo, **não há diferença comprovada** naquele passo.
- Se a vazão para de crescer enquanto a latência sobe, o sistema saturou: mais usuários só
  aumentam a fila.

---

## 9. Estrutura do relatório

1. **Objetivo e hipóteses** (seção 1), escritas antes de medir.
2. **Arquiteturas testadas**: diagrama de A e B, recursos criados, custo por hora de cada uma
   (EC2, ALB, RDS) segundo a calculadora da AWS.
3. **Método**: o que foi fixado (seção 2), a rampa, o número de repetições, a duração final dos passos.
4. **Resultados**: tabela e os 4 gráficos da seção 8; prints do CloudWatch; resultado do teste de falha.
5. **Discussão**:
   - Qual arquitetura teve menor p95? Em quais passos a diferença é real (sem sobreposição)?
   - Qual foi mais consistente (CV)?
   - Onde ficou o joelho de cada uma? Por que naquele ponto?
   - Qual parte da latência cresceu com a carga (fila, prefill ou geração)?
   - O RDS foi gargalo? Como você sabe?
   - A sua previsão da seção 6.3 acertou? Onde errou, e por quê?
   - Quantos usuários cada arquitetura suporta segundo o critério de "aceitável" que você escolheu?
   - O ganho de B justifica o custo extra (segunda EC2 + ALB)? Para quantos usuários?
   - O que aconteceu no teste de falha?
6. **Limitações** (seção 10) e **conclusão**: resposta direta à pergunta do projeto.

---

## 10. Limitações conhecidas

- **Ordem fixa:** todas as repetições de A acontecem antes das de B, em sessões diferentes. Uma
  variação no ambiente da AWS entre as sessões não pode ser separada do efeito da arquitetura.
  As 3 repetições ajudam a estimar essa variação, mas não a eliminam.
- **Carga sintética:** 8 perguntas fixas e 1 s de pausa não imitam usuários reais, que leem a
  resposta antes de perguntar de novo. O teste mede a **capacidade**, não a experiência típica.
- **Cache do prompt:** o Ollama reaproveita a parte do prompt que se repete (a base de
  conhecimento). Isso reduz o prefill e é igual em A e B, mas os números absolutos não valem para
  perguntas sempre diferentes.
- **Escala pequena:** 16 usuários e 2 instâncias. As conclusões sobre a tendência valem; os números
  absolutos não se transferem para outros tamanhos.

---
