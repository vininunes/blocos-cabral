/**
 * Planilhas: Excel do relatório e a base exportada em .xlsx
 * (a base do app fica em JSON; o .xlsx é a cópia para abrir no Excel).
 */
import ExcelJS from 'exceljs'

import type { Base } from './base'
import { EDITAVEIS } from './base'
import * as C from './config'
import type { Celula, FormatoKpi, Tabela } from './metricas'
import type { ResultadoProjecao } from './projecao'

const DIA = /^\d{4}-\d{2}-\d{2}$/
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
const argb = (hex: string) => `FF${hex}`

/** Data em texto -> Date "local" que o Excel mostra igual (sem fuso). */
function celula(v: Celula | undefined): ExcelJS.CellValue {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' && (DIA.test(v) || DATA_HORA.test(v))) {
    return new Date(`${v.length === 10 ? v + 'T00:00:00' : v}Z`)
  }
  return v
}

function cabecalho(ws: ExcelJS.Worksheet, cor: (coluna: number) => string = () => C.AZUL) {
  ws.getRow(1).eachCell((c, j) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(cor(j)) } }
    c.alignment = { wrapText: true, vertical: 'middle' }
  })
}

/**
 * Formato numérico de uma coluna do relatório, pelo nome. O Python decidia pelo tipo do
 * pandas (float/int), o que deixava contagens como '15.' (formato '#,##0.##' em número
 * inteiro) e valores zerados sem R$; aqui: datas, %, contagens inteiras e R$.
 */
function formatoColuna(nome: string, valores: Celula[]): string | null {
  if (valores.some((v) => typeof v === 'string' && DIA.test(v))) return 'dd/mm/yyyy'
  if (!valores.some((v) => typeof v === 'number') || nome === 'Dia' || nome === 'Quantidade')
    return null
  if (nome.includes('%') || nome.includes('Variação') || nome.includes('Taxa')) return '0.0%'
  if (['Qtd', 'Notas', 'Propostas', 'Canceladas'].includes(nome)) return '#,##0'
  return '"R$" #,##0.00'
}

/**
 * { aba: tabela } -> .xlsx formatado (cabeçalho azul, larguras, R$, %, datas). Com `projecao`,
 * entra também a aba Projeção (quadro de metas e projeção de vendas).
 */
export async function excelRelatorio(
  tabelas: Record<string, Tabela & { formatos?: FormatoKpi[] }>,
  projecao?: ResultadoProjecao | null
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  for (const [nome, t] of Object.entries(tabelas)) {
    const ws = wb.addWorksheet(nome.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.addRow(t.colunas)
    for (const l of t.linhas) ws.addRow(l.map(celula))
    cabecalho(ws)
    t.colunas.forEach((c, j) => {
      const valores = t.linhas.map((l) => l[j])
      const larg =
        Math.max(c.length, ...valores.slice(0, 200).map((v) => String(v ?? '').length)) + 2
      const coluna = ws.getColumn(j + 1)
      coluna.width = Math.min(Math.max(larg, 10), 60)
      const fmt = formatoColuna(c, valores)
      if (fmt) for (let i = 2; i <= t.linhas.length + 1; i++) ws.getCell(i, j + 1).numFmt = fmt
    })
    if (t.formatos) {
      // formatos por linha (aba Indicadores): A, B, diferença e variação
      const mapa: Record<string, string> = {
        moeda: '"R$" #,##0.00',
        pct: '0.0%',
        dias: '#,##0.0',
        int: '#,##0',
      }
      const pp = '+0.0" p.p.";-0.0" p.p."'
      t.formatos.forEach((f, i) => {
        const r = i + 2
        const base = mapa[f] ?? '#,##0'
        for (let j = 2; j <= Math.min(t.colunas.length, 3); j++) ws.getCell(r, j).numFmt = base
        if (t.colunas.length >= 5) {
          ws.getCell(r, 4).numFmt = f === 'pct' ? pp : `+${base};-${base}`
          ws.getCell(r, 5).numFmt = f === 'pct' ? pp : '+0.0%;-0.0%'
          if (f === 'pct')
            for (const j of [4, 5]) {
              const v = ws.getCell(r, j).value
              if (typeof v === 'number') ws.getCell(r, j).value = v * 100 // diferença de percentuais em p.p.
            }
        }
      })
    }
  }
  if (projecao && temProjecao(projecao)) abaProjecao(wb, projecao)
  return new Uint8Array(await wb.xlsx.writeBuffer())
}

// ---------------------------------------------------------------- projeção

/** Cores do quadro de metas (como na planilha da equipe). */
export const CORES_PROJECAO = {
  vender_mais: 'E8392B',
  meta_mensal: 'A0CF5F',
  parar_vender: 'FFFF4F',
  mes: 'E0844A',
} as const

export const METAS_PROJECAO = [
  ['vender_mais', 'Vender Mais'],
  ['meta_mensal', 'Meta Mensal'],
  ['parar_vender', 'Parar de Vender'],
] as const

/** Há o que mostrar no quadro: algum cliente com projeção ou alguma meta. */
export const temProjecao = (p: ResultadoProjecao) =>
  p.linhas.length > 0 || p.metas.some((m) => METAS_PROJECAO.some(([k]) => m[k] !== null))

/**
 * Aba Projeção: metas do mês (Vender Mais, Meta Mensal, Parar de Vender) em cima, clientes por
 * rank com o valor total do pedido e a projeção de cada mês, e os totais no fim.
 */
function abaProjecao(wb: ExcelJS.Workbook, p: ResultadoProjecao) {
  const ws = wb.addWorksheet('Projeção', { views: [{ showGridLines: false }] })
  const MOEDA = '"R$" #,##0;-"R$" #,##0;"R$" 0'
  const MOEDA_CENT = '"R$" #,##0.00'
  const ultima = 3 + p.meses.length // colunas: A rank, B cliente, C valor total, D.. meses
  ws.columns = [{ width: 7 }, { width: 44 }, { width: 24 }, ...p.meses.map(() => ({ width: 18 }))]
  const borda: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  }
  const pintar = (c: ExcelJS.Cell, cor: string) =>
    (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(cor) } })
  const linha = (valores: ExcelJS.CellValue[]) => {
    const r = ws.addRow(valores)
    for (let j = 1; j <= ultima; j++) r.getCell(j).border = borda
    return r
  }

  // metas: rótulo colorido e o valor de cada mês na coluna do mês
  const titulo = linha(['', 'META DE VENDAS'])
  titulo.getCell(2).font = { bold: true, size: 16 }
  titulo.getCell(2).alignment = { horizontal: 'center' }
  for (const [k, nome] of METAS_PROJECAO) {
    const r = linha(['', nome, '', ...p.metas.map((m) => m[k])])
    for (let j = 2; j <= ultima; j++) {
      const c = r.getCell(j)
      pintar(c, CORES_PROJECAO[k])
      c.font = { bold: true }
      c.alignment = { horizontal: 'center' }
      if (j > 3) c.numFmt = MOEDA
    }
  }

  // cabeçalho
  const cab = linha(['Rank', 'BLOCOS / PISOS INTERTRAVADOS', 'VALOR TOTAL PEDIDO', ...p.rotulos])
  cab.height = 34
  cab.eachCell((c, j) => {
    c.font = { bold: true, size: j === 1 ? 11 : 13 }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    if (j > 3) pintar(c, CORES_PROJECAO.mes)
  })

  for (const l of p.linhas) {
    const r = linha([l.rank, l.nome, l.valor_total, ...l.meses.map((v) => v || null)])
    r.getCell(3).numFmt = Number.isInteger(l.valor_total ?? 0) ? MOEDA : MOEDA_CENT
    for (let j = 4; j <= ultima; j++) r.getCell(j).numFmt = MOEDA
  }
  linha([])
  const proj = linha(['', 'VENDAS PROJETADAS', null, ...p.projetadas])
  proj.font = { bold: true }
  for (let j = 4; j <= ultima; j++) proj.getCell(j).numFmt = MOEDA
  const conc = linha(['', 'VENDAS CONCRETIZADAS', p.concretizadas])
  conc.getCell(3).numFmt = MOEDA
}

// ---------------------------------------------------------------- base exportada

/** colunas internas -> cabeçalho na planilha (mesmo layout do antigo dados/base.xlsx) */
export const COLUNAS_BASE: Record<string, Record<string, string>> = {
  Propostas: {
    proposta: 'Proposta',
    data: 'Data criação',
    cliente: 'Cliente',
    cnpj: 'CNPJ/CPF',
    cidade: 'Cidade',
    uf: 'UF',
    vendedor: 'Vendedor',
    valor: 'Valor',
    situacao_bling: 'Situação Bling',
    status: 'Status',
    dt_aprovacao: 'Data aprovação',
    dt_cancelamento: 'Data cancelamento',
    pedido: 'Pedido ligado',
    dt_entrega: 'Data entrega',
    nf: 'Nota fiscal',
    dt_faturamento: 'Data faturamento',
    motivo: 'Motivo',
    comentario: 'Comentário / feedback',
    ult_ocorrencia: 'Última ocorrência Bling',
    primeira_importacao: '1ª importação',
    ultima_atualizacao: 'Última atualização',
    historico: 'Histórico de status',
  },
  Pedidos: {
    pedido: 'Pedido',
    data: 'Data',
    cliente: 'Cliente',
    cnpj: 'CNPJ/CPF',
    cidade: 'Cidade',
    uf: 'UF',
    produto: 'Produto',
    sku: 'SKU',
    un: 'Un',
    qtd: 'Quantidade',
    vlr_unit: 'Valor unitário',
    vlr_item: 'Valor item',
    total_pedido: 'Total pedido',
    frete: 'Frete',
    desconto: 'Desconto',
    vendedor: 'Vendedor',
    pagamento: 'Forma de pagamento',
    arquivo: 'Arquivo de origem',
  },
  Notas: {
    nf: 'Nota fiscal',
    data: 'Data emissão',
    cliente: 'Cliente',
    uf: 'UF',
    operacao: 'Operação',
    vlr_produtos: 'Valor produtos',
    frete: 'Frete',
    desconto: 'Desconto',
    seguro: 'Seguro',
    outras: 'Outras despesas',
    total_faturado: 'Total faturado',
    total_nota: 'Total nota',
    pedido: 'Pedido ligado',
    vendedor: 'Vendedor',
    cidade: 'Cidade',
    cnpj: 'CNPJ/CPF',
    arquivo: 'Arquivo de origem',
  },
  ItensPropostas: {
    proposta: 'Proposta',
    produto: 'Produto',
    codigo: 'Código',
    un: 'Un',
    qtd: 'Quantidade',
    vlr_unit: 'Preço unitário',
    vlr_total: 'Preço total',
  },
  Arquivos: {
    arquivo: 'Arquivo',
    tipo: 'Tipo',
    importado_em: 'Importado em',
    linhas: 'Linhas',
    hash: 'Identificador do conteúdo',
  },
  Precos: {
    de: 'Período início',
    ate: 'Período fim',
    cliente: 'Cliente',
    cnpj: 'CNPJ/CPF',
    cidade: 'Cidade',
    uf: 'UF',
    produto: 'Produto',
    codigo: 'Código',
    qtd: 'Quantidade',
    preco: 'Preço médio',
    valor: 'Valor',
    frete: 'Frete',
    desconto: 'Desconto',
    outras: 'Outras despesas',
    total: 'Total venda',
    arquivo: 'Arquivo (identificador)',
  },
}

const LARGURAS: Record<string, number> = {
  cliente: 38,
  produto: 46,
  historico: 60,
  comentario: 46,
  vendedor: 26,
  operacao: 24,
  arquivo: 34,
  cidade: 20,
  motivo: 22,
  situacao_bling: 14,
  status: 12,
}
const MOEDA = new Set([
  'valor',
  'vlr_unit',
  'vlr_item',
  'total_pedido',
  'frete',
  'desconto',
  'vlr_produtos',
  'seguro',
  'outras',
  'total_faturado',
  'total_nota',
  'vlr_total',
  'preco',
  'total',
])
const DATA_HORA_COLS = new Set([
  'ult_ocorrencia',
  'primeira_importacao',
  'ultima_atualizacao',
  'importado_em',
])

/** Campos em % (fração) e em quantidade inteira nas exportações por tabela. */
const PCT = new Set(['participacao', 'participacao_acumulada', 'conversao'])
const INTEIRO = new Set(['qtd', 'linhas', 'notas', 'propostas', 'pedidos', 'dias_sem_comprar'])
const MOEDA_CLIENTES = new Set([
  'faturamento',
  'ticket_medio',
  'potencial',
  'provisao_mes',
  'carteira_aberta',
  'aguardando_nota',
  'faturamento_90d',
  'faturamento_90d_anterior',
])

/**
 * Uma tabela do Banco de dados em .xlsx (o que está na tela: busca e ordenação), formatada
 * pela chave de cada coluna: R$, %, quantidades e datas.
 */
export async function exportarTabela(
  aba: string,
  colunas: { chave: string; titulo: string }[],
  linhas: Record<string, Celula>[]
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(aba.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.addRow(colunas.map((c) => c.titulo))
  for (const l of linhas) ws.addRow(colunas.map((c) => celula(l[c.chave] ?? null)))
  cabecalho(ws)
  ws.getRow(1).height = 30
  colunas.forEach(({ chave, titulo }, j) => {
    const amostra = linhas.slice(0, 200).map((l) => String(l[chave] ?? '').length)
    ws.getColumn(j + 1).width =
      LARGURAS[chave] ?? Math.min(Math.max(titulo.length, ...amostra, 8) + 2, 50)
    const fmt =
      MOEDA.has(chave) || MOEDA_CLIENTES.has(chave)
        ? '"R$" #,##0.00'
        : PCT.has(chave)
          ? '0.0%'
          : INTEIRO.has(chave)
            ? '#,##0'
            : DATA_HORA_COLS.has(chave)
              ? 'dd/mm/yyyy hh:mm'
              : chave.startsWith('dt_') || chave === 'data' || chave === 'ultima_compra'
                ? 'dd/mm/yyyy'
                : null
    if (fmt) for (let i = 2; i <= linhas.length + 1; i++) ws.getCell(i, j + 1).numFmt = fmt
  })
  if (linhas.length)
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: linhas.length + 1, column: colunas.length },
    }
  return new Uint8Array(await wb.xlsx.writeBuffer())
}

/** A base inteira em .xlsx (abas Propostas, Pedidos, Notas, ItensPropostas, Arquivos). */
export async function exportarBase(base: Base): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const fontes: Record<string, object[]> = {
    Propostas: base.propostas,
    Pedidos: base.pedidos,
    Notas: base.notas,
    ItensPropostas: base.itensPropostas,
    Arquivos: base.t.arquivos,
    Precos: base.t.precos,
  }
  for (const [aba, cols] of Object.entries(COLUNAS_BASE)) {
    const chaves = Object.keys(cols)
    const ws = wb.addWorksheet(aba, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] })
    ws.addRow(Object.values(cols))
    for (const r of fontes[aba])
      ws.addRow(chaves.map((c) => celula((r as Record<string, Celula>)[c] ?? null)))
    const editaveis: readonly string[] = aba === 'Propostas' ? EDITAVEIS : []
    cabecalho(ws, (j) => (editaveis.includes(chaves[j - 1]) ? C.VERDE : C.AZUL))
    ws.getRow(1).height = 30
    chaves.forEach((c, j) => {
      ws.getColumn(j + 1).width = LARGURAS[c] ?? 13
      const fmt = MOEDA.has(c)
        ? '#,##0.00'
        : c === 'qtd'
          ? '#,##0.##'
          : DATA_HORA_COLS.has(c)
            ? 'dd/mm/yyyy hh:mm'
            : c.startsWith('dt_') || c === 'data' || c === 'de' || c === 'ate'
              ? 'dd/mm/yyyy'
              : null
      if (fmt) for (let i = 2; i <= fontes[aba].length + 1; i++) ws.getCell(i, j + 1).numFmt = fmt
    })
    if (fontes[aba].length)
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: fontes[aba].length + 1, column: chaves.length },
      }
    if (aba === 'Propostas' && fontes[aba].length) {
      const j = chaves.indexOf('motivo') + 1
      for (let i = 2; i <= fontes[aba].length + 500; i++)
        ws.getCell(i, j).dataValidation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: false,
          formulae: [`"${C.MOTIVOS.join(',')}"`],
        }
    }
  }
  return new Uint8Array(await wb.xlsx.writeBuffer())
}
