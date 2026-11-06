import { useEffect, useState } from 'react'

/**
 * Valor com debounce: só acompanha `value` depois de `delay` ms sem mudança.
 * Para buscas por tecla que viram queryKey/request (uma entrada de cache e um
 * request por caractere sem isso).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
