#!/usr/bin/env python3
"""Lê os CSVs do k6 em resultados/ e gera uma tabela comparativa.

Uso: python3 analisar.py            -> imprime a tabela e grava resultados/tabela.csv

Só usa a biblioteca padrão do Python (não precisa instalar nada).
"""
import csv
import glob
import os
import re
import statistics

LINHAS = []


def percentil(valores, p):
    """Percentil por interpolação linear (p entre 0 e 100)."""
    v = sorted(valores)
    if not v:
        return float("nan")
    k = (len(v) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(v) - 1)
    return v[f] + (v[c] - v[f]) * (k - f)


for arquivo in sorted(glob.glob("resultados/*_r*/vus*.csv")):
    cenario, rep = re.search(r"resultados/(\w+?)_r(\d+)", arquivo).groups()
    vus = int(re.search(r"vus(\d+)\.csv$", arquivo).group(1))

    latencias, fila, prefill, geracao = [], [], [], []
    total_chat, erros = 0, 0
    t_min, t_max = None, None

    with open(arquivo, newline="") as f:
        for linha in csv.DictReader(f):
            nome, valor = linha["metric_name"], float(linha["metric_value"])
            if nome == "latencia_chat":
                latencias.append(valor)
            elif nome == "tempo_fila_e_rede":
                fila.append(valor)
            elif nome == "tempo_prefill":
                prefill.append(valor)
            elif nome == "tempo_geracao":
                geracao.append(valor)
            elif nome == "http_reqs" and linha.get("name") == "chat":
                total_chat += 1
                if linha.get("status") != "200":
                    erros += 1
                t = int(linha["timestamp"])
                t_min = t if t_min is None else min(t_min, t)
                t_max = t if t_max is None else max(t_max, t)

    if not latencias:
        continue
    duracao = max(1, (t_max - t_min)) if t_min is not None else 1
    media = statistics.mean(latencias)
    desvio = statistics.pstdev(latencias)
    LINHAS.append({
        "cenario": cenario, "rep": int(rep), "vus": vus, "n": len(latencias),
        "p50_s": percentil(latencias, 50) / 1000,
        "p95_s": percentil(latencias, 95) / 1000,
        "p99_s": percentil(latencias, 99) / 1000,
        "media_s": media / 1000,
        "desvio_s": desvio / 1000,
        "cv": desvio / media,                       # coeficiente de variação: menor = mais consistente
        "req_por_min": 60 * len(latencias) / duracao,
        "erros_pct": 100 * erros / total_chat if total_chat else 0.0,
        "fila_med_s": statistics.median(fila) / 1000 if fila else float("nan"),
        "prefill_med_s": statistics.median(prefill) / 1000 if prefill else float("nan"),
        "geracao_med_s": statistics.median(geracao) / 1000 if geracao else float("nan"),
    })

if not LINHAS:
    raise SystemExit("Nenhum CSV encontrado em resultados/*_r*/vus*.csv")

LINHAS.sort(key=lambda r: (r["cenario"], r["rep"], r["vus"]))
COLUNAS = list(LINHAS[0].keys())

with open("resultados/tabela.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLUNAS)
    w.writeheader()
    w.writerows(LINHAS)

print(" ".join(f"{c:>13}" for c in COLUNAS))
for r in LINHAS:
    print(" ".join(f"{r[c]:>13.2f}" if isinstance(r[c], float) else f"{r[c]:>13}" for c in COLUNAS))
print("\nTabela gravada em resultados/tabela.csv (abra no Excel/Google Sheets para os gráficos).")
