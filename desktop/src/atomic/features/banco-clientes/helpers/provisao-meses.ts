/** Grade de provisão mensal: conversão e validação dos valores digitados. */

/** '1.234,56' ou '1234.56' -> 1234.56; vazio -> null. */
export const numeroOuNulo = (s: string): number | null => {
  const t = s.trim()
  if (!t) return null
  return Number(t.includes(',') ? t.replaceAll('.', '').replace(',', '.') : t)
}

/** Valores digitados por mês ('AAAA-MM' -> texto). */
export type MesesDigitados = Record<string, string>

export const mesDoAno = (ano: number, i: number) => `${ano}-${String(i + 1).padStart(2, '0')}`

/** Meses com valor inválido (não numérico ou negativo). */
export function mesesInvalidos(ano: number, valores: MesesDigitados) {
  return Array.from({ length: 12 }, (_, i) => mesDoAno(ano, i)).filter((m) => {
    const v = numeroOuNulo(valores[m] ?? '')
    return v !== null && (!Number.isFinite(v) || v < 0)
  })
}
