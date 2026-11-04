#!/bin/bash
# Roda a rampa completa (1, 2, 4, 8, 16 usuários) contra um cenário.
# Uso: ./rodar_cenario.sh <CENARIO> <REPETICAO> <URL>
#   ex.: ./rodar_cenario.sh A 1 http://3.88.10.20
#        ./rodar_cenario.sh B 2 http://nuvem-alb-123.us-east-1.elb.amazonaws.com
# Variáveis opcionais: SENHA (senha dos alunoNN), DURACAO (por passo, padrão 3m), AQUECIMENTO (padrão 1m),
#                      PASSOS (padrão "1 2 4 8 16"), PAUSA (s entre passos, padrão 30)
set -euo pipefail

CENARIO=$1; REP=$2; URL=$3
SENHA=${SENHA:-trocar-esta-senha}
DURACAO=${DURACAO:-3m}
PASSOS=${PASSOS:-"1 2 4 8 16"}
PAUSA=${PAUSA:-30}
AQUECIMENTO=${AQUECIMENTO:-1m}
OUT=resultados/${CENARIO}_r${REP}
mkdir -p "$OUT"

echo "== Aquecimento (2 usuários, $AQUECIMENTO) — não entra na análise"
k6 run --quiet -e URL="$URL" -e SENHA="$SENHA" -e VUS=2 -e DURACAO="$AQUECIMENTO" carga.js > /dev/null

for VUS in $PASSOS; do
  sleep "$PAUSA" # deixa o servidor esvaziar a fila antes do próximo passo
  echo "== Cenário $CENARIO, repetição $REP: $VUS usuário(s) por $DURACAO  [$(date +%H:%M:%S)]"
  k6 run --quiet \
    -e URL="$URL" -e SENHA="$SENHA" -e VUS="$VUS" -e DURACAO="$DURACAO" \
    --out csv="$OUT/vus${VUS}.csv" \
    --summary-export "$OUT/vus${VUS}_resumo.json" \
    carga.js
done

echo "== Fim. Resultados em $OUT/"
