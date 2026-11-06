import * as React from 'react'

import {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'

import { matchesNormalized, normalizeSearchText } from '@/lib/search/normalize-text'

import { useTableUiConfig } from './use-table-ui-config'

export function useDataTable<TData extends Record<string, unknown>>(
  data: TData[],
  columns: ColumnDef<TData, unknown>[],
  options?: {
    initialColumnVisibility?: VisibilityState
    initialColumnOrder?: ColumnOrderState
    /** Ordenação inicial (ex.: [{ id: 'created_at', desc: true }]). */
    initialSorting?: SortingState
    /** false desabilita a ordenação por clique nos headers (default true). */
    enableSorting?: boolean
    /**
     * Campos que a BUSCA GLOBAL da tabela varre. Declare sempre que a tela usar
     * `table.setGlobalFilter` / `<DataTable globalFilter>`: sem isso o filtro cai
     * no fallback de varrer TODAS as chaves da linha, e o termo acaba casando com
     * `created_at`, `api_url` e ids (digitar "2024" traz tudo daquele ano).
     * Acessores permitem buscar em campos aninhados/derivados.
     */
    globalFilterFields?: Array<keyof TData & string> | Array<(row: TData) => unknown>
    onColumnOrderChange?: (order: ColumnOrderState) => void
    onColumnVisibilityChange?: (visibility: VisibilityState) => void
    pageSize?: number
    tableId?: string
  }
) {
  const tableId = options?.tableId

  // When tableId is provided and no explicit callback was passed, persist
  // column order / visibility via the user-ui-configurations endpoint.
  const uiConfig = useTableUiConfig(tableId)
  const autoPersistColumnOrder = !!tableId && !options?.onColumnOrderChange
  const autoPersistColumnVisibility = !!tableId && !options?.onColumnVisibilityChange

  // Priority — when auto-persisting, the API-saved value wins over the static
  // default from options. When the caller manages persistence (explicit
  // callback), only their initial value is used.
  const effectiveInitialColumnOrder = autoPersistColumnOrder
    ? (uiConfig.initialColumnOrder ?? options?.initialColumnOrder)
    : options?.initialColumnOrder

  const effectiveInitialColumnVisibility = autoPersistColumnVisibility
    ? (uiConfig.initialColumnVisibility ?? options?.initialColumnVisibility)
    : options?.initialColumnVisibility

  const [sorting, setSorting] = React.useState<SortingState>(options?.initialSorting ?? [])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    effectiveInitialColumnVisibility ?? {}
  )
  // Colunas com meta.pinFirst ficam sempre à frente da ordem — mesmo quando
  // a ordem persistida (salva antes da coluna existir) não as conhece.
  const pinnedFirstIds = React.useMemo(
    () =>
      columns
        .filter((c) => (c.meta as { pinFirst?: boolean } | undefined)?.pinFirst)
        .map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey)
        .filter((id): id is string => !!id),
    [columns]
  )

  const hoistPinned = React.useCallback(
    (order: ColumnOrderState): ColumnOrderState => {
      if (pinnedFirstIds.length === 0) return order
      const pinned = new Set(pinnedFirstIds)
      return [...pinnedFirstIds, ...order.filter((id) => !pinned.has(id))]
    },
    [pinnedFirstIds]
  )

  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(() =>
    hoistPinned(effectiveInitialColumnOrder ?? [])
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  // Sem campos declarados, o fallback varre todas as chaves da linha
  // (comportamento legado — ver `globalFilterFields`).
  const globalFilterFields = options?.globalFilterFields

  // Store callbacks in refs to avoid stale closures and effect deps
  const onColumnOrderChangeRef = React.useRef(options?.onColumnOrderChange)
  onColumnOrderChangeRef.current = options?.onColumnOrderChange
  const onColumnVisibilityChangeRef = React.useRef(options?.onColumnVisibilityChange)
  onColumnVisibilityChangeRef.current = options?.onColumnVisibilityChange

  // Save callbacks from the API hook — also refs to avoid stale closures.
  const saveColumnOrderRef = React.useRef(uiConfig.saveColumnOrder)
  saveColumnOrderRef.current = uiConfig.saveColumnOrder
  const saveColumnVisibilityRef = React.useRef(uiConfig.saveColumnVisibility)
  saveColumnVisibilityRef.current = uiConfig.saveColumnVisibility

  // Track whether initial render has happened to skip firing callbacks on mount
  const hasMountedRef = React.useRef(false)

  // Serialise to JSON so the effect only fires when the value changes, not
  // when the caller passes a new object literal with the same contents.
  const effectiveInitialColumnOrderKey = JSON.stringify(effectiveInitialColumnOrder)
  React.useEffect(() => {
    if (effectiveInitialColumnOrder && effectiveInitialColumnOrder.length > 0) {
      setColumnOrder(hoistPinned(effectiveInitialColumnOrder))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveInitialColumnOrderKey])

  const effectiveInitialColumnVisibilityKey = JSON.stringify(effectiveInitialColumnVisibility)
  React.useEffect(() => {
    if (
      effectiveInitialColumnVisibility &&
      Object.keys(effectiveInitialColumnVisibility).length > 0
    ) {
      setColumnVisibility(effectiveInitialColumnVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveInitialColumnVisibilityKey])

  React.useEffect(() => {
    if (!hasMountedRef.current) return
    onColumnOrderChangeRef.current?.(columnOrder)
    if (autoPersistColumnOrder) saveColumnOrderRef.current(columnOrder)
  }, [columnOrder, autoPersistColumnOrder])

  React.useEffect(() => {
    if (!hasMountedRef.current) return
    onColumnVisibilityChangeRef.current?.(columnVisibility)
    if (autoPersistColumnVisibility) saveColumnVisibilityRef.current(columnVisibility)
  }, [columnVisibility, autoPersistColumnVisibility])

  React.useEffect(() => {
    hasMountedRef.current = true
  }, [])

  const table = useReactTable({
    data,
    columns,
    enableSorting: options?.enableSorting ?? true,
    initialState: {
      pagination: {
        pageSize: options?.pageSize ?? 10,
      },
    },
    state: {
      globalFilter,
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = normalizeSearchText(String(filterValue ?? '').trim())
      if (query === '') return true

      const values =
        globalFilterFields && globalFilterFields.length > 0
          ? globalFilterFields.map((field) =>
              typeof field === 'function' ? field(row.original) : row.original[field]
            )
          : Object.values(row.original)

      return values.some(
        (value) =>
          (typeof value === 'string' || typeof value === 'number') &&
          matchesNormalized(value, query)
      )
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return {
    table,
    sorting,
    columnFilters,
    columnVisibility,
    columnOrder,
    rowSelection,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setColumnOrder,
    setRowSelection,
  }
}

export type UseDataTableReturn<TData extends Record<string, unknown>> = ReturnType<
  typeof useDataTable<TData>
>
