"""Painel do Relatório de Operações — Blocos Cabral.

Executar:  streamlit run painel.py   (ou o atalho 'Relatório Blocos Cabral')
"""
from datetime import date

import altair as alt
import pandas as pd
import streamlit as st

from app import config as C
from app.base import Base, BaseEmUso, guardar_em_entrada
from app.metricas import DIMENSOES, FILTROS, TODOS, Relatorio
from app.periodo import MESMA_DATA, MODOS, PERSONALIZADO, SEM_COMPARACAO, TIPOS, Periodo, comparacao
from app.planilha import excel_relatorio
from app.ppt import gerar_ppt, nome_arquivo
from app.utils import fmt_data, fmt_moeda, fmt_moeda_curta, fmt_num, fmt_pct, fmt_qtd, fmt_sinal

st.set_page_config(page_title="Relatório de Operações · Blocos Cabral", page_icon=str(C.FAVICON) if C.FAVICON.exists() else None,
                   layout="wide")
def svg_icone(caminho: str, cor: str) -> str:
    """Ícone Lucide (chevron) como data URI para usar em CSS."""
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' "
           f"stroke='#{cor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='{caminho}'/></svg>")
    return "data:image/svg+xml," + svg.replace("#", "%23").replace("<", "%3C").replace(">", "%3E")


st.markdown(f"""<style>
.block-container {{padding-top: 3.2rem;}}
.st-key-nav_ant button, .st-key-nav_prox button {{height: 64px; border-color: #{C.CINZA};}}
.st-key-nav_ant button:hover, .st-key-nav_prox button:hover {{border-color: #{C.AZUL}; color: #{C.AZUL};}}
.st-key-nav_ant button p, .st-key-nav_prox button p {{font-size: 0;}}
.st-key-nav_ant button {{background: #fff url("{svg_icone('m15 18-6-6 6-6', C.GRAFITE)}") no-repeat center / 28px;}}
.st-key-nav_prox button {{background: #fff url("{svg_icone('m9 18 6-6-6-6', C.GRAFITE)}") no-repeat center / 28px;}}
.st-key-nav_ant button:hover {{background-image: url("{svg_icone('m15 18-6-6 6-6', C.AZUL)}");}}
.st-key-nav_prox button:hover {{background-image: url("{svg_icone('m9 18 6-6-6-6', C.AZUL)}");}}
div[data-testid="stMetric"] {{background:#{C.CINZA_CLARO}; border-left:5px solid #{C.AZUL}; padding:10px 14px;
  border-radius:4px;}}
div[data-testid="stMetricValue"] {{color:#{C.AZUL}; font-size:1.55rem;}}
.periodo {{text-align:center; font-size:1.3rem; font-weight:700; color:#{C.AZUL};}}
.periodo-faixa {{background:#{C.CINZA_CLARO}; border-radius:6px; height:64px; display:flex; flex-direction:column;
  justify-content:center; margin-top:-1rem;}}
.sub {{text-align:center; color:#787878; font-size:.85rem;}}
.sub b {{color:#{C.GRAFITE};}}
/* cartões de indicadores (A x B) */
.kc {{background:#{C.CINZA_CLARO}; border-radius:6px; padding:12px 16px; margin-bottom:12px;}}
.kc-big {{border-left:5px solid #{C.AZUL}; min-height:172px;}}
.kc-nome {{color:#5A5A5A; font-size:.86rem;}}
.kc-valor {{color:#{C.AZUL}; font-weight:700; font-size:1.7rem; line-height:1.25; white-space:nowrap;}}
.kc-big .kc-valor {{font-size:1.95rem;}}
.kc-delta {{font-weight:700; font-size:.92rem; margin-top:2px;}}
.kc-delta span {{font-weight:400; color:#787878;}}
.kc-delta.pos {{color:#{C.VERDE};}} .kc-delta.neg {{color:#{C.VERMELHO};}} .kc-delta.neu {{color:#828282;}}
.kc-b {{color:#787878; font-size:.8rem; margin-top:2px;}}
.kc-barras {{margin-top:10px;}}
.kc-linha {{display:flex; align-items:center; gap:8px; font-size:.75rem; color:#5A5A5A; margin-top:4px;}}
.kc-rot {{width:92px; flex:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}}
.kc-trilho {{flex:1; background:#fff; height:9px; border-radius:5px; overflow:hidden;}}
.kc-bar {{height:100%; border-radius:5px;}}
.kc-num {{width:88px; flex:none; text-align:right; white-space:nowrap;}}
.kc-grupo {{font-size:.74rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#{C.AZUL};
  border-bottom:2px solid #{C.AZUL}; padding-bottom:4px; margin:4px 0 10px;}}
.kc-row {{border-left:4px solid #{C.CINZA}; padding:9px 14px;}}
.kc-row .kc-valor {{font-size:1.3rem;}}
.kc-row .kc-topo {{display:flex; justify-content:space-between; align-items:baseline; gap:10px;}}
</style>""", unsafe_allow_html=True)


# ---------------------------------------------------------------- base

def carregar_base(forcar=False) -> Base:
    if forcar or "base" not in st.session_state:
        st.session_state.base = Base()
    return st.session_state.base


base = carregar_base()


def data_mais_recente(b: Base) -> date:
    datas = [d for d in (b.notas["data"].max(), b.pedidos["data"].max()) if pd.notna(d)]
    return max(datas).date() if datas else date.today()


# ---------------------------------------------------------------- importação (modal)

ARQUIVOS_BLING = [
    ("orcamentos", "1. Orçamentos (CSV)", ["csv"],
     "Bling → Vendas → Propostas comerciais → selecionar → Exportar (CSV)."),
    ("vendas", "2. Vendas — pedidos atendidos (CSV)", ["csv"],
     "Bling → Vendas → Pedidos de venda → filtrar situação Atendido → Exportar (CSV)."),
    ("notas", "3. Notas Fiscais por Operação (PDF)", ["pdf"],
     "Bling → Relatórios → Notas fiscais por operação → período → salvar como PDF."),
]


@st.dialog("Import Bling data", width="large")
def dialogo_importar():
    st.markdown("Envie os arquivos exportados do Bling. Pode enviar só os que tiver, não precisa dos três de uma vez.")
    escolhidos = []
    for tipo, titulo, ext, ajuda in ARQUIVOS_BLING:
        f = st.file_uploader(titulo, type=ext, key=f"up_{tipo}", help=ajuda)
        if f is None:
            st.caption(ajuda)
            continue
        dados = f.getvalue()
        ja = base.importado_como(dados)
        if ja:
            st.caption(f"⚠️ Este arquivo já foi importado antes (como *{ja}*) e será ignorado.")
        escolhidos.append((f.name, dados, tipo))
    st.caption("Arquivos repetidos são reconhecidos pelo conteúdo e ignorados. Propostas, pedidos e notas que já "
               "existem na base são atualizados, nunca duplicados.")
    c1, c2, c3 = st.columns([1, 1, 1.4])
    if c1.button("Importar", type="primary", disabled=not escolhidos, width="stretch"):
        with st.spinner("Importando..."):
            lista = [(guardar_em_entrada(n, d), d, t) for n, d, t in escolhidos]  # cópia em entrada/
            _concluir_importacao(base.importar(lista))
        st.rerun()
    if c2.button("Cancelar", width="stretch"):
        st.rerun()
    if c3.button("Ler pasta entrada/", width="stretch", help=f"Importa os arquivos novos de {C.ENTRADA}"):
        with st.spinner("Importando..."):
            _concluir_importacao(base.importar_pasta())
        st.rerun()


def _concluir_importacao(resumo):
    try:
        base.salvar()
        st.session_state.ancora = data_mais_recente(base)
    except BaseEmUso as e:
        resumo["erros"].append(str(e))
    st.session_state.resumo = resumo


def faixa(serie) -> str:
    s = serie.dropna()
    return f"{fmt_data(s.min())} a {fmt_data(s.max())}" if len(s) else "sem dados"


# ---------------------------------------------------------------- barra lateral

with st.sidebar:
    if C.LOGO.exists():
        st.image(str(C.LOGO), width=220)
    if st.button("Import Bling data", type="primary", icon=":material/upload_file:", width="stretch"):
        dialogo_importar()
    if "resumo" in st.session_state:
        r = st.session_state.resumo
        if r["importados"]:
            st.success("Importados:\n\n" + "\n".join(f"- {x}" for x in r["importados"]) +
                       f"\n\n{r['novas_propostas']} propostas novas · {r['mudancas']} mudanças de situação · "
                       f"{r['ligacoes']['notas_pedidos']} notas e {r['ligacoes']['propostas_pedidos']} propostas ligadas a pedidos")
        if r["ignorados"]:
            st.info("Já importados antes (conteúdo idêntico), nada a fazer:\n\n" + "\n".join(f"- {x}" for x in r["ignorados"]))
        for e in r["erros"]:
            st.error(e)
        if st.button("Fechar aviso", width="stretch"):
            del st.session_state.resumo
            st.rerun()

    zona_export = st.container()  # preenchida no fim do script, quando o relatório já foi calculado

    # rodapé: cobertura dos dados
    st.markdown("<div style='height:2rem'></div>", unsafe_allow_html=True)
    st.divider()
    st.markdown("**Dados cobertos**")
    fins = [s.max() for s in (base.notas["data"], base.pedidos["data"], base.propostas["data"]) if s.notna().any()]
    if fins:
        inicios = [s.min() for s in (base.notas["data"], base.pedidos["data"], base.propostas["data"]) if s.notna().any()]
        st.markdown(f"<div style='font-size:1.05rem;color:#{C.AZUL};font-weight:700'>"
                    f"{fmt_data(min(inicios))} a {fmt_data(min(fins))}</div>", unsafe_allow_html=True)
        if max(fins) != min(fins):
            st.caption(f"Algumas fontes vão até {fmt_data(max(fins))}; o período completo (todas as fontes) "
                       f"termina em {fmt_data(min(fins))}.")
    for nome, serie, n in (("Notas fiscais", base.notas["data"], len(base.notas)),
                           ("Pedidos entregues", base.pedidos["data"], base.pedidos["pedido"].nunique()),
                           ("Propostas", base.propostas["data"], len(base.propostas))):
        st.caption(f"**{nome} ({n})**  \n{faixa(serie)}")
    ult = base.ultima_importacao()
    st.caption(f"Última importação: {ult:%d/%m/%Y %H:%M}" if pd.notna(ult) and ult else "Base vazia.")

if base.propostas.empty and base.pedidos.empty and base.notas.empty:
    st.title("Relatório de Operações")
    st.info("Comece clicando em **Import Bling data** na barra lateral.")
    st.stop()

# ---------------------------------------------------------------- seletor de período e status

ss = st.session_state
ss.setdefault("tipo", "Semana")
ss.setdefault("ancora", data_mais_recente(base))
ss.setdefault("filtro", TODOS)
ss.setdefault("modo", MESMA_DATA)


def periodo_atual() -> Periodo:
    if ss.tipo == "Personalizado":
        de, ate = ss.get("de", ss.ancora), ss.get("ate", ss.ancora)
        return Periodo.de("Personalizado", ss.ancora, de, ate)
    return Periodo.de(ss.tipo, ss.ancora)


def mover(n):
    p = periodo_atual().deslocar(n)
    if ss.tipo == "Personalizado":
        ss.de, ss.ate = p.inicio, p.fim
    else:
        ss.ancora = p.inicio


COLUNAS_TOPO = [1.9, 1, 1.15, 1.25]
c_tit, c_tipo, c_status, c_modo = st.columns(COLUNAS_TOPO, vertical_alignment="bottom")
c_tit.markdown(f"<h2 style='color:#{C.AZUL};margin:0;padding-bottom:.35rem'>Relatório de Operações</h2>",
               unsafe_allow_html=True)
c_tipo.selectbox("Tipo de período", TIPOS, key="tipo",
                 help="Dia, Semana (segunda a domingo), Mês, Trimestre, Semestre, Ano ou Personalizado.")
c_status.selectbox("Status da operação", FILTROS, key="filtro",
                   help="Todos = relatório completo. Um status gera o relatório focado nele.")
c_modo.selectbox("Comparar com", MODOS, key="modo",
                 help="Período anterior: o período inteiro contra o anterior inteiro.\n\n"
                      "Até a mesma data: período em andamento até o último dia com dados, contra o anterior até o "
                      "mesmo ponto (ex.: 1 a 16/out x 1 a 16/set).\n\n"
                      "Mesmo período do ano anterior: o mesmo corte, um ano antes.\n\n"
                      "Personalizado: escolha livre do período de comparação.\n\n"
                      "Sem comparação: só os números do período, sem variações.")
if ss.tipo == "Personalizado" or ss.modo == PERSONALIZADO:
    _, d1, d2, d3 = st.columns(COLUNAS_TOPO)
    if ss.tipo == "Personalizado":
        p0 = periodo_atual()
        ss.setdefault("de", p0.inicio)
        ss.setdefault("ate", p0.fim)
        d1.date_input("De", key="de", format="DD/MM/YYYY")
        d2.date_input("Até", key="ate", format="DD/MM/YYYY")
    if ss.modo == PERSONALIZADO:
        b0 = periodo_atual().anterior()
        ss.setdefault("cmp_de", b0.inicio)
        ss.setdefault("cmp_ate", b0.fim)
        c1, c2 = d3.columns(2)
        c1.date_input("Comparar de", key="cmp_de", format="DD/MM/YYYY")
        c2.date_input("até", key="cmp_ate", format="DD/MM/YYYY")

# período selecionado ocupando toda a largura, com as setas nas pontas
c_ant, c_rot, c_prox = st.columns([.6, 10, .6], vertical_alignment="center")
c_ant.button("‹", key="nav_ant", on_click=mover, args=(-1,), width="stretch",
             help="Período anterior")
c_prox.button("›", key="nav_prox", on_click=mover, args=(1,), width="stretch",
              help="Próximo período")
ultimo_dia = base.cobertura()[1] or data_mais_recente(base)
per, per_b = comparacao(periodo_atual(), ss.modo, ultimo_dia, ss.get("cmp_de"), ss.get("cmp_ate"))
sub = f"comparando com <b>{per_b.rotulo}</b> · {ss.modo.lower()}" if per_b else "sem comparação"
c_rot.markdown(f"<div class='periodo-faixa'><div class='periodo'>{per.rotulo}</div>"
               f"<div class='sub'>{sub}</div></div>", unsafe_allow_html=True)

rel = Relatorio(base, per, ss.filtro, per_b, ss.modo)
rotulo_b = per_b.rotulo if per_b else "sem comparação"
if rel.cobertura_b == "nenhuma":
    st.warning(f"A base não tem dados de {per_b.rotulo}: as variações ficam em branco. "
               f"Os dados cobertos vão de {fmt_data(base.cobertura()[0])} a {fmt_data(ultimo_dia)}.",
               icon=":material/info:")
elif rel.cobertura_b == "parcial":
    st.warning(f"A base cobre só parte de {per_b.rotulo} (dados a partir de {fmt_data(base.cobertura()[0])} "
               f"até {fmt_data(ultimo_dia)}): a comparação pode ficar distorcida.", icon=":material/info:")
chave = f"{per.rotulo}|{rotulo_b}|{ss.filtro}"
if ss.get("chave_dl") != chave:  # arquivos gerados valem só para o período/comparação/status atual
    ss.pop("ppt", None)
    ss.pop("xlsx", None)
    ss.chave_dl = chave

# ---------------------------------------------------------------- indicadores


def fmt_kpi(v, f):
    if v is None:
        return "-"
    return {"moeda": fmt_moeda, "pct": fmt_pct, "dias": lambda x: fmt_num(x, 1)}.get(f, fmt_num)(v)


def fmt_curto(v, f):
    """Valor resumido para as barras dos cartões."""
    return fmt_moeda_curta(v) if f == "moeda" else fmt_kpi(v, f)


def fmt_delta(k):
    """(texto, classe css): '▲ +9,6% · +R$ 50,6 mil' com verde/vermelho conforme subir ser bom ou ruim."""
    d = k.delta
    if not rel.compara:
        return "", "neu"
    if rel.cobertura_b == "nenhuma":
        return "sem dados para comparar", "neu"
    if d is None or (k.formato != "pct" and not k.anterior and not k.atual):
        return "sem movimento", "neu"
    seta = "▲" if d > 0 else ("▼" if d < 0 else "■")
    if k.formato == "pct":
        txt = f"{seta} {fmt_sinal(d * 100, lambda x: fmt_num(x, 1))} p.p."
    else:
        abs_ = fmt_sinal(d, {"moeda": fmt_moeda_curta, "dias": lambda x: fmt_num(x, 1)}.get(k.formato, fmt_num))
        txt = f"{seta} {fmt_pct(k.variacao, sinal=True)} <span>· {abs_}</span>" if k.variacao is not None else \
            f"{seta} {abs_} <span>· sem base em {rel.nome_b}</span>"
    cls = {True: "pos", False: "neg", None: "neu"}[k.melhorou]
    return txt, cls


def cartao_destaque(k) -> str:
    txt, cls = fmt_delta(k)
    maior = max(abs(k.atual or 0), abs(k.anterior or 0)) or 1
    barras_html = ""
    if not rel.compara:
        return (f"<div class='kc kc-big' style='min-height:0'><div class='kc-nome'>{k.nome}</div>"
                f"<div class='kc-valor'>{fmt_kpi(k.atual, k.formato)}</div></div>")
    linhas = [(rel.nome_a, k.atual, C.AZUL)]
    if rel.cobertura_b != "nenhuma":
        linhas.append((rel.nome_b, k.anterior, C.CINZA))
    for rot, v, cor in linhas:
        w = 0 if v is None else max(abs(v) / maior * 100, 1 if v else 0)
        barras_html += (f"<div class='kc-linha'><span class='kc-rot' title='{rot}'>{rot}</span>"
                        f"<div class='kc-trilho'><div class='kc-bar' style='width:{w:.0f}%;background:#{cor}'></div></div>"
                        f"<span class='kc-num'>{fmt_curto(v, k.formato)}</span></div>")
    return (f"<div class='kc kc-big'><div class='kc-nome'>{k.nome}</div>"
            f"<div class='kc-valor'>{fmt_kpi(k.atual, k.formato)}</div>"
            f"<div class='kc-delta {cls}'>{txt}</div><div class='kc-barras'>{barras_html}</div></div>")


def cartao_linha(k) -> str:
    txt, cls = fmt_delta(k)
    b = ("" if rel.cobertura_b == "nenhuma" or not rel.compara else
         f"<div class='kc-b'>{rel.nome_b}: {fmt_kpi(k.anterior, k.formato)}</div>")
    return (f"<div class='kc kc-row'><div class='kc-topo'><span class='kc-nome'>{k.nome}</span>"
            f"<span class='kc-valor'>{fmt_kpi(k.atual, k.formato)}</span></div>"
            + (f"<div class='kc-delta {cls}'>{txt}</div>" if txt else "") + f"{b}</div>")


grupos = rel.grupos()
for col, k in zip(st.columns(len(grupos[0][1])), grupos[0][1]):
    col.markdown(cartao_destaque(k), unsafe_allow_html=True)
blocos = grupos[1:]
if len(blocos) == 1:  # relatório focado: indicadores lado a lado
    for col, k in zip(st.columns(len(blocos[0][1])), blocos[0][1]):
        col.markdown(cartao_linha(k), unsafe_allow_html=True)
else:  # relatório completo: um bloco por etapa do fluxo
    for col, (titulo, ks) in zip(st.columns(len(blocos)), blocos):
        col.markdown(f"<div class='kc-grupo'>{titulo}</div>" + "".join(cartao_linha(k) for k in ks),
                     unsafe_allow_html=True)

# ---------------------------------------------------------------- gráficos e tabelas


def barras(df, cat, val, cor=C.AZUL, horizontal=False, moeda=True, altura=320):
    if df.empty:
        st.caption("Sem dados no período.")
        return
    d = df[[cat, val]].copy()
    d["rotulo"] = d[val].map(fmt_moeda_curta if moeda else fmt_num)
    ordem = list(dict.fromkeys(d[cat]))
    if horizontal:
        enc = dict(y=alt.Y(f"{cat}:N", sort=ordem, title=None, axis=alt.Axis(labelLimit=320)),
                   x=alt.X(f"{val}:Q", title=None, axis=None))
        txt = dict(align="left", dx=4)
    else:
        enc = dict(x=alt.X(f"{cat}:N", sort=ordem, title=None, axis=alt.Axis(labelAngle=0)),
                   y=alt.Y(f"{val}:Q", title=None, axis=None))
        txt = dict(baseline="bottom", dy=-3)
    d["valor_fmt"] = d[val].map(fmt_moeda if moeda else fmt_num)
    dica = [alt.Tooltip(f"{cat}:N", title=cat), alt.Tooltip("valor_fmt:N", title=val)]
    base_ch = alt.Chart(d).encode(**enc, tooltip=dica)
    ch = base_ch.mark_bar(color=f"#{cor}") + base_ch.mark_text(fontSize=11, **txt).encode(text="rotulo:N")
    st.altair_chart(ch.properties(height=altura), width="stretch")


def evolucao_todos(ev):
    cat = ev.columns[0]
    d = ev.melt(id_vars=cat, value_vars=[C.FATURADO, C.ENTREGUE], var_name="Série", value_name="Valor")
    d["rotulo"] = d["Valor"].map(lambda v: fmt_moeda_curta(v) if v else "")
    enc = dict(x=alt.X(f"{cat}:N", sort=list(ev[cat]), title=None, axis=alt.Axis(labelAngle=0)),
               xOffset=alt.XOffset("Série:N", sort=[C.FATURADO, C.ENTREGUE]), y=alt.Y("Valor:Q", title=None, axis=None))
    cor = alt.Color("Série:N", scale=alt.Scale(domain=[C.FATURADO, C.ENTREGUE], range=[f"#{C.AZUL}", f"#{C.CINZA}"]),
                    legend=alt.Legend(orient="top", title=None))
    d["valor_fmt"] = d["Valor"].map(fmt_moeda)
    dica = [alt.Tooltip(f"{cat}:N", title=cat), alt.Tooltip("Série:N", title="Série"),
            alt.Tooltip("valor_fmt:N", title="Valor")]
    b = alt.Chart(d).encode(**enc, tooltip=dica)
    ch = b.mark_bar().encode(color=cor) + b.mark_text(fontSize=10, baseline="bottom", dy=-3).encode(text="rotulo:N")
    st.altair_chart(ch.properties(height=340), width="stretch")


def curva_acumulada(st_curva):
    """Linhas do acumulado dia a dia: A (azul, contínua) x B (cinza, tracejada)."""
    ac = rel.acumulado(st_curva)
    a, b = rel.nome_a, rel.nome_b
    carteira = st_curva == C.PROCESSO
    ult = ac[a].last_valid_index()
    if ult is not None:
        va, vb = ac.at[ult, a], ac.at[ult, b]
        dia = ac.at[ult, "Rótulo"]
        quando = f"na {dia.lower()}" if dia.isalpha() else f"no dia {dia}"
        frase = (f"Carteira {quando}: **{fmt_moeda(va)}** em {a}" if carteira else
                 f"Acumulado até {quando}: **{fmt_moeda(va)}** em {a}")
        if rel.cobertura_b != "nenhuma" and pd.notna(vb):
            frase += f" contra **{fmt_moeda(vb)}** em {b}"
            if vb:
                frase += f" ({fmt_pct(va / vb - 1, sinal=True)})" if vb else ""
        st.markdown(frase + ".")
    d = ac.melt(id_vars=["Dia", "Rótulo"], value_vars=[a, b], var_name="Período", value_name="Valor").dropna()
    d["valor_fmt"] = d["Valor"].map(fmt_moeda)
    rotulos = dict(zip(ac["Dia"], ac["Rótulo"]))
    expr = " : ".join(f"datum.value == {k} ? '{v}'" for k, v in rotulos.items()) + " : ''"
    eixo_x = alt.Axis(title=None, labelExpr=expr, tickMinStep=1, grid=False)
    ch = alt.Chart(d).mark_line(point=len(ac) <= 31, strokeWidth=2.5).encode(
        x=alt.X("Dia:Q", axis=eixo_x, scale=alt.Scale(domain=[1, max(len(ac), 2)], nice=False)),
        y=alt.Y("Valor:Q", title=None, axis=alt.Axis(labelExpr="'R$ ' + format(datum.value / 1000, ',.0f') + ' mil'")),
        color=alt.Color("Período:N", scale=alt.Scale(domain=[a, b], range=[f"#{C.AZUL}", f"#{C.CINZA}"]),
                        legend=alt.Legend(orient="top", title=None)),
        strokeDash=alt.StrokeDash("Período:N", scale=alt.Scale(domain=[a, b], range=[[1, 0], [6, 4]]), legend=None),
        tooltip=[alt.Tooltip("Período:N"), alt.Tooltip("Rótulo:N", title="Dia"), alt.Tooltip("valor_fmt:N", title="Valor")])
    st.altair_chart(ch.properties(height=300), width="stretch")


def altas_quedas(dim):
    """Barras divergentes da diferença A - B: quem mais cresceu (verde) e quem mais caiu (vermelho)."""
    if rel.cobertura_b == "nenhuma":
        st.caption(f"Sem dados de {rel.nome_b} para comparar.")
        return
    mv = rel.variacoes(dim, 5)
    nome = DIMENSOES[dim][1]
    if mv.empty:
        st.caption("Sem variações entre os dois períodos.")
        return
    d = mv.copy()
    d["Nome"] = d[nome].map(lambda x: x if len(x) <= 34 else x[:32] + "…")
    d["rotulo"] = d["Diferença"].map(lambda v: fmt_sinal(v, fmt_moeda_curta))
    d["a_fmt"], d["b_fmt"] = d["Valor"].map(fmt_moeda), d["Valor anterior"].map(fmt_moeda)
    d["var_fmt"] = d["Variação"].map(lambda v: "novo" if pd.isna(v) else fmt_pct(v, sinal=True))
    ordem = list(d["Nome"])
    base_ch = alt.Chart(d).encode(
        y=alt.Y("Nome:N", sort=ordem, title=None, axis=alt.Axis(labelLimit=230)),
        x=alt.X("Diferença:Q", title=None, axis=None),
        tooltip=[alt.Tooltip(f"{nome}:N"), alt.Tooltip("a_fmt:N", title=rel.nome_a),
                 alt.Tooltip("b_fmt:N", title=rel.nome_b), alt.Tooltip("var_fmt:N", title="Variação")])
    barra = base_ch.mark_bar().encode(color=alt.Color(
        "Movimento:N", scale=alt.Scale(domain=["Alta", "Queda"], range=[f"#{C.VERDE}", f"#{C.VERMELHO}"]), legend=None))
    txt = base_ch.mark_text(fontSize=10, dx=alt.ExprRef("datum['Diferença'] > 0 ? 4 : -4"),
                            align=alt.ExprRef("datum['Diferença'] > 0 ? 'left' : 'right'")).encode(text="rotulo:N")
    regra = alt.Chart(pd.DataFrame({"x": [0]})).mark_rule(color=f"#{C.GRAFITE}").encode(x="x:Q")
    st.altair_chart((barra + txt + regra).properties(height=26 * len(d) + 20), width="stretch")


MOEDA_COLS = {"Valor", "Faturado", "Entregue", "Aprovado", "Faturado anterior", "Valor anterior", "Valor (R$)",
              "Diferença"}
QTD_COLS = {"Qtd", "Quantidade", "Notas", "Propostas", "Canceladas", "Pedidos"}
PCT_COLS = {"Variação", "% das emitidas"}


def _estilo(df: pd.DataFrame):
    """Valores exibidos no padrão brasileiro (R$ 1.234,56), mantendo a ordenação numérica das colunas."""
    fmts = {}
    for c in df.columns:
        numerica = pd.api.types.is_numeric_dtype(df[c])
        if numerica and c == "Diferença":
            fmts[c] = lambda v: fmt_sinal(v, fmt_moeda)
        elif numerica and (c in MOEDA_COLS or c.startswith(("Valor", C.FATURADO, C.ENTREGUE, C.APROVADO))):
            fmts[c] = fmt_moeda
        elif numerica and c == "Variação":
            fmts[c] = lambda v: fmt_pct(v, sinal=True)
        elif numerica and c in PCT_COLS:
            fmts[c] = fmt_pct
        elif numerica and c in QTD_COLS:
            fmts[c] = fmt_qtd
        elif pd.api.types.is_datetime64_any_dtype(df[c]):
            fmts[c] = fmt_data
    sty = df.style.format(fmts, na_rep="")
    cor = lambda v: "" if pd.isna(v) or v == 0 else f"color: #{C.VERDE if v > 0 else C.VERMELHO}"
    sinal = [c for c in ("Variação", "Diferença") if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    return sty.map(cor, subset=sinal) if sinal else sty


def tabela(df: pd.DataFrame, altura="auto", config=None):
    st.dataframe(_estilo(rel.renomear(df)), hide_index=True, width="stretch", height=altura, column_config=config)


abas = ["Visão geral", "Pedidos", "Vendedores", "Clientes", "Produtos", "Cidades", "Detalhamento", "Feedback"]
tab = dict(zip(abas, st.tabs(abas)))

with tab["Visão geral"]:
    st.caption(f"{per.rotulo} x {rotulo_b} · status: {ss.filtro}" if per_b else f"{per.rotulo} · status: {ss.filtro}")
    if rel.compara:  # curva A x B e maiores altas e quedas
        g_curva, g_mov = st.columns([1.35, 1], gap="large")
        with g_curva:
            if ss.filtro == TODOS:
                h1, h2 = st.columns([1.2, 1], vertical_alignment="center")
                h1.markdown(f"**Acumulado dia a dia: {rel.nome_a} x {rel.nome_b}**")
                st_curva = h2.segmented_control("Série", [C.FATURADO, C.ENTREGUE, C.APROVADO], default=C.FATURADO,
                                                key="curva_st", label_visibility="collapsed") or C.FATURADO
            else:
                st_curva = ss.filtro
                st.markdown(f"**{'Carteira em aberto dia a dia' if ss.filtro == C.PROCESSO else 'Acumulado dia a dia'}: "
                            f"{rel.nome_a} x {rel.nome_b}**")
            curva_acumulada(st_curva)
        with g_mov:
            h1, h2 = st.columns([1, 1.3], vertical_alignment="center")
            h1.markdown("**Maiores altas e quedas**")
            dim = h2.segmented_control("Dimensão", list(DIMENSOES), default="Clientes", key="mov_dim",
                                       label_visibility="collapsed") or "Clientes"
            altas_quedas(dim)
            st.caption(f"Diferença de valor ({'faturamento' if ss.filtro == TODOS else ss.filtro.lower()}) "
                       f"entre {rel.nome_a} e {rel.nome_b}.")
        st.divider()
    ev = rel.evolucao()
    if ss.filtro == TODOS:
        st.markdown(f"**Faturado (notas) x Entregue (pedidos) por {ev.columns[0].lower()}**")
        evolucao_todos(ev)
        st.markdown("**Funil das propostas emitidas no período (situação atual)**")
        fu = rel.funil()
        g1, g2 = st.columns([1, 1.1])
        with g1:
            barras(fu, "Etapa", "Qtd", horizontal=True, moeda=False, altura=240)
        with g2:
            tabela(fu)
    elif ss.filtro == C.PROCESSO:
        st.markdown("**Carteira em aberto por idade (dias desde a emissão)**")
        barras(ev, "Idade", "Valor", horizontal=True)
    else:
        st.markdown(f"**{ss.filtro} por {ev.columns[0].lower()}**")
        barras(ev, ev.columns[0], ss.filtro, cor=C.VERMELHO if ss.filtro == C.CANCELADO else C.AZUL)
    if ss.filtro == C.CANCELADO:
        st.markdown("**Motivos de cancelamento**")
        barras(rel.motivos(), "Motivo", "Qtd", cor=C.VERMELHO, horizontal=True, moeda=False, altura=200)

with tab["Pedidos"]:
    pe, regra_pedidos = rel.pedidos_filtrados()
    f1, f3 = st.columns([1.2, 3.8], vertical_alignment="bottom")
    situacao = f1.segmented_control("Entregue", ["Todos", "Sim", "Não"], default="Todos", key="ped_sit")
    busca = f3.text_input("Buscar", placeholder="cliente, pedido, nota ou vendedor", key="ped_busca")
    if situacao in ("Sim", "Não"):
        pe = pe[pe["Entregue"] == situacao]
    if busca:
        t = busca.strip().lower()
        pe = pe[pe[["Pedido", "Cliente", "Nota", "Vendedor", "Proposta"]].apply(
            lambda c: c.astype(str).str.lower().str.contains(t, regex=False)).any(axis=1)]
    m1, m2, m3 = st.columns(3)
    ent = pe[pe["Entregue"] == "Sim"]
    nao = pe[pe["Entregue"] == "Não"]
    m1.metric("Pedidos", fmt_num(len(pe)), help=fmt_moeda(pe["Valor"].sum()))
    m2.metric("Entregues (com nota)", f"{fmt_num(len(ent))} · {fmt_moeda(ent['Valor'].sum())}")
    m3.metric("Aguardando nota", f"{fmt_num(len(nao))} · {fmt_moeda(nao['Valor'].sum())}")
    tabela(
        pe, altura=520,
        config={
            "Pedido": st.column_config.TextColumn("Pedido", width=70),
            "Entregue": st.column_config.TextColumn("Entregue", width=75, help="Sim = pedido com nota fiscal emitida"),
            "Data do pedido": st.column_config.Column("Data pedido", width=95),
            "Data entrega": st.column_config.Column("Entrega (nota)", width=105),
            "Nota": st.column_config.TextColumn("Nota", width=70),
            "Cliente": st.column_config.TextColumn("Cliente", width=280),
            "Valor": st.column_config.Column("Valor", width=120),
            "Vendedor": st.column_config.TextColumn("Vendedor", width=190),
            "Cidade": st.column_config.TextColumn("Cidade", width=150),
            "Proposta": st.column_config.TextColumn("Proposta", width=80),
        })
    st.caption(f"{regra_pedidos} Entregue = o pedido tem nota fiscal; a data de entrega é a data de emissão da nota.")

with tab["Vendedores"]:
    ve = rel.vendedores()
    col_val = "Faturado" if ss.filtro == TODOS else "Valor"
    barras(ve.head(12), "Vendedor", col_val, horizontal=True, altura=min(40 * len(ve.head(12)) + 20, 460))
    tabela(ve)
with tab["Clientes"]:
    tabela(rel.clientes(50))
with tab["Produtos"]:
    tabela(rel.produtos(50))
with tab["Cidades"]:
    ci = rel.cidades(50)
    barras(ci.head(10), "Cidade", "Valor", cor=C.VERDE, horizontal=True, altura=380)
    tabela(ci)

with tab["Detalhamento"]:
    if ss.filtro == TODOS:
        sub = st.tabs(["Notas emitidas", "Vendas aprovadas", "Cancelamentos", "Aguardando nota", "Notas sem pedido"])
        with sub[0]:
            tabela(rel.lista(C.FATURADO).drop(columns=["Motivo", "Comentário"]))
        with sub[1]:
            tabela(rel.lista(C.APROVADO).drop(columns=["Motivo"]))
        with sub[2]:
            tabela(rel.lista(C.CANCELADO))
        with sub[3]:
            ag = rel.aguardando_nota()
            st.caption(f"{len(ag)} pedidos feitos no período ainda sem nota fiscal: {fmt_moeda(ag['Valor'].sum())}. "
                       "Eles entram em Entregue quando a nota for emitida.")
            tabela(ag)
        with sub[4]:
            nsp = rel.lista(C.FATURADO)
            tabela(nsp[nsp["Pedido"] == "sem pedido"].drop(columns=["Motivo", "Comentário"]))
    else:
        tabela(rel.lista())
        if ss.filtro == C.ENTREGUE:
            ag = rel.aguardando_nota()
            st.markdown(f"**Aguardando nota** — {len(ag)} pedidos feitos no período ainda sem nota "
                        f"({fmt_moeda(ag['Valor'].sum())}), sem data de entrega")
            tabela(ag)

with tab["Feedback"]:
    st.caption("Motivo do cancelamento e acompanhamento pós-venda. Também é possível corrigir datas e o pedido ligado. "
               "As alterações ficam na base (dados/base.xlsx).")
    st.caption("Propostas do período e status selecionados no topo da página "
               "(Todos = propostas com qualquer movimentação no período).")
    pr = base.propostas
    m = pr.index.isin(rel.propostas_filtradas().index)
    cols = ["proposta", "cliente", "vendedor", "valor", "status", "data", "dt_aprovacao", "dt_cancelamento",
            "pedido", "nf", "motivo", "comentario"]
    ed = pr.loc[m, cols].copy()
    ed["valor"] = ed["valor"].map(fmt_moeda)
    editado = st.data_editor(
        ed, hide_index=True, width="stretch", key="editor",
        disabled=["proposta", "cliente", "vendedor", "valor", "status", "data", "nf"],
        column_config={
            "proposta": "Proposta", "cliente": "Cliente", "vendedor": "Vendedor",
            "valor": st.column_config.TextColumn("Valor"),
            "status": "Status",
            "data": st.column_config.DateColumn("Criação", format="DD/MM/YYYY"),
            "dt_aprovacao": st.column_config.DateColumn("Aprovação", format="DD/MM/YYYY"),
            "dt_cancelamento": st.column_config.DateColumn("Cancelamento", format="DD/MM/YYYY"),
            "pedido": st.column_config.TextColumn("Pedido ligado"),
            "nf": "Nota",
            "motivo": st.column_config.SelectboxColumn("Motivo", options=[""] + C.MOTIVOS),
            "comentario": st.column_config.TextColumn("Comentário / feedback", width="large"),
        })
    if st.button("Salvar feedback", type="primary"):
        for _, row in editado.iterrows():
            i = base.propostas.index[base.propostas["proposta"] == row["proposta"]][0]
            for c in ("dt_aprovacao", "dt_cancelamento", "pedido", "motivo", "comentario"):
                v = row[c]
                if c.startswith("dt_"):
                    v = pd.to_datetime(v) if pd.notna(v) else pd.NaT
                else:
                    v = "" if v is None or (isinstance(v, float) and pd.isna(v)) else str(v)
                base.propostas.at[i, c] = v
        base.ligar()
        try:
            base.salvar()
            st.success("Feedback salvo.")
        except BaseEmUso as e:
            st.error(str(e))

# ---------------------------------------------------------------- exportação (barra lateral)

with zona_export:
    st.divider()
    st.markdown("**Exportar relatório**")
    st.caption(f"{per.rotulo} x {rel.nome_b} · {ss.filtro}" if rel.compara else f"{per.rotulo} · {ss.filtro}")
    if st.button("Gerar PowerPoint", icon=":material/slideshow:", width="stretch"):
        with st.spinner("Gerando PowerPoint..."):
            dados = gerar_ppt(rel)
            nome = nome_arquivo(rel)
            (C.SAIDA / nome).write_bytes(dados)
            ss.ppt = (nome, dados)
    if "ppt" in ss:
        st.download_button(f"Baixar {ss.ppt[0]}", ss.ppt[1], file_name=ss.ppt[0], width="stretch",
                           icon=":material/download:", type="primary",
                           mime="application/vnd.openxmlformats-officedocument.presentationml.presentation")
    if st.button("Gerar Excel", icon=":material/table_view:", width="stretch"):
        with st.spinner("Gerando Excel..."):
            nome = nome_arquivo(rel, "xlsx")
            dados = excel_relatorio(rel.tabelas_excel())
            (C.SAIDA / nome).write_bytes(dados)
            ss.xlsx = (nome, dados)
    if "xlsx" in ss:
        st.download_button(f"Baixar {ss.xlsx[0]}", ss.xlsx[1], file_name=ss.xlsx[0], width="stretch",
                           icon=":material/download:", type="primary",
                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    st.caption((f"Comparando com {per_b.rotulo}. " if per_b else "Sem comparação. ")
               + "Uma cópia também fica salva na pasta saida/.")
