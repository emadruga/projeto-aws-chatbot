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
