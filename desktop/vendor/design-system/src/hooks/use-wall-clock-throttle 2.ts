import { useEffect, useRef, useState } from 'react'

/**
 * Devolve `value`, mas propaga mudanças no máximo uma vez a cada `intervalMs`
 * de relógio de parede (a última mudança sempre chega, com atraso ≤ intervalMs).
 * Útil para valores derivados do tempo do player: em velocidade alta o tempo de
 * playback muda a cada tick de 100 ms, e quem só precisa acompanhar
 * visualmente (agulha de gráfico, esmaecimento de trilha) não precisa de 10 Hz.
 */
export function useWallClockThrottle<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value)
  const lastEmitRef = useRef(0)

  useEffect(() => {
    if (Object.is(value, throttled)) return
    const wait = lastEmitRef.current + intervalMs - performance.now()
    if (wait <= 0) {
      lastEmitRef.current = performance.now()
      setThrottled(value)
      return
    }
    const timer = setTimeout(() => {
      lastEmitRef.current = performance.now()
      setThrottled(value)
    }, wait)
    return () => clearTimeout(timer)
  }, [value, throttled, intervalMs])

  return throttled
}
