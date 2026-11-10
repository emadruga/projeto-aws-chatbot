# ============================================================
# PREFIXO DOS RECURSOS = nome do aluno
# Todo recurso criado (EC2, ALB, banco, bucket, security groups) começa com este prefixo.
# Assim, no console e na cobrança, cada aluno reconhece o que é seu.
#
# De onde vem o nome: do "aws sts get-caller-identity". No Learner Lab o ARN termina assim:
#   .../voclabs/user1234567=_Student_View__Maria_Silva
# Pegamos o que vem depois de "__" ("Maria_Silva") e montamos "maria-silva"
# (primeiro e último nome, minúsculas, sem acento, só letras, números e hífen).
# Se o nome ficar grande demais (ALB e target group aceitam 32 caracteres), usamos só o primeiro nome.
# Se o ARN não tiver esse formato, o prefixo vira "aluno".
# Para escolher você mesmo: terraform apply -var prefixo=meu-nome
# ============================================================

data "aws_caller_identity" "atual" {}

locals {
  # última parte do ARN: "user1234567=_Student_View__Maria_Silva"
  arn_partes = split("/", data.aws_caller_identity.atual.arn)
  sessao     = local.arn_partes[length(local.arn_partes) - 1]

  # "Maria_Silva" -> minúsculas, sem acento, sem símbolos
  nome_bruto = lower(try(regex("__(.+)$", local.sessao)[0], ""))
  nome_limpo = replace(
    replace(
      replace(
        replace(
          replace(
            replace(local.nome_bruto, "/[áàâãä]/", "a"),
          "/[éèêë]/", "e"),
        "/[íìîï]/", "i"),
      "/[óòôõö]/", "o"),
    "/[úùûü]/", "u"),
  "/ç/", "c")
  palavras = [for p in split("_", replace(local.nome_limpo, "/[^a-z0-9_]/", "")) : p if p != ""]

  nome_completo = length(local.palavras) > 1 ? "${local.palavras[0]}-${local.palavras[length(local.palavras) - 1]}" : try(local.palavras[0], "aluno")
  nome_auto     = length(local.nome_completo) <= 28 ? local.nome_completo : substr(local.palavras[0], 0, 28)

  prefixo = var.prefixo != "" ? var.prefixo : local.nome_auto
}
