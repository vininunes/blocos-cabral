/**
 * Planilhas: Excel do relatório e a base exportada em .xlsx
 * (a base do app fica em JSON; o .xlsx é a cópia para abrir no Excel).
 */
import ExcelJS from 'exceljs'

import type { Base } from './base'
import { EDITAVEIS } from './base'
import * as C from './config'
import type { Celula, FormatoKpi, Tabela } from './metricas'

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

/** { aba: tabela } -> .xlsx formatado (cabeçalho azul, larguras, R$, %, datas). */
export async function excelRelatorio(
  tabelas: Record<string, Tabela & { formatos?: FormatoKpi[] }>
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
  return new Uint8Array(await wb.xlsx.writeBuffer())
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
])
const DATA_HORA_COLS = new Set([
  'ult_ocorrencia',
  'primeira_importacao',
  'ultima_atualizacao',
  'importado_em',
])

/** A base inteira em .xlsx (abas Propostas, Pedidos, Notas, ItensPropostas, Arquivos). */
export async function exportarBase(base: Base): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const fontes: Record<string, object[]> = {
    Propostas: base.propostas,
    Pedidos: base.pedidos,
    Notas: base.notas,
    ItensPropostas: base.itensPropostas,
    Arquivos: base.t.arquivos,
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
            : c.startsWith('dt_') || c === 'data'
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
