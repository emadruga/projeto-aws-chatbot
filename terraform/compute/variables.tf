variable "instance_count" {
  description = "Quantas EC2 rodam o chatbot (1 = Arch A, 2 = Arch B)"
  type        = number
  default     = 1
}

variable "use_alb" {
  description = "Criar o Application Load Balancer? (false = Arch A, true = Arch B)"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "Tipo da EC2. Use o MESMO em todos os cenários. Learner Lab: até 'large'."
  type        = string
  default     = "m5.large" # 2 vCPU, 8 GB, desempenho fixo (sem créditos de CPU)
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
