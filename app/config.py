"""Caminhos e identidade visual."""
import os
from pathlib import Path

RAIZ = Path(os.environ.get("BLOCOS_RAIZ", Path(__file__).resolve().parent.parent))
ENTRADA = RAIZ / "entrada"
SAIDA = RAIZ / "saida"
DADOS = RAIZ / "dados"
ASSETS = RAIZ / "assets"
BASE_XLSX = DADOS / "base.xlsx"
LOGO = ASSETS / "logo.png"
FAVICON = ASSETS / "favicon.png"

for _p in (ENTRADA, SAIDA, DADOS):
    _p.mkdir(parents=True, exist_ok=True)

# cores do logo
AZUL = "232F66"
VERDE = "1E6B34"
GRAFITE = "2E2A28"
CINZA = "C8CBD2"
CINZA_CLARO = "F4F2F7"
VERMELHO = "C03D2B"

# status do fluxo
PROCESSO = "Em processo"
APROVADO = "Aprovado"
ENTREGUE = "Entregue"
FATURADO = "Faturado"
CANCELADO = "Cancelado"
STATUS = [PROCESSO, APROVADO, ENTREGUE, FATURADO, CANCELADO]

# situação no Bling (orçamentos) -> status do fluxo
MAPA_SITUACAO = {
    "rascunho": PROCESSO,
    "aprovado": APROVADO,
    "concluido": APROVADO,
    "nao aprovado": CANCELADO,
}

MOTIVOS = [
    "Preço", "Prazo de entrega", "Frete", "Concorrência", "Obra adiada",
    "Sem retorno do cliente", "Acompanhamento pós-venda", "Outro",
]
