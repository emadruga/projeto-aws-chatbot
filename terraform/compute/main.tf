# ============================================================
# CAMADA DE COMPUTAÇÃO (sem estado) — alterna entre A e B
# Lê da camada base: endpoint do RDS, bucket S3 e o SG "app".
# ============================================================

data "terraform_remote_state" "base" {
  backend = "local"
  config = {
    path = "${path.module}/../base/terraform.tfstate"
  }
}

locals {
  base = data.terraform_remote_state.base.outputs
}

# ---------- Rede: apenas LEMOS a VPC default ----------
data "aws_vpc" "default" {
  default = true
}

# Duas subnets default em duas AZs (o ALB exige pelo menos 2 AZs)
data "aws_subnets" "selected" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
  filter {
    name   = "availability-zone"
    values = ["us-east-1a", "us-east-1b"]
  }
}

locals {
  subnet_ids = sort(data.aws_subnets.selected.ids)
}

# ---------- Imagem: Amazon Linux 2023 ----------
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

# ---------- Security group "web" das EC2 ----------
resource "aws_security_group" "web" {
  name_prefix = "nuvem-web-"
  description = "Chatbot Gemma: HTTP e SSH"
  vpc_id      = data.aws_vpc.default.id
}

# Arch A: porta 80 aberta para a internet
resource "aws_vpc_security_group_ingress_rule" "web_from_internet" {
  count             = var.use_alb ? 0 : 1
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

# Arch B: porta 80 aceita SOMENTE tráfego vindo do ALB
resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  count                        = var.use_alb ? 1 : 0
  security_group_id            = aws_security_group.web.id
  referenced_security_group_id = aws_security_group.alb[0].id
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
}

# SSH (A e B): só a partir do IP do aluno
resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = var.ssh_cidr
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "web_out" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# ---------- As instâncias ----------
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.al2023.id
  instance_type = var.instance_type
  subnet_id     = local.subnet_ids[count.index % length(local.subnet_ids)]
  # "web" abre 80/22; "app" é o crachá que libera o acesso ao RDS
  vpc_security_group_ids      = [aws_security_group.web.id, local.base.app_sg_id]
  associate_public_ip_address = true
  key_name                    = "vockey"             # par de chaves do Learner Lab (labsuser.pem)
  iam_instance_profile        = "LabInstanceProfile" # credenciais temporárias para ler o S3

  root_block_device {
    volume_size = 20 # GB: Ollama + modelo não cabem nos 8 GB padrão
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    model            = var.model
    num_parallel     = var.num_parallel
    history_messages = var.history_messages
    seed_users       = var.seed_users
    seed_password    = var.seed_password
    db_host          = local.base.db_host
    db_name          = local.base.db_name
    db_user          = local.base.db_user
    db_password      = local.base.db_password
    kb_bucket        = local.base.kb_bucket
    kb_key           = local.base.kb_key
    # código da aplicação, comprimido para caber no limite de 16 KB do user_data
    app_py_gz     = base64gzip(file("${path.module}/../../app/app.py"))
    index_html_gz = base64gzip(file("${path.module}/../../app/index.html"))
  })
  user_data_replace_on_change = true # mudou o código? a instância é recriada

  tags = {
    Name = "nuvem-web-${count.index + 1}"
  }
}
