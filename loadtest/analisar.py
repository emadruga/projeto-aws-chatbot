#!/usr/bin/env python3
"""Lê os CSVs do k6 em resultados/ e gera uma tabela comparativa.
A linha com rep = 0 junta as respostas de todas as repetições (mais amostras, percentis mais confiáveis).

Uso: python3 analisar.py            -> imprime a tabela e grava resultados/tabela.csv

Só usa a biblioteca padrão do Python (não precisa instalar nada).
"""
import csv
import glob
import os
import re
import statistics

LINHAS = []
POOL = {}  # (cenario, vus) -> respostas de todas as repetições juntas


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
    g = POOL.setdefault((cenario, vus), {"lat": [], "fila": [], "pre": [], "ger": [], "chat": 0, "erros": 0, "rpm": []})
    g["lat"] += latencias; g["fila"] += fila; g["pre"] += prefill; g["ger"] += geracao
    g["chat"] += total_chat; g["erros"] += erros; g["rpm"].append(60 * len(latencias) / duracao)
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

# Linha agregada (rep = 0): junta as respostas de todas as repetições do mesmo cenário e número de usuários.
# Os percentis sobre o conjunto são mais confiáveis que os de cada repetição, porque o n é maior.
for (cenario, vus), g in sorted(POOL.items()):
    if len(g["rpm"]) < 2:
        continue  # só uma repetição: não há o que agregar
    lat = g["lat"]
    m, d = statistics.mean(lat), statistics.pstdev(lat)
    LINHAS.append({
        "cenario": cenario, "rep": 0, "vus": vus, "n": len(lat),
        "p50_s": percentil(lat, 50) / 1000, "p95_s": percentil(lat, 95) / 1000,
        "p99_s": percentil(lat, 99) / 1000, "media_s": m / 1000, "desvio_s": d / 1000, "cv": d / m,
        "req_por_min": statistics.mean(g["rpm"]),
        "erros_pct": 100 * g["erros"] / g["chat"] if g["chat"] else 0.0,
        "fila_med_s": statistics.median(g["fila"]) / 1000 if g["fila"] else float("nan"),
        "prefill_med_s": statistics.median(g["pre"]) / 1000 if g["pre"] else float("nan"),
        "geracao_med_s": statistics.median(g["ger"]) / 1000 if g["ger"] else float("nan"),
    })

LINHAS.sort(key=lambda r: (r["cenario"], r["rep"], r["vus"]))
COLUNAS = list(LINHAS[0].keys())

with open("resultados/tabela.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLUNAS)
    w.writeheader()
    w.writerows(LINHAS)

print(" ".join(f"{c:>13}" for c in COLUNAS))
for r in LINHAS:
    print(" ".join(f"{r[c]:>13.2f}" if isinstance(r[c], float) else f"{r[c]:>13}" for c in COLUNAS))

# Avisos para quem lê a tabela. Com várias repetições, vale o n da linha agregada (rep = 0).
agregadas = [r for r in LINHAS if r["rep"] == 0]
N_MIN = 30 if agregadas else 20  # abaixo disso, p95 e p99 são pouco confiáveis
pequenos = [r for r in (agregadas or LINHAS) if r["n"] < N_MIN]
if pequenos:
    print(f"\nAVISO: n < {N_MIN} (p95 e p99 são só indicativos) em:")
    for r in pequenos:
        quem = "todas as repetições" if r["rep"] == 0 else f"repetição {r['rep']}"
        print(f"  {r['cenario']} {quem}, {r['vus']} usuário(s): n = {r['n']}")
com_erro = [r for r in LINHAS if r["erros_pct"] > 0]
if com_erro:
    print("\nERROS por passo (em passos com 1 ou 2 usuários, descarte a repetição; veja o plano, seção 7):")
    for r in com_erro:
        print(f"  {r['cenario']} repetição {r['rep']}, {r['vus']} usuário(s): {r['erros_pct']:.1f}% de erros")
else:
    print("\nErros: nenhum passo teve requisição de chat com erro.")
print("\nTabela gravada em resultados/tabela.csv (abra no Excel/Google Sheets para os gráficos).")
