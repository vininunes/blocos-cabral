/**
 * Formato de cada coluna pelo nome:
 * valores em R$, quantidades, percentuais, datas e Diferença/Variação com sinal.
 */
import type { Celula } from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtPct, fmtQtd, fmtSinal } from '@server/relatorio/utils'

const MOEDA = new Set([
  'Valor',
  'Faturado',
  'Entregue',
  'Aprovado',
  'Faturado anterior',
  'Valor anterior',
  'Diferença',
  'Faturamento',
  'Potencial',
  'Provisionado',
  'Realizado',
])
const PREFIXO_MOEDA = ['Valor', 'Faturado', 'Entregue', 'Aprovado']
const QTD = new Set(['Qtd', 'Quantidade', 'Notas', 'Propostas', 'Canceladas', 'Pedidos'])
const PCT = new Set(['Variação', '% das emitidas', 'Participação', 'Acumulado', '% atingido'])
const DATA = /^\d{4}-\d{2}-\d{2}$/

export type FormatoColuna = 'moeda' | 'diferenca' | 'variacao' | 'pct' | 'qtd' | 'texto'

export function formatoColuna(nome: string, amostra: Celula[]): FormatoColuna {
  const numerica = amostra.some((v) => typeof v === 'number')
  if (!numerica) return 'texto'
  if (nome === 'Diferença') return 'diferenca'
  if (nome === 'Variação') return 'variacao'
  if (MOEDA.has(nome) || PREFIXO_MOEDA.some((p) => nome.startsWith(p))) return 'moeda'
  if (PCT.has(nome)) return 'pct'
  if (QTD.has(nome)) return 'qtd'
  return 'qtd'
}

export function formatarCelula(v: Celula, formato: FormatoColuna): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return DATA.test(v) ? fmtData(v) : v
  switch (formato) {
    case 'moeda':
      return fmtMoeda(v)
    case 'diferenca':
      return fmtSinal(v, (x) => fmtMoeda(x))
    case 'variacao':
      return fmtPct(v, 1, true)
    case 'pct':
      return fmtPct(v)
    default:
      return fmtQtd(v)
  }
}

/** Verde/vermelho em Diferença e Variação. */
export function corCelula(v: Celula, formato: FormatoColuna) {
  if ((formato !== 'diferenca' && formato !== 'variacao') || typeof v !== 'number' || v === 0)
    return undefined
  return v > 0 ? 'text-cabral-verde' : 'text-cabral-vermelho'
}
