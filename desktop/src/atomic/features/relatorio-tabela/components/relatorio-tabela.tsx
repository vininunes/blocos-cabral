import { useMemo, useState, type ReactNode } from 'react'

import type { Celula, Tabela } from '@server/relatorio/api-tipos'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'

import { DataTable } from '@/atomic/base-components/data-table'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'

import { cn } from '@/lib/tailwind/utils'

import { corCelula, formatarCelula, formatoColuna } from '../helpers/formato-coluna'

type Linha = Celula[]

/**
 * Tabela do relatório (DataTable do design system) a partir de { colunas, linhas }:
 * formata pelo nome da coluna e ordena pelo valor (não pelo texto) ao clicar no título.
 */
export function RelatorioTabela({
  tabela,
  alturaMax = 520,
  preencher = false,
  titulos,
  celulas,
  vazio = 'Sem dados no período.',
  className,
}: {
  tabela: Tabela
  alturaMax?: number
  /** Ocupa toda a altura disponível (o pai deve ser flex coluna); ignora alturaMax. */
  preencher?: boolean
  /** Título exibido por coluna (ex.: 'Data entrega' -> 'Entrega (nota)'). */
  titulos?: Record<string, string>
  /** Célula própria por coluna (ex.: selo colorido da classe ABC). */
  celulas?: Record<string, (valor: Celula) => ReactNode>
  vazio?: string
  className?: string
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = useMemo<ColumnDef<Linha>[]>(
    () =>
      tabela.colunas.map((nome, j) => {
        const formato = formatoColuna(
          nome,
          tabela.linhas.map((l) => l[j])
        )
        const numerica = formato !== 'texto'
        return {
          id: String(j),
          accessorFn: (l) => l[j],
          sortUndefined: 'last',
          sortingFn: (a, b) => {
            const x = a.original[j],
              y = b.original[j]
            if (x === y) return 0
            if (x === null) return -1
            if (y === null) return 1
            return x < y ? -1 : 1
          },
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
                {titulos?.[nome] ?? nome}
                <Icone className="size-3 opacity-60" />
              </button>
            )
          },
          cell: ({ getValue }) => {
            const v = getValue() as Celula
            if (celulas?.[nome]) return celulas[nome](v)
            return (
              <span
                className={cn(
                  'block text-xs',
                  numerica && 'text-right tabular-nums whitespace-nowrap',
                  corCelula(v, formato)
                )}
              >
                {formatarCelula(v, formato)}
              </span>
            )
          },
        }
      }),
    [tabela, titulos, celulas]
  )
  const table = useReactTable({
    data: tabela.linhas,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!tabela.linhas.length) {
    return <DetailsEmptyState className="h-40" icon={<Inbox />} title={vazio} description="" />
  }
  return (
    <div
      className={cn('flex min-h-0', preencher && 'flex-1', className)}
      style={preencher ? undefined : { maxHeight: alturaMax }}
    >
      <DataTable
        className={preencher ? 'h-full min-h-0' : undefined}
        table={table}
        disableColumnReorder
      />
    </div>
  )
}
