import { fmtData, fmtMoeda, fmtNum, fmtQtd } from '@server/relatorio/utils'

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
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

export const campoNumerico = (chave: string) =>
  MOEDA.has(chave) || chave === 'qtd' || chave === 'linhas'

/** Valor de um campo da base formatado para a tabela (R$, quantidade, datas). */
export function formatarCampo(chave: string, v: string | number | null): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number')
    return MOEDA.has(chave) ? fmtMoeda(v) : chave === 'qtd' ? fmtQtd(v) : fmtNum(v)
  if (DATA_HORA.test(v)) return `${fmtData(v)} ${v.slice(11, 16)}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtData(v)
  return v
}
