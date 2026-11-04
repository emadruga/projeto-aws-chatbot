output "url" {
  description = "Endereço do chatbot (e alvo do teste de carga)"
  value       = var.use_alb ? "http://${one(aws_lb.app[*].dns_name)}" : "http://${aws_instance.web[0].public_ip}"
}

output "ssh" {
  description = "Um comando SSH por instância"
  value       = [for i in aws_instance.web : "ssh -i labsuser.pem ec2-user@${i.public_ip}"]
}

output "instance_ids" {
  value = aws_instance.web[*].id
}
