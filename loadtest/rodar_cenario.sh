#!/bin/bash
# Roda a rampa de concorrência (1, 4 e 16 usuários) contra um cenário, sempre com o MESMO número de
# respostas por passo (N). Cada usuário envia N ÷ usuários perguntas: 1 usuário envia 16, 4 enviam 4 cada,
# 16 enviam 1 cada. Assim todos os passos têm o mesmo n (precisão estatística igual) e o tempo de cada
# passo é previsível. Usado igualmente em A e em B.
# Uso: ./rodar_cenario.sh <CENARIO> <REPETICAO> <URL>
#   ex.: ./rodar_cenario.sh A 1 http://3.88.10.20
#        ./rodar_cenario.sh B 2 http://nuvem-alb-123.us-east-1.elb.amazonaws.com
# Variáveis opcionais: SENHA (senha dos alunoNN), N (respostas por passo, padrão 16),
#                      PASSOS (padrão "1 4 16"; cada valor deve dividir N), PAUSA (s entre passos, padrão 30),
#                      AQUECIMENTO (padrão 30s)
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "Uso: $0 <CENARIO> <REPETICAO> <URL>   ex.: $0 A 1 http://3.88.10.20" >&2; exit 1
fi
CENARIO=$1; REP=$2; URL=$3
# A repetição é um número (1, 2, 3...). Evita pastas como A_rR, que o analisar.py ignora.
if ! [[ "$REP" =~ ^[0-9]+$ ]]; then
  echo "ERRO: a repetição deve ser um número (1, 2, 3...), e não '$REP'." >&2; exit 1
fi
SENHA=${SENHA:-trocar-esta-senha}
N=${N:-16}
PASSOS=${PASSOS:-"1 4 16"}
PAUSA=${PAUSA:-30}
AQUECIMENTO=${AQUECIMENTO:-30s}

# Cada passo precisa de N ÷ usuários inteiro, senão o n não seria igual nos passos.
for VUS in $PASSOS; do
  if [ $(( N % VUS )) -ne 0 ]; then
    echo "ERRO: $VUS usuários não divide N=$N. Use passos que dividam N (ex.: N=16, passos 1 4 16)." >&2; exit 1
  fi
done

OUT=resultados/${CENARIO}_r${REP}
mkdir -p "$OUT"

echo "== Aquecimento (2 usuários, $AQUECIMENTO) — não entra na análise  [$(date +%H:%M:%S)]"
echo "   Pode levar vários minutos: o k6 espera as respostas em andamento terminarem."
k6 run --quiet -e URL="$URL" -e SENHA="$SENHA" -e VUS=2 -e DURACAO="$AQUECIMENTO" carga.js > "$OUT/aquecimento.log"
echo "   Aquecimento concluído  [$(date +%H:%M:%S)]"

for VUS in $PASSOS; do
  ITER=$(( N / VUS ))
  sleep "$PAUSA" # deixa o servidor esvaziar a fila antes do próximo passo
  echo "== Cenário $CENARIO, repetição $REP: $VUS usuário(s) × $ITER pergunta(s) = $N respostas  [$(date +%H:%M:%S)]"
  k6 run --quiet \
    -e URL="$URL" -e SENHA="$SENHA" -e VUS="$VUS" -e ITERACOES="$ITER" \
    --out csv="$OUT/vus${VUS}.csv" \
    --summary-export "$OUT/vus${VUS}_resumo.json" \
    carga.js
done

echo "== Fim. Resultados em $OUT/"
