variable "instance_count" {
  description = "Quantas EC2 rodam o chatbot (1 = Arch A; 2 ou mais, atrás do ALB = Arch B). As EC2 se alternam entre us-east-1a e us-east-1b."
  type        = number
  default     = 1
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 15
    error_message = "Use de 1 a 15 instâncias (o Learner Lab permite 32 vCPU ao mesmo tempo; cada large tem 2 vCPU e o gerador de carga usa mais 2)."
  }
}

variable "use_alb" {
  description = "Criar o Application Load Balancer? (false = Arch A, true = Arch B)"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "Tipo de TODAS as EC2 (A e B). Use o MESMO em todos os cenários que for comparar. Learner Lab: de nano até large. Precisa de ~8 GB de RAM (m5.large); com menos, o Ollama pode ficar sem memória."
  type        = string
  default     = "m5.large" # 2 vCPU, 8 GB, desempenho fixo (sem créditos de CPU)
  validation {
    condition     = can(regex("^[a-z0-9]+\\.(nano|micro|small|medium|large)$", var.instance_type))
    error_message = "No Learner Lab o EC2 só aceita tamanhos nano, micro, small, medium e large (ex.: m5.large)."
  }
}

variable "ssh_cidr" {
  description = "Seu IP público em /32 para SSH (descubra com: curl ifconfig.me)"
  type        = string
}

variable "model" {
  description = "Modelo do Ollama. Fixe a tag (nunca 'latest')."
  type        = string
  default     = "gemma2:2b"
}

variable "num_parallel" {
  description = "Requisições que o Ollama processa em paralelo por instância"
  type        = number
  default     = 2
}

variable "history_messages" {
  description = "Quantas mensagens anteriores vão para o modelo (fixo = custo constante)"
  type        = number
  default     = 6
}

variable "seed_users" {
  description = "Quantos usuários de teste criar (aluno01, aluno02, ...) para o teste de carga"
  type        = number
  default     = 20
}

variable "seed_password" {
  description = "Senha dos usuários de teste"
  type        = string
  default     = "trocar-esta-senha"
  sensitive   = true
}
