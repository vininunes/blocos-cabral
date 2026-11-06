/** Estilo dos gráficos, (Observable Plot). */
export const GRID = { stroke: 'currentColor', strokeOpacity: 0.3, strokeDasharray: '3 3' }
export const EIXO = { stroke: 'currentColor', strokeOpacity: 0.35 }
export const ESTILO = {
  background: 'transparent',
  color: 'currentColor',
  fontSize: '10px',
  overflow: 'visible',
}
/**
 * Tooltip dos gráficos (Plot.tip): no tip, `fill` é o FUNDO do balão e o texto usa a cor do
 * gráfico (currentColor); fundo e borda seguem o tema (claro/escuro) do design system.
 */
export const TOOLTIP = {
  fill: 'var(--background)',
  stroke: 'var(--border)',
  fontSize: 11,
  lineHeight: 1.3,
  textPadding: 8,
  pathFilter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
}

/** Cores da Blocos Cabral (tokens em styles/relatorio.css; acompanham o tema escuro). */
export const COR = {
  azul: 'var(--cabral-azul)',
  verde: 'var(--cabral-verde)',
  vermelho: 'var(--cabral-vermelho)',
  grafite: 'var(--cabral-grafite)',
  /** Período B (comparação). */
  cinza: '#a3a9b5',
}
