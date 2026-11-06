/** Corta rótulos longos do eixo (o texto inteiro aparece no ponteiro). */
export function cortar(rotulo: string, max: number) {
  return rotulo.length <= max ? rotulo : `${rotulo.slice(0, max - 1)}…`
}

/** Margem esquerda para caber os rótulos das categorias (barras horizontais). */
export function margemRotulos(rotulos: string[], largura: number, max = 34) {
  const maior = Math.max(4, ...rotulos.map((r) => cortar(r, max).length))
  // ~6,6 px por caractere na fonte de 10px dos gráficos
  return Math.min(Math.round(largura * 0.45), Math.round(maior * 6.6) + 14)
}
