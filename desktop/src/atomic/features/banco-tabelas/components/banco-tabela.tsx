import { useMemo, useState, type ReactNode } from 'react'

import type { ConteudoTabela } from '@server/relatorio/api-tipos'
import { fmtNum, norm } from '@server/relatorio/utils'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Search,
} from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { DataTable } from '@/atomic/base-components/data-table'
import { InputText } from '@/atomic/base-components/input-text'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'

import { campoNumerico, formatarCampo } from '@/atomic/features/banco-dados/helpers/formato-campo'

import { cn } from '@/lib/tailwind/utils'

type Linha = Record<string, string | number | null>
const POR_PAGINA = 50

/**
 * Tabela do banco (DataTable do design system): busca em todas as colunas, ordenação pelo
 * valor e paginação de 50 linhas. `acoes` adiciona uma coluna de ação por linha.
 */
export function BancoTabela({
  conteudo,
  ferramentas,
  acoes,
  vazio = 'Tabela vazia. Use Importar para trazer os dados do Bling.',
}: {
  conteudo: ConteudoTabela
  ferramentas?: ReactNode
  acoes?: (linha: Linha) => ReactNode
  vazio?: string
}) {
  const [busca, setBusca] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = useMemo<ColumnDef<Linha>[]>(
    () =>
      conteudo.colunas.map(({ chave, titulo }) => {
        const numerica = campoNumerico(chave)
        return {
          id: chave,
          accessorFn: (l) => l[chave],
          sortUndefined: 'last',
          header: ({ column }) => {
            const ordem = column.getIsSorted()
            const Icone = ordem === 'desc' ? ArrowDown : ordem === 'asc' ? ArrowUp : ChevronsUpDown
            return (
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-1 text-xs font-medium whitespace-nowrap',
                  numerica && 'justify-end'
                )}
                onClick={column.getToggleSortingHandler()}
              >
                {titulo}
                <Icone className="size-3 opacity-60" />
              </button>
            )
          },
          cell: ({ getValue }) => (
            <span
              className={cn(
                'block max-w-80 truncate text-xs',
                numerica && 'text-right tabular-nums whitespace-nowrap'
              )}
              title={String(getValue() ?? '')}
            >
              {formatarCampo(chave, getValue() as Linha[string])}
            </span>
          ),
        }
      }),
    [conteudo]
  )
  const table = useReactTable({
    data: conteudo.linhas,
    columns,
    state: { sorting, globalFilter: busca },
    onSortingChange: setSorting,
    globalFilterFn: (row: Row<Linha>, _id, filtro: string) => {
      const termo = norm(filtro)
      return Object.values(row.original).some((v) => v !== null && norm(String(v)).includes(termo))
    },
    initialState: { pagination: { pageSize: POR_PAGINA } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const total = table.getFilteredRowModel().rows.length
  const { pageIndex } = table.getState().pagination

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <InputText
          className="min-w-64 flex-1"
          icon={<Search className="size-3.5" />}
          placeholder="Buscar em todas as colunas"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            table.setPageIndex(0)
          }}
        />
        {ferramentas}
      </div>
      {!conteudo.linhas.length ? (
        <DetailsEmptyState className="h-48" icon={<Inbox />} title={vazio} description="" />
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <DataTable
              className="h-full min-h-0"
              table={table}
              disableColumnReorder
              renderRowActions={acoes ? (row) => acoes(row.original) : undefined}
            />
          </div>
          <div className="flex shrink-0 items-center justify-between text-xs text-muted-foreground">
            <span>
              {fmtNum(total)} {total === 1 ? 'linha' : 'linhas'}
              {busca && ` encontradas de ${fmtNum(conteudo.linhas.length)}`}
            </span>
            <div className="flex items-center gap-2">
              <span>
                Página {pageIndex + 1} de {Math.max(1, table.getPageCount())}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
