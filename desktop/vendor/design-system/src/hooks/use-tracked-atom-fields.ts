import { useCallback, useEffect, useReducer, useRef } from 'react'

import { type Atom, useStore } from 'jotai'

/**
 * Assina um atom de OBJETO só pelos campos efetivamente lidos.
 *
 * `read(field)` devolve o valor atual (do store) e registra o campo; o hook só
 * re-renderiza quando um campo registrado muda (`Object.is`). O conjunto de
 * campos só cresce (leituras no render, em memos, effects ou handlers).
 *
 * `version` incrementa a cada mudança relevante: use-o nas deps de callbacks
 * "leitores" para que mudem de identidade exatamente quando o que leem muda.
 *
 * Base de hooks de ações que antes faziam `useAtom(estadoInteiro)` e forçavam
 * re-render de todos os consumidores a cada escrita (ex.: arrasto).
 */
export function useTrackedAtomFields<T extends object>(atom: Atom<T>) {
  const store = useStore()
  const trackedRef = useRef<Set<keyof T>>(new Set())
  const [version, bumpVersion] = useReducer((v: number) => v + 1, 0)
  const renderedRef = useRef<T>(store.get(atom))
  renderedRef.current = store.get(atom)

  useEffect(() => {
    const changedTracked = (prev: T, next: T) => {
      for (const field of trackedRef.current) {
        if (!Object.is(prev[field], next[field])) return true
      }
      return false
    }
    let last = renderedRef.current
    const unsubscribe = store.sub(atom, () => {
      const next = store.get(atom)
      const prev = last
      last = next
      if (prev !== next && changedTracked(prev, next)) bumpVersion()
    })
    // Mudança entre o render e a assinatura.
    const current = store.get(atom)
    if (current !== last) {
      const prev = last
      last = current
      if (changedTracked(prev, current)) bumpVersion()
    }
    return unsubscribe
  }, [store, atom])

  const read = useCallback(
    <K extends keyof T>(field: K): T[K] => {
      trackedRef.current.add(field)
      return store.get(atom)[field]
    },
    [store, atom]
  )

  return { read, version, store }
}
