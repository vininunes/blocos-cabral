/**
 * Datas sem fuso, como texto: dia 'AAAA-MM-DD' e data-hora 'AAAA-MM-DDTHH:MM:SS'.
 * Comparar textos nesse formato equivale a comparar as datas; a aritmética usa UTC
 * por baixo para nunca depender do fuso da máquina. `null` = sem data (NaT no Python).
 */
export type Dia = string
export type DataHora = string
export type Data = Dia | DataHora

const DIA_MS = 86_400_000
const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function ms(d: Data): number {
  const [y, m, dd] = [Number(d.slice(0, 4)), Number(d.slice(5, 7)), Number(d.slice(8, 10))]
  const [h, mi, s] =
    d.length > 10
      ? [Number(d.slice(11, 13)), Number(d.slice(14, 16)), Number(d.slice(17, 19))]
      : [0, 0, 0]
  return Date.UTC(y, m - 1, dd, h, mi, s)
}

/** Data-hora a partir de ms UTC; meia-noite vira só o dia (como o Python grava). */
export function deMs(t: number): Data {
  const x = new Date(t)
  const dia = `${pad(x.getUTCFullYear(), 4)}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`
  const h = x.getUTCHours(),
    mi = x.getUTCMinutes(),
    s = x.getUTCSeconds()
  return h || mi || s ? `${dia}T${pad(h)}:${pad(mi)}:${pad(s)}` : dia
}

export function criar(y: number, m: number, d: number, h = 0, mi = 0, s = 0): Data | null {
  const t = Date.UTC(y, m - 1, d, h, mi, s)
  const x = new Date(t)
  if (x.getUTCFullYear() !== y || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null
  if (h > 23 || mi > 59 || s > 59) return null
  return deMs(t)
}

/** Só o dia (normalize do pandas). */
export const dia = (d: Data | null): Dia | null => (d ? d.slice(0, 10) : null)

export const addDias = (d: Dia, n: number): Dia => deMs(ms(d) + n * DIA_MS).slice(0, 10)

/** a - b em dias inteiros, arredondando para baixo (timedelta.days do Python). */
export const difDias = (a: Data, b: Data) => Math.floor((ms(a) - ms(b)) / DIA_MS)

/** |a - b| em dias inteiros (abs(timedelta).days). */
export const difDiasAbs = (a: Data, b: Data) => Math.floor(Math.abs(ms(a) - ms(b)) / DIA_MS)

/** Dia da semana com segunda = 0 (date.weekday()). */
export const diaSemana = (d: Dia) => (new Date(ms(d)).getUTCDay() + 6) % 7

export const ano = (d: Dia) => Number(d.slice(0, 4))
export const mes = (d: Dia) => Number(d.slice(5, 7))
export const diaDoMes = (d: Dia) => Number(d.slice(8, 10))

export const ultimoDiaDoMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Primeiro dia do mês `n` meses depois de `d`. */
export function addMeses(d: Dia, n: number): Dia {
  const m = mes(d) - 1 + n
  const y = ano(d) + Math.floor(m / 12)
  return `${pad(y, 4)}-${pad((((m % 12) + 12) % 12) + 1)}-01`
}

/** Dias de `ini` a `fim` (inclusive). */
export function intervalo(ini: Dia, fim: Dia): Dia[] {
  const out: Dia[] = []
  for (let d = ini; d <= fim; d = addDias(d, 1)) out.push(d)
  return out
}

export const minData = (a: Data, b: Data) => (a <= b ? a : b)
export const maxData = (a: Data, b: Data) => (a >= b ? a : b)

/** Agora, no horário local da máquina, sem frações de segundo. */
export function agora(): DataHora {
  const x = new Date()
  return `${pad(x.getFullYear(), 4)}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`
}

/** strftime simplificado: %d %m %y %Y %H %M. */
export function formatar(d: Data, fmt: string): string {
  return fmt
    .replace('%d', d.slice(8, 10))
    .replace('%m', d.slice(5, 7))
    .replace('%Y', d.slice(0, 4))
    .replace('%y', d.slice(2, 4))
    .replace('%H', d.length > 10 ? d.slice(11, 13) : '00')
    .replace('%M', d.length > 10 ? d.slice(14, 16) : '00')
}
