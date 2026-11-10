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

- [ ] Instalar Terraform, AWS CLI, Python 3 e cliente SSH (QUICKSTART, seção 1).
- [ ] Obter o projeto e copiar as credenciais do Learner Lab para `~/.aws/credentials` (a cada sessão!).
- [ ] Baixar a `labsuser.pem` e ajustar a permissão.
- [ ] Nos `.tfvars`: o **seu** IP em `ssh_cidr` (com `/32`) e uma `seed_password` sua.
- [ ] Ler o [`PLANO_TESTE_DE_CARGA.md`](PLANO_TESTE_DE_CARGA.md), seções 1 e 2.

### Etapa 1 — Sessão 1: base e Arquitetura A

1. `terraform apply` em `terraform/base` (uma vez no projeto). Conferir o seu prefixo: `terraform output prefixo`.
2. Criar o gerador de carga `<prefixo>-gerador-carga` (t3.small) e instalar k6 e tmux.
3. `terraform apply -var-file=a.tfvars` em `terraform/compute`; esperar a URL responder `200`.
4. Teste de fumaça pelo navegador: login com `aluno01` e uma pergunta.
5. Preencher o histórico (uma vez no projeto).
6. **Piloto** com 1 usuário: medir o **S** (tempo de uma resposta com o servidor livre).
7. **Antes de medir:** escrever as hipóteses e preencher a tabela de previsão (abaixo).
8. **3 repetições** de A, cada uma com `vmstat` ligado na EC2, dentro do `tmux`.
9. Prints do CloudWatch (RDS: CPU e conexões) e cópia da pasta `resultados/` para o seu computador.
10. `terraform destroy -var-file=a.tfvars` (**somente** em `compute`).

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

1. `python3 analisar.py` na pasta `loadtest/` (gera `resultados/tabela.csv`). Use a linha `rep = 0` (as 3 repetições juntas).
2. Os **4 gráficos obrigatórios** (Excel ou Google Sheets):
   - p95 × número de usuários (A e B);
   - vazão × número de usuários;
   - decomposição da latência (fila, prefill, geração) com 1, 4 e 16 usuários;
   - CPU ao longo do tempo (do `vmstat`), uma repetição de A e uma de B.
3. Comparar o medido com a sua previsão.

### Etapa 4 — Relatório e limpeza

Estrutura do relatório (PLANO, seção 9):

1. Objetivo e hipóteses (escritas antes de medir).
2. Arquiteturas testadas: diagramas, recursos e custo por hora (calculadora da AWS).
3. Método: o que foi fixado, a rampa, as repetições, a duração real de cada repetição.
4. Resultados: tabela, os 4 gráficos e os prints do CloudWatch.
5. Discussão: menor p95, consistência, joelho, qual parte da latência cresceu, o RDS foi gargalo?,
   a previsão acertou?, quantos usuários cada uma suporta, o ganho de B justifica o custo?
6. Limitações e conclusão: a resposta direta à pergunta do projeto.

Limpeza final: `terraform destroy` em `compute` **e depois** em `base`; encerrar o gerador; conferir no console
que não sobrou EC2, RDS nem load balancer com o seu prefixo.

---

## 4. O que você entrega

| # | Entrega | Quando fica pronta |
|---|---|---|
| 1 | Hipóteses e tabela de previsão (com o S do piloto) | Sessão 1, antes das repetições |
| 2 | Diário de bordo: horários, durações, anomalias, repetições descartadas | Ao longo das sessões |
| 3 | Pasta `resultados/` (CSVs do k6, `vmstat`, `tabela.csv`) e `terraform output configuracao` de A e de B | Fim de cada sessão |
| 4 | Prints do CloudWatch (RDS em A e B; ALB em B) | Fim de cada sessão |
| 5 | Relatório completo, com os 4 gráficos | Fim do projeto |
| 6 | Evidência de limpeza: print do console sem recursos com o seu prefixo | Fim do projeto |

Prazos e forma de envio: conforme o ambiente da disciplina.

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
