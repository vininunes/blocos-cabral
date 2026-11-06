import type { DiaIso } from '@server/relatorio/api-tipos'

/** 'AAAA-MM-DD' <-> Date local (o DatePicker do design system trabalha com Date). */
export function diaParaDate(d: DiaIso | null | undefined): Date | undefined {
  if (!d) return undefined
  return new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
}

export function dateParaDia(d: Date | undefined): DiaIso | null {
  if (!d) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
