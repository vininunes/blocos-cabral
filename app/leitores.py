"""Leitura dos arquivos exportados do Bling.

- vendas_*.csv      -> itens de pedidos Atendidos (entregues)
- orcamentos_*.csv  -> propostas comerciais (processo de venda) e seus itens
- *.pdf             -> relatório "Notas Fiscais por Operação" (uma linha por nota)
"""
import io
import re
from pathlib import Path

import pandas as pd

from .utils import (data_br, data_do_nome_arquivo, limpo, norm, normalizar_unidade,
                    num_br, so_digitos)


class ArquivoInvalido(Exception):
    pass


def tipo_arquivo(nome: str) -> str:
    n = norm(Path(nome).name)
    if n.endswith(".pdf"):
        return "notas"
    if n.startswith("vendas"):
        return "vendas"
    if n.startswith("orcamento"):
        return "orcamentos"
    return ""


def _ler_csv(conteudo: bytes) -> pd.DataFrame:
    texto = conteudo.decode("utf-8-sig", errors="replace")
    primeira = texto.split("\n", 1)[0]
    sep = ";" if primeira.count(";") >= primeira.count(",") else ","
    return pd.read_csv(io.StringIO(texto), sep=sep, dtype=str, keep_default_na=False)


def _col(df: pd.DataFrame, nome: str, obrigatoria=True):
    alvo = norm(nome)
    for c in df.columns:
        if norm(c) == alvo:
            return c
    if obrigatoria:
        raise ArquivoInvalido(f"Coluna '{nome}' não encontrada. Colunas do arquivo: {list(df.columns)[:12]}...")
    return None


def _vendedor(s) -> str:
    return limpo(s) or "(sem vendedor)"


def ler_vendas(conteudo: bytes, nome: str) -> pd.DataFrame:
    df = _ler_csv(conteudo)
    c = {k: _col(df, k, k not in ("valor frete pedido", "valor desconto pedido", "forma pagamento"))
         for k in ("numero pedido", "nome comprador", "data", "cpf/cnpj comprador", "cidade comprador",
                   "uf comprador", "produto", "sku", "un", "quantidade", "valor unitario", "valor total",
                   "total pedido", "valor frete pedido", "valor desconto pedido", "vendedor", "forma pagamento")}
    g = lambda k: df[c[k]] if c[k] else pd.Series([""] * len(df))
    out = pd.DataFrame({
        "pedido": g("numero pedido").str.strip(),
        "data": pd.to_datetime(g("data").map(data_br)).dt.normalize(),
        "cliente": g("nome comprador").map(limpo),
        "cnpj": g("cpf/cnpj comprador").map(so_digitos),
        "cidade": g("cidade comprador").map(limpo),
        "uf": g("uf comprador").map(limpo).str.upper(),
        "produto": g("produto").map(limpo),
        "sku": g("sku").map(limpo),
        "un": g("un").map(normalizar_unidade),
        "qtd": g("quantidade").map(num_br),
        "vlr_unit": g("valor unitario").map(num_br),
        "vlr_item": g("valor total").map(num_br),
        "total_pedido": g("total pedido").map(num_br),
        "frete": g("valor frete pedido").map(num_br),
        "desconto": g("valor desconto pedido").map(num_br),
        "vendedor": g("vendedor").map(_vendedor),
        "pagamento": g("forma pagamento").map(limpo),
        "arquivo": nome,
    })
    return out[out["pedido"] != ""]


def ler_orcamentos(conteudo: bytes, nome: str):
    """Devolve (propostas, itens). Propostas: 1 linha por proposta, valor = soma dos itens + frete - desconto."""
    df = _ler_csv(conteudo)
    opc = ("municipio", "estado", "ultima ocorrencia", "frete", "desconto proposta", "descricao",
           "codigo do produto", "unidade", "quantidade", "preco unitario")
    c = {k: _col(df, k, k not in opc)
         for k in ("numero da proposta", "data", "nome do contato", "cpf/cnpj", "situacao", "preco total",
                   "vendedor") + opc}
    g = lambda k: df[c[k]] if c[k] else pd.Series([""] * len(df), index=df.index)
    itens = pd.DataFrame({
        "proposta": g("numero da proposta").str.strip(),
        "produto": g("descricao").map(limpo),
        "codigo": g("codigo do produto").map(limpo),
        "un": g("unidade").map(normalizar_unidade),
        "qtd": g("quantidade").map(num_br),
        "vlr_unit": g("preco unitario").map(num_br),
        "vlr_total": g("preco total").map(num_br),
    })
    itens = itens[itens["proposta"] != ""]
    base = pd.DataFrame({
        "proposta": g("numero da proposta").str.strip(),
        "data": pd.to_datetime(g("data").map(data_br)).dt.normalize(),
        "cliente": g("nome do contato").map(limpo),
        "cnpj": g("cpf/cnpj").map(so_digitos),
        "cidade": g("municipio").map(limpo),
        "uf": g("estado").map(limpo).str.upper(),
        "vendedor": g("vendedor").map(_vendedor),
        "situacao_bling": g("situacao").map(limpo),
        "ult_ocorrencia": pd.to_datetime(g("ultima ocorrencia").map(data_br)),
        "extra": g("frete").map(num_br) - g("desconto proposta").map(num_br),
    })
    base = base[base["proposta"] != ""]
    props = base.groupby("proposta", sort=False).first().reset_index()
    soma = itens.groupby("proposta")["vlr_total"].sum()
    props["valor"] = props["proposta"].map(soma).fillna(0) + props["extra"]
    props = props.drop(columns="extra")
    props["snapshot"] = data_do_nome_arquivo(nome) or pd.Timestamp.now().to_pydatetime()
    return props, itens


_VAL = r"[\d\.]+,\d\d"
_NF = re.compile(r"(?<!\d)(\d{6}) (.+?) ([A-Z]{2}) (\d\d/\d\d/\d{4}) ((?:" + _VAL + r" ?){12}" + _VAL + ")")
_OP = re.compile(r"Operação: (.*?) Número")


def ler_notas_pdf(conteudo: bytes, nome: str) -> pd.DataFrame:
    """Relatório 'Notas Fiscais por Operação' do Bling (PDF)."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(conteudo)
    texto = "\n".join(pdf[i].get_textpage().get_text_range() for i in range(len(pdf)))
    if "Notas Fiscais por Opera" not in texto:
        raise ArquivoInvalido("O PDF não é o relatório 'Notas Fiscais por Operação' do Bling.")
    flat = re.sub(r"\s+", " ", texto)
    ops = [(m.start(), m.group(1).strip()) for m in _OP.finditer(flat)]
    linhas = []
    for m in _NF.finditer(flat):
        v = [num_br(x) for x in m.group(5).split()]
        op = [o for p, o in ops if p < m.start()]
        linhas.append({
            "nf": m.group(1),
            "cliente": limpo(m.group(2)),
            "uf": m.group(3),
            "data": pd.Timestamp(data_br(m.group(4))),
            "operacao": op[-1] if op else "",
            "vlr_produtos": v[0], "frete": v[1], "desconto": v[2], "seguro": v[3], "outras": v[4],
            "total_faturado": v[11], "total_nota": v[12],
            "arquivo": nome,
        })
    if not linhas:
        raise ArquivoInvalido("Nenhuma nota encontrada no PDF.")
    return pd.DataFrame(linhas)
