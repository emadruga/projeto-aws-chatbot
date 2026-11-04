# Recursos do ALB: só existem quando use_alb = true (Arch B)

resource "aws_security_group" "alb" {
  count       = var.use_alb ? 1 : 0
  name_prefix = "nuvem-alb-"
  description = "ALB do chatbot"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_in" {
  count             = var.use_alb ? 1 : 0
  security_group_id = aws_security_group.alb[0].id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb_out" {
  count             = var.use_alb ? 1 : 0
  security_group_id = aws_security_group.alb[0].id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_lb" "app" {
  count              = var.use_alb ? 1 : 0
  name               = "nuvem-alb"
  load_balancer_type = "application"
  subnets            = local.subnet_ids
  security_groups    = [aws_security_group.alb[0].id]
  idle_timeout       = 1200 # padrão é 60 s; respostas do LLM sob carga podem demorar mais
}

resource "aws_lb_target_group" "app" {
  count    = var.use_alb ? 1 : 0
  name     = "nuvem-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    path                = "/" # a aplicação só sobe quando o modelo já está pronto
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }
}

resource "aws_lb_listener" "http" {
  count             = var.use_alb ? 1 : 0
  load_balancer_arn = aws_lb.app[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

resource "aws_lb_target_group_attachment" "web" {
  count            = var.use_alb ? var.instance_count : 0
  target_group_arn = aws_lb_target_group.app[0].arn
  target_id        = aws_instance.web[count.index].id
  port             = 80
}
