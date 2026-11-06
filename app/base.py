"""Base histórica (dados/base.xlsx): propostas, pedidos, itens, notas e arquivos importados.

Regras do fluxo:
  Processo de venda -> Aprovado -> Entregue (pedido Atendido) -> Faturado (nota emitida)
- Data de entrega = data de emissão da nota do pedido. Sem nota, o pedido não tem data de entrega.
                    \\-> Cancelado
- A situação do Bling define Processo / Aprovado / Cancelado (config.MAPA_SITUACAO).
- A data de cada mudança vem da 'Última ocorrência' do Bling ou, se vazia, da data do export.
- Proposta aprovada é ligada a um pedido do mesmo CNPJ (valor igual tem prioridade).
- Nota fiscal é ligada a um pedido do mesmo cliente com o mesmo valor (a nota não traz CNPJ).
- Colunas preenchidas pela equipe (motivo, comentário, pedido/datas corrigidos) nunca são sobrescritas.
"""
from datetime import datetime
from pathlib import Path

import hashlib

import pandas as pd

from . import config as C
from .leitores import ler_notas_pdf, ler_orcamentos, ler_vendas, tipo_arquivo
from .utils import chave_nome, fmt_data, norm

# colunas internas -> cabeçalho na planilha
COLS = {
    "Propostas": {
        "proposta": "Proposta", "data": "Data criação", "cliente": "Cliente", "cnpj": "CNPJ/CPF",
        "cidade": "Cidade", "uf": "UF", "vendedor": "Vendedor", "valor": "Valor",
        "situacao_bling": "Situação Bling", "status": "Status", "dt_aprovacao": "Data aprovação",
        "dt_cancelamento": "Data cancelamento", "pedido": "Pedido ligado", "dt_entrega": "Data entrega",
        "nf": "Nota fiscal", "dt_faturamento": "Data faturamento", "motivo": "Motivo",
        "comentario": "Comentário / feedback", "ult_ocorrencia": "Última ocorrência Bling",
        "primeira_importacao": "1ª importação", "ultima_atualizacao": "Última atualização",
        "historico": "Histórico de status",
    },
    "Pedidos": {
        "pedido": "Pedido", "data": "Data", "cliente": "Cliente", "cnpj": "CNPJ/CPF", "cidade": "Cidade",
        "uf": "UF", "produto": "Produto", "sku": "SKU", "un": "Un", "qtd": "Quantidade",
        "vlr_unit": "Valor unitário", "vlr_item": "Valor item", "total_pedido": "Total pedido",
        "frete": "Frete", "desconto": "Desconto", "vendedor": "Vendedor", "pagamento": "Forma de pagamento",
        "arquivo": "Arquivo de origem",
    },
    "Notas": {
        "nf": "Nota fiscal", "data": "Data emissão", "cliente": "Cliente", "uf": "UF", "operacao": "Operação",
        "vlr_produtos": "Valor produtos", "frete": "Frete", "desconto": "Desconto", "seguro": "Seguro",
        "outras": "Outras despesas", "total_faturado": "Total faturado", "total_nota": "Total nota",
        "pedido": "Pedido ligado", "vendedor": "Vendedor", "cidade": "Cidade", "cnpj": "CNPJ/CPF",
        "arquivo": "Arquivo de origem",
    },
    "ItensPropostas": {
        "proposta": "Proposta", "produto": "Produto", "codigo": "Código", "un": "Un", "qtd": "Quantidade",
        "vlr_unit": "Preço unitário", "vlr_total": "Preço total",
    },
    "Arquivos": {"arquivo": "Arquivo", "tipo": "Tipo", "importado_em": "Importado em", "linhas": "Linhas",
                 "hash": "Identificador do conteúdo"},
}
TEXTO = {"proposta", "pedido", "nf", "cnpj", "sku", "codigo", "hash"}
DATAS = {"data", "dt_aprovacao", "dt_cancelamento", "dt_entrega", "dt_faturamento", "ult_ocorrencia",
         "primeira_importacao", "ultima_atualizacao", "importado_em"}
EDITAVEIS = ["dt_aprovacao", "dt_cancelamento", "pedido", "motivo", "comentario"]
NUMEROS = {"valor", "qtd", "vlr_unit", "vlr_item", "total_pedido", "frete", "desconto", "vlr_produtos", "seguro",
           "outras", "total_faturado", "total_nota", "vlr_total", "linhas"}


def ajustar_tipos(df: pd.DataFrame) -> pd.DataFrame:
    """Garante datas como datetime, valores como float e códigos como texto (também após concat)."""
    df = df.copy()
    for c in df.columns:
        if c in DATAS:
            df[c] = pd.to_datetime(df[c], errors="coerce", dayfirst=True)
        elif c in NUMEROS:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)
        elif c in TEXTO:
            df[c] = df[c].map(lambda v: "" if v is None or (isinstance(v, float) and v != v) else str(v).removesuffix(".0"))
        else:
            df[c] = df[c].map(lambda v: "" if v is None or (isinstance(v, float) and v != v) else v)
    return df


class BaseEmUso(Exception):
    pass


class Base:
    def __init__(self, caminho: Path = C.BASE_XLSX):
        self.caminho = Path(caminho)
        self.t = {aba: ajustar_tipos(pd.DataFrame(columns=list(cols))) for aba, cols in COLS.items()}
        if self.caminho.exists():
            self._carregar()

    # ------------------------------------------------------------ persistência

    def _carregar(self):
        xls = pd.read_excel(self.caminho, sheet_name=None, dtype=object)
        for aba, cols in COLS.items():
            if aba not in xls:
                continue
            df = xls[aba].rename(columns={v: k for k, v in cols.items()})
            for c in cols:
                if c not in df.columns:
                    df[c] = None
            self.t[aba] = ajustar_tipos(df[list(cols)])

    def salvar(self):
        from .planilha import gravar_base
        try:
            gravar_base(self)
        except PermissionError as e:
            raise BaseEmUso("Feche o arquivo dados/base.xlsx no Excel e tente de novo.") from e

    @property
    def propostas(self):
        return self.t["Propostas"]

    @property
    def pedidos(self):
        return self.t["Pedidos"]

    @property
    def notas(self):
        return self.t["Notas"]

    @property
    def itens_propostas(self):
        return self.t["ItensPropostas"]

    def pedidos_agregados(self) -> pd.DataFrame:
        """Uma linha por pedido (os itens repetem os dados do pedido)."""
        p = self.pedidos
        if p.empty:
            return p
        return p.groupby("pedido", sort=False).first().reset_index()

    def cobertura(self):
        """(início, fim) em que todas as fontes têm dados: do maior início ao menor fim. (None, None) se vazia."""
        series = [s for s in (self.notas["data"], self.pedidos["data"], self.propostas["data"]) if s.notna().any()]
        if not series:
            return None, None
        return max(s.min() for s in series).date(), min(s.max() for s in series).date()

    def ultima_importacao(self):
        a = self.t["Arquivos"]
        return None if a.empty else a["importado_em"].max()

    # ------------------------------------------------------------ importação

    def _hashes(self) -> dict:
        """Identificador do conteúdo -> nome do arquivo já importado.
        Registros antigos (sem identificador) são completados pela cópia guardada em entrada/."""
        arq = self.t["Arquivos"]
        for i, r in arq.iterrows():
            if not r["hash"] and (C.ENTRADA / r["arquivo"]).is_file():
                arq.at[i, "hash"] = hash_conteudo((C.ENTRADA / r["arquivo"]).read_bytes())
        return {h: n for h, n in zip(arq["hash"], arq["arquivo"]) if h}

    def importado_como(self, conteudo: bytes):
        """Nome com que este mesmo conteúdo já foi importado (ou None)."""
        return self._hashes().get(hash_conteudo(conteudo))

    def importar(self, arquivos, forcar=False) -> dict:
        """arquivos: lista de (nome, bytes) ou (nome, bytes, tipo). Sem tipo, ele é deduzido do nome.
        Importa vendas, depois orçamentos, depois notas; liga tudo."""
        resumo = {"importados": [], "ignorados": [], "erros": [], "mudancas": 0, "novas_propostas": 0}
        vistos = self._hashes()
        ordem = {"vendas": 0, "orcamentos": 1, "notas": 2}
        fila = sorted(((a[2] if len(a) > 2 and a[2] else tipo_arquivo(a[0]), a[0], a[1]) for a in arquivos),
                      key=lambda x: (ordem.get(x[0], 9), x[1]))
        for tipo, nome, conteudo in fila:
            if not tipo:
                resumo["erros"].append(f"{nome}: tipo não reconhecido (use vendas_*.csv, orcamentos_*.csv ou o PDF de notas)")
                continue
            h = hash_conteudo(conteudo)
            if h in vistos and not forcar:
                igual = vistos[h]
                resumo["ignorados"].append(nome if norm(igual) == norm(nome) else f"{nome} (mesmo conteúdo de {igual})")
                continue
            try:
                if tipo == "vendas":
                    n = self._importar_vendas(ler_vendas(conteudo, nome))
                elif tipo == "orcamentos":
                    props, itens = ler_orcamentos(conteudo, nome)
                    n = self._importar_orcamentos(props, itens, resumo)
                else:
                    n = self._importar_notas(ler_notas_pdf(conteudo, nome))
            except Exception as e:  # mostra o erro do arquivo e segue com os outros
                resumo["erros"].append(f"{nome}: {e}")
                continue
            arq = self.t["Arquivos"]
            arq = arq[arq["hash"] != h]
            self.t["Arquivos"] = ajustar_tipos(pd.concat([arq, pd.DataFrame([{
                "arquivo": nome, "tipo": tipo, "importado_em": pd.Timestamp.now().floor("s"), "linhas": n,
                "hash": h}])], ignore_index=True))
            vistos[h] = nome
            resumo["importados"].append(f"{nome} ({n} linhas)")
        resumo["ligacoes"] = self.ligar()
        return resumo

    def importar_pasta(self, pasta: Path = C.ENTRADA, forcar=False) -> dict:
        arquivos = [(p.name, p.read_bytes()) for p in sorted(Path(pasta).iterdir())
                    if p.is_file() and not p.name.startswith(".") and tipo_arquivo(p.name)]
        return self.importar(arquivos, forcar)

    def _importar_vendas(self, novos: pd.DataFrame) -> int:
        antigos = self.pedidos[~self.pedidos["pedido"].isin(set(novos["pedido"]))]
        self.t["Pedidos"] = ajustar_tipos(pd.concat([antigos, novos], ignore_index=True)
                                          .sort_values(["data", "pedido"], kind="stable").reset_index(drop=True))
        return novos["pedido"].nunique()

    def _importar_notas(self, novas: pd.DataFrame) -> int:
        antigas = self.notas
        # mantém a ligação/edição já feita para notas reimportadas
        manter = antigas.set_index("nf")[["pedido", "vendedor", "cidade", "cnpj"]]
        novas = novas.copy()
        for c in ("pedido", "vendedor", "cidade", "cnpj"):
            novas[c] = novas["nf"].map(manter[c]) if not manter.empty else ""
            novas[c] = novas[c].fillna("")
        antigas = antigas[~antigas["nf"].isin(set(novas["nf"]))]
        self.t["Notas"] = ajustar_tipos(pd.concat([antigas, novas], ignore_index=True)
                                        .sort_values(["data", "nf"], kind="stable").reset_index(drop=True))
        return len(novas)

    def _importar_orcamentos(self, props: pd.DataFrame, itens: pd.DataFrame, resumo: dict) -> int:
        base = self.propostas.set_index("proposta", drop=False)
        linhas = []
        for _, p in props.iterrows():
            snap = pd.Timestamp(p["snapshot"])
            status_novo = C.MAPA_SITUACAO.get(norm(p["situacao_bling"]), C.PROCESSO)
            if p["proposta"] in base.index:
                r = base.loc[p["proposta"]].to_dict()
                for c in ("data", "cliente", "cnpj", "vendedor", "valor"):
                    r[c] = p[c]
                for c in ("cidade", "uf"):
                    if p[c]:
                        r[c] = p[c]
                if pd.notna(p["ult_ocorrencia"]):
                    r["ult_ocorrencia"] = p["ult_ocorrencia"]
                r["ultima_atualizacao"] = snap
                if norm(r["situacao_bling"]) != norm(p["situacao_bling"]):
                    quando = p["ult_ocorrencia"] if pd.notna(p["ult_ocorrencia"]) else snap
                    _historico(r, quando, f"{r['situacao_bling']} -> {p['situacao_bling']}")
                    r["situacao_bling"] = p["situacao_bling"]
                    _aplicar_status(r, status_novo, quando)
                    resumo["mudancas"] += 1
            else:
                r = {c: None for c in COLS["Propostas"]}
                r.update({c: p[c] for c in ("proposta", "data", "cliente", "cnpj", "cidade", "uf", "vendedor",
                                            "valor", "situacao_bling", "ult_ocorrencia")})
                r.update(primeira_importacao=snap, ultima_atualizacao=snap, pedido="", nf="", motivo="",
                         comentario="", historico=f"{fmt_data(p['data'])}: criada ({p['situacao_bling']})")
                # na 1ª importação a data da mudança só é conhecida se o Bling informar
                _aplicar_status(r, status_novo, p["ult_ocorrencia"])
                resumo["novas_propostas"] += 1
            linhas.append(r)
        atualizadas = pd.DataFrame(linhas, columns=list(COLS["Propostas"]))
        resto = self.propostas[~self.propostas["proposta"].isin(set(atualizadas["proposta"]))]
        self.t["Propostas"] = ajustar_tipos(pd.concat([resto, atualizadas], ignore_index=True)
                                            .sort_values(["data", "proposta"], kind="stable").reset_index(drop=True))
        it = self.itens_propostas
        self.t["ItensPropostas"] = ajustar_tipos(pd.concat([it[~it["proposta"].isin(set(itens["proposta"]))], itens],
                                                           ignore_index=True))
        return len(props)

    # ------------------------------------------------------------ ligações

    def ligar(self) -> dict:
        n_np = self._ligar_notas_pedidos()
        n_pp = self._ligar_propostas_pedidos()
        return {"notas_pedidos": n_np, "propostas_pedidos": n_pp}

    def _ligar_notas_pedidos(self) -> int:
        notas, peds = self.notas, self.pedidos_agregados()
        if notas.empty or peds.empty:
            return 0
        peds = peds.assign(k=peds["cliente"].map(chave_nome), k2=peds["cliente"].map(_dois_nomes))
        usados = set(notas["pedido"].dropna()) - {""}
        n = 0
        for i, nf in notas.iterrows():
            if nf["pedido"]:
                continue
            k, k2 = chave_nome(nf["cliente"]), _dois_nomes(nf["cliente"])
            c = peds[((peds["k"] == k) | (peds["k2"] == k2)) & ~peds["pedido"].isin(usados)
                     & ((peds["total_pedido"] - nf["total_nota"]).abs() < 0.05)
                     & (peds["data"] <= nf["data"] + pd.Timedelta(days=3))]
            if c.empty:
                continue
            p = c.loc[(c["data"] - nf["data"]).abs().idxmin()]
            notas.at[i, "pedido"] = p["pedido"]
            usados.add(p["pedido"])
            n += 1
        # completa vendedor/cidade/CNPJ a partir do pedido
        pi = peds.set_index("pedido")
        for i, nf in notas.iterrows():
            if nf["pedido"] in pi.index:
                p = pi.loc[nf["pedido"]]
                notas.at[i, "vendedor"] = p["vendedor"]
                notas.at[i, "cnpj"] = p["cnpj"]
                notas.at[i, "cidade"] = f"{p['cidade']}/{p['uf']}" if p["uf"] else p["cidade"]
            else:
                if not nf["vendedor"]:
                    notas.at[i, "vendedor"] = "(nota sem pedido)"
                if not nf["cidade"]:
                    notas.at[i, "cidade"] = "(nota sem pedido)"
        return n

    def _ligar_propostas_pedidos(self) -> int:
        props, peds = self.propostas, self.pedidos_agregados()
        nf_do_pedido = {r["pedido"]: r for _, r in self.notas.iterrows() if r["pedido"]}
        usados = set()
        for v in props["pedido"].dropna():
            usados.update(x.strip() for x in str(v).replace(";", ",").split(",") if x.strip())
        n = 0
        for i, r in props.iterrows():
            base_status = C.MAPA_SITUACAO.get(norm(r["situacao_bling"]), C.PROCESSO)
            if base_status == C.APROVADO and not r["pedido"] and not peds.empty:
                ref = r["dt_aprovacao"] if pd.notna(r["dt_aprovacao"]) else r["data"]
                c = peds[(peds["cnpj"] == r["cnpj"]) & (r["cnpj"] != "") & ~peds["pedido"].isin(usados)
                         & (peds["data"] >= r["data"]) & (peds["data"] <= r["data"] + pd.Timedelta(days=90))]
                if not c.empty:
                    score = (c["data"] - ref).abs().dt.days + ((c["total_pedido"] - r["valor"]).abs() >= 1) * 1000
                    p = c.loc[score.idxmin()]
                    props.at[i, "pedido"] = p["pedido"]
                    usados.add(p["pedido"])
                    obs = "" if abs(p["total_pedido"] - r["valor"]) < 1 else ", valor diferente - conferir"
                    hist = dict(r)
                    _historico(hist, p["data"], f"entregue (pedido {p['pedido']}{obs})")
                    props.at[i, "historico"] = hist["historico"]
                    n += 1
            # status derivado
            pedido = str(props.at[i, "pedido"] or "").replace(";", ",").split(",")[0].strip()
            status = base_status
            data_pedido = pd.NaT
            if base_status == C.APROVADO and pedido:
                # pedido gerado mas sem nota continua Aprovado: só a nota fiscal caracteriza a entrega
                pp = peds[peds["pedido"] == pedido]
                if not pp.empty:
                    data_pedido = pp.iloc[0]["data"]
                props.at[i, "dt_entrega"] = pd.NaT  # só a nota fiscal define a data de entrega
                if pedido in nf_do_pedido:
                    status = C.FATURADO  # entregue e faturado (a data da nota é a data de entrega)
                    props.at[i, "nf"] = nf_do_pedido[pedido]["nf"]
                    # a data da nota é a data de entrega
                    props.at[i, "dt_entrega"] = nf_do_pedido[pedido]["data"]
                    if pd.isna(props.at[i, "dt_faturamento"]):
                        props.at[i, "dt_faturamento"] = nf_do_pedido[pedido]["data"]
            props.at[i, "status"] = status
            # datas que faltam (aprovação sem data no Bling: usa a data do pedido gerado)
            if status in (C.APROVADO, C.ENTREGUE, C.FATURADO) and pd.isna(props.at[i, "dt_aprovacao"]):
                props.at[i, "dt_aprovacao"] = data_pedido if pd.notna(data_pedido) else r["data"]
            if status == C.CANCELADO and pd.isna(props.at[i, "dt_cancelamento"]):
                props.at[i, "dt_cancelamento"] = r["ult_ocorrencia"] if pd.notna(r["ult_ocorrencia"]) else r["data"]
        return n


def hash_conteudo(conteudo: bytes) -> str:
    return hashlib.sha256(conteudo).hexdigest()[:16]


def guardar_em_entrada(nome: str, conteudo: bytes) -> str:
    """Salva uma cópia em entrada/. Se já existir outro arquivo com o mesmo nome e conteúdo diferente,
    usa um nome novo (ex.: 'Notas (2).pdf') para não sobrescrever o anterior. Devolve o nome usado."""
    destino = C.ENTRADA / nome
    n = 2
    while destino.exists() and destino.read_bytes() != conteudo:
        destino = C.ENTRADA / f"{Path(nome).stem} ({n}){Path(nome).suffix}"
        n += 1
    destino.write_bytes(conteudo)
    return destino.name


def _dois_nomes(s) -> str:
    return " ".join(norm(s).replace(".", "").split()[:2])


def _historico(r: dict, quando, texto: str):
    h = f"{fmt_data(pd.Timestamp(quando))}: {texto}"
    r["historico"] = f"{r['historico']} | {h}" if r.get("historico") else h


def _aplicar_status(r: dict, status: str, quando):
    r["status"] = status
    if status == C.APROVADO and pd.isna(r.get("dt_aprovacao")) and pd.notna(quando):
        r["dt_aprovacao"] = pd.Timestamp(quando)
    if status == C.CANCELADO and pd.isna(r.get("dt_cancelamento")) and pd.notna(quando):
        r["dt_cancelamento"] = pd.Timestamp(quando)
