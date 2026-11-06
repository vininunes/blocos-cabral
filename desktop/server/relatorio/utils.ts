/** Conversões de texto, números e datas no padrão brasileiro (port de app/utils.py). */
import { criar, deMs, formatar, ms, type Data } from './datas'

const MN = /\p{Mn}/gu
const ESPACOS = /\s+/

const texto = (s: unknown) => (s === null || s === undefined || s === false ? '' : String(s))

/** Minúsculas, sem acentos e espaços extras (para comparar cabeçalhos e nomes). */
export function norm(s: unknown): string {
  const t = texto(s).replaceAll(' ', ' ').normalize('NFD').replace(MN, '')
  return t.toLowerCase().split(ESPACOS).filter(Boolean).join(' ')
}

/** Nome de cliente reduzido a letras/números, para casar nota fiscal com pedido. */
export const chaveNome = (s: unknown) => norm(s).replace(/[^a-z0-9]/g, '')

export const soDigitos = (s: unknown) => texto(s).replace(/\D/g, '')

export const limpo = (s: unknown) =>
  texto(s).replaceAll(' ', ' ').split(ESPACOS).filter(Boolean).join(' ')

const FLOAT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

/** '5.050,00' -> 5050 ; '9273,82575' -> 9273.82575 ; '147' -> 147 */
export function numBr(s: unknown): number {
  let t = texto(s).replaceAll(' ', '').trim()
  if (!t) return 0
  if (t.includes(',')) t = t.replaceAll('.', '').replace(',', '.')
  return FLOAT.test(t) ? Number(t) : 0
}

const DATA_BR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
const EXCEL_ZERO = Date.UTC(1899, 11, 30)

/** 'dd/mm/aaaa', 'dd/mm/aaaa hh:mm[:ss]' ou serial do Excel -> data (ou null). */
export function dataBr(s: unknown): Data | null {
  const t = texto(s).trim()
  if (!t) return null
  const m = DATA_BR.exec(t)
  if (m) {
    const [d, mo, y, h, mi, se] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)))
    return criar(y, mo, d, h, mi, se)
  }
  if (/^\d+(\.\d+)?$/.test(t)) {
    // datetime + timedelta(days=x): resolução de microssegundos, aqui arredondada ao segundo
    return deMs(EXCEL_ZERO + Math.round(Number(t) * 86_400) * 1000)
  }
  return null
}

/** 'vendas_2026-10-17-14-39-51.csv' -> 2026-10-17T14:39:51 */
export function dataDoNomeArquivo(nome: string): Data | null {
  const m = /(20\d\d)-(\d\d)-(\d\d)(?:-(\d\d)-(\d\d)(?:-(\d\d))?)?/.exec(nome)
  if (!m) return null
  const p = m.slice(1).map((x) => (x ? Number(x) : 0))
  return criar(p[0], p[1], p[2], p[3], p[4], p[5])
}

export function normalizarUnidade(un: unknown): string {
  const u = texto(un).replaceAll(' ', '').trim().toUpperCase()
  if (u === 'M²' || u === 'M2') return 'm²'
  if (u === 'PALETE' || u === 'PLT') return 'PLT'
  if (['PÇ', 'PC', 'PCA', 'PECA'].includes(u)) return 'PC'
  return u || 'UN'
}

// ---------------------------------------------------------------- formatação

// toFixed arredonda o valor binário como o '{:.Nf}' do Python; só diverge em empates
// exatos (ex.: 0,125), em que o Python vai para o par e o JS para cima.
const fixo = (x: number, casas: number) => x.toFixed(casas)

export function fmtNum(x: number | null | undefined, casas = 0): string {
  const v = Number(x || 0)
  const [int, dec] = fixo(Math.abs(v), casas).split('.')
  const s = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '')
  return (v < 0 && Number(fixo(Math.abs(v), casas)) ? '-' : '') + s
}

export const fmtMoeda = (x: number | null | undefined, casas = 2) => 'R$ ' + fmtNum(x, casas)

/** Quantidade: inteiro sem casas; fracionado com até 2 casas. */
export function fmtQtd(x: number | null | undefined): string {
  const v = Number(x || 0)
  return Number.isInteger(v) ? fmtNum(v, 0) : fmtNum(v, 2)
}

export function fmtMoedaCurta(x: number | null | undefined): string {
  const v = Number(x || 0)
  if (Math.abs(v) >= 1_000_000) return 'R$ ' + fmtNum(v / 1_000_000, 2) + ' mi'
  if (Math.abs(v) >= 10_000) return 'R$ ' + fmtNum(v / 1_000, 1) + ' mil'
  return 'R$ ' + fmtNum(v, 0)
}

/** Valor com sinal na frente do símbolo: +R$ 1.234,56 / -R$ 1.234,56. */
export function fmtSinal(x: number | null | undefined, fmt: (v: number) => string): string {
  const v = Number(x || 0)
  return (v > 0 ? '+' : v < 0 ? '-' : '') + fmt(Math.abs(v))
}

export function fmtPct(x: number | null | undefined, casas = 1, sinal = false): string {
  const v = Number(x || 0)
  const s = fmtNum(v * 100, casas) + '%'
  return sinal && v > 0 ? '+' + s : s
}

export function fmtData(d: Data | null | undefined, comAno = true): string {
  if (!d) return ''
  return formatar(d, comAno ? '%d/%m/%Y' : '%d/%m')
}

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
export const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export { ms }
