"""Testes com os exports reais de outubro/2026 (valores conferidos com o Bling).

Rodar:  .venv/bin/python -m pytest -q
"""
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from app import config as C
from app.base import Base
from app.metricas import FILTROS, TODOS, Relatorio
from app.periodo import Periodo
from app.planilha import excel_relatorio
from app.ppt import gerar_ppt

ENTRADA = Path(__file__).resolve().parent.parent / "entrada"
ARQS = ["vendas_2026-10-17-14-39-51.csv", "orcamentos_2026-10-17-14-33-27.csv", "notas_2026-10-17-16-41-00.pdf"]


def _arquivos(nomes=ARQS):
    return [(n, (ENTRADA / n).read_bytes()) for n in nomes]


@pytest.fixture(scope="module")
def base(tmp_path_factory):
    b = Base(tmp_path_factory.mktemp("b") / "base.xlsx")
    r = b.importar(_arquivos())
    assert not r["erros"], r["erros"]
    return b


SEMANA = Periodo.de("Semana", date(2026, 10, 16))


def test_importacao(base):
    p = base.pedidos_agregados()
    assert len(p) == 211 and len(base.pedidos) == 460
    assert p["total_pedido"].sum() == pytest.approx(1_569_174.76, abs=0.01)
    assert len(base.notas) == 164
    assert base.notas["total_nota"].sum() == pytest.approx(1_198_426.87, abs=0.01)  # = "Notas por Cliente" do Bling
    assert (base.notas["pedido"] != "").sum() == 162
    assert len(base.propostas) == 74 and len(base.itens_propostas) == 484
    # proposta com pedido mas sem nota continua Aprovado (entrega só com nota)
    assert base.propostas["status"].value_counts().to_dict() == {
        C.PROCESSO: 47, C.FATURADO: 16, C.APROVADO: 8, C.CANCELADO: 3}


def test_faturamento_igual_bling(base):
    """'Evolução do Faturamento' do Bling, 13 a 16/10/2026."""
    bling = {13: 114_852.50, 14: 111_528.63, 15: 123_318.92, 16: 128_087.46}
    for dia, valor in bling.items():
        r = Relatorio(base, Periodo.de("Dia", date(2026, 10, dia)))
        assert r.kpis()[0].atual == pytest.approx(valor, abs=0.01)
    assert Relatorio(base, SEMANA).kpis()[0].atual == pytest.approx(477_787.51, abs=0.01)
    assert Relatorio(base, Periodo.de("Mês", date(2026, 10, 1))).kpis()[0].atual == pytest.approx(1_198_426.87, abs=0.01)


def test_kpis_semana(base):
    k = {x.nome: x for x in Relatorio(base, SEMANA).kpis()}
    # entrega = data da nota do pedido; pedido sem nota não entra em Entregue
    assert k["Entregue (pedidos)"].atual == pytest.approx(468_219.80, abs=0.01)
    assert k["Entregue (pedidos)"].anterior == pytest.approx(519_763.37, abs=0.01)
    assert k["Pedidos entregues"].atual == 64
    assert k["Aguardando nota"].atual == pytest.approx(225_010.57, abs=0.01)  # pedidos da semana sem nota
    assert k["Vendas aprovadas"].atual == pytest.approx(183_148.94, abs=0.01)
    assert k["Propostas canceladas"].atual == 3
    assert k["Carteira em processo"].atual == pytest.approx(7_360_546.61, abs=0.01)


def test_filtros_por_status(base):
    esperado = {C.PROCESSO: 47, C.APROVADO: 11, C.ENTREGUE: 64, C.FATURADO: 65, C.CANCELADO: 3}
    for st, n in esperado.items():
        r = Relatorio(base, SEMANA, st)
        assert r.kpis()[0].atual == n
        assert len(r.lista()) == n


def test_reimportacao_nao_duplica(tmp_path):
    b = Base(tmp_path / "base.xlsx")
    b.importar(_arquivos())
    b.salvar()
    b2 = Base(tmp_path / "base.xlsx")
    assert b2.importar(_arquivos())["ignorados"] == ARQS  # identificados pelo conteúdo
    r = b2.importar(_arquivos(), forcar=True)
    assert r["mudancas"] == 0
    assert (len(b2.propostas), len(b2.pedidos), len(b2.notas)) == (74, 460, 164)


def test_mudanca_de_situacao(tmp_path):
    """Um export posterior com a proposta 24998 aprovada e a 25023 cancelada grava as datas da mudança."""
    b = Base(tmp_path / "base.xlsx")
    b.importar(_arquivos())
    txt = (ENTRADA / ARQS[1]).read_bytes().decode("utf-8-sig").splitlines()
    novo = []
    for l in txt:
        if '"24998"' in l:
            l = l.replace('"Rascunho"', '"Aprovado"')
        if '"25023"' in l:
            l = l.replace('"Rascunho"', '"Não aprovado"')
        novo.append(l)
    r = b.importar([("orcamentos_2026-10-20-09-00-00.csv", "\n".join(novo).encode("utf-8-sig"))])
    assert r["mudancas"] == 2
    p = b.propostas.set_index("proposta")
    assert p.loc["24998", "status"] == C.APROVADO
    assert p.loc["24998", "dt_aprovacao"] == pd.Timestamp(2026, 10, 20, 9)
    assert p.loc["25023", "status"] == C.CANCELADO
    assert "Rascunho -> Não aprovado" in p.loc["25023", "historico"]


def test_feedback_preservado(tmp_path):
    b = Base(tmp_path / "base.xlsx")
    b.importar(_arquivos())
    i = b.propostas.index[b.propostas["proposta"] == "25010"][0]
    b.propostas.at[i, "motivo"] = "Preço"
    b.propostas.at[i, "comentario"] = "Cliente achou caro"
    b.salvar()
    b2 = Base(tmp_path / "base.xlsx")
    b2.importar(_arquivos(), forcar=True)
    p = b2.propostas.set_index("proposta")
    assert p.loc["25010", "motivo"] == "Preço" and p.loc["25010", "comentario"] == "Cliente achou caro"
    assert Relatorio(b2, SEMANA).motivos().iloc[0]["Motivo"] in ("Preço", "Não informado")


@pytest.mark.parametrize("tipo", ["Dia", "Semana", "Mês", "Trimestre", "Semestre", "Ano"])
def test_periodos(tipo):
    p = Periodo.de(tipo, date(2026, 10, 16))
    assert p.inicio <= date(2026, 10, 16) <= p.fim
    assert p.anterior().fim < p.inicio
    assert p.deslocar(1).anterior() == p


def test_ppt_e_excel(base):
    for f in FILTROS:
        r = Relatorio(base, SEMANA, f)
        assert len(gerar_ppt(r)) > 30_000
        assert len(excel_relatorio(r.tabelas_excel())) > 5_000


def test_identifica_arquivo_pelo_conteudo(tmp_path):
    b = Base(tmp_path / "base.xlsx")
    b.importar(_arquivos())
    pdf = (ENTRADA / ARQS[2]).read_bytes()
    # mesmo conteúdo com outro nome: ignorado
    r = b.importar([("Notas faturadas outubro.pdf", pdf)])
    assert r["importados"] == [] and "mesmo conteúdo" in r["ignorados"][0]
    # mesmo nome com conteúdo diferente (export novo): importado
    orc = (ENTRADA / ARQS[1]).read_bytes().decode("utf-8-sig").replace('"Rascunho"', '"Aprovado"', 1)
    r = b.importar([(ARQS[1], orc.encode("utf-8-sig"))])
    assert len(r["importados"]) == 1 and r["mudancas"] == 1
    assert len(b.propostas) == 74


def test_guardar_em_entrada_nao_sobrescreve(tmp_path, monkeypatch):
    from app import base as B
    monkeypatch.setattr(B.C, "ENTRADA", tmp_path)
    assert B.guardar_em_entrada("Notas.pdf", b"a") == "Notas.pdf"
    assert B.guardar_em_entrada("Notas.pdf", b"a") == "Notas.pdf"        # idêntico: mesmo arquivo
    assert B.guardar_em_entrada("Notas.pdf", b"b") == "Notas (2).pdf"    # diferente: nome novo
    assert (tmp_path / "Notas.pdf").read_bytes() == b"a"


def test_data_entrega_e_a_da_nota(base):
    """Entregue só contém pedidos com nota, na data de emissão da nota; nunca usa a data do pedido."""
    notas = base.notas[base.notas["pedido"] != ""].set_index("pedido")
    for per in (SEMANA, Periodo.de("Mês", date(2026, 10, 1))):
        e = Relatorio(base, per).conjunto(C.ENTREGUE)
        assert e["chave"].isin(notas.index).all()
        for _, x in e.iterrows():
            assert x["data"] == notas.loc[x["chave"], "data"].normalize()
    ag = Relatorio(base, Periodo.de("Mês", date(2026, 10, 1))).aguardando_nota()
    assert len(ag) == 49 and not ag["Pedido"].isin(notas.index).any()
    assert len(Relatorio(base, SEMANA).aguardando_nota()) == 27
    assert base.propostas.loc[base.propostas["nf"] == "", "dt_entrega"].isna().all()


def test_abas_obedecem_periodo_e_status(base):
    """Aba Pedidos e Feedback seguem o período e o status escolhidos."""
    def ped(f, per=SEMANA):
        return Relatorio(base, per, f).pedidos_filtrados()[0]
    assert len(ped(TODOS)) == 90                                    # feitos na semana
    assert len(ped(TODOS, Periodo.de("Mês", date(2026, 10, 1)))) == 211
    assert len(ped(C.ENTREGUE)) == 64 and (ped(C.ENTREGUE)["Entregue"] == "Sim").all()
    assert set(ped(C.FATURADO)["Pedido"]) == set(ped(C.ENTREGUE)["Pedido"])
    assert len(ped(C.CANCELADO)) == 0 and len(ped(C.PROCESSO)) == 0
    assert ped(C.APROVADO)["Pedido"].isin(base.propostas["pedido"]).all()
    assert len(Relatorio(base, SEMANA, C.CANCELADO).propostas_filtradas()) == 3
    assert len(Relatorio(base, SEMANA, C.PROCESSO).propostas_filtradas()) == 47
    # tabs de ranking usam o conjunto do status no período
    for f in FILTROS[1:]:
        r = Relatorio(base, SEMANA, f)
        assert r.clientes()["Valor"].sum() <= r.conjunto(f)["valor"].sum() + 0.01


def test_funil_entregues_so_com_nota(base):
    f = Relatorio(base, SEMANA).funil().set_index("Etapa")["Qtd"].to_dict()
    assert f["Aprovadas"] == 6
    assert f["Com pedido, aguardando nota"] == 3      # 25059, 25063, 25069
    assert f["Entregues (com nota)"] == 3             # 25043, 25061, 25065


def test_formato_moeda():
    from app.utils import fmt_moeda, fmt_qtd
    assert fmt_moeda(138666.30000000002) == "R$ 138.666,30"
    assert fmt_moeda(6.77) == "R$ 6,77"
    assert fmt_qtd(0.1) == "0,10" and fmt_qtd(16288) == "16.288"


# ---------------------------------------------------------------- comparação entre períodos

def test_comparacao_ate_a_mesma_data():
    from app.periodo import ANO_ANTERIOR, ANTERIOR, MESMA_DATA, PERSONALIZADO, comparacao
    mes = Periodo.de("Mês", date(2026, 10, 1))
    a, b = comparacao(mes, MESMA_DATA, date(2026, 10, 16))
    assert (a.inicio, a.fim, a.parcial) == (date(2026, 10, 1), date(2026, 10, 16), True)
    assert (b.inicio, b.fim) == (date(2026, 9, 1), date(2026, 9, 16))
    assert a.curto == "Out/26 até 16/10" and b.rotulo == "Setembro de 2026 (até 16/09)"
    # mês anterior sem o dia: usa o último dia do mês
    a, b = comparacao(Periodo.de("Mês", date(2026, 3, 1)), MESMA_DATA, date(2026, 3, 30))
    assert b.fim == date(2026, 2, 28)
    a, b = comparacao(Periodo.de("Mês", date(2028, 3, 1)), MESMA_DATA, date(2028, 3, 30))
    assert b.fim == date(2028, 2, 29)  # bissexto
    # período já fechado: igual ao período anterior inteiro (fevereiro x janeiro inteiro)
    fev = Periodo.de("Mês", date(2026, 2, 1))
    assert comparacao(fev, MESMA_DATA, date(2026, 10, 16)) == (fev, fev.anterior())
    assert comparacao(fev, MESMA_DATA, date(2026, 10, 16))[1].fim == date(2026, 1, 31)
    # semana parcial: seg-sex x seg-sex
    a, b = comparacao(SEMANA, MESMA_DATA, date(2026, 10, 16))
    assert (a.fim, b.inicio, b.fim) == (date(2026, 10, 16), date(2026, 10, 5), date(2026, 10, 9))
    # período anterior não corta
    assert comparacao(mes, ANTERIOR, date(2026, 10, 16)) == (mes, mes.anterior())
    # ano anterior: mesmo corte; semana volta 52 semanas (mesmo dia da semana)
    a, b = comparacao(mes, ANO_ANTERIOR, date(2026, 10, 16))
    assert (b.inicio, b.fim) == (date(2025, 10, 1), date(2025, 10, 16))
    a, b = comparacao(SEMANA, ANO_ANTERIOR, date(2026, 10, 16))
    assert b.inicio.weekday() == 0 and b.inicio.year == 2025 and b.dias == a.dias
    # personalizado
    a, b = comparacao(mes, PERSONALIZADO, date(2026, 10, 16), date(2026, 9, 20), date(2026, 9, 5))
    assert a == mes and (b.inicio, b.fim) == (date(2026, 9, 5), date(2026, 9, 20))


def test_relatorio_comparado(base):
    from app.periodo import MESMA_DATA, comparacao
    a, b = comparacao(SEMANA, MESMA_DATA, base.cobertura()[1])
    r = Relatorio(base, a, TODOS, b, MESMA_DATA)
    assert r.cobertura_b == "total"
    k = {x.nome: x for x in r.kpis()}
    # semana até sexta 16/10: faturamento da semana inteira (não há notas no fim de semana)
    assert k["Faturamento (notas)"].atual == pytest.approx(477_787.51, abs=0.01)
    # diferença = A - B; variação = A / B - 1
    f = k["Faturamento (notas)"]
    assert f.delta == pytest.approx(f.atual - f.anterior) and f.delta < 0
    assert f.variacao == pytest.approx(f.atual / f.anterior - 1)
    assert f.melhorou is False                                  # faturamento caiu: piora
    assert k["Vendas aprovadas"].melhorou is True               # aprovadas subiram: melhora
    assert k["Propostas canceladas"].melhorou is False          # cancelamentos subiram: piora
    # cartões: todos os indicadores aparecem uma única vez, destaques primeiro
    g = r.grupos()
    assert g[0][0] == "Destaques" and sum(len(ks) for _, ks in g) == len(r.kpis())
    # curva acumulada termina no total do período
    ac = r.acumulado()
    assert ac[r.nome_a].dropna().iloc[-1] == pytest.approx(k["Faturamento (notas)"].atual, abs=0.01)
    assert ac[r.nome_b].dropna().iloc[-1] == pytest.approx(k["Faturamento (notas)"].anterior, abs=0.01)
    # altas e quedas: diferença = A - B, altas positivas, quedas negativas
    mv = r.variacoes("Clientes")
    assert (mv.loc[mv["Movimento"] == "Alta", "Diferença"] > 0).all()
    assert (mv.loc[mv["Movimento"] == "Queda", "Diferença"] < 0).all()
    assert (mv["Diferença"] - (mv["Valor"] - mv["Valor anterior"])).abs().max() < 0.01
    # ranking com a coluna de comparação
    assert {"Valor anterior", "Diferença", "Variação"} <= set(r.clientes().columns)


def test_comparacao_sem_dados(base):
    from app.periodo import MESMA_DATA, comparacao
    a, b = comparacao(Periodo.de("Mês", date(2026, 10, 1)), MESMA_DATA, base.cobertura()[1])
    r = Relatorio(base, a, TODOS, b, MESMA_DATA)
    assert r.cobertura_b == "nenhuma"
    assert r.acumulado()[r.nome_b].isna().all()
    for f in FILTROS:
        r = Relatorio(base, a, f, b, MESMA_DATA)
        assert len(gerar_ppt(r)) > 30_000
        assert len(excel_relatorio(r.tabelas_excel())) > 5_000


def test_sem_comparacao(base):
    from app.periodo import SEM_COMPARACAO, comparacao
    mes = Periodo.de("Mês", date(2026, 10, 1))
    a, b = comparacao(mes, SEM_COMPARACAO, date(2026, 10, 16))
    assert a == mes and b is None  # período inteiro, sem corte
    for f in FILTROS:
        r = Relatorio(base, a, f, b, SEM_COMPARACAO)
        assert not r.compara and r.cobertura_b == "total"
        assert not {"Valor anterior", "Diferença", "Variação"} & set(r.clientes().columns)
        assert not any("anterior" in c or c == "Variação" for c in r.vendedores().columns)
        t = r.tabelas_excel()
        assert list(t["Indicadores"].columns) == ["Indicador", "Valor"]
        assert "Altas e quedas" not in t and "Acumulado" not in t
        assert len(gerar_ppt(r)) > 30_000
        assert len(excel_relatorio(t)) > 5_000
