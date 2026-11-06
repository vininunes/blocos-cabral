import { useCallback, useEffect, useRef } from 'react'

import type { ColumnOrderState, VisibilityState } from '@tanstack/react-table'
import { useMutation, useQuery } from '@tanstack/react-query'

import { getUserUiConfig, upsertUserUiConfig } from '@/services/http-user-ui-config'

interface TableUiConfigValue {
  columnOrder?: ColumnOrderState
  columnVisibility?: VisibilityState
}

const SAVE_DEBOUNCE_MS = 500

function configKeyFor(tableId: string): string {
  return `data-table-${tableId}`
}

/**
 * Persistent column order/visibility for a table via the
 * `/user-ui-configurations/{email}/{configKey}` endpoint.
 *
 * Returns initial values from the API (undefined until fetched) and
 * debounced setters that PUT the merged value to the backend.
 */
export function useTableUiConfig(tableId: string | undefined) {
  const enabled = !!tableId
  const configKey = tableId ? configKeyFor(tableId) : ''

  const query = useQuery({
    queryKey: ['user-ui-config', 'table', tableId],
    queryFn: () => getUserUiConfig<TableUiConfigValue>(configKey),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  })

  const mutation = useMutation({
    mutationFn: (value: TableUiConfigValue) => upsertUserUiConfig(configKey, value),
  })

  // Hold the latest persisted value so we can merge partial updates.
  const valueRef = useRef<TableUiConfigValue>({})
  useEffect(() => {
    if (query.data?.value) valueRef.current = query.data.value
  }, [query.data])

  const mutateRef = useRef(mutation.mutate)
  mutateRef.current = mutation.mutate

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSave = useCallback(
    (next: TableUiConfigValue) => {
      if (!enabled) return
      valueRef.current = { ...valueRef.current, ...next }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        mutateRef.current(valueRef.current)
        debounceRef.current = null
      }, SAVE_DEBOUNCE_MS)
    },
    [enabled],
  )

  const saveColumnOrder = useCallback(
    (columnOrder: ColumnOrderState) => scheduleSave({ columnOrder }),
    [scheduleSave]
  )
  const saveColumnVisibility = useCallback(
    (columnVisibility: VisibilityState) => scheduleSave({ columnVisibility }),
    [scheduleSave]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    initialColumnOrder: query.data?.value?.columnOrder,
    initialColumnVisibility: query.data?.value?.columnVisibility,
    saveColumnOrder,
    saveColumnVisibility,
    isLoading: enabled && query.isLoading,
  }
}
