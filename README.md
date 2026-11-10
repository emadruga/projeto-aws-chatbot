# Projeto AWS Chatbot — Gemma em duas arquiteturas

Projeto final da disciplina **Cloud Systems Architecture** (AWS Academy Learner Lab).

Um site com um chatbot (Google Gemma 2 2B, servido via Ollama) responde dúvidas sobre o
Curso Técnico em Segurança Cibernética (IFF + Inmetro). Cada aluno, no seu próprio Learner Lab, vai provisionar **duas
arquiteturas AWS** com Terraform, executar o mesmo teste de carga em cada uma e responder, **com dados**:

> **Qual arquitetura entrega o menor tempo de resposta ao usuário final, de forma mais consistente?**

- **A — Monolito:** Usuário → 1 EC2 (backend + Ollama + Gemma) → RDS
- **B — Balanceada:** Usuário → ALB → 2 EC2 idênticas → RDS

Serviços: EC2, ALB, RDS, S3, IAM e VPC. O código da aplicação (`app/`) já vem pronto: o foco é a
arquitetura, não a programação.

## Por onde começar

1. [`docs/ESCOPO_E_ATIVIDADES.md`](docs/ESCOPO_E_ATIVIDADES.md) — escopo, etapas, entregas e regras (slides em [`docs/slides/`](docs/slides/ESCOPO_E_ATIVIDADES.pptx))
2. [`docs/QUICKSTART.md`](docs/QUICKSTART.md) — roteiro passo a passo, do zero à análise
3. [`docs/ARCH_A_vs_ARCH_B.md`](docs/ARCH_A_vs_ARCH_B.md) — como a infraestrutura é montada e por quê
4. [`docs/PLANO_TESTE_DE_CARGA.md`](docs/PLANO_TESTE_DE_CARGA.md) — procedimento de medição e estrutura do relatório

## Estrutura

```
app/                backend Flask e página de login + chat
bases/              base de conhecimento (resumo do PPC) e PPC original
docs/               guias do projeto
loadtest/           teste de carga (k6) e análise dos resultados
terraform/base/     camada de dados: RDS + S3 + security groups (criada uma vez)
terraform/compute/  camada de computação: EC2 (+ ALB); a.tfvars, b.tfvars, b1.tfvars
```

## Avisos

- Use apenas o **AWS Academy Learner Lab**. Ao terminar, rode `terraform destroy` em `compute` **e depois** em `base`.
- Nunca faça commit de `labsuser.pem`, credenciais da AWS ou arquivos `terraform.tfstate` (o `.gitignore` já os bloqueia).
- Troque `ssh_cidr` nos `.tfvars` pelo **seu** IP público (`/32`).
- Os resultados e as conclusões do relatório devem vir das **suas** medições.
