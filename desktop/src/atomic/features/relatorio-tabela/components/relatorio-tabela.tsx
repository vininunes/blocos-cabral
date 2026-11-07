import { useMemo, useState, type ReactNode } from 'react'

import type { Celula, Tabela } from '@server/relatorio/api-tipos'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'

import { cn } from '@/lib/tailwind/utils'

import { corCelula, formatarCelula, formatoColuna } from '../helpers/formato-coluna'
import { tdClasse, thClasse } from '../helpers/tabela-virtual'
import { TabelaVirtual } from './tabela-virtual'

type Linha = Celula[]

/** ~px por caractere no text-xs; limites da largura da coluna. */
const PX_CARACTERE = 7
const LARGURA_MIN = 64
const LARGURA_MAX = 420

/**
 * Tabela do relatório a partir de { colunas, linhas }: formata pelo nome da coluna e ordena pelo
 * valor (não pelo texto) ao clicar no título. Virtualizada: só as linhas visíveis vão para o DOM.
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
  // larguras pelo conteúdo de todas as linhas (não só das visíveis): colunas estáveis no scroll
  const larguras = useMemo(
    () =>
      tabela.colunas.map((nome, j) => {
        const formato = formatoColuna(
          nome,
          tabela.linhas.map((l) => l[j])
        )
        let maior = (titulos?.[nome] ?? nome).length + 3 // ícone de ordenação
        for (const l of tabela.linhas) maior = Math.max(maior, formatarCelula(l[j], formato).length)
        return Math.min(LARGURA_MAX, Math.max(LARGURA_MIN, Math.round(maior * PX_CARACTERE) + 24))
      }),
    [tabela, titulos]
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
  const rows = table.getRowModel().rows
  // texto inteiro no hover quando a célula é cortada
  const titulo = (v: Celula) => (typeof v === 'string' && v.length > 30 ? v : undefined)
  const headers = table.getHeaderGroups()[0].headers
  return (
    <TabelaVirtual<Row<Linha>>
      dados={rows}
      chave={(r) => r.id}
      larguras={larguras}
      preencher={preencher}
      alturaMax={alturaMax}
      className={className}
      cabecalho={() => (
        <tr>
          {headers.map((h, i) => (
            <th key={h.id} className={thClasse(i)}>
              {flexRender(h.column.columnDef.header, h.getContext())}
            </th>
          ))}
        </tr>
      )}
      linha={(r) =>
        r.getVisibleCells().map((c, i) => (
          <td key={c.id} className={tdClasse(i)} title={titulo(c.getValue() as Celula)}>
            {flexRender(c.column.columnDef.cell, c.getContext())}
          </td>
        ))
      }
    />
  )
}
