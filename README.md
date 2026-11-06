# Relatório de Operações — Blocos Cabral

O relatório agora é um **app instalável (Electron)** em [`desktop/`](desktop/README.md):
design system próprio, instaladores para Windows e macOS, base em JSON com migração
automática da `base.xlsx` antiga, PowerPoint e Excel.

Fluxo: **Processo de venda → Aprovado → Entregue (pedido) → Faturado (nota fiscal)**, ou **Cancelado**.
Faturamento = notas emitidas pela data de emissão (igual ao "Evolução do Faturamento" do Bling).

## Instalar

| Sistema | Arquivo (em `desktop/release/`) |
|---|---|
| Windows | `Relatorio Blocos Cabral Setup 1.0.0.exe` |
| macOS (Apple Silicon) | `Relatorio Blocos Cabral-1.0.0-arm64.dmg` |
| macOS (Intel) | `Relatorio Blocos Cabral-1.0.0.dmg` |

Sem assinatura de código: no Windows, o SmartScreen pede **Mais informações → Executar assim
mesmo**; no macOS, no primeiro uso, botão direito no app → **Abrir**.

## Arquivos do Bling
| Arquivo | Onde exportar | Nome |
|---|---|---|
| Orçamentos | Vendas → Propostas comerciais → Exportar CSV | `orcamentos_*.csv` |
| Vendas | Vendas → Pedidos (situação Atendido) → Exportar CSV | `vendas_*.csv` |
| Notas fiscais | Relatórios → Notas Fiscais por Operação → PDF | `*.pdf` |

## Painel antigo (Python/Streamlit) — legado

`painel.py`, `app/`, `tests/` e `windows/` são o app anterior. Continuam aqui porque o gabarito
dos testes de paridade do app novo é gerado a partir deles
(`desktop/scripts/gerar-golden.py`). O `dist/` tem o instalador antigo
(`Instalar_Relatorio_Blocos_Cabral.exe`), substituído pelo instalador do app novo.

```
.venv/bin/python -m pytest -q          # testes do motor Python
.venv/bin/python -m streamlit run painel.py
```
