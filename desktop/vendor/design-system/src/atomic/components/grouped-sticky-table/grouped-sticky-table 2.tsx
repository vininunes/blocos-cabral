import { useMemo, useState } from 'react'

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/atomic/base-components/table-base'

import { cn } from '@/lib/tailwind/utils'

/**
 * Tabela com linhas agrupadas em seções, cada uma com cabeçalho sticky próprio
 * (ex.: agrupar por status). `DataTable` (base-components/data-table.tsx) não
 * cobre isso — é lista plana, sem `getGroupedRowModel` nem sub-header; use-o
 * para lista simples com paginação/filtro/coluna reordenável.
 *
 * Cabeçalho de grupo é uma `<tr sticky>` dentro do `<tbody>`, não `<thead>`
 * extra (HTML5 só permite um `<thead>` por `<table>`) nem `<td>` sticky solto
 * (não empilha corretamente entre grupos).
 *
 * Sort é local e por grupo — nunca mistura itens de grupos diferentes.
 */

export interface GroupedStickyTableColumn<TItem> {
  key: string
  label: string
  align?: 'left' | 'right'
  className?: string
  /** Omitir para uma coluna não-ordenável (ex.: ações). */
  sortValue?: (item: TItem) => string | number
  renderCell: (item: TItem) => React.ReactNode
}

export interface GroupedStickyTableGroup<TItem, TGroupKey extends string> {
  key: TGroupKey
  label: React.ReactNode
  count: number
  items: TItem[]
}

interface Sort {
  columnKey: string
  dir: 'asc' | 'desc'
}

function SortableHeadCell<TItem>({
  column,
  sort,
  onToggle,
  isFirst,
}: {
  column: GroupedStickyTableColumn<TItem>
  sort: Sort | null
  onToggle: (columnKey: string) => void
  isFirst: boolean
}) {
  const align = column.align ?? 'left'
  const headClassName = cn(
    'sticky top-0 z-10 bg-background border-b',
    !isFirst && 'border-l',
    align === 'right' && 'text-right',
    column.className,
  )

  if (!column.sortValue) {
    return <TableHead className={headClassName}>{column.label}</TableHead>
  }

  const active = sort?.columnKey === column.key
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <TableHead className={headClassName}>
      <button
        type="button"
        onClick={() => onToggle(column.key)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active && 'text-foreground',
        )}
      >
        <span>{column.label}</span>
        <Icon className="size-3 opacity-60" />
      </button>
    </TableHead>
  )
}

export interface GroupedStickyTableProps<TItem, TGroupKey extends string> {
  columns: GroupedStickyTableColumn<TItem>[]
  groups: GroupedStickyTableGroup<TItem, TGroupKey>[]
  getRowKey: (item: TItem) => string | number
  /** Conteúdo mostrado no lugar da tabela quando não há nenhum item em nenhum grupo. */
  emptyState: React.ReactNode
  className?: string
  /** Largura de cada coluna via `<colgroup>` (ex.: `'14%'`, `'auto'`) — mesma ordem de `columns`. */
  columnWidths?: string[]
  onRowClick?: (item: TItem) => void
  getRowClassName?: (item: TItem) => string | undefined
  minWidth?: string
}

export function GroupedStickyTable<TItem, TGroupKey extends string>({
  columns,
  groups: baseGroups,
  getRowKey,
  emptyState,
  className,
  columnWidths,
  onRowClick,
  getRowClassName,
  minWidth,
}: GroupedStickyTableProps<TItem, TGroupKey>) {
  const [sort, setSort] = useState<Sort | null>(null)

  // Ordenação clicável cicla: asc → desc → padrão (sem ordenação = ordem original).
  function toggleSort(columnKey: string) {
    setSort((prev) => {
      if (prev?.columnKey !== columnKey) return { columnKey, dir: 'asc' }
      if (prev.dir === 'asc') return { columnKey, dir: 'desc' }
      return null
    })
  }

  const groups = useMemo(() => {
    if (!sort) return baseGroups
    const column = columns.find((c) => c.key === sort.columnKey)
    if (!column?.sortValue) return baseGroups

    const comparator = (a: TItem, b: TItem) => {
      const av = column.sortValue!(a)
      const bv = column.sortValue!(b)
      const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? c : -c
    }
    // Ordena DENTRO de cada grupo — os grupos permanecem separados.
    return baseGroups.map((g) => ({ ...g, items: [...g.items].sort(comparator) }))
  }, [baseGroups, columns, sort])

  const total = groups.reduce((acc, g) => acc + g.items.length, 0)
  const colSpan = columns.length

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden select-text', className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={minWidth ? { minWidth } : undefined}
        >
          {columnWidths && (
            <colgroup>
              {columnWidths.map((width, i) => (
                <col key={columns[i]?.key ?? i} style={{ width }} />
              ))}
            </colgroup>
          )}

          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-transparent hover:bg-transparent even:bg-transparent">
              {columns.map((column, i) => (
                <SortableHeadCell
                  key={column.key}
                  column={column}
                  sort={sort}
                  onToggle={toggleSort}
                  isFirst={i === 0}
                />
              ))}
            </TableRow>
          </TableHeader>

          {total === 0 ? (
            <TableBody>
              <TableRow className="bg-transparent hover:bg-transparent even:bg-transparent">
                <TableCell colSpan={colSpan} className="border-b py-16 text-center text-sm text-muted-foreground">
                  {emptyState}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            groups.map((group) => (
              <TableBody key={group.key}>
                <TableRow className="sticky top-10 z-10 bg-muted hover:bg-muted even:bg-muted">
                  <TableHead colSpan={colSpan} className="h-auto border-b px-3 py-1.5 text-left font-medium">
                    <span className="inline-flex items-center gap-2">
                      {group.label}
                      <span className="rounded bg-background px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {group.count}
                      </span>
                    </span>
                  </TableHead>
                </TableRow>

                {group.items.map((item) => (
                  <TableRow
                    key={getRowKey(item)}
                    className={cn(
                      onRowClick && 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                      getRowClassName?.(item),
                    )}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              onRowClick(item)
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((column, i) => (
                      <TableCell
                        key={column.key}
                        // overflow-hidden é essencial com table-fixed: sem ele,
                        // conteúdo whitespace-nowrap mais largo que a coluna
                        // (ex. um `truncate` no <span> interno, que só corta
                        // dentro da própria largura do <span>, não da <td>)
                        // vaza visualmente sobre a coluna vizinha em vez de
                        // ser cortado no limite real da coluna.
                        className={cn('overflow-hidden border-b', i > 0 && 'border-l', column.className)}
                      >
                        {column.renderCell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            ))
          )}
        </table>
      </div>
    </div>
  )
}
