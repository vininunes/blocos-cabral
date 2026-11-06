import * as React from 'react'

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Column,
  flexRender,
  Header,
  Row,
  Table as TanStackTable,
  Table as TanstackTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  EyeOff,
  GripVertical,
  Search,
} from 'lucide-react'

import { useDebounce } from '@/hooks/use-debounce'

import { cn } from '@/lib/tailwind/utils'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { InputText } from './input-text'
import { Select } from './select'
import { TableCell, TableHead, TableRow } from './table-base'

type DataTableProps<TData> = {
  table: TanstackTable<TData>
  globalFilter?: boolean
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  tableFooter?: React.ReactNode
  className?: string
  transparent?: boolean
  renderRowActions?: (row: Row<TData>) => React.ReactNode
  disableColumnReorder?: boolean
  getRowClassName?: (row: Row<TData>) => string
  onRowClick?: (row: Row<TData>) => void
  onRowMouseEnter?: (row: Row<TData>) => void
  onRowMouseLeave?: () => void
  rowRef?: (row: Row<TData>, el: HTMLTableRowElement | null) => void
}

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

interface DataTablePaginationProps<TData> {
  table: TanStackTable<TData>
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 25, 30, 40, 50],
}: DataTablePaginationProps<TData>) {
  const pageSize = table.getState().pagination.pageSize
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of{' '}
        {table.getFilteredRowModel().rows.length}
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
            items={[pageSizeOptions.map((size) => ({ value: `${size}`, name: `${size}` }))]}
            placeholder={`${pageSize}`}
            className="w-[70px]"
          />
        </div>

        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-7 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-7 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="data-[state=open]:bg-accent">
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1" />
            ) : (
              <ChevronsUpDown className="ml-1" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function DataTableViewOptions<TData>({ table }: { table: TanStackTable<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Columns
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value)}
              onSelect={(e) => e.preventDefault()}
            >
              {(column.columnDef.meta as { title?: string })?.title ??
                (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DraggableTableHeader<TData>({
  header,
  index,
}: {
  header: Header<TData, unknown>
  index: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        header.index == 0 ? 'w-[40px]' : '',
        index > 0 ? 'border-l' : '',
        (header.column.columnDef.meta as { headerClassName?: string })?.headerClassName
      )}
    >
      <div className="flex items-center gap-1">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="size-4 text-muted-foreground" />
        </span>
        {header.isPlaceholder
          ? null
          : header.column.columnDef.header
            ? flexRender(header.column.columnDef.header, header.getContext())
            : null}
      </div>
    </TableHead>
  )
}

function StaticTableHeader<TData>({
  header,
  index,
}: {
  header: Header<TData, unknown>
  index: number
}) {
  return (
    <TableHead
      className={cn(
        header.index == 0 ? 'w-[40px]' : '',
        index > 0 ? 'border-l' : '',
        (header.column.columnDef.meta as { headerClassName?: string })?.headerClassName
      )}
    >
      {header.isPlaceholder
        ? null
        : header.column.columnDef.header
          ? flexRender(header.column.columnDef.header, header.getContext())
          : null}
    </TableHead>
  )
}

// Opções estáveis (módulo): inline a cada render anulavam o memo do dnd-kit e
// recomputavam activators/listeners de todos os cabeçalhos.
const MOUSE_SENSOR_OPTIONS = { activationConstraint: { distance: 5 } }
const TOUCH_SENSOR_OPTIONS = { activationConstraint: { delay: 250, tolerance: 5 } }
const DND_MODIFIERS = [restrictToHorizontalAxis]

export function DataTable<TData>({
  table,
  globalFilter,
  toolbar,
  footer,
  tableFooter,
  className,
  transparent,
  renderRowActions,
  disableColumnReorder = false,
  getRowClassName,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  rowRef,
}: DataTableProps<TData>) {
  const [inputValue, setInputValue] = React.useState(table.getState().globalFilter ?? '')

  const { debounced: setDebouncedFilter } = useDebounce((value: string) => {
    table.setGlobalFilter(value)
  }, 200)
  // Filtro aplicado no onChange (antes num effect de [inputValue], que
  // disparava setGlobalFilter('') em toda montagem, mesmo sem filtro).

  const columnOrder = table.getState().columnOrder
  const columns = table.getAllLeafColumns()

  // Colunas fixas no início (meta.pinFirst): não participam do drag e ficam
  // sempre à frente, mesmo com uma ordem persistida que não as conhece.
  const pinnedIds = React.useMemo(
    () =>
      new Set(
        columns
          .filter((c) => (c.columnDef.meta as { pinFirst?: boolean })?.pinFirst)
          .map((c) => c.id)
      ),
    [columns]
  )

  const columnIds = React.useMemo(() => {
    const allIds = columns.map((c) => c.id)
    let ordered = allIds
    if (columnOrder.length > 0) {
      const orderSet = new Set(columnOrder)
      const missing = allIds.filter((id) => !orderSet.has(id))
      ordered = [...columnOrder, ...missing]
    }
    if (pinnedIds.size === 0) return ordered
    return [
      ...ordered.filter((id) => pinnedIds.has(id)),
      ...ordered.filter((id) => !pinnedIds.has(id)),
    ]
  }, [columnOrder, columns, pinnedIds])

  const sensors = useSensors(
    useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS),
    useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      // Colunas fixas não são arrastáveis nem alvo de drop
      if (pinnedIds.has(active.id as string) || (over && pinnedIds.has(over.id as string))) return
      if (over && active.id !== over.id) {
        const oldIndex = columnIds.indexOf(active.id as string)
        const newIndex = columnIds.indexOf(over.id as string)
        const newOrder = arrayMove(columnIds, oldIndex, newIndex)
        table.setColumnOrder(newOrder)
      }
    },
    [columnIds, pinnedIds, table]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={DND_MODIFIERS}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col w-full gap-2', className)}>
        {globalFilter ||
          (toolbar && (
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              {globalFilter && (
                <InputText
                  icon={<Search />}
                  placeholder={`Filter`}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setDebouncedFilter(e.target.value)
                  }}
                />
              )}
              {toolbar}
            </div>
          ))}

        <div
          className={cn(
            'w-full overflow-auto rounded-md border flex-1 min-h-0',
            transparent
              ? // Linhas transparentes (o Card por trás dá o fundo), mas o
                // zebrado permanece — o seletor de par re-aplica o stripe com
                // especificidade acima do bg-transparent; o hover (com !)
                // vence ambos, para as linhas sempre reagirem ao mouse
                '[&_tr[data-slot=table-row]]:bg-transparent [&_tbody_tr[data-slot=table-row]:nth-child(even)]:bg-black/5 [&_tbody_tr[data-slot=table-row]:hover]:bg-black/10!'
              : 'bg-card text-card-foreground'
          )}
        >
          <table className="min-w-full caption-bottom text-sm border-separate border-spacing-0">
            {/* th com o mesmo fundo da coluna de actions (bg-background) — o
                token segue o tema (solid/glass), então o header acompanha a
                variante ativa em toda a aplicação */}
            <thead className="[&_tr]:border-b [&_tr:hover]:bg-transparent [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {disableColumnReorder ? (
                    headerGroup.headers.map((header, index) => (
                      <StaticTableHeader key={header.id} header={header} index={index} />
                    ))
                  ) : (
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                      {headerGroup.headers.map((header, index) =>
                        pinnedIds.has(header.column.id) ? (
                          <StaticTableHeader key={header.id} header={header} index={index} />
                        ) : (
                          <DraggableTableHeader key={header.id} header={header} index={index} />
                        )
                      )}
                    </SortableContext>
                  )}
                  {renderRowActions && (
                    // min-w garante os 40px mesmo com a tabela vazia: sem
                    // células (min-content 0), uma coluna w-full esmagaria o
                    // th de ações para ~0.
                    <TableHead className="sticky right-0 w-10 min-w-10 bg-background border-l" />
                  )}
                </TableRow>
              ))}
            </thead>
            <tbody className="[&>tr:last-child]:border-b-0" onMouseLeave={onRowMouseLeave}>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    ref={rowRef ? (el) => rowRef(row, el) : undefined}
                    data-state={row.getIsSelected() && 'selected'}
                    className={getRowClassName?.(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row) : undefined}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={`border-b ${index > 0 ? 'border-l' : ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}

                    {renderRowActions && (
                      <TableCell className="sticky right-0 w-10 border-l border-b flex items-center justify-center bg-background">
                        {renderRowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  {/* +1 cobre a coluna de ações — sem isso a linha vazia
                      deixa um buraco sob o th de ações. */}
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length + (renderRowActions ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </tbody>
            {tableFooter && (
              <tfoot className="sticky bottom-0 z-10 bg-muted border-t font-medium text-sm">
                {tableFooter}
              </tfoot>
            )}
          </table>
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </DndContext>
  )
}
