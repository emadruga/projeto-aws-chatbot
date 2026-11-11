#!/usr/bin/env python3
"""Gera uma planilha Excel (.xlsx) a partir de resultados/tabela.csv (a saída do analisar.py).

  - uma aba por repetição (ex.: A_rep1, A_rep2, A_rep3, B_rep1, ...) com os passos de cada uma;
  - uma aba final "Agregado" (as 3 repetições juntas, n = 48 por passo) com A x B lado a lado
    e gráficos comparativos nativos do Excel (editáveis): mediana (p50), p95 e vazão x usuários.

Uso:  python3 analisar.py                       # gera resultados/tabela.csv
      python3 gerar_planilha.py                 # gera resultados/resultados.xlsx (cenários A e B)
      python3 gerar_planilha.py A B1            # outros cenários (o primeiro é a referência das razões)

Precisa do pacote openpyxl (diferente do analisar.py, que usa só a biblioteca padrão):
      pip install openpyxl         (instalação por sistema: docs/ESCOPO_E_ATIVIDADES.md, seção 0.3)
O que discutir em cada parte da planilha: docs/ESCOPO_E_ATIVIDADES.md, seção 4.5.
"""
import csv
import os
import sys

from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultados")
CSV_ENTRADA = os.path.join(PASTA, "tabela.csv")
XLSX_SAIDA = os.path.join(PASTA, "resultados.xlsx")

# coluna do CSV -> (título na planilha, formato do número)
COLUNAS = [
    ("vus", "Usuários", "0"),
    ("n", "n (respostas)", "0"),
    ("p50_s", "p50 (s)", "0.0"),
    ("p95_s", "p95 (s)", "0.0"),
    ("p99_s", "p99 (s)", "0.0"),
    ("media_s", "Média (s)", "0.0"),
    ("desvio_s", "Desvio-padrão (s)", "0.0"),
    ("cv", "CV", "0.00"),
    ("req_por_min", "Resp/min", "0.00"),
    ("erros_pct", "Erros (%)", "0.0"),
    ("fila_med_s", "Fila mediana (s)", "0.0"),
    ("prefill_med_s", "Prefill mediano (s)", "0.0"),
    ("geracao_med_s", "Geração mediana (s)", "0.0"),
]
CORES = ["1F77B4", "E8710A", "2CA02C", "7F7F7F"]  # A azul, B laranja, ...
CABECALHO = PatternFill("solid", fgColor="DDE6F0")
NEGRITO = Font(bold=True)


def ler_tabela(caminho):
    """Lê o tabela.csv e devolve {(cenario, rep): [linhas ordenadas por usuários]}, com números convertidos."""
    dados = {}
    with open(caminho, newline="", encoding="utf-8") as f:
        for linha in csv.DictReader(f):
            for chave in list(linha):
                if chave != "cenario":
                    linha[chave] = float(linha[chave])
            dados.setdefault((linha["cenario"], int(linha["rep"])), []).append(linha)
    for linhas in dados.values():
        linhas.sort(key=lambda r: r["vus"])
    return dados


def escrever_tabela(aba, linhas, lin0, col0=1):
    """Escreve o cabeçalho e as linhas a partir de (lin0, col0). Devolve a próxima linha livre."""
    for j, (_, titulo, _) in enumerate(COLUNAS):
        c = aba.cell(row=lin0, column=col0 + j, value=titulo)
        c.font, c.fill = NEGRITO, CABECALHO
        c.alignment = Alignment(horizontal="center", wrap_text=True)
    for i, linha in enumerate(linhas, start=1):
        for j, (chave, _, formato) in enumerate(COLUNAS):
            c = aba.cell(row=lin0 + i, column=col0 + j, value=linha[chave])
            c.number_format = formato
    return lin0 + len(linhas) + 1


def ajustar_larguras(aba, largura=14):
    for col in range(1, aba.max_column + 1):
        aba.column_dimensions[get_column_letter(col)].width = largura


def aba_repeticao(wb, cenario, rep, linhas):
    aba = wb.create_sheet(f"{cenario}_rep{rep}")
    aba["A1"] = f"Cenário {cenario}, repetição {rep}"
    aba["A1"].font = Font(bold=True, size=13)
    aba["A2"] = "Um passo = N usuários simultâneos, n = 16 respostas. Fonte: resultados/tabela.csv (analisar.py)."
    escrever_tabela(aba, linhas, 4)
    ajustar_larguras(aba)
    aba.row_dimensions[4].height = 32
    return aba


def grafico(aba, titulo, eixo_y, col_dados, lin_cab, n_passos, cenarios, ancora):
    """Gráfico de linhas: uma linha por cenário, eixo X = usuários (coluna A da tabela de gráfico)."""
    g = LineChart()
    g.title, g.height, g.width = titulo, 8.5, 15
    g.y_axis.title, g.x_axis.title = eixo_y, "Usuários simultâneos"
    g.y_axis.delete = g.x_axis.delete = False  # versões novas do Excel/openpyxl escondem os eixos sem isto
    g.y_axis.scaling.min = 0
    g.legend.position = "b"
    for k, cenario in enumerate(cenarios):
        col = col_dados + k
        g.add_data(Reference(aba, min_col=col, min_row=lin_cab, max_row=lin_cab + n_passos), titles_from_data=True)
        s = g.series[-1]
        s.graphicalProperties.line.solidFill = CORES[k % len(CORES)]
        s.graphicalProperties.line.width = 28000
        s.marker.symbol = "circle"
        s.marker.size = 7
        s.marker.graphicalProperties.solidFill = CORES[k % len(CORES)]
        s.marker.graphicalProperties.line.solidFill = CORES[k % len(CORES)]
        s.smooth = False
    g.set_categories(Reference(aba, min_col=1, min_row=lin_cab + 1, max_row=lin_cab + n_passos))
    aba.add_chart(g, ancora)


def aba_agregado(wb, dados, cenarios):
    aba = wb.create_sheet("Agregado")
    aba["A1"] = "Agregado: as repetições juntas (n = 48 por passo), " + " x ".join(cenarios)
    aba["A1"].font = Font(bold=True, size=13)
    aba["A2"] = "Percentis calculados sobre todas as respostas das 3 repetições (linha rep = 0 do analisar.py)."

    # 1) tabela de cada cenário
    lin = 4
    for cenario in cenarios:
        aba.cell(row=lin, column=1, value=f"Cenário {cenario}").font = Font(bold=True, size=12)
        lin = escrever_tabela(aba, dados[(cenario, 0)], lin + 1) + 1

    # 2) tabela para os gráficos: usuários x (p50, p95, vazão) de cada cenário
    ref = cenarios[0]
    passos = [int(r["vus"]) for r in dados[(ref, 0)]]
    aba.cell(row=lin, column=1, value="Dados dos gráficos").font = Font(bold=True, size=12)
    lin += 1
    blocos = [("p50 (s)", "p50_s", "0.0"), ("p95 (s)", "p95_s", "0.0"), ("Resp/min", "req_por_min", "0.00")]
    cab = lin
    aba.cell(row=cab, column=1, value="Usuários")
    col = 2
    inicio_bloco = {}
    for titulo, chave, formato in blocos:
        inicio_bloco[chave] = col
        for cenario in cenarios:
            aba.cell(row=cab, column=col, value=f"{cenario} {titulo}")
            for i, p in enumerate(passos, start=1):
                linha = next(r for r in dados[(cenario, 0)] if int(r["vus"]) == p)
                aba.cell(row=cab + i, column=col, value=linha[chave]).number_format = formato
            col += 1
    for i, p in enumerate(passos, start=1):
        aba.cell(row=cab + i, column=1, value=p)
    for c in range(1, col):
        x = aba.cell(row=cab, column=c)
        x.font, x.fill, x.alignment = NEGRITO, CABECALHO, Alignment(horizontal="center", wrap_text=True)
    lin = cab + len(passos) + 2

    # 3) razões entre o cenário de referência e os demais (quantas vezes menor/maior)
    for outro in cenarios[1:]:
        aba.cell(row=lin, column=1, value=f"{ref} ÷ {outro} (quantas vezes {outro} é melhor; vazão: {outro} ÷ {ref})").font = NEGRITO
        titulos = ["Usuários", "p50", "p95", "Desvio-padrão", "Vazão"]
        for j, t in enumerate(titulos, start=1):
            c = aba.cell(row=lin + 1, column=j, value=t)
            c.font, c.fill, c.alignment = NEGRITO, CABECALHO, Alignment(horizontal="center")
        for i, p in enumerate(passos, start=1):
            a = next(r for r in dados[(ref, 0)] if int(r["vus"]) == p)
            b = next(r for r in dados[(outro, 0)] if int(r["vus"]) == p)
            valores = [p, a["p50_s"] / b["p50_s"], a["p95_s"] / b["p95_s"], a["desvio_s"] / b["desvio_s"],
                       b["req_por_min"] / a["req_por_min"]]
            for j, v in enumerate(valores, start=1):
                c = aba.cell(row=lin + 1 + i, column=j, value=v)
                c.number_format = "0" if j == 1 else '0.00"×"'
        lin += len(passos) + 3

    # 4) variação entre repetições do p95 (mínimo e máximo), para ver se as barras se sobrepõem
    aba.cell(row=lin, column=1, value="p95 por repetição: mínimo e máximo (s)").font = NEGRITO
    cab2 = lin + 1
    titulos = ["Usuários"]
    for cenario in cenarios:
        titulos += [f"{cenario} mín", f"{cenario} máx"]
    for j, t in enumerate(titulos, start=1):
        c = aba.cell(row=cab2, column=j, value=t)
        c.font, c.fill, c.alignment = NEGRITO, CABECALHO, Alignment(horizontal="center")
    for i, p in enumerate(passos, start=1):
        aba.cell(row=cab2 + i, column=1, value=p)
        for k, cenario in enumerate(cenarios):
            v = [r["p95_s"] for (c, rep), ls in dados.items() if c == cenario and rep != 0 for r in ls if int(r["vus"]) == p]
            aba.cell(row=cab2 + i, column=2 + 2 * k, value=min(v)).number_format = "0.0"
            aba.cell(row=cab2 + i, column=3 + 2 * k, value=max(v)).number_format = "0.0"
    ajustar_larguras(aba)
    aba.row_dimensions[cab].height = 32

    # gráficos à direita das tabelas
    n = len(passos)
    grafico(aba, "Mediana (p50) × usuários", "segundos", inicio_bloco["p50_s"], cab, n, cenarios, "P4")
    grafico(aba, "p95 × usuários", "segundos", inicio_bloco["p95_s"], cab, n, cenarios, "P22")
    grafico(aba, "Vazão × usuários", "respostas por minuto", inicio_bloco["req_por_min"], cab, n, cenarios, "P40")
    return aba


def main():
    cenarios = sys.argv[1:] or ["A", "B"]
    if not os.path.exists(CSV_ENTRADA):
        sys.exit(f"ERRO: {CSV_ENTRADA} não existe. Rode antes: python3 analisar.py")
    dados = ler_tabela(CSV_ENTRADA)
    faltam = [c for c in cenarios if (c, 0) not in dados]
    if faltam:
        sys.exit(f"ERRO: sem resultados agregados para {faltam} em {CSV_ENTRADA}")

    wb = Workbook()
    wb.remove(wb.active)
    for cenario in cenarios:
        for rep in sorted(r for (c, r) in dados if c == cenario and r != 0):
            aba_repeticao(wb, cenario, rep, dados[(cenario, rep)])
    aba_agregado(wb, dados, cenarios)
    wb.active = len(wb.sheetnames) - 1  # abre na aba final
    wb.save(XLSX_SAIDA)
    print(f"Planilha gravada em {XLSX_SAIDA}")
    print("Abas:", ", ".join(wb.sheetnames))


if __name__ == "__main__":
    main()
