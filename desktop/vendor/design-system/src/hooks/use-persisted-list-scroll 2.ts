import { useCallback, useEffect, useRef, useState } from 'react'

/** Persistência do scrollTop só depois que a rolagem para. */
const SCROLL_PERSIST_DELAY_MS = 250

/**
 * Scroll de lista persistido nas props de uma janela SEM re-render por frame.
 *
 * Antes as janelas de lista gravavam o scrollTop cru a cada evento de scroll
 * (setState + escrita debounced no windowsState), re-renderizando a janela e a
 * lista virtualizada por frame. Aqui o estado React é só o booleano `scrolled`
 * (sombra do header, muda ao cruzar o topo) e o scrollTop é persistido via
 * `persist` quando a rolagem para.
 */
export function usePersistedListScroll(
  initialScrollTop: number,
  persist: (scrollTop: number) => void
) {
  const [scrolled, setScrolled] = useState(initialScrollTop > 0)
  const persistRef = useRef(persist)
  useEffect(() => {
    persistRef.current = persist
  }, [persist])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const onScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    setScrolled(scrollTop > 0)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      persistRef.current(scrollTop)
    }, SCROLL_PERSIST_DELAY_MS)
  }, [])

  return { scrolled, onScroll }
}
