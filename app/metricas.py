"""Indicadores, rankings e listas do relatório para um período e um filtro de status."""
from dataclasses import dataclass

import pandas as pd

from . import config as C
from .periodo import ANTERIOR, SEM_COMPARACAO, Periodo
from .utils import DIAS, MESES

TODOS = "Todos"
FILTROS = [TODOS, C.PROCESSO, C.APROVADO, C.ENTREGUE, C.FATURADO, C.CANCELADO]
APROVADOS = (C.APROVADO, C.ENTREGUE, C.FATURADO)

# organização dos cartões (relatório completo): destaques + blocos na ordem do fluxo da venda
GRUPOS_TODOS = [
    ("Destaques", ["Faturamento (notas)", "Entregue (pedidos)", "Vendas aprovadas"]),
    ("Propostas", ["Propostas emitidas", "Taxa de aprovação", "Propostas canceladas", "Carteira em processo"]),
    ("Pedidos", ["Pedidos entregues", "Aguardando nota"]),
    ("Faturamento", ["Notas emitidas", "Ticket médio por nota", "Clientes faturados"]),
]
DIMENSOES = {"Clientes": ("cliente", "Cliente"), "Vendedores": ("vendedor", "Vendedor"),
             "Produtos": ("produto", "Produto"), "Cidades": ("cidade", "Cidade")}


@dataclass
class KPI:
    nome: str
    atual: float
    anterior: float
    formato: str = "int"      # moeda | int | pct | dias
    inverso: bool = False     # True quando subir é ruim (ex.: cancelamentos)

    @property
    def delta(self):
        """Diferença absoluta A - B (em fração para percentuais; exibida em p.p.). None se não houver base."""
        return None if self.anterior is None else self.atual - self.anterior

    @property
    def variacao(self):
        """Variação relativa A / B - 1 (ou em p.p. para percentuais). None se não houver base."""
        if self.formato == "pct":
            return self.delta
        if not self.anterior:
            return None
        return self.atual / self.anterior - 1

    @property
    def melhorou(self):
        """True se A está melhor que B (considerando indicadores em que subir é ruim); None se igual/sem base."""
        if not self.delta:
            return None
        return bool((self.delta > 0) != self.inverso)


def diferenca(atual: pd.Series, anterior: pd.Series):
    """(diferença, variação): A - B e A / B - 1."""
    return atual - anterior, (atual / anterior - 1).where(anterior > 0)


def _dias(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s).dt.normalize()


def _entre(s: pd.Series, ini, fim) -> pd.Series:
    d = _dias(s)
    return (d >= pd.Timestamp(ini)) & (d <= pd.Timestamp(fim))


def _cidade(df: pd.DataFrame) -> pd.Series:
    return df["cidade"].where(df["uf"] == "", df["cidade"] + "/" + df["uf"]).replace("", "(não informada)")


class Relatorio:
    def __init__(self, base, periodo: Periodo, filtro: str = TODOS, comparar: Periodo = None, modo: str = ANTERIOR):
        """periodo = A (analisado); comparar = B (padrão: período anterior).
        Com modo 'Sem comparação' o anterior ainda é calculado por dentro, mas não aparece nas saídas."""
        self.base, self.p, self.filtro = base, periodo, filtro
        self.ant = comparar or periodo.anterior()
        self.modo = modo
        self.compara = modo != SEM_COMPARACAO
        self._kpis = None
        self._peds = base.pedidos_agregados()
        props = base.propostas.copy()
        for c in ("data", "dt_aprovacao", "dt_cancelamento"):
            props[c] = _dias(props[c])
        self._props = props

    # ------------------------------------------------------------ conjuntos por status

    def conjunto(self, status: str, per: Periodo = None) -> pd.DataFrame:
        """Registros do status no período. Colunas: chave, data, criacao, valor, cliente, cnpj, cidade,
        vendedor, info, motivo, comentario, ref (chave para itens)."""
        per = per or self.p
        ini, fim = pd.Timestamp(per.inicio), pd.Timestamp(per.fim)
        cols = ["chave", "data", "criacao", "valor", "cliente", "cnpj", "cidade", "vendedor", "info",
                "motivo", "comentario", "ref"]
        if status == C.FATURADO:
            n = self.base.notas
            n = n[_entre(n["data"], ini, fim)]
            out = pd.DataFrame({"chave": n["nf"], "data": _dias(n["data"]), "criacao": _dias(n["data"]),
                                "valor": n["total_nota"], "cliente": n["cliente"], "cnpj": n["cnpj"],
                                "cidade": n["cidade"], "vendedor": n["vendedor"],
                                "info": n["pedido"].map(lambda x: f"ped. {x}" if x else "sem pedido"),
                                "motivo": "", "comentario": "", "ref": n["pedido"]})
            return out[cols]
        if status == C.ENTREGUE:
            # data de entrega = emissão da nota ligada ao pedido; pedido sem nota não tem data de entrega
            p = self._peds
            n = self.base.notas
            n = n[n["pedido"] != ""].drop_duplicates("pedido").set_index("pedido")
            p = p[p["pedido"].isin(n.index)].copy() if not p.empty else p
            p["entrega"] = _dias(p["pedido"].map(n["data"]))
            p = p[_entre(p["entrega"], ini, fim)]
            out = pd.DataFrame({"chave": p["pedido"], "data": p["entrega"], "criacao": _dias(p["data"]),
                                "valor": p["total_pedido"], "cliente": p["cliente"], "cnpj": p["cnpj"],
                                "cidade": _cidade(p), "vendedor": p["vendedor"],
                                "info": p["pedido"].map(lambda x: f"NF {n.at[x, 'nf']}"),
                                "motivo": "", "comentario": "", "ref": p["pedido"]})
            return out[cols]
        r = self._props
        if status == C.APROVADO:
            m = r["status"].isin(APROVADOS) & r["dt_aprovacao"].between(ini, fim)
            data = r["dt_aprovacao"]
            info = r["status"] + r["pedido"].map(lambda x: f" (ped. {x})" if x else "")
        elif status == C.CANCELADO:
            m = (r["status"] == C.CANCELADO) & r["dt_cancelamento"].between(ini, fim)
            data = r["dt_cancelamento"]
            info = r["status"]
        else:  # processo: carteira aberta no último dia do período
            decidida = ((r["status"].isin(APROVADOS) & (r["dt_aprovacao"] <= fim)) |
                        ((r["status"] == C.CANCELADO) & (r["dt_cancelamento"] <= fim)))
            m = (r["data"] <= fim) & ~decidida
            data = r["data"]
            info = ((fim - r["data"]).dt.days).astype("Int64").astype(str) + " dias"
        s = r[m]
        out = pd.DataFrame({"chave": s["proposta"], "data": data[m], "criacao": s["data"], "valor": s["valor"],
                            "cliente": s["cliente"], "cnpj": s["cnpj"], "cidade": _cidade(s),
                            "vendedor": s["vendedor"], "info": info[m], "motivo": s["motivo"],
                            "comentario": s["comentario"], "ref": s["proposta"]})
        return out[cols]

    def aguardando_nota(self, per: Periodo = None) -> pd.DataFrame:
        """Pedidos feitos no período (data do pedido) que ainda não têm nota fiscal, ou seja, sem data de entrega."""
        per = per or self.p
        p = self._peds
        if p.empty:
            return pd.DataFrame(columns=["Pedido", "Cliente", "Vendedor", "Valor", "Data do pedido"])
        ligados = set(self.base.notas["pedido"]) - {""}
        p = p[~p["pedido"].isin(ligados) & _entre(p["data"], per.inicio, per.fim)]
        p = p.sort_values("total_pedido", ascending=False)
        return pd.DataFrame({"Pedido": p["pedido"], "Cliente": p["cliente"], "Vendedor": p["vendedor"],
                             "Valor": p["total_pedido"], "Data do pedido": _dias(p["data"])}).reset_index(drop=True)

    def todos_pedidos(self) -> pd.DataFrame:
        """Todos os pedidos da base, indicando se já foram entregues (têm nota fiscal) e a proposta de origem."""
        p = self._peds
        cols = ["Pedido", "Entregue", "Data do pedido", "Data entrega", "Nota", "Cliente", "Valor", "Vendedor",
                "Cidade", "Proposta"]
        if p.empty:
            return pd.DataFrame(columns=cols)
        n = self.base.notas
        n = n[n["pedido"] != ""].drop_duplicates("pedido").set_index("pedido")
        pr = self.base.propostas
        pr = pr[pr["pedido"] != ""].drop_duplicates("pedido").set_index("pedido")["proposta"]
        entregue = p["pedido"].isin(n.index)
        out = pd.DataFrame({
            "Pedido": p["pedido"], "Data do pedido": _dias(p["data"]), "Cliente": p["cliente"], "Cidade": _cidade(p),
            "Vendedor": p["vendedor"], "Valor": p["total_pedido"],
            "Entregue": entregue.map({True: "Sim", False: "Não"}),
            "Data entrega": _dias(p["pedido"].map(n["data"])),
            "Nota": p["pedido"].map(n["nf"]).fillna(""),
            "Proposta": p["pedido"].map(pr).fillna(""),
        })
        return out.sort_values(["Data do pedido", "Pedido"], ascending=False).reset_index(drop=True)[cols]

    def pedidos_filtrados(self):
        """Pedidos da aba Pedidos conforme período e status. Devolve (DataFrame, explicação)."""
        todos = self.todos_pedidos()
        f = self.filtro
        if f == TODOS:
            m = todos["Data do pedido"].between(pd.Timestamp(self.p.inicio), pd.Timestamp(self.p.fim))
            return todos[m], "Pedidos feitos no período (pela data do pedido)."
        if f in (C.ENTREGUE, C.FATURADO):
            refs = set(self.conjunto(f)["ref"]) - {""}
            txt = ("Pedidos entregues no período (pela data da nota fiscal)." if f == C.ENTREGUE else
                   "Pedidos das notas emitidas no período.")
            return todos[todos["Pedido"].isin(refs)], txt
        if f == C.APROVADO:
            ap = self.conjunto(C.APROVADO)
            peds = set(self.base.propostas.set_index("proposta").loc[list(ap["chave"]), "pedido"]) - {""} if len(ap) else set()
            return (todos[todos["Pedido"].isin(peds)],
                    "Pedidos gerados pelas propostas aprovadas no período.")
        return todos.iloc[0:0], f"Propostas com status '{f}' ainda não geraram pedido."

    def propostas_filtradas(self) -> pd.DataFrame:
        """Propostas da aba Feedback conforme período e status (índices da base)."""
        pr = self.base.propostas
        if self.filtro == TODOS:
            ini, fim = pd.Timestamp(self.p.inicio), pd.Timestamp(self.p.fim)
            mov = pd.Series(False, index=pr.index)
            for c in ("data", "dt_aprovacao", "dt_cancelamento", "dt_entrega", "dt_faturamento"):
                mov |= _dias(pr[c]).between(ini, fim)
            return pr[mov]
        if self.filtro in (C.ENTREGUE, C.FATURADO):
            refs = set(self.conjunto(self.filtro)["ref"]) - {""}
            return pr[pr["pedido"].isin(refs)]
        return pr[pr["proposta"].isin(set(self.conjunto(self.filtro)["chave"]))]

    def itens(self, status: str, conj: pd.DataFrame) -> pd.DataFrame:
        """Itens (produto, un, qtd, valor) dos registros do conjunto."""
        if status in (C.ENTREGUE, C.FATURADO):
            it = self.base.pedidos
            it = it[it["pedido"].isin(set(conj["ref"]) - {""})]
            return pd.DataFrame({"produto": it["produto"], "un": it["un"], "qtd": it["qtd"], "valor": it["vlr_item"]})
        it = self.base.itens_propostas
        it = it[it["proposta"].isin(set(conj["ref"]))]
        return pd.DataFrame({"produto": it["produto"], "un": it["un"], "qtd": it["qtd"], "valor": it["vlr_total"]})

    # ------------------------------------------------------------ KPIs

    def kpis(self) -> list:
        if self._kpis is None:
            self._kpis = self._kpis_todos() if self.filtro == TODOS else self._kpis_foco(self.filtro)
        return self._kpis

    def grupos(self) -> list:
        """[(título, [KPI])]: primeiro os destaques, depois os blocos por etapa do fluxo."""
        k = self.kpis()
        if self.filtro == TODOS:
            pelo_nome = {x.nome: x for x in k}
            return [(t, [pelo_nome[n] for n in nomes]) for t, nomes in GRUPOS_TODOS]
        return [("Destaques", [k[1], k[0], k[2]]), ("Indicadores", k[3:])]

    # ------------------------------------------------------------ comparação A x B

    @property
    def nome_a(self) -> str:
        return self.p.curto

    @property
    def nome_b(self) -> str:
        return self.ant.curto if self.ant.curto != self.p.curto else self.ant.curto + " (B)"

    @property
    def cobertura_b(self) -> str:
        """'total', 'parcial' ou 'nenhuma': quanto do período B a base cobre."""
        ini, fim = self.base.cobertura()
        b = self.ant
        if not self.compara:
            return "total"
        if ini is None or b.fim < ini or b.inicio > fim:
            return "nenhuma"
        return "parcial" if b.inicio < ini or b.fim > fim else "total"

    def _sem_b(self, df: pd.DataFrame) -> pd.DataFrame:
        """Sem comparação: tira as colunas do período B (anterior, diferença, variação)."""
        if self.compara:
            return df
        return df.drop(columns=[c for c in df.columns if "anterior" in c or c in ("Diferença", "Variação")])

    def renomear(self, df: pd.DataFrame) -> pd.DataFrame:
        """'Valor anterior' -> 'Valor (Set/26)' para exibição."""
        return df.rename(columns={c: c.replace("anterior", f"({self.nome_b})") for c in df.columns if "anterior" in c})

    def _carteira(self, dia) -> float:
        r, d = self._props, pd.Timestamp(dia)
        decidida = ((r["status"].isin(APROVADOS) & (r["dt_aprovacao"] <= d)) |
                    ((r["status"] == C.CANCELADO) & (r["dt_cancelamento"] <= d)))
        return float(r.loc[(r["data"] <= d) & ~decidida, "valor"].sum())

    def acumulado(self, status: str = None) -> pd.DataFrame:
        """Valor acumulado dia a dia de A e de B, alinhados pelo dia do período (Em processo: carteira no dia).
        Dias depois do último dia com dados ficam vazios. Colunas: Dia, Rótulo, <A>, <B>."""
        st = status or self._foco_ou_faturado()
        ultimo = self.base.cobertura()[1]

        def serie(per):
            dias = pd.date_range(per.inicio, per.fim, freq="D")
            if st == C.PROCESSO:
                v = pd.Series([self._carteira(d) for d in dias], index=dias)
            else:
                c = self.conjunto(st, per)
                v = c.groupby("data")["valor"].sum().reindex(dias, fill_value=0).cumsum()
            if ultimo is not None:
                v = v.where(v.index <= pd.Timestamp(ultimo))
            return v.reset_index(drop=True)

        a, b = serie(self.p), serie(self.ant)
        if self.cobertura_b == "nenhuma":  # sem dados de B: linha vazia em vez de zerada
            b[:] = float("nan")
        n = max(len(a), len(b))
        if self.p.tipo == "Semana" and self.ant.tipo == "Semana":
            rot = [DIAS[i % 7][:3] for i in range(n)]
        else:
            rot = [str(i + 1) for i in range(n)]
        out = pd.DataFrame({"Dia": range(1, n + 1), "Rótulo": rot,
                            self.nome_a: a.reindex(range(n)).values, self.nome_b: b.reindex(range(n)).values})
        return out if self.compara else out.dropna(subset=[self.nome_a], how="all").drop(columns=self.nome_b)

    def _por(self, col: str, per: Periodo) -> pd.Series:
        st = self._foco_ou_faturado()
        c = self.conjunto(st, per)
        if col == "produto":
            return self.itens(st, c).groupby("produto")["valor"].sum()
        return c.groupby(col)["valor"].sum()

    def _com_anterior(self, t: pd.DataFrame, col: str, chave: str) -> pd.DataFrame:
        """Acrescenta Valor anterior, Diferença e Variação a um ranking (linhas já escolhidas pelo período A)."""
        if not self.compara:
            return t
        t["Valor anterior"] = t[chave].map(self._por(col, self.ant)).fillna(0)
        t["Diferença"], t["Variação"] = diferenca(t["Valor"], t["Valor anterior"])
        return t

    def variacoes(self, dim: str = "Clientes", n: int = 5) -> pd.DataFrame:
        """Maiores altas e maiores quedas de valor entre A e B (inclui quem só aparece em um dos dois)."""
        col, nome = DIMENSOES[dim]
        t = pd.DataFrame({"Valor": self._por(col, self.p), "Valor anterior": self._por(col, self.ant)}).fillna(0)
        t["Diferença"], t["Variação"] = diferenca(t["Valor"], t["Valor anterior"])
        altas = t[t["Diferença"] > 0.005].nlargest(n, "Diferença")
        quedas = t[t["Diferença"] < -0.005].nsmallest(n, "Diferença")
        out = pd.concat([altas, quedas]).rename_axis(nome).reset_index()
        out.insert(0, "Movimento", ["Alta"] * len(altas) + ["Queda"] * len(quedas))
        return out

    def _kpis_todos(self) -> list:
        def calc(per):
            fat, ent = self.conjunto(C.FATURADO, per), self.conjunto(C.ENTREGUE, per)
            apr, can = self.conjunto(C.APROVADO, per), self.conjunto(C.CANCELADO, per)
            car = self.conjunto(C.PROCESSO, per)
            r = self._props
            emit = r[r["data"].between(pd.Timestamp(per.inicio), pd.Timestamp(per.fim))]
            decid = len(apr) + len(can)
            return [fat["valor"].sum(), len(fat), fat["valor"].mean() if len(fat) else 0, fat["cliente"].nunique(),
                    ent["valor"].sum(), len(ent), apr["valor"].sum(), len(emit),
                    (len(apr) / decid) if decid else None, len(can), car["valor"].sum()]
        a, b = calc(self.p), calc(self.ant)
        a.append(self.aguardando_nota(self.p)["Valor"].sum())
        b.append(self.aguardando_nota(self.ant)["Valor"].sum())
        nomes = ["Faturamento (notas)", "Notas emitidas", "Ticket médio por nota", "Clientes faturados",
                 "Entregue (pedidos)", "Pedidos entregues", "Vendas aprovadas", "Propostas emitidas",
                 "Taxa de aprovação", "Propostas canceladas", "Carteira em processo", "Aguardando nota"]
        fmts = ["moeda", "int", "moeda", "int", "moeda", "int", "moeda", "int", "pct", "int", "moeda", "moeda"]
        inv = {9, 11}
        return [KPI(n, a[i] if a[i] is not None else 0, b[i], fmts[i], i in inv) for i, n in enumerate(nomes)]

    def _kpis_foco(self, st: str) -> list:
        def calc(per):
            c = self.conjunto(st, per)
            q, v = len(c), c["valor"].sum()
            base = [q, v, v / q if q else 0, c["cliente"].nunique()]
            if st == C.FATURADO:
                extra = [c["cidade"].nunique(), (c["info"] == "sem pedido").sum()]
            elif st == C.ENTREGUE:
                extra = [c["cidade"].nunique(), self.aguardando_nota(per)["Valor"].sum()]
            elif st == C.APROVADO:
                ja = c["info"].str.startswith((C.ENTREGUE, C.FATURADO)).sum()
                extra = [ja, (c["data"] - c["criacao"]).dt.days.mean() if q else 0]
            elif st == C.CANCELADO:
                extra = [(c["motivo"] == "").sum(), (c["data"] - c["criacao"]).dt.days.mean() if q else 0]
            else:
                idade = (pd.Timestamp(per.fim) - c["criacao"]).dt.days
                extra = [(idade > 30).sum(), idade.mean() if q else 0]
            return [x if x is None else (0 if x != x else x) for x in base + extra]
        a, b = calc(self.p), calc(self.ant)
        nomes = {
            C.FATURADO: ["Notas emitidas", "Faturamento", "Ticket médio", "Clientes", "Cidades", "Notas sem pedido"],
            C.ENTREGUE: ["Pedidos entregues", "Valor entregue", "Ticket médio", "Clientes", "Cidades",
                         "Aguardando nota"],
            C.APROVADO: ["Propostas aprovadas", "Valor aprovado", "Ticket médio", "Clientes",
                         "Já entregues/faturadas", "Dias médios até aprovar"],
            C.CANCELADO: ["Propostas canceladas", "Valor perdido", "Ticket médio", "Clientes",
                          "Sem motivo informado", "Dias médios até cancelar"],
            C.PROCESSO: ["Propostas em aberto", "Valor em aberto", "Ticket médio", "Clientes",
                         "Paradas há mais de 30 dias", "Idade média (dias)"],
        }[st]
        fmts = ["int", "moeda", "moeda", "int", "int", "dias"]
        if st == C.ENTREGUE:
            fmts[5] = "moeda"
        inverso = st == C.CANCELADO
        return [KPI(n, a[i] if a[i] is not None else 0, b[i], fmts[i], inverso or (st == C.PROCESSO and i >= 4) or
                    (st == C.ENTREGUE and i == 5) or (st == C.FATURADO and i == 5))
                for i, n in enumerate(nomes)]

    # ------------------------------------------------------------ evolução

    def _baldes(self, per: Periodo):
        ini, fim = per.inicio, per.fim
        if per.tipo == "Dia":
            ini = fim - pd.Timedelta(days=6)
        g = Periodo("Personalizado", ini, fim).granularidade()
        dias = pd.date_range(ini, fim, freq="D")
        if g == "dia":
            chave = dias
            rot = [f"{DIAS[d.weekday()][:3]} {d:%d/%m}" for d in dias]
        elif g == "semana":
            chave = dias - pd.to_timedelta(dias.weekday, unit="D")
            rot = [f"Sem {d:%d/%m}" for d in chave]
        else:
            chave = dias.to_period("M").to_timestamp()
            rot = [f"{MESES[d.month - 1][:3]}/{d:%y}" for d in chave]
        mapa = pd.DataFrame({"dia": dias, "balde": chave, "rotulo": rot})
        return g, mapa, pd.Timestamp(ini), pd.Timestamp(fim)

    def evolucao(self) -> pd.DataFrame:
        """Todos: Faturado x Entregue por balde. Foco: valor e qtd do status (Processo: carteira por idade)."""
        if self.filtro == C.PROCESSO:
            c = self.conjunto(C.PROCESSO)
            idade = (pd.Timestamp(self.p.fim) - c["criacao"]).dt.days
            faixas = ["0 a 7 dias", "8 a 15 dias", "16 a 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90 dias"]
            f = pd.cut(idade, [-1, 7, 15, 30, 60, 90, 10**6], labels=faixas)
            t = c.groupby(f, observed=False)["valor"].agg(["sum", "count"]).reindex(faixas, fill_value=0)
            return pd.DataFrame({"Idade": faixas, "Valor": t["sum"].values, "Qtd": t["count"].values})
        g, mapa, ini, fim = self._baldes(self.p)
        per = Periodo("Personalizado", ini.date(), fim.date())
        series = {C.FATURADO: C.FATURADO, C.ENTREGUE: C.ENTREGUE} if self.filtro == TODOS else {self.filtro: self.filtro}
        out = mapa.groupby("balde", sort=True)["rotulo"].first().to_frame()
        for nome, st in series.items():
            c = self.conjunto(st, per)
            c = c.merge(mapa, left_on="data", right_on="dia", how="inner")
            out[nome] = c.groupby("balde")["valor"].sum()
            if self.filtro != TODOS:
                out["Qtd"] = c.groupby("balde")["valor"].count()
        out = out.fillna(0).reset_index(drop=True).rename(columns={"rotulo": g.capitalize()})
        return out

    # ------------------------------------------------------------ rankings

    def _foco_ou_faturado(self):
        return C.FATURADO if self.filtro == TODOS else self.filtro

    def vendedores(self) -> pd.DataFrame:
        if self.filtro != TODOS:
            st = self.filtro
            a, b = self.conjunto(st), self.conjunto(st, self.ant)
            t = a.groupby("vendedor")["valor"].agg(Qtd="count", Valor="sum")
            t["Valor anterior"] = b.groupby("vendedor")["valor"].sum()
            t = t.fillna(0).sort_values("Valor", ascending=False)
            t["Diferença"], t["Variação"] = diferenca(t["Valor"], t["Valor anterior"])
            return self._sem_b(t.reset_index().rename(columns={"vendedor": "Vendedor"}))
        fat, ent = self.conjunto(C.FATURADO), self.conjunto(C.ENTREGUE)
        apr, can = self.conjunto(C.APROVADO), self.conjunto(C.CANCELADO)
        r = self._props
        emit = r[r["data"].between(pd.Timestamp(self.p.inicio), pd.Timestamp(self.p.fim))]
        t = pd.DataFrame({
            "Faturado": fat.groupby("vendedor")["valor"].sum(),
            "Notas": fat.groupby("vendedor")["valor"].count(),
            "Entregue": ent.groupby("vendedor")["valor"].sum(),
            "Aprovado": apr.groupby("vendedor")["valor"].sum(),
            "Propostas": emit.groupby("vendedor")["proposta"].count(),
            "Canceladas": can.groupby("vendedor")["valor"].count(),
            "Faturado anterior": self.conjunto(C.FATURADO, self.ant).groupby("vendedor")["valor"].sum(),
        }).fillna(0)
        t = t[(t.drop(columns="Faturado anterior") != 0).any(axis=1)].sort_values("Faturado", ascending=False)
        t["Diferença"], t["Variação"] = diferenca(t["Faturado"], t["Faturado anterior"])
        return self._sem_b(t.reset_index().rename(columns={"index": "Vendedor", "vendedor": "Vendedor"}))

    def clientes(self, n=10) -> pd.DataFrame:
        c = self.conjunto(self._foco_ou_faturado())
        t = c.groupby("cliente").agg(Cidade=("cidade", "first"), Qtd=("valor", "count"), Valor=("valor", "sum"))
        t = t.sort_values("Valor", ascending=False).head(n).reset_index().rename(columns={"cliente": "Cliente"})
        return self._com_anterior(t, "cliente", "Cliente")

    def cidades(self, n=10) -> pd.DataFrame:
        c = self.conjunto(self._foco_ou_faturado())
        t = c.groupby("cidade").agg(Qtd=("valor", "count"), Valor=("valor", "sum"))
        t = t.sort_values("Valor", ascending=False).head(n).reset_index().rename(columns={"cidade": "Cidade"})
        return self._com_anterior(t, "cidade", "Cidade")

    def produtos(self, n=10) -> pd.DataFrame:
        st = self._foco_ou_faturado()
        it = self.itens(st, self.conjunto(st))
        t = it.groupby("produto").agg(Un=("un", "first"), Quantidade=("qtd", "sum"), Valor=("valor", "sum"))
        t = t.sort_values("Valor", ascending=False).head(n).reset_index().rename(columns={"produto": "Produto"})
        return self._com_anterior(t, "produto", "Produto")

    def funil(self) -> pd.DataFrame:
        """Propostas emitidas no período e a situação atual delas."""
        r = self._props
        e = r[r["data"].between(pd.Timestamp(self.p.inicio), pd.Timestamp(self.p.fim))]
        aprov = e[e["status"].isin(APROVADOS)]
        etapas = [("Propostas emitidas", e),
                  ("Em processo", e[e["status"] == C.PROCESSO]),
                  ("Aprovadas", aprov),
                  ("Com pedido, aguardando nota", aprov[(aprov["pedido"] != "") & (aprov["nf"] == "")]),
                  ("Entregues (com nota)", e[e["status"] == C.FATURADO]),
                  ("Canceladas", e[e["status"] == C.CANCELADO])]
        t = pd.DataFrame([{"Etapa": n, "Qtd": len(d), "Valor": d["valor"].sum()} for n, d in etapas])
        t["% das emitidas"] = t["Qtd"] / len(e) if len(e) else 0.0
        return t

    def motivos(self) -> pd.DataFrame:
        c = self.conjunto(C.CANCELADO)
        c = c.assign(motivo=c["motivo"].replace("", "Não informado"))
        t = c.groupby("motivo")["valor"].agg(Qtd="count", Valor="sum").sort_values("Qtd", ascending=False)
        return t.reset_index().rename(columns={"motivo": "Motivo"})

    def lista(self, status: str = None, n=None) -> pd.DataFrame:
        st = status or self._foco_ou_faturado()
        c = self.conjunto(st).sort_values("valor", ascending=False)
        if n:
            c = c.head(n)
        rot = {C.FATURADO: ("Nota", "Emissão", "Pedido"), C.ENTREGUE: ("Pedido", "Entrega", "Nota"),
               C.APROVADO: ("Proposta", "Aprovada em", "Status"), C.CANCELADO: ("Proposta", "Cancelada em", "Status"),
               C.PROCESSO: ("Proposta", "Criação", "Idade")}[st]
        return pd.DataFrame({rot[0]: c["chave"], "Cliente": c["cliente"], "Vendedor": c["vendedor"],
                             "Valor": c["valor"], rot[1]: c["data"], rot[2]: c["info"],
                             "Motivo": c["motivo"], "Comentário": c["comentario"]}).reset_index(drop=True)

    def tabelas_excel(self) -> dict:
        k = self.kpis()
        ind = pd.DataFrame({"Indicador": [x.nome for x in k], self.nome_a: [x.atual for x in k],
                            self.nome_b: [x.anterior for x in k], "Diferença": [x.delta for x in k],
                            "Variação": [x.variacao for x in k]})
        ind.attrs["formatos"] = [x.formato for x in k]  # moeda/int/pct/dias por linha
        if not self.compara:
            ind = ind[["Indicador", self.nome_a]].rename(columns={self.nome_a: "Valor"})
            ind.attrs["formatos"] = [x.formato for x in k]
        mov = pd.concat([self.variacoes(d, 10).rename(columns={DIMENSOES[d][1]: "Nome"}).assign(Dimensão=d)
                         for d in DIMENSOES], ignore_index=True)
        mov = mov[["Dimensão", "Movimento", "Nome", "Valor", "Valor anterior", "Diferença", "Variação"]]
        t = {"Indicadores": ind, "Acumulado": self.acumulado().drop(columns="Rótulo"),
             "Altas e quedas": self.renomear(mov),
             "Evolução": self.evolucao(), "Vendedores": self.renomear(self.vendedores()),
             "Clientes": self.renomear(self.clientes(50)), "Produtos": self.renomear(self.produtos(50)),
             "Cidades": self.renomear(self.cidades(50))}
        if not self.compara:
            del t["Acumulado"], t["Altas e quedas"]
        if self.filtro == TODOS:
            t["Funil"] = self.funil()
            t["Aprovadas"] = self.lista(C.APROVADO)
            t["Canceladas"] = self.lista(C.CANCELADO)
            t["Aguardando nota"] = self.aguardando_nota()
            t["Notas"] = self.lista(C.FATURADO)
        else:
            t["Detalhamento"] = self.lista()
            if self.filtro == C.CANCELADO:
                t["Motivos"] = self.motivos()
            if self.filtro == C.ENTREGUE:
                t["Aguardando nota"] = self.aguardando_nota()
        return t
