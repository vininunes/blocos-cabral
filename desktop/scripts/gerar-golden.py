"""Gera o gabarito (tests/golden/*.json) a partir do motor Python (../app), para conferir
que o motor em TypeScript (server/relatorio) dá exatamente os mesmos resultados.

Uso (da pasta desktop/):  ../.venv/bin/python scripts/gerar-golden.py
"""
import json
import math
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

from app import config as C  # noqa: E402
from app.base import Base  # noqa: E402
from app.metricas import DIMENSOES, FILTROS, Relatorio  # noqa: E402
from app.periodo import ANO_ANTERIOR, ANTERIOR, MESMA_DATA, SEM_COMPARACAO, Periodo, comparacao  # noqa: E402

ENTRADA = RAIZ / "entrada"
SAIDA = Path(__file__).resolve().parents[1] / "tests" / "golden"
ARQS = ["vendas_2026-10-17-14-39-51.csv", "orcamentos_2026-10-17-14-33-27.csv", "notas_2026-10-17-16-41-00.pdf"]


def val(v):
    if v is None or v is pd.NaT:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (pd.Timestamp, datetime)):
        if pd.isna(v):
            return None
        return v.strftime("%Y-%m-%d") if (v.hour, v.minute, v.second) == (0, 0, 0) else v.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(v, date):
        return v.isoformat()
    if hasattr(v, "item"):
        v = v.item()
        if isinstance(v, float) and math.isnan(v):
            return None
    return v


def recs(df: pd.DataFrame):
    return {"colunas": [str(c) for c in df.columns],
            "linhas": [[val(x) for x in row] for row in df.itertuples(index=False, name=None)]}


def dump_base(b: Base):
    return {
        "propostas": recs(b.propostas.drop(columns=["primeira_importacao", "ultima_atualizacao"])),
        "pedidos": recs(b.pedidos),
        "pedidosAgregados": recs(b.pedidos_agregados()),
        "notas": recs(b.notas),
        "itensPropostas": recs(b.itens_propostas),
        "cobertura": [val(x) for x in b.cobertura()],
    }


def per_json(p):
    return None if p is None else {"tipo": p.tipo, "inicio": val(p.inicio), "fim": val(p.fim), "parcial": p.parcial,
                                   "rotulo": p.rotulo, "curto": p.curto}


def dump_rel(r: Relatorio):
    k = r.kpis()
    out = {
        "nomeA": r.nome_a, "nomeB": r.nome_b, "coberturaB": r.cobertura_b,
        "kpis": [{"nome": x.nome, "atual": val(x.atual), "anterior": val(x.anterior), "formato": x.formato,
                  "inverso": x.inverso, "delta": val(x.delta), "variacao": val(x.variacao), "melhorou": x.melhorou}
                 for x in k],
        "grupos": [[t, [x.nome for x in ks]] for t, ks in r.grupos()],
        "acumulado": recs(r.acumulado()),
        "evolucao": recs(r.evolucao()),
        "vendedores": recs(r.vendedores()),
        "clientes": recs(r.clientes(50)),
        "cidades": recs(r.cidades(50)),
        "produtos": recs(r.produtos(50)),
        "funil": recs(r.funil()),
        "motivos": recs(r.motivos()),
        "lista": recs(r.lista()),
        "aguardandoNota": recs(r.aguardando_nota()),
        "pedidosFiltrados": recs(r.pedidos_filtrados()[0]),
        "pedidosExplicacao": r.pedidos_filtrados()[1],
        "propostasFiltradas": list(r.propostas_filtradas()["proposta"]),
        "variacoes": {d: recs(r.variacoes(d, 10)) for d in DIMENSOES},
    }
    if r.filtro == "Todos":
        out["todosPedidos"] = recs(r.todos_pedidos())
    return out


def cenarios(b: Base, periodos, modos):
    ultimo = b.cobertura()[1]
    res = []
    for tipo, ancora, de, ate in periodos:
        p = Periodo.de(tipo, ancora, de, ate)
        for modo in modos:
            a, bb = comparacao(p, modo, ultimo)
            for f in FILTROS:
                r = Relatorio(b, a, f, bb, modo)
                res.append({"tipo": tipo, "ancora": val(ancora), "de": val(de), "ate": val(ate), "modo": modo,
                            "filtro": f, "a": per_json(a), "b": per_json(bb), "rel": dump_rel(r)})
    return res


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    C.ENTRADA = tmp  # _hashes() não deve olhar a entrada/ real

    # base 1: os três exports de 17/10 (os mesmos dos testes Python)
    b1 = Base(tmp / "b1.xlsx")
    r1 = b1.importar([(n, (ENTRADA / n).read_bytes()) for n in ARQS])
    assert not r1["erros"], r1["erros"]
    periodos = [("Dia", date(2026, 10, 16), None, None), ("Semana", date(2026, 10, 16), None, None),
                ("Mês", date(2026, 10, 1), None, None), ("Mês", date(2026, 9, 1), None, None),
                ("Trimestre", date(2026, 10, 1), None, None), ("Ano", date(2026, 10, 1), None, None),
                ("Personalizado", date(2026, 10, 5), date(2026, 10, 5), date(2026, 10, 12))]
    modos = [MESMA_DATA, ANTERIOR, ANO_ANTERIOR, SEM_COMPARACAO]
    (SAIDA / "base1.json").write_text(json.dumps({
        "arquivos": ARQS, "resumo": {k: v for k, v in r1.items()}, "base": dump_base(b1),
        "cenarios": cenarios(b1, periodos, modos)}, ensure_ascii=False))

    # base antiga em .xlsx (migração): a base 1 com feedback preenchido, gravada pelo app Python
    i = b1.propostas.index[b1.propostas["proposta"] == "25010"][0]
    b1.propostas.at[i, "motivo"] = "Preço"
    b1.propostas.at[i, "comentario"] = "Cliente achou caro; voltar a falar em dezembro"
    b1.caminho = SAIDA / "base1-legado.xlsx"
    b1.salvar()

    # base 2: todos os exports de entrada/ (atualizações de status, PDF repetido com outro nome)
    nomes = sorted(p.name for p in ENTRADA.iterdir() if p.is_file() and not p.name.startswith("."))
    b2 = Base(tmp / "b2.xlsx")
    r2 = b2.importar([(n, (ENTRADA / n).read_bytes()) for n in nomes])
    # o "Notas Fiscais por Operação - Bling.pdf" é recusado (não é o relatório): erro esperado
    periodos2 = [("Semana", date(2026, 10, 16), None, None), ("Mês", date(2026, 10, 1), None, None)]
    (SAIDA / "base2.json").write_text(json.dumps({
        "arquivos": nomes, "resumo": {k: v for k, v in r2.items()}, "base": dump_base(b2),
        "cenarios": cenarios(b2, periodos2, [MESMA_DATA, ANTERIOR])}, ensure_ascii=False))
    for f in sorted(SAIDA.glob("*.json")):
        print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
