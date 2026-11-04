# Estes valores são lidos pela camada compute (terraform_remote_state)
output "app_sg_id" { value = aws_security_group.app.id }
output "db_host" { value = aws_db_instance.chat.address }
output "db_name" { value = aws_db_instance.chat.db_name }
output "db_user" { value = aws_db_instance.chat.username }
output "kb_bucket" { value = terraform_data.knowledge.output.bucket }
output "kb_key" { value = terraform_data.knowledge.output.key }

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
