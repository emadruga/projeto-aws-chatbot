# ============================================================
# CAMADA DE DADOS (com estado) — criada UMA vez, usada por A e B
#   - RDS Postgres: usuários, sessões e histórico das conversas
#   - S3: base de conhecimento (plano pedagógico do curso)
#   - Security groups: "app" (marca as EC2) e "db" (protege o RDS)
# ============================================================

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# ---------- Security groups ----------
# "app": não abre porta nenhuma. Serve de "crachá": toda EC2 da camada compute recebe
# este SG, e o banco aceita conexões de quem tem o crachá.
resource "aws_security_group" "app" {
  name_prefix = "${local.prefixo}-app-"
  description = "Cracha das EC2 do chatbot"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_egress_rule" "app_out" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "db" {
  name_prefix = "${local.prefixo}-db-"
  description = "Postgres acessivel so pelas EC2 do chatbot"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

# ---------- RDS Postgres ----------
resource "random_password" "db" {
  length  = 20
  special = false # o RDS não aceita alguns símbolos; só letras e números evita problemas
}

resource "aws_db_subnet_group" "default" {
  name_prefix = "${local.prefixo}-db-"
  subnet_ids  = data.aws_subnets.default.ids
}

resource "aws_db_instance" "chat" {
  identifier_prefix      = "${local.prefixo}-db-"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "chatbot"
  username               = "chatbot"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false # o banco NÃO fica exposto à internet
  multi_az               = false
  skip_final_snapshot    = true # laboratório: destruir sem snapshot
  apply_immediately      = true
}

# ---------- S3: base de conhecimento ----------
# Por que não usamos o recurso aws_s3_bucket? Ele consulta configurações do bucket
# (como o Object Lock) que o Learner Lab bloqueia por política da organização (erro 403).
# Solução simples: criar o bucket e enviar o arquivo com a AWS CLI, via local-exec.
# Buckets novos já nascem privados (bloqueio de acesso público ligado por padrão).

# Sufixo aleatório: nomes de bucket são únicos no mundo todo
resource "random_id" "kb" {
  byte_length = 8
}

resource "terraform_data" "knowledge" {
  # Valores guardados aqui ficam disponíveis no destroy (via self.input)
  input = {
    bucket = "${local.prefixo}-kb-${random_id.kb.hex}"
    key    = "conhecimento/plano_pedagogico.txt"
    file   = var.knowledge_file
  }

  # Se o arquivo mudar, o recurso é refeito e o arquivo novo é enviado
  triggers_replace = filemd5(var.knowledge_file)

  # Cria o bucket (us-east-1 não usa LocationConstraint)
  provisioner "local-exec" {
    command = "aws s3api create-bucket --bucket ${self.input.bucket} --region us-east-1"
  }

  # Envia a base de conhecimento
  provisioner "local-exec" {
    command = "aws s3 cp ${self.input.file} s3://${self.input.bucket}/${self.input.key} --content-type text/plain"
  }

  # No destroy: esvazia e remove o bucket
  provisioner "local-exec" {
    when    = destroy
    command = "aws s3 rb s3://${self.input.bucket} --force"
  }
}
