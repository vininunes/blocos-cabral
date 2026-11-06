"""Conversões de texto, números e datas no padrão brasileiro."""
import re
import unicodedata
from datetime import date, datetime, timedelta

_EXCEL_ZERO = date(1899, 12, 30)


def norm(s) -> str:
    """Minúsculas, sem acentos e espaços extras (para comparar cabeçalhos e nomes)."""
    s = unicodedata.normalize("NFD", str(s or "").replace("\xa0", " "))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


def chave_nome(s) -> str:
    """Nome de cliente reduzido a letras/números, para casar nota fiscal com pedido."""
    return re.sub(r"[^a-z0-9]", "", norm(s))


def so_digitos(s) -> str:
    return re.sub(r"\D", "", str(s or ""))


def limpo(s) -> str:
    return " ".join(str(s or "").replace("\xa0", " ").split())


def num_br(s) -> float:
    """'5.050,00' -> 5050.0 ; '9273,82575' -> 9273.82575 ; '147' -> 147.0"""
    s = str(s or "").replace("\xa0", "").strip()
    if not s:
        return 0.0
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def data_br(s):
    """'dd/mm/aaaa', 'dd/mm/aaaa hh:mm' ou serial do Excel -> datetime (ou None)."""
    s = str(s or "").strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    if re.fullmatch(r"\d+(\.\d+)?", s):
        return datetime.combine(_EXCEL_ZERO, datetime.min.time()) + timedelta(days=float(s))
    return None


def data_do_nome_arquivo(nome: str):
    """'vendas_2026-10-17-14-39-51.csv' -> datetime(2026,10,17,14,39,51)"""
    m = re.search(r"(20\d\d)-(\d\d)-(\d\d)(?:-(\d\d)-(\d\d)(?:-(\d\d))?)?", nome)
    if not m:
        return None
    p = [int(x) if x else 0 for x in m.groups()]
    return datetime(*p)


def normalizar_unidade(un) -> str:
    u = str(un or "").replace("\xa0", "").strip().upper()
    if u in ("M²", "M2"):
        return "m²"
    if u in ("PALETE", "PLT"):
        return "PLT"
    if u in ("PÇ", "PC", "PCA", "PECA"):
        return "PC"
    return u or "UN"


# ---------------------------------------------------------------- formatação

def fmt_num(x, casas=0) -> str:
    x = float(x or 0)
    s = f"{abs(x):,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("-" if x < 0 and round(abs(x), casas) else "") + s


def fmt_moeda(x, casas=2) -> str:
    return "R$ " + fmt_num(x, casas)


def fmt_qtd(x) -> str:
    """Quantidade: inteiro sem casas; fracionado com até 2 casas."""
    x = float(x or 0)
    return fmt_num(x, 0) if x.is_integer() else fmt_num(x, 2)


def fmt_moeda_curta(x) -> str:
    x = float(x or 0)
    if abs(x) >= 1_000_000:
        return "R$ " + fmt_num(x / 1_000_000, 2) + " mi"
    if abs(x) >= 10_000:
        return "R$ " + fmt_num(x / 1_000, 1) + " mil"
    return "R$ " + fmt_num(x, 0)


def fmt_sinal(x, fmt) -> str:
    """Valor com sinal na frente do símbolo: +R$ 1.234,56 / -R$ 1.234,56."""
    x = float(x or 0)
    return ("+" if x > 0 else "-" if x < 0 else "") + fmt(abs(x))


def fmt_pct(x, casas=1, sinal=False) -> str:
    x = float(x or 0)
    s = fmt_num(x * 100, casas) + "%"
    return ("+" + s) if sinal and x > 0 else s


def fmt_data(d, ano=True) -> str:
    try:
        if d is None or d != d:  # None ou NaT/NaN
            return ""
        return d.strftime("%d/%m/%Y" if ano else "%d/%m")
    except (AttributeError, ValueError):
        return ""


MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho",
         "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
