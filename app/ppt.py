"""Geração do PowerPoint (python-pptx) com a identidade da Blocos Cabral.

Gráficos são nativos do PowerPoint (editáveis); valores em R$ aparecem em milhares nos gráficos.
"""
import io
from datetime import date

import pandas as pd
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

from . import config as C
from .metricas import TODOS, Relatorio
from .utils import fmt_data, fmt_moeda, fmt_moeda_curta, fmt_num, fmt_pct, fmt_qtd, fmt_sinal

SW, SH = 960, 540          # pontos (16:9)
M = 40                     # margem
CINZA_TXT = "787878"


def _rgb(h):
    return RGBColor.from_string(h)


def _pt(v):
    return Emu(int(v * 12700))


class Deck:
    def __init__(self, rel: Relatorio):
        self.rel = rel
        self.prs = Presentation()
        self.prs.slide_width, self.prs.slide_height = _pt(SW), _pt(SH)
        self.layout = self.prs.slide_layouts[6]  # em branco
        self.rotulo = rel.p.rotulo + ("" if rel.filtro == TODOS else f"  ·  {rel.filtro}")

    # ------------------------------------------------------------ primitivas

    def texto(self, s, txt, l, t, w, h, tam=12, negrito=False, cor=C.GRAFITE, alin=PP_ALIGN.LEFT, quebra=True):
        tb = s.shapes.add_textbox(_pt(l), _pt(t), _pt(w), _pt(h))
        tf = tb.text_frame
        tf.word_wrap = quebra
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = alin
        r = p.add_run()
        r.text = str(txt)
        r.font.name, r.font.size, r.font.bold = "Arial", Pt(tam), negrito
        r.font.color.rgb = _rgb(cor)
        return tb

    def retangulo(self, s, l, t, w, h, cor):
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, _pt(l), _pt(t), _pt(w), _pt(h))
        r.fill.solid()
        r.fill.fore_color.rgb = _rgb(cor)
        r.line.fill.background()
        r.shadow.inherit = False
        return r

    def slide(self, titulo, subtitulo=""):
        s = self.prs.slides.add_slide(self.layout)
        n = len(self.prs.slides)
        self.retangulo(s, 0, 0, SW, 8, C.AZUL)
        tam = 24 if len(titulo) <= 40 else (20 if len(titulo) <= 48 else 17)  # título sempre em uma linha
        self.texto(s, titulo, M, 24 + (24 - tam) / 2, 620, 36, tam, True, C.AZUL, quebra=False)
        self.texto(s, self.rotulo, SW - M - 320, 32, 320, 20, 12, False, CINZA_TXT, PP_ALIGN.RIGHT)
        if subtitulo:
            self.texto(s, subtitulo, M, 66, SW - 2 * M, 20, 13)
        ln = s.shapes.add_connector(1, _pt(M), _pt(SH - 36), _pt(SW - M), _pt(SH - 36))
        ln.line.color.rgb = _rgb(C.CINZA)
        self.texto(s, f"Blocos Cabral · Relatório de Vendas · {self.rotulo}", M, SH - 30, 600, 16, 9, cor="828282")
        self.texto(s, str(n), SW - M - 30, SH - 30, 30, 16, 9, cor="828282", alin=PP_ALIGN.RIGHT)
        if C.LOGO.exists():
            s.shapes.add_picture(str(C.LOGO), _pt(SW - M - 160), _pt(SH - 31), height=_pt(20))
        return s

    def tabela(self, s, df: pd.DataFrame, fmts: dict, larguras: list, l=M, t=84, max_linhas=12, tam=None,
               cores_celulas=None):
        """cores_celulas: {(linha, coluna): cor} para colorir o texto de células específicas (linha 0 = 1º registro)."""
        df = self.rel.renomear(df.head(max_linhas))
        fmts = {self.rel.renomear(pd.DataFrame(columns=[c])).columns[0]: f for c, f in fmts.items()}
        if df.empty:
            self.texto(s, "Sem registros no período.", M, 220, SW - 2 * M, 30, 16, cor=CINZA_TXT, alin=PP_ALIGN.CENTER)
            return
        nl, nc = len(df) + 1, len(df.columns)
        shp = s.shapes.add_table(nl, nc, _pt(l), _pt(t), _pt(sum(larguras)), _pt(22 * nl))
        tb = shp.table
        tam = tam or (10 if nl > 11 else 11)
        for j, w in enumerate(larguras):
            tb.columns[j].width = _pt(w)
        for i in range(nl):
            tb.rows[i].height = _pt(20)
            for j, col in enumerate(df.columns):
                cel = tb.cell(i, j)
                f = fmts.get(col, "t")
                if i == 0:
                    txt = col
                else:
                    txt = _formatar(df.iloc[i - 1, j], f)
                cel.margin_left = cel.margin_right = _pt(5)
                cel.margin_top = cel.margin_bottom = _pt(2)
                cel.vertical_anchor = MSO_ANCHOR.MIDDLE
                cel.fill.solid()
                cel.fill.fore_color.rgb = _rgb(C.AZUL if i == 0 else (C.CINZA_CLARO if i % 2 == 0 else "FFFFFF"))
                p = cel.text_frame.paragraphs[0]
                p.alignment = PP_ALIGN.LEFT if f == "t" else PP_ALIGN.RIGHT
                p.font.size = Pt(tam)  # vale também para células vazias (altura da linha)
                r = p.add_run()
                r.text = txt
                r.font.name, r.font.size, r.font.bold = "Arial", Pt(tam), i == 0
                cor = "FFFFFF" if i == 0 else C.GRAFITE
                if i > 0 and f in ("v", "dm") and txt and txt not in ("0,0%", "R$ 0,00"):
                    cor = C.VERMELHO if txt.startswith("-") else C.VERDE
                if i > 0 and cores_celulas and (i - 1, col) in cores_celulas:
                    cor = cores_celulas[(i - 1, col)]
                r.font.color.rgb = _rgb(cor)

    def grafico(self, s, categorias, series: dict, l, t, w, h, tipo="col", cores=None, mil=True, legenda=False,
                cores_pontos=None):
        cd = CategoryChartData()
        cd.categories = [str(c) for c in categorias]
        for nome, vals in series.items():
            cd.add_series(nome, [round(float(v) / 1000, 1) if mil else float(v) for v in vals])
        ct = XL_CHART_TYPE.COLUMN_CLUSTERED if tipo == "col" else XL_CHART_TYPE.BAR_CLUSTERED
        ch = s.shapes.add_chart(ct, _pt(l), _pt(t), _pt(w), _pt(h), cd).chart
        ch.font.name, ch.font.size = "Arial", Pt(10)
        ch.has_title = False
        ch.has_legend = legenda
        if legenda:
            ch.legend.position = XL_LEGEND_POSITION.TOP
            ch.legend.include_in_layout = False
        cores = cores or [C.AZUL, C.CINZA, C.VERDE]
        plot = ch.plots[0]
        plot.gap_width = 60
        plot.overlap = -10 if len(series) > 1 else 0
        for i, ser in enumerate(plot.series):
            ser.format.fill.solid()
            ser.format.fill.fore_color.rgb = _rgb(cores[i % len(cores)])
            ser.invert_if_negative = False
        if cores_pontos:
            for k, cor in enumerate(cores_pontos[:len(categorias)]):
                pt_ = plot.series[0].points[k]
                pt_.format.fill.solid()
                pt_.format.fill.fore_color.rgb = _rgb(cor)
        plot.has_data_labels = True
        dl = plot.data_labels
        dl.number_format = "#,##0;-#,##0;;" if mil else "#,##0;-#,##0;0"
        dl.number_format_is_linked = False
        dl.font.size = Pt(9 if len(categorias) > 12 else 10)
        dl.position = XL_LABEL_POSITION.OUTSIDE_END
        va = ch.value_axis
        va.has_major_gridlines = True
        va.major_gridlines.format.line.color.rgb = _rgb("E6E6E6")
        va.tick_labels.font.size = Pt(9)
        va.tick_labels.number_format = "#,##0"
        va.tick_labels.number_format_is_linked = False
        va.format.line.fill.background()
        maior = max([float(v) for vals in series.values() for v in vals] or [0])
        if not mil and maior < 10:
            va.major_unit = 1
        ca = ch.category_axis
        ca.tick_labels.font.size = Pt(9 if len(categorias) > 12 else 10)
        ca.format.line.color.rgb = _rgb(C.CINZA)
        if tipo == "bar":
            ca.reverse_order = True
        if any(float(v) < 0 for vals in series.values() for v in vals):
            from pptx.enum.chart import XL_TICK_LABEL_POSITION
            ca.tick_label_position = XL_TICK_LABEL_POSITION.LOW
        if mil:
            self.texto(s, "valores em R$ mil", l, t - 14, 200, 12, 9, cor=CINZA_TXT)
        return ch

    def linha(self, s, categorias, series: dict, l, t, w, h, cores, tracejado=()):
        """Gráfico de linhas (valores em R$ mil); dias sem dados ficam vazios."""
        cd = CategoryChartData()
        cd.categories = [str(c) for c in categorias]
        for nome, vals in series.items():
            cd.add_series(nome, [None if v is None or v != v else round(float(v) / 1000, 1) for v in vals])
        ch = s.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS if len(categorias) <= 31 else XL_CHART_TYPE.LINE,
                                _pt(l), _pt(t), _pt(w), _pt(h), cd).chart
        ch.font.name, ch.font.size = "Arial", Pt(10)
        ch.has_title = False
        ch.has_legend = True
        ch.legend.position = XL_LEGEND_POSITION.TOP
        ch.legend.include_in_layout = False
        for i, ser in enumerate(ch.plots[0].series):
            ser.smooth = False
            ser.format.line.color.rgb = _rgb(cores[i])
            ser.format.line.width = Pt(2.5)
            if i in tracejado:
                from pptx.enum.dml import MSO_LINE_DASH_STYLE
                ser.format.line.dash_style = MSO_LINE_DASH_STYLE.DASH
            if len(categorias) <= 31:
                ser.marker.size = 5
                ser.marker.format.fill.solid()
                ser.marker.format.fill.fore_color.rgb = _rgb(cores[i])
                ser.marker.format.line.color.rgb = _rgb(cores[i])
        va = ch.value_axis
        va.has_major_gridlines = True
        va.major_gridlines.format.line.color.rgb = _rgb("E6E6E6")
        va.tick_labels.font.size = Pt(9)
        va.tick_labels.number_format = "#,##0"
        va.tick_labels.number_format_is_linked = False
        va.format.line.fill.background()
        ca = ch.category_axis
        ca.tick_labels.font.size = Pt(9)
        ca.format.line.color.rgb = _rgb(C.CINZA)
        self.texto(s, "valores em R$ mil", l, t - 14, 200, 12, 9, cor=CINZA_TXT)
        return ch

    def _delta(self, k):
        """(texto, cor) da variação de um KPI: verde/vermelho conforme subir ser bom ou ruim."""
        d = k.delta
        if not self.rel.compara:
            return "", "828282"
        if self.rel.cobertura_b == "nenhuma":
            return "sem dados para comparar", "828282"
        if d is None or (k.formato != "pct" and not k.anterior and not k.atual):
            return "sem movimento", "828282"
        seta = "▲" if d > 0 else ("▼" if d < 0 else "■")
        if k.formato == "pct":
            txt = f"{seta} {'+' if d > 0 else ''}{fmt_num(d * 100, 1)} p.p."
        else:
            abs_ = _fmt_delta(d, k.formato, curto=True)
            txt = f"{seta} {fmt_pct(k.variacao, sinal=True)}  ({abs_})" if k.variacao is not None else f"{seta} {abs_}"
        return txt, {True: C.VERDE, False: C.VERMELHO, None: "828282"}[k.melhorou]

    def cartao_destaque(self, s, l, t, w, h, k):
        r = self.rel
        self.retangulo(s, l, t, w, h, C.CINZA_CLARO)
        self.retangulo(s, l, t, 5, h, C.AZUL)
        val = _fmt_kpi(k.atual, k.formato)
        self.texto(s, k.nome, l + 16, t + 10, w - 26, 16, 11, cor="5A5A5A")
        self.texto(s, val, l + 16, t + 28, w - 24, 30, 20 if len(val) > 14 else 24, True, C.AZUL)
        if not r.compara:
            return
        txt, cor = self._delta(k)
        self.texto(s, txt, l + 16, t + 62, w - 24, 16, 11, True, cor)
        linhas = [(r.nome_a, k.atual, C.AZUL)]
        if r.cobertura_b != "nenhuma":
            linhas.append((r.nome_b, k.anterior, C.CINZA))
        maior = max(abs(k.atual or 0), abs(k.anterior or 0)) or 1
        trilho_l, trilho_w = l + 16 + 96, w - 16 - 96 - 70
        for j, (rot, v, cb) in enumerate(linhas):
            y = t + 84 + j * 15
            self.texto(s, rot, l + 16, y, 94, 12, 8, cor="5A5A5A", quebra=False)
            self.retangulo(s, trilho_l, y + 2, trilho_w, 8, "FFFFFF")
            if v:
                self.retangulo(s, trilho_l, y + 2, max(trilho_w * abs(v) / maior, 1), 8, cb)
            num = fmt_moeda_curta(v) if k.formato == "moeda" else _fmt_kpi(v, k.formato)
            self.texto(s, num, l + w - 68, y, 58, 12, 8, cor="5A5A5A", alin=PP_ALIGN.RIGHT)

    def cartao_linha(self, s, l, t, w, h, k):
        self.retangulo(s, l, t, w, h, C.CINZA_CLARO)
        self.retangulo(s, l, t, 4, h, C.CINZA)
        self.texto(s, k.nome, l + 12, t + 6, w * .55, 14, 10, cor="5A5A5A")
        self.texto(s, _fmt_kpi(k.atual, k.formato), l + w * .4, t + 4, w * .6 - 10, 18, 13, True, C.AZUL,
                   PP_ALIGN.RIGHT)
        if not self.rel.compara:
            return
        txt, cor = self._delta(k)
        self.texto(s, txt, l + 12, t + 24, w - 22, 12, 9, True, cor)
        if self.rel.cobertura_b != "nenhuma":
            self.texto(s, f"{self.rel.nome_b}: {_fmt_kpi(k.anterior, k.formato)}", l + 12, t + 37, w - 22,
                       12, 8, cor=CINZA_TXT)

    def resumo(self, titulo):
        """Destaques no topo e os demais indicadores por etapa do fluxo (A x B)."""
        r = self.rel
        s = self.slide(titulo, f"{r.p.rotulo}  x  {r.ant.rotulo}  ({r.modo.lower()})" if r.compara else r.p.rotulo)
        grupos = r.grupos()
        gap = 16
        dest = grupos[0][1]
        w = (SW - 2 * M - (len(dest) - 1) * gap) / len(dest)
        for i, k in enumerate(dest):
            self.cartao_destaque(s, M + i * (w + gap), 90, w, 120 if r.compara else 72, k)
        if not r.compara:  # sem variações: cartões compactos com só o valor
            return self._resumo_simples(s, grupos[1:])
        blocos = grupos[1:]
        if len(blocos) == 1:
            ks = blocos[0][1]
            w = (SW - 2 * M - (len(ks) - 1) * gap) / len(ks)
            for i, k in enumerate(ks):
                self.cartao_linha(s, M + i * (w + gap), 226, w, 52, k)
        else:
            w = (SW - 2 * M - (len(blocos) - 1) * gap) / len(blocos)
            for j, (titulo_b, ks) in enumerate(blocos):
                l = M + j * (w + gap)
                self.texto(s, titulo_b.upper(), l, 222, w, 14, 9, True, C.AZUL)
                self.retangulo(s, l, 238, w, 2, C.AZUL)
                for i, k in enumerate(ks):
                    self.cartao_linha(s, l, 246 + i * 58, w, 52, k)
        if r.cobertura_b != "total":
            aviso = ("A base não tem dados do período de comparação." if r.cobertura_b == "nenhuma" else
                     "A base cobre só parte do período de comparação: variações podem estar distorcidas.")
            self.texto(s, aviso, M, SH - 56, SW - 2 * M, 14, 9, True, C.VERMELHO)
        return s

    def _resumo_simples(self, s, blocos):
        gap = 16
        if len(blocos) == 1:
            ks = blocos[0][1]
            w = (SW - 2 * M - (len(ks) - 1) * gap) / len(ks)
            for i, k in enumerate(ks):
                self.cartao_linha(s, M + i * (w + gap), 182, w, 30, k)
            return s
        w = (SW - 2 * M - (len(blocos) - 1) * gap) / len(blocos)
        for j, (titulo_b, ks) in enumerate(blocos):
            l = M + j * (w + gap)
            self.texto(s, titulo_b.upper(), l, 182, w, 14, 9, True, C.AZUL)
            self.retangulo(s, l, 198, w, 2, C.AZUL)
            for i, k in enumerate(ks):
                self.cartao_linha(s, l, 206 + i * 38, w, 30, k)
        return s

    def comparativo(self):
        """Slides de comparação: curva acumulada, tabela de indicadores e maiores altas e quedas."""
        r = self.rel
        st = C.FATURADO if r.filtro == TODOS else r.filtro
        ac = r.acumulado(st)
        a, b = r.nome_a, r.nome_b
        ult = ac[a].last_valid_index()
        sub = ""
        if ult is not None:
            va, vb = ac.at[ult, a], ac.at[ult, b]
            dia = ac.at[ult, "Rótulo"]
            sub = f"{a} x {b}  ·  {'na ' + dia.lower() if dia.isalpha() else 'no dia ' + dia}: {fmt_moeda(va)} em {a}"
            if pd.notna(vb):
                sub += f"  x  {fmt_moeda(vb)} em {b}" + (f"  ({fmt_pct(va / vb - 1, sinal=True)})" if vb else "")
        nome = {C.FATURADO: "Faturamento", C.PROCESSO: "Carteira em aberto"}.get(st, st)
        s = self.slide(f"{nome} {'dia a dia' if st == C.PROCESSO else 'acumulado'}", sub or f"{a} x {b}")
        self.linha(s, ac["Rótulo"], {a: ac[a], b: ac[b]}, M, 110, SW - 2 * M, 370, [C.AZUL, C.CINZA], tracejado=(1,))

        k = r.kpis()
        ind = pd.DataFrame({"Indicador": [x.nome for x in k],
                            a: [_fmt_kpi(x.atual, x.formato) for x in k],
                            b: [_fmt_kpi(x.anterior, x.formato) if r.cobertura_b != "nenhuma" else "-" for x in k],
                            "Diferença": [_fmt_delta(x.delta, x.formato) for x in k],
                            "Variação": [_fmt_var(x) for x in k]})
        cores = {}
        for i, x in enumerate(k):
            if x.delta and r.cobertura_b != "nenhuma":
                cor = C.VERDE if x.melhorou else C.VERMELHO
                cores[(i, "Diferença")] = cores[(i, "Variação")] = cor
            elif r.cobertura_b == "nenhuma":
                ind.loc[i, ["Diferença", "Variação"]] = ""
        s = self.slide("Indicadores lado a lado", f"{r.p.rotulo}  x  {r.ant.rotulo}")
        self.tabela(s, ind, {a: "r", b: "r", "Diferença": "r", "Variação": "r"}, [300, 160, 160, 160, 100],
                    max_linhas=14, cores_celulas=cores)
        self.texto(s, "Verde = melhora, vermelho = piora (para cancelamentos e pedidos aguardando nota, subir é ruim). "
                   "Taxas comparadas em pontos percentuais (p.p.).", M, SH - 58, SW - 2 * M, 14, 9, cor=CINZA_TXT)

        s = self.slide("Maiores altas e quedas", f"Diferença de valor entre {a} e {b}"
                       + ("" if r.filtro == TODOS else f" ({r.filtro.lower()})"))
        if r.cobertura_b == "nenhuma":
            self.texto(s, f"Sem dados de {r.ant.rotulo} para comparar.", M, 220, SW - 2 * M, 30, 16, cor=CINZA_TXT,
                       alin=PP_ALIGN.CENTER)
            return
        w = (SW - 2 * M - 30) / 2
        for j, dim in enumerate(("Clientes", "Produtos")):
            mv = r.variacoes(dim, 5)
            l = M + j * (w + 30)
            self.texto(s, dim, l, 96, w, 18, 13, True, C.AZUL)
            if mv.empty:
                self.texto(s, "Sem variações.", l, 200, w, 20, 12, cor=CINZA_TXT)
                continue
            nomes = [x if len(x) <= 30 else x[:28] + "…" for x in mv.iloc[:, 1]]
            self.grafico(s, nomes, {"Diferença": mv["Diferença"]}, l, 134, w, 340, "bar",
                         cores_pontos=[C.VERDE if v > 0 else C.VERMELHO for v in mv["Diferença"]])

    def cartao(self, s, l, t, w, h, k, cor_barra):
        self.retangulo(s, l, t, w, h, C.CINZA_CLARO)
        self.retangulo(s, l, t, 5, h, cor_barra)
        val = _fmt_kpi(k.atual, k.formato)
        self.texto(s, k.nome, l + 18, t + 16, w - 28, 18, 12, cor="5A5A5A")
        self.texto(s, val, l + 18, t + 44, w - 24, 34, 22 if len(val) > 13 else 26, True, C.AZUL)
        v = k.variacao
        if v is None:
            txt, cor = "sem base anterior", "828282"
        else:
            seta = "▲" if v > 0 else ("▼" if v < 0 else "■")
            txt = f"{seta} " + (f"{'+' if v > 0 else ''}{fmt_num(v * 100, 1)} p.p." if k.formato == "pct"
                                else fmt_pct(v, sinal=True))
            cor = {True: C.VERDE, False: C.VERMELHO, None: "828282"}[k.melhorou]
        self.texto(s, txt, l + 18, t + 92, w - 24, 18, 13, True, cor)
        self.texto(s, "anterior: " + _fmt_kpi(k.anterior, k.formato), l + 18, t + 116, w - 24, 16, 10, cor=CINZA_TXT)

    def cartoes(self, s, kpis, cols=4, t0=86, h=150):
        gap = 16
        w = (SW - 2 * M - (cols - 1) * gap) / cols
        for i, k in enumerate(kpis):
            l = M + (i % cols) * (w + gap)
            t = t0 + (i // cols) * (h + gap)
            self.cartao(s, l, t, w, h, k, C.AZUL if i < cols else C.VERDE)

    # ------------------------------------------------------------ slides

    def capa(self):
        s = self.prs.slides.add_slide(self.layout)
        self.retangulo(s, 0, 0, SW, 8, C.AZUL)
        if C.LOGO.exists():
            s.shapes.add_picture(str(C.LOGO), _pt(M), _pt(60), height=_pt(60))
        self.texto(s, "Relatório de Vendas", M, 200, SW - 2 * M, 50, 40, True, C.AZUL)
        sub = self.rel.p.rotulo + ("" if self.rel.filtro == TODOS else f"  ·  Status: {self.rel.filtro}")
        self.texto(s, sub, M, 258, SW - 2 * M, 30, 22)
        if self.rel.compara:
            self.texto(s, f"Comparando com: {self.rel.ant.rotulo}  ({self.rel.modo.lower()})", M, 294, SW - 2 * M, 20,
                       13, cor=CINZA_TXT)
        self.retangulo(s, 0, SH - 78, SW, 8, C.VERDE)
        self.retangulo(s, 0, SH - 70, SW, 70, C.AZUL)
        ult = self.rel.base.ultima_importacao()
        self.texto(s, "Processo de venda → Aprovado → Entregue → Faturado   ·   Gerado em "
                   + fmt_data(date.today()) + (f" · dados do Bling importados em {fmt_data(ult)}" if ult else ""),
                   M, SH - 45, SW - 2 * M, 20, 12, cor="FFFFFF")

    def deck_completo(self):
        r = self.rel
        self.capa()
        s = self.resumo("Resumo do período")
        if r.cobertura_b == "total":
            self.texto(s, "Faturamento = notas fiscais emitidas (igual ao Bling). Entregue = pedidos com nota, pela data "
                       "da nota. Carteira = propostas em negociação no fim do período.", M, SH - 56, SW - 2 * M, 14, 9,
                       cor=CINZA_TXT)
        if r.compara:
            self.comparativo()

        ev = r.evolucao()
        cat = ev.columns[0]
        melhor = ev.loc[ev[C.FATURADO].idxmax()] if len(ev) else None
        sub = (f"Faturado: {fmt_moeda(ev[C.FATURADO].sum())}  ·  Entregue: {fmt_moeda(ev[C.ENTREGUE].sum())}"
               + (f"  ·  maior faturamento: {melhor[cat]} ({fmt_moeda(melhor[C.FATURADO])})" if melhor is not None else ""))
        s = self.slide(f"Faturamento x Entregue por {cat.lower()}", sub)
        self.grafico(s, ev[cat], {"Faturado (notas)": ev[C.FATURADO], "Entregue (pedidos)": ev[C.ENTREGUE]},
                     M, 110, SW - 2 * M, 370, "col", [C.AZUL, C.CINZA], legenda=True)

        fu = r.funil()
        s = self.slide("Funil de propostas", "Propostas emitidas no período e a situação em que estão hoje.")
        self.grafico(s, fu["Etapa"], {"Qtd": fu["Qtd"]}, M, 110, 440, 300, "bar", mil=False,
                     cores_pontos=[C.AZUL, C.CINZA, C.AZUL, C.CINZA, C.VERDE, C.VERMELHO])
        self.tabela(s, fu, {"Qtd": "i", "Valor": "m", "% das emitidas": "p"}, [170, 45, 125, 80], l=500, t=120)

        cols = ["Vendedor", "Faturado", "Notas", "Entregue", "Aprovado", "Propostas", "Canceladas"]
        ve = r.vendedores()[cols + (["Variação"] if r.compara else [])]
        s = self.slide("Vendedores")
        self.tabela(s, ve, {c: "m" for c in ("Faturado", "Entregue", "Aprovado")} |
                    {"Notas": "i", "Propostas": "i", "Canceladas": "i", "Variação": "v"},
                    [230, 110, 55, 110, 110, 75, 80, 80] if r.compara else [260, 120, 60, 120, 120, 90, 110])
        self.texto(s, "Faturado = notas do período · Entregue = pedidos atendidos · Aprovado = propostas aprovadas · "
                   + (f"Variação = faturado vs {r.nome_b}" if r.compara else ""), M, SH - 58, SW - 2 * M, 14, 9, cor=CINZA_TXT)

        s = self.slide("Top 10 clientes (faturamento)")
        self._ranking(s, r.clientes(), "Cliente", ["Cidade"], [300, 130])
        s = self.slide("Top 10 produtos (faturamento)")
        self._ranking(s, r.produtos(), "Produto", ["Un"], [360, 40])
        self.texto(s, "Itens dos pedidos que já têm nota fiscal no período.", M, SH - 58, SW - 2 * M, 14, 9, cor=CINZA_TXT)

        ci = r.cidades()
        s = self.slide("Faturamento por cidade")
        self.grafico(s, ci["Cidade"], {"Faturado": ci["Valor"]}, M, 100, SW - 2 * M, 380, "bar", [C.VERDE])

        s = self.slide("Vendas aprovadas no período")
        self._lista(s, r.lista(C.APROVADO), [70, 270, 170, 110, 85, 175], ("Motivo", "Comentário"))

        self._cancelamentos()

        ag = r.aguardando_nota()
        s = self.slide("Pedidos aguardando nota fiscal",
                       f"{len(ag)} pedidos feitos no período ainda sem nota: {fmt_moeda(ag['Valor'].sum())}. "
                       "Entram em Entregue/Faturado quando a nota for emitida.")
        self._lista(s, ag, [70, 330, 210, 120, 110], t=96)

    def deck_foco(self):
        r, st = self.rel, self.rel.filtro
        self.capa()
        self.resumo(f"Resumo: {st}")
        if r.compara:
            self.comparativo()
        ev = r.evolucao()
        cat = ev.columns[0]
        if st == C.PROCESSO:
            s = self.slide("Carteira em aberto por idade",
                           "Propostas em negociação no fim do período, pelo tempo desde a emissão.")
            self.grafico(s, ev[cat], {"Valor": ev["Valor"]}, M, 110, SW - 2 * M, 340, "bar", [C.AZUL])
        else:
            s = self.slide(f"{st} por {cat.lower()}",
                           f"Total: {fmt_moeda(ev[st].sum())}  ·  {fmt_num(ev['Qtd'].sum())} registros")
            self.grafico(s, ev[cat], {st: ev[st]}, M, 110, SW - 2 * M, 370, "col",
                         [C.VERMELHO if st == C.CANCELADO else C.AZUL])
        s = self.slide("Vendedores")
        self.tabela(s, r.vendedores(), {"Qtd": "i", "Valor": "m", "Valor anterior": "m", "Diferença": "dm",
                                        "Variação": "v"},
                    [280, 60, 150, 150, 140, 100] if r.compara else [480, 120, 280])
        s = self.slide("Top 10 clientes")
        self._ranking(s, r.clientes(), "Cliente", ["Cidade"], [300, 130])
        s = self.slide("Top 10 produtos")
        self._ranking(s, r.produtos(), "Produto", ["Un"], [360, 40])
        ci = r.cidades()
        s = self.slide("Por cidade")
        self.grafico(s, ci["Cidade"], {"Valor": ci["Valor"]}, M, 100, SW - 2 * M, 380, "bar", [C.VERDE])
        if st == C.CANCELADO:
            self._cancelamentos()
        else:
            s = self.slide("Detalhamento (maiores valores)")
            if st == C.PROCESSO:
                self._lista(s, r.lista(), [65, 240, 150, 100, 80, 80, 165], ("Motivo",))
            else:
                self._lista(s, r.lista(), [70, 280, 170, 110, 85, 175], ("Motivo", "Comentário"))

    def _cancelamentos(self):
        r = self.rel
        can = r.lista(C.CANCELADO)
        s = self.slide("Cancelamentos e motivos")
        if can.empty:
            self.texto(s, "Nenhuma proposta cancelada no período.", M, 220, SW - 2 * M, 30, 18, cor=C.VERDE,
                       alin=PP_ALIGN.CENTER)
            return
        mo = r.motivos()
        self.grafico(s, mo["Motivo"], {"Qtd": mo["Qtd"]}, M, 84, 420, 170, "bar", [C.VERMELHO], mil=False)
        self.texto(s, "Motivo e comentário são preenchidos pela equipe na tela de Feedback do painel "
                   "(ou na aba Propostas da base).", 490, 96, SW - 490 - M, 50, 12)
        self._lista(s, can, [60, 190, 115, 90, 85, 75, 110, 155], (), t=270, max_linhas=8)

    def _ranking(self, s, df, chave, extras, larguras):
        """Top 10 com o valor de A, de B, a diferença e a variação."""
        if not self.rel.compara:
            cols = [chave] + extras + [c for c in df.columns if c not in [chave] + extras]
            larg = {"Cliente": [420, 200, 70, 150], "Produto": [480, 60, 120, 150]}[chave]
            self.tabela(s, df[cols], {"Qtd": "i", "Quantidade": "i", "Valor": "m"}, larg)
            return
        cols = [chave] + extras + ["Valor", "Valor anterior", "Diferença", "Variação"]
        resto = (SW - 2 * M - sum(larguras)) / 4
        self.tabela(s, df[cols], {"Valor": "m", "Valor anterior": "m", "Diferença": "dm", "Variação": "v"},
                    larguras + [resto * 1.1, resto * 1.1, resto * 1.05, resto * .75], tam=10)

    def _lista(self, s, df, larguras, ocultar=(), t=84, max_linhas=12):
        df = df.drop(columns=[c for c in ocultar if c in df.columns])
        larguras = [w for w in larguras if w][:len(df.columns)]
        while len(larguras) < len(df.columns):
            larguras.append(90)
        fmts = {"Valor": "m"} | {c: "d" for c in df.columns if df[c].dtype.kind == "M"}
        self.tabela(s, df, fmts, larguras, t=t, max_linhas=max_linhas)

    def bytes(self) -> bytes:
        buf = io.BytesIO()
        self.prs.save(buf)
        return buf.getvalue()


def _fmt_kpi(v, formato):
    if v is None:
        return "-"
    if formato == "moeda":
        return fmt_moeda(v)
    if formato == "pct":
        return fmt_pct(v)
    if formato == "dias":
        return fmt_num(v, 1)
    return fmt_num(v)


def _fmt_delta(d, formato, curto=False):
    """Diferença absoluta com sinal (+R$ 50.615,45; +3; +2,5 p.p.)."""
    if d is None or d != d:
        return ""
    if formato == "pct":
        return fmt_sinal(d * 100, lambda x: fmt_num(x, 1)) + " p.p."
    if formato == "moeda":
        return fmt_sinal(d, fmt_moeda_curta if curto else fmt_moeda)
    return fmt_sinal(d, lambda x: fmt_num(x, 1 if formato == "dias" else 0))


def _fmt_var(k):
    v = k.variacao
    if v is None:
        return ""
    return f"{'+' if v > 0 else ''}{fmt_num(v * 100, 1)} p.p." if k.formato == "pct" else fmt_pct(v, sinal=True)


def _formatar(v, f):
    if v is None or (isinstance(v, float) and v != v) or v is pd.NaT:
        return ""
    if isinstance(v, str) and f != "t":  # já formatado
        return v
    if f == "dm":
        return fmt_sinal(v, fmt_moeda)
    if f == "m":
        return fmt_moeda(v)
    if f == "i":
        return fmt_qtd(v)
    if f == "p":
        return fmt_pct(v)
    if f == "v":
        return fmt_pct(v, sinal=True)
    if f == "d":
        return fmt_data(v)
    s = str(v)
    return s if len(s) <= 60 else s[:57] + "..."


def gerar_ppt(rel: Relatorio) -> bytes:
    d = Deck(rel)
    d.deck_completo() if rel.filtro == TODOS else d.deck_foco()
    return d.bytes()


def nome_arquivo(rel: Relatorio, ext="pptx") -> str:
    from .utils import norm
    foco = "" if rel.filtro == TODOS else norm(rel.filtro).replace(" ", "-") + "_"
    return f"Relatorio_{foco}{norm(rel.p.tipo)}_{rel.p.inicio:%Y-%m-%d}_a_{rel.p.fim:%Y-%m-%d}.{ext}"
