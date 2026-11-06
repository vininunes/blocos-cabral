# Relatório Blocos Cabral (app desktop)

App instalável (Electron) do Relatório de Operações da Blocos Cabral: React + design system
próprio (`vendor/design-system`), arquitetura de features/modules, gráficos com Observable
Plot, API local em Node e instaladores para macOS e Windows. Substitui o painel Streamlit (`../painel.py`),
que fica como referência dos testes de paridade (`scripts/gerar-golden.py`).

## Uso

1. **Banco de dados** (navegação no header): barra com o período que cada fonte tem dados (e o
   período comum, usado no relatório) e as tabelas da base — Propostas, Itens das propostas,
   Pedidos, Notas, Clientes e Arquivos importados. Cada tabela importa o seu arquivo do Bling
   (orçamentos CSV, vendas CSV, PDF de notas, contatos CSV); em Arquivos importados dá para
   importar qualquer um, ler a pasta entrada/ e **desfazer** uma importação. Arquivos repetidos
   são reconhecidos pelo conteúdo.
   - **Clientes**: um por CNPJ/CPF (sem documento, pelo nome), montados dos dados e completados
     pelo CSV de Contatos do Bling. A equipe preenche grupo econômico, segmento, situação e
     observações. Estimador **Curva ABC / potencial** por grupo econômico: A até 80% do
     faturamento, B até 95%, C o resto; tendência (90 dias x 90 anteriores) e potencial
     (propostas em aberto + pedidos aguardando nota).
2. Escolher tipo de período, status e **Comparar com**; as setas ‹ › andam de período.
3. Abas: Visão geral, Pedidos, Vendedores, Clientes, Produtos, Cidades, Detalhamento e
   **Feedback** (motivo, comentário, datas e pedido ligado; **Salvar feedback** grava na base).
4. **Exportar**: PowerPoint e Excel do relatório na tela e a base completa em .xlsx — ficam
   em `saida/` (o aviso tem **Abrir** e **Mostrar na pasta**).

### Base do app antigo

No primeiro uso (sem `dados/base.json`), o app procura a `base.xlsx` do app Python e a
converte, com o feedback e os exports de `entrada/`:

- Windows: `%LOCALAPPDATA%\RelatorioBlocosCabral\dados\base.xlsx` (instalação antiga)
- macOS: `~/Desktop/blocos-cabral/dados/base.xlsx`
- qualquer sistema: `dados/base.xlsx` dentro da pasta de dados do app

Para trazer outra planilha depois: menu **Dados → Importar base do app antigo (base.xlsx)…**
(substitui a base atual, com confirmação).

```
desktop/
├── vendor/design-system/ # design system: base-components/components/lib/hooks (aliases @/...)
├── src/atomic/features/  # uma pasta por funcionalidade (api, components, hooks, models, store, translation)
├── src/atomic/modules/   # telas que compõem as features (relatorio/)
├── src/styles/           # tokens do design system com as cores da Cabral
├── server/               # API local + motor do relatório (leitores, base, métricas, PPT, Excel)
├── electron/main.ts      # janela + servidor interno em 127.0.0.1 (token de sessão)
├── tests/                # vitest (os testes com dados reais rodam quando entrada/ existe)
└── electron-builder.yml  # dmg/zip (macOS) e NSIS (Windows)
```

## Desenvolvimento

```bash
yarn install
yarn dev            # navegador em http://localhost:3200 (dados em ../entrada, ../dados, ../saida)
yarn electron:dev   # o mesmo dentro do Electron, com hot reload
yarn typecheck && yarn lint && yarn test
```

### Motor do relatório e testes

`server/relatorio/` é o port em TypeScript de `../app` (leitores, base, períodos, métricas).
A base fica em `dados/base.json`. Os testes conferem os números de duas formas:

- `tests/relatorio.test.ts`: os testes de `../tests/test_relatorio.py`, com os valores
  conferidos com o Bling (exports reais de outubro/2026 em `../entrada`).
- `tests/exportacao.test.ts`: PowerPoint, Excel e base exportada (todos os status, sem
  dados de B, sem comparação).
- `tests/banco.test.ts`: tabela Clientes, curva ABC, grupo econômico, CSV de contatos e
  desfazer importação (a base fica igual à de nunca ter importado o arquivo).
- `tests/migracao.test.ts`: `tests/golden/base1-legado.xlsx` (gravada pelo app Python, com
  feedback) migrada igual, campo a campo.
- `tests/paridade.test.ts`: compara com o gabarito gerado pelo motor Python
  (`tests/golden/*.json`): as tabelas da base e 192 relatórios (7 períodos × 4 modos de
  comparação × 6 status, mais a base com todos os exports). Para regenerar depois de mudar
  uma regra no Python: `../.venv/bin/python scripts/gerar-golden.py`.

Empates em rankings saem em ordem arbitrária no pandas; no TS, o desempate é pelo nome.

Diferenças intencionais em relação ao painel Python: o período abre no último dia coberto por
todas as fontes (não na data mais recente de pedidos); em "Cancelado", alta nas altas e quedas
é vermelha; no Excel, contagens com `#,##0` e valores sempre em R$.

PowerPoint (`server/relatorio/ppt.ts`, pptxgenjs): o arquivo gerado passa por `ajustarPacote`
— a planilha embutida de cada gráfico é refeita com o exceljs (o Keynote descarta o gráfico
com a do pptxgenjs), relações viram relativas e a série B do acumulado fica tracejada. Logo e
rodapé ficam no slide mestre. Para conferir os slides: exporte pelo Keynote ou salve como PDF
no PowerPoint.

Design system: os componentes ficam em `vendor/design-system` e são importados pelos aliases
`@/atomic/base-components`, `@/atomic/components`, `@/lib`, `@/hooks` (ver `vite.config.ts` e
`tsconfig.app.json`); o lint e o prettier não mexem nessa pasta.

## Instaladores

```bash
yarn dist:mac       # release/Relatorio Blocos Cabral-<versão>-arm64.dmg (Apple Silicon) e -<versão>.dmg (Intel)
yarn dist:win       # release/Relatorio Blocos Cabral Setup <versão>.exe (gerado no Mac, sem wine)
yarn pack           # só o app descompactado, para testar
```

- Dados do app instalado: `Documentos/Relatorio Blocos Cabral/` (`entrada/`, `dados/`, `saida/`);
  o menu **Dados** abre as pastas. Atualizar o app (instalar uma versão nova por cima) não
  mexe nos dados. Para mudar a versão: `version` no `package.json`.
- Sem assinatura de código: no macOS, primeiro uso com botão direito → Abrir; no Windows, o
  SmartScreen pede "Mais informações → Executar assim mesmo".
- `toolsets.nsis: 1.2.1` no `electron-builder.yml` é necessário para gerar o `.exe` num Mac
  Apple Silicon (o makensis legado só existe em x86).

Teste sem interação (sobe o app, consulta a API e encerra):

```bash
# RELATORIO_SMOKE_IMPORT=1 também importa a pasta entrada/ e gera PPT, Excel e base
# (feche o app aberto antes: só roda uma instância por vez)
RELATORIO_SMOKE_TEST=1 RELATORIO_SMOKE_SHOT=/tmp/tela.png RELATORIO_DATA_DIR=/tmp/dados \
  "release/mac-arm64/Relatorio Blocos Cabral.app/Contents/MacOS/Relatorio Blocos Cabral"
```
