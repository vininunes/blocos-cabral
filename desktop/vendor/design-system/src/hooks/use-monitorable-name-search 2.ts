import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getSearchMonitorables,
  type SearchMonitorableFilter,
} from '@/atomic/features/vessel/api/http-search-monitorable'

import { useDebounce } from './use-debounce'

export interface MonitorableSearchOption {
  value: number
  label: string
}

const MIN_QUERY_LENGTH = 4
const SEARCH_DEBOUNCE_MS = 300

/**
 * Busca de monitorable por nome para selects de formulário (admin): debounce de
 * 300 ms, cancela o request anterior (AbortController) e descarta respostas
 * obsoletas. Antes cada tecla disparava um request e respostas fora de ordem
 * podiam sobrescrever o resultado da busca mais recente.
 *
 * `filter` amplia os campos buscados (ex.: `['name', 'device_id']` também acha
 * pelo MMSI) e `withDeviceId` mostra o MMSI no rótulo — útil para desambiguar
 * homônimos. Os defaults mantêm o comportamento dos forms de admin.
 */
export function useMonitorableNameSearch({
  filter = 'name',
  withDeviceId = false,
}: {
  filter?: SearchMonitorableFilter | SearchMonitorableFilter[]
  withDeviceId?: boolean
} = {}) {
  // Chave primitiva: um array literal novo por render recriaria o runSearch.
  const filterKey = Array.isArray(filter) ? filter.join(',') : filter
  const [searchResults, setSearchResults] = useState<MonitorableSearchOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const seqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const runSearch = useCallback(
    async (query: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const seq = ++seqRef.current
      setIsSearching(true)
      try {
        const response = await getSearchMonitorables(
          { q: query, filter: filterKey },
          controller.signal
        )
        if (seq !== seqRef.current) return
        setSearchResults(
          response.data.map((item) => ({
            value: item.monitorable.id,
            label: withDeviceId
              ? `${item.monitorable.name || '-'} · ${item.monitorable.device_id}`
              : item.monitorable.name,
          }))
        )
      } catch {
        if (seq !== seqRef.current) return
        setSearchResults([])
      } finally {
        if (seq === seqRef.current) setIsSearching(false)
      }
    },
    [filterKey, withDeviceId]
  )

  const { debounced, cancel } = useDebounce(runSearch, SEARCH_DEBOUNCE_MS)

  const handleSearch = useCallback(
    (query: string) => {
      if (query.length < MIN_QUERY_LENGTH) {
        cancel()
        abortRef.current?.abort()
        seqRef.current++
        setIsSearching(false)
        setSearchResults([])
        return
      }
      debounced(query)
    },
    [cancel, debounced]
  )

  return { searchResults, isSearching, handleSearch }
}
