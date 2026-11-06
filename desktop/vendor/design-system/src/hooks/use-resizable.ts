import { useCallback, useEffect, useRef, useState } from 'react'

interface Size {
  w: number
  h: number
}

interface UseResizableOptions {
  initial: Size
  min: Size
  aspectRatio?: number // width / height — when set, height is derived from width
  /**
   * Limite superior, avaliado a cada movimento (o container pode mudar de
   * tamanho no meio do resize). Dentro de uma janela use
   * `useWindowMaxContentSize()`. `undefined` = sem limite. `min` prevalece.
   */
  getMax?: (contentEl: HTMLElement) => Size | undefined
}

export function useResizable({ initial, min, aspectRatio, getMax }: UseResizableOptions) {
  const [size, setSize] = useState<Size>(initial)
  const sizeRef = useRef<Size>(initial)
  const dragging = useRef(false)
  const origin = useRef({ x: 0, y: 0, w: 0, h: 0 })
  // Coalescência por frame: o pointermove pode vir acima da taxa de quadros e
  // cada setSize re-renderiza o conteúdo inteiro (ex.: player da janela CCTV),
  // além de medir o container (getMax) por evento.
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number; el: HTMLElement } | null>(null)

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  const applyPending = useCallback(() => {
    rafRef.current = null
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    let w = origin.current.w + pending.x - origin.current.x
    let h = origin.current.h + pending.y - origin.current.y
    const max = getMax?.(pending.el)
    if (max) {
      w = Math.min(w, max.w)
      h = Math.min(h, max.h)
      // Com proporção fixa a altura deriva da largura: limitar também a
      // largura pela altura máxima, senão a janela estoura por baixo.
      if (aspectRatio) w = Math.min(w, max.h * aspectRatio)
    }
    if (aspectRatio) h = w / aspectRatio
    const newSize = { w: Math.max(min.w, w), h: Math.max(min.h, h) }
    if (newSize.w === sizeRef.current.w && newSize.h === sizeRef.current.h) return
    sizeRef.current = newSize
    setSize(newSize)
  }, [min, aspectRatio, getMax])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    origin.current = { x: e.clientX, y: e.clientY, w: sizeRef.current.w, h: sizeRef.current.h }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return
      pendingRef.current = { x: e.clientX, y: e.clientY, el: e.currentTarget }
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(applyPending)
    },
    [applyPending]
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
    // Aplica o último movimento pendente já, sem esperar o próximo frame.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      applyPending()
    }
  }, [applyPending])

  return { size, onPointerDown, onPointerMove, onPointerUp }
}
