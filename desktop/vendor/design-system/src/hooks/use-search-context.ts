/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'

import { getContext } from '@/lib/search/search-registry'

export function useSearchContext<T extends { id: string }, F = any>(
  key: string,
  docs: T[],
  query: string,
  filters?: F
) {
  const { build, search } = getContext(key)

  const index = useMemo(() => build(docs), [build, docs])

  const ids = useMemo(() => {
    if (!query && !filters) return docs.map((d) => d.id)
    return search(index, query, filters)
  }, [index, query, filters, search, docs])

  const idSet = useMemo(() => new Set(ids), [ids])
  const results = useMemo(() => docs.filter((d) => idSet.has(d.id)), [docs, idSet])

  return { results, ids, index }
}
