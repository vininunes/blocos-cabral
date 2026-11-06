import { useEffect, useRef } from 'react'

import { useElementSize } from '../hooks/use-element-size'

/** Menor lado (px) em que vale desenhar. */
const MIN_SIZE = 40

/**
 * Caixa que MEDE a si mesma (ResizeObserver) e pede um gráfico do Observable Plot no
 * tamanho exato — caixa padrão dos gráficos. `build` deve ser estável
 * (useCallback) e devolver o elemento do Plot, ou null para não desenhar.
 *
 * `[&>svg]:!w-full/!h-full`: o global.css encolhe para 16px todo `svg` sem classe
 * `size-*` — o SVG do Plot não tem classe.
 */
export function PlotBox({
  build,
}: {
  build: (width: number, height: number) => SVGSVGElement | HTMLElement | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(containerRef)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (width < MIN_SIZE || height < MIN_SIZE) {
      el.replaceChildren()
      return
    }
    const chart = build(width, height)
    if (chart) el.replaceChildren(chart)
    else el.replaceChildren()
  }, [build, width, height])

  useEffect(() => {
    const el = containerRef.current
    return () => el?.replaceChildren()
  }, [])

  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden [&>svg]:!h-full [&>svg]:!w-full [&>svg]:!max-w-full"
      />
    </div>
  )
}
