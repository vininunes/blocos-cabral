import { useEffect, useState, type RefObject } from 'react'

/** Tamanho (contentRect) de um elemento, observado via ResizeObserver. */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Arredondado: frações sub-pixel (zoom, animação) não viram re-render nem rebuild do gráfico.
    const update = (rawWidth: number, rawHeight: number) => {
      const width = Math.round(rawWidth)
      const height = Math.round(rawHeight)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(el)
    const rect = el.getBoundingClientRect()
    update(rect.width, rect.height)
    return () => observer.disconnect()
  }, [ref])

  return size
}
