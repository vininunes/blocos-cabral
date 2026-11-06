"""Períodos do relatório: Dia, Semana (seg-dom), Mês, Trimestre, Semestre, Ano e Personalizado,
e o período de comparação (anterior, até a mesma data, ano anterior ou personalizado)."""
import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from .utils import DIAS, MESES, fmt_data

TIPOS = ["Dia", "Semana", "Mês", "Trimestre", "Semestre", "Ano", "Personalizado"]
MENSAIS = {"Mês": 1, "Trimestre": 3, "Semestre": 6, "Ano": 12}

ANTERIOR = "Período anterior"
MESMA_DATA = "Até a mesma data"
ANO_ANTERIOR = "Mesmo período do ano anterior"
PERSONALIZADO = "Personalizado"
SEM_COMPARACAO = "Sem comparação"
MODOS = [MESMA_DATA, ANTERIOR, ANO_ANTERIOR, PERSONALIZADO, SEM_COMPARACAO]


def _add_meses(d: date, n: int) -> date:
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def _mover_data(d: date, meses: int) -> date:
    """Mesmo dia `meses` adiante (ou atrás); se o mês não tiver o dia, usa o último dia do mês."""
    ini = _add_meses(d, meses)
    return ini.replace(day=min(d.day, calendar.monthrange(ini.year, ini.month)[1]))


@dataclass
class Periodo:
    tipo: str
    inicio: date
    fim: date
    parcial: bool = False     # cortado antes do fim natural (ex.: mês até o último dia com dados)

    @staticmethod
    def de(tipo: str, ancora: date, de: date = None, ate: date = None) -> "Periodo":
        a = ancora
        if tipo == "Dia":
            return Periodo(tipo, a, a)
        if tipo == "Semana":
            ini = a - timedelta(days=a.weekday())
            return Periodo(tipo, ini, ini + timedelta(days=6))
        if tipo in MENSAIS:
            meses = MENSAIS[tipo]
            m0 = (a.month - 1) // meses * meses
            ini = date(a.year, m0 + 1, 1)
            return Periodo(tipo, ini, _add_meses(ini, meses) - timedelta(days=1))
        de, ate = de or a, ate or de or a
        return Periodo("Personalizado", min(de, ate), max(de, ate))

    @property
    def dias(self) -> int:
        return (self.fim - self.inicio).days + 1

    def anterior(self) -> "Periodo":
        return self.deslocar(-1)

    def deslocar(self, n: int) -> "Periodo":
        if self.tipo in MENSAIS:
            return Periodo.de(self.tipo, _add_meses(self.inicio, n * MENSAIS[self.tipo]))
        d = timedelta(days=self.dias * n)
        return Periodo(self.tipo, self.inicio + d, self.fim + d)

    def cortar(self, ate: date) -> "Periodo":
        """Período até `ate` (inclusive), quando `ate` cai antes do fim."""
        if self.inicio <= ate < self.fim:
            return Periodo(self.tipo, self.inicio, ate, True)
        return self

    @property
    def rotulo(self) -> str:
        i, f = self.inicio, self.fim
        ate = f" (até {fmt_data(f, False)})" if self.parcial else ""
        if self.tipo == "Dia":
            return f"{DIAS[i.weekday()]}, {fmt_data(i)}"
        if self.tipo == "Semana":
            if self.parcial:
                return f"Semana {fmt_data(i, False)} a {fmt_data(f)} (parcial)"
            return f"Semana {fmt_data(i, False)} a {fmt_data(f)}"
        if self.tipo == "Mês":
            return f"{MESES[i.month - 1]} de {i.year}{ate}"
        if self.tipo == "Trimestre":
            return f"{(i.month - 1) // 3 + 1}º trimestre de {i.year}{ate}"
        if self.tipo == "Semestre":
            return f"{1 if i.month <= 6 else 2}º semestre de {i.year}{ate}"
        if self.tipo == "Ano":
            return f"Ano {i.year}{ate}"
        return f"{fmt_data(i)} a {fmt_data(f)}"

    @property
    def curto(self) -> str:
        """Rótulo curto para colunas, legendas e cartões (ex.: 'Out/26', 'Out/26 até 16/10')."""
        i, f = self.inicio, self.fim
        if self.tipo == "Dia":
            return f"{i:%d/%m/%y}"
        if self.tipo == "Semana":
            if self.parcial:
                return f"Sem {i:%d}–{f:%d/%m/%y}" if i.month == f.month else f"Sem {i:%d/%m}–{f:%d/%m/%y}"
            return f"Sem {i:%d/%m/%y}"
        if self.tipo == "Personalizado":
            return f"{i:%d/%m}–{f:%d/%m/%y}"
        txt = {"Mês": f"{MESES[i.month - 1][:3]}/{i:%y}",
               "Trimestre": f"{(i.month - 1) // 3 + 1}º tri/{i:%y}",
               "Semestre": f"{1 if i.month <= 6 else 2}º sem/{i:%y}",
               "Ano": f"{i.year}"}[self.tipo]
        return txt + (f" até {f:%d/%m}" if self.parcial else "")

    def granularidade(self) -> str:
        """Agrupamento dos gráficos de evolução."""
        if self.dias <= 31:
            return "dia"
        if self.dias <= 92:
            return "semana"
        return "mês"


def comparacao(p: Periodo, modo: str, ultimo_dia: date, de: date = None, ate: date = None):
    """(A, B): período analisado e período de comparação.

    Período anterior: A inteiro x período anterior inteiro (como sempre foi).
    Até a mesma data: A vai até o último dia com dados; B é o período anterior até o mesmo ponto
      (mesmo dia do mês nos períodos mensais; mesma quantidade de dias nos demais).
    Ano anterior: mesmo corte, um ano antes (Dia e Semana voltam 52 semanas para manter o dia da semana).
    Personalizado: A inteiro x B livre (de/ate).
    Sem comparação: A inteiro e B = None.
    """
    if modo == SEM_COMPARACAO:
        return p, None
    if modo == PERSONALIZADO:
        de, ate = de or p.inicio, ate or de or p.fim
        return p, Periodo("Personalizado", min(de, ate), max(de, ate))
    if modo == ANTERIOR:
        return p, p.anterior()
    a = p.cortar(ultimo_dia)
    if modo == ANO_ANTERIOR:
        if p.tipo in ("Dia", "Semana"):
            d = timedelta(days=364)
            return a, Periodo(p.tipo, a.inicio - d, a.fim - d, a.parcial)
        if not a.parcial and p.tipo in MENSAIS:
            return a, Periodo.de(p.tipo, _mover_data(p.inicio, -12))
        return a, Periodo(p.tipo, _mover_data(a.inicio, -12), _mover_data(a.fim, -12), a.parcial)
    # até a mesma data
    b = p.anterior()
    if not a.parcial:
        return a, b
    fim = _mover_data(a.fim, -MENSAIS[p.tipo]) if p.tipo in MENSAIS else b.inicio + (a.fim - a.inicio)
    return a, Periodo(b.tipo, b.inicio, min(fim, b.fim), True)
