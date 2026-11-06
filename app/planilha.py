"""Gravação das planilhas: base histórica formatada e Excel do relatório."""
import io

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from . import config as C

LARGURAS = {"cliente": 38, "produto": 46, "historico": 60, "comentario": 46, "vendedor": 26, "operacao": 24,
            "arquivo": 34, "cidade": 20, "motivo": 22, "situacao_bling": 14, "status": 12}
MOEDA = {"valor", "vlr_unit", "vlr_item", "total_pedido", "frete", "desconto", "vlr_produtos", "seguro",
         "outras", "total_faturado", "total_nota", "vlr_total"}


def _formatar_aba(ws, cols: list, editaveis=()):
    cab = Font(bold=True, color="FFFFFF")
    for j, c in enumerate(cols, 1):
        cel = ws.cell(row=1, column=j)
        cel.font = cab
        cel.fill = PatternFill("solid", fgColor=C.VERDE if c in editaveis else C.AZUL)
        cel.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(j)].width = LARGURAS.get(c, 13)
        fmt = None
        if c in MOEDA:
            fmt = "#,##0.00"
        elif c == "qtd":
            fmt = "#,##0.##"
        elif c in ("ult_ocorrencia", "primeira_importacao", "ultima_atualizacao", "importado_em"):
            fmt = "dd/mm/yyyy hh:mm"
        elif c.startswith("dt_") or c == "data":
            fmt = "dd/mm/yyyy"
        if fmt:
            for row in ws.iter_rows(min_row=2, min_col=j, max_col=j):
                row[0].number_format = fmt
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "B2"
    if ws.max_row > 1:
        ws.auto_filter.ref = ws.dimensions


def gravar_base(base):
    from .base import COLS, EDITAVEIS
    with pd.ExcelWriter(base.caminho, engine="openpyxl") as xw:
        for aba, cols in COLS.items():
            df = base.t[aba][list(cols)].rename(columns=cols)
            df.to_excel(xw, sheet_name=aba, index=False)
            ws = xw.sheets[aba]
            _formatar_aba(ws, list(cols), EDITAVEIS if aba == "Propostas" else ())
            if aba == "Propostas" and len(df):
                j = list(cols).index("motivo") + 1
                letra = get_column_letter(j)
                dv = DataValidation(type="list", formula1='"' + ",".join(C.MOTIVOS) + '"', allow_blank=True,
                                    showErrorMessage=False)
                ws.add_data_validation(dv)
                dv.add(f"{letra}2:{letra}{len(df) + 500}")


def excel_relatorio(tabelas: dict) -> bytes:
    """tabelas: {nome_aba: DataFrame} -> bytes de um .xlsx formatado."""
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        for nome, df in tabelas.items():
            df.to_excel(xw, sheet_name=nome[:31], index=False)
            ws = xw.sheets[nome[:31]]
            for j, c in enumerate(df.columns, 1):
                cel = ws.cell(row=1, column=j)
                cel.font = Font(bold=True, color="FFFFFF")
                cel.fill = PatternFill("solid", fgColor=C.AZUL)
                larg = max([len(str(c))] + [len(str(v)) for v in df[c].head(200)]) + 2
                ws.column_dimensions[get_column_letter(j)].width = min(max(larg, 10), 60)
                if pd.api.types.is_float_dtype(df[c]):
                    nome = str(c)
                    if "%" in nome or "Variação" in nome or "Taxa" in nome:
                        fmt = "0.0%"
                    elif nome in ("Qtd", "Quantidade", "Notas", "Propostas", "Canceladas"):
                        fmt = "#,##0.##"
                    else:
                        fmt = '"R$" #,##0.00'
                    for row in ws.iter_rows(min_row=2, min_col=j, max_col=j):
                        row[0].number_format = fmt
                elif pd.api.types.is_datetime64_any_dtype(df[c]):
                    for row in ws.iter_rows(min_row=2, min_col=j, max_col=j):
                        row[0].number_format = "dd/mm/yyyy"
            if df.attrs.get("formatos"):  # formatos por linha (aba Indicadores)
                mapa = {"moeda": '"R$" #,##0.00', "pct": "0.0%", "dias": "#,##0.0", "int": "#,##0"}
                for i, f in enumerate(df.attrs["formatos"], 2):
                    for j in (2, 3, 4):  # A, B e diferença
                        ws.cell(row=i, column=j).number_format = mapa.get(f, "#,##0")
                    pp = '+0.0" p.p.";-0.0" p.p."'
                    ws.cell(row=i, column=4).number_format = (pp if f == "pct" else
                                                              "+" + mapa.get(f, "#,##0") + ";-" + mapa.get(f, "#,##0"))
                    ws.cell(row=i, column=5).number_format = pp if f == "pct" else "+0.0%;-0.0%"
                    for j in (4, 5):  # diferença de percentuais em pontos percentuais
                        if f == "pct" and ws.cell(row=i, column=j).value is not None:
                            ws.cell(row=i, column=j).value = ws.cell(row=i, column=j).value * 100
            ws.freeze_panes = "A2"
    return buf.getvalue()
