/**
 * Generic list helpers for text search and alphabetic sorting.
 *
 * Replaces the per-feature `*FilterSearchQuery` / `sortAlphabeticAsc|Desc`
 * helpers that were copy-pasted across vessel, port, area, notification, etc.
 */

import { matchesNormalized, normalizeSearchText } from '@/lib/search/normalize-text'

type SearchFieldValue = string | number | null | undefined
type SearchFieldAccessor<T> = (item: T) => SearchFieldValue

/**
 * Builds a text search filter over the given fields, insensível a acento e
 * caixa ("sao francisco" acha "São Francisco do Sul").
 *
 * An empty query returns the input list unchanged. A field is matched when its
 * stringified value contains the (normalized) query as a substring.
 *
 * Cada superfície declara AQUI os campos que entram na busca — a comparação em
 * si vem de `normalizeSearchText` (`@/lib/search/normalize-text`), única na
 * aplicação.
 *
 * @example
 * const filterVessels = createSearchFilter<VesselMonitorable>([
 *   (v) => v.name,
 *   (v) => v.device_id,
 *   (v) => v.register_number,
 * ])
 * filterVessels(vessels, query)
 */
export function createSearchFilter<T>(fields: Array<SearchFieldAccessor<T>>) {
  return (items: T[], searchQuery: string): T[] => {
    const query = normalizeSearchText(searchQuery.trim())
    if (query === '') return items

    return items.filter((item) =>
      fields.some((getField) => matchesNormalized(getField(item), query))
    )
  }
}

export type AlphabeticDirection = 'asc' | 'desc'

/**
 * Returns a case-insensitive alphabetic comparator for the given name accessor.
 * Useful when composing with other comparators (e.g. a primary tie-breaker).
 *
 * @example
 * ports.sort((a, b) => comparePortType(a, b) || byName(a, b))
 */
export function alphabeticComparator<T>(
  getName: (item: T) => string,
  direction: AlphabeticDirection = 'asc'
) {
  const factor = direction === 'asc' ? 1 : -1

  return (a: T, b: T): number => {
    const nameA = getName(a).toLowerCase()
    const nameB = getName(b).toLowerCase()

    if (nameA < nameB) return -1 * factor
    if (nameA > nameB) return 1 * factor
    return 0
  }
}

/**
 * Sorts a list alphabetically (in place, matching `Array.prototype.sort`) by the
 * given name accessor.
 */
export function sortAlphabetic<T>(
  items: T[],
  getName: (item: T) => string,
  direction: AlphabeticDirection = 'asc'
): T[] {
  return items.sort(alphabeticComparator(getName, direction))
}
