variable "db_instance_class" {
  description = "Classe do RDS. A mesma para A e B (o banco é compartilhado)."
  type        = string
  default     = "db.t3.micro"
}

variable "knowledge_file" {
  description = "Arquivo da base de conhecimento enviado ao S3"
  type        = string
  default     = "../../bases/plano_pedagogico_gemma.txt"
}

variable "prefixo" {
  description = "Prefixo dos recursos. Vazio = nome do aluno, lido do 'aws sts get-caller-identity' (veja nomes.tf)."
  type        = string
  default     = ""
  validation {
    condition     = var.prefixo == "" || can(regex("^[a-z][a-z0-9-]{0,26}[a-z0-9]$", var.prefixo))
    error_message = "Use de 2 a 28 caracteres: minúsculas, números e hífen, começando por letra (ex.: maria-silva)."
  }
}
