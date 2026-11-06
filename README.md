# Relatório de Operações — Blocos Cabral

O relatório agora é um **app instalável (Electron)** em [`desktop/`](desktop/README.md):
design system próprio, instaladores para Windows e macOS, base em JSON com migração
automática da `base.xlsx` do antigo painel em Python, PowerPoint e Excel.

Fluxo: **Processo de venda → Aprovado → Entregue (pedido) → Faturado (nota fiscal)**, ou **Cancelado**.
Faturamento = notas emitidas pela data de emissão (igual ao "Evolução do Faturamento" do Bling).

## Instalar

Baixe o instalador na página de [Releases](https://github.com/vininunes/blocos-cabral/releases):

| Sistema | Arquivo |
|---|---|
| Windows | `Relatorio-Blocos-Cabral-<versão>-windows-setup.exe` |
| macOS (Apple Silicon) | `Relatorio-Blocos-Cabral-<versão>-mac-apple-silicon.dmg` |

Sem assinatura de código: no Windows, o SmartScreen pede **Mais informações → Executar assim
mesmo**; no macOS, no primeiro uso, botão direito no app → **Abrir**.

## Arquivos do Bling
| Arquivo | Onde exportar | Nome |
|---|---|---|
| Orçamentos | Vendas → Propostas comerciais → Exportar CSV | `orcamentos_*.csv` |
| Vendas | Vendas → Pedidos (situação Atendido) → Exportar CSV | `vendas_*.csv` |
| Notas fiscais | Relatórios → Notas Fiscais por Operação → PDF | `*.pdf` |
