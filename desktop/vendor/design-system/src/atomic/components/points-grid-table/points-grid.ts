/** Uma linha da tabela de pontos: o TEXTO de cada coluna (a edição é livre;
 * o número só vale quando o texto é válido). */
export type PointsGridRow = string[]

/** Texto de uma célula → número (vírgula decimal aceita; vazio = NaN). */
export function parsePointsGridCell(value: string): number {
  return value.trim() === '' ? NaN : Number(value.replace(',', '.'))
}

/** Texto das células → números (NaN onde a célula não é número). */
export function pointsGridToNumbers(rows: PointsGridRow[]): number[][] {
  return rows.map((row) => row.map(parsePointsGridCell))
}
