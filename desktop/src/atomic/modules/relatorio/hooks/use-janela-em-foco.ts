import { useEffect, useState } from 'react'

/** A janela do app está em foco? (eventos focus/blur da janela) */
export function useJanelaEmFoco() {
  const [foco, setFoco] = useState(() => document.hasFocus())
  useEffect(() => {
    const on = () => setFoco(true)
    const off = () => setFoco(false)
    window.addEventListener('focus', on)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('focus', on)
      window.removeEventListener('blur', off)
    }
  }, [])
  return foco
}
