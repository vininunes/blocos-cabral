import { useCallback, useState } from 'react'

type Updater<T> = T | ((prev: T) => T)

/**
 * Generic setter for a single key of a list's display-preferences object.
 * Accepts a value or an updater function, like React's `setState`.
 */
export type HandleDisplayPreferences<Prefs> = <K extends keyof Prefs>(
  key: K,
  next: Updater<Prefs[K]>
) => void

/**
 * Shared state machine for list views: a search query plus a display-preferences
 * object updated key-by-key. Extracts the boilerplate duplicated across
 * `useVesselList`, `usePortList`, etc. — each hook keeps its own (filter/sort)
 * derivation so memo dependencies stay surgical.
 */
export function useListPreferences<Prefs>(defaultPreferences: Prefs, defaultSearchQuery = '') {
  const [displayPreferences, setDisplayPreferences] = useState(defaultPreferences)
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery)

  const handleDisplayPreferences = useCallback<HandleDisplayPreferences<Prefs>>((key, next) => {
    setDisplayPreferences((prev) => {
      const newValue =
        typeof next === 'function'
          ? (next as (prev: Prefs[typeof key]) => Prefs[typeof key])(prev[key])
          : next
      return { ...prev, [key]: newValue }
    })
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    displayPreferences,
    setDisplayPreferences,
    handleDisplayPreferences,
  }
}
