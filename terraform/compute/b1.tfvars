# Arquitetura B1: ALB + 1 EC2 (isola o overhead do ALB)
instance_count = 1          # número de EC2 (parâmetro: pode trocar, ex.: -var instance_count=4)
instance_type  = "m5.large" # tipo de TODAS as EC2: use o mesmo em A e B (nano a large no Learner Lab)
use_alb        = true
ssh_cidr       = "SEU.IP.PUBLICO/32" # troque pelo seu IP (curl ifconfig.me) e mantenha o /32
