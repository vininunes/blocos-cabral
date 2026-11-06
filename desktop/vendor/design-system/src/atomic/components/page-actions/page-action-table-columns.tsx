import { useReducer, useState } from 'react'

import type { Table as TanStackTable } from '@tanstack/react-table'
import { Table as TableIcon } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * Visibilidade de colunas de uma tabela como page action (header do Pages):
 * float card com ícone de tabela e dropdown de checkboxes — versão
 * reutilizável do DataTableViewOptions para fora do toolbar da tabela.
 */
export function PageActionTableColumns<TData>({ table }: { table: TanStackTable<TData> }) {
  // O header não re-renderiza junto com o estado interno da tabela (a
  // instância vive na página) — força update para o checkbox refletir o
  // toggle imediatamente.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  // Controlado + modal=false com fechamento explícito no clique fora (os
  // itens usam preventDefault para manter o menu aberto ao alternar colunas)
  const [open, setOpen] = useState(false)

  return (
    <FloatCard className="flex h-9 items-center">
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-full rounded-xl">
            <TableIcon className="size-3.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          onPointerDownOutside={() => setOpen(false)}
          onEscapeKeyDown={() => setOpen(false)}
        >
          {table
            .getAllColumns()
            .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(value)
                  forceUpdate()
                }}
                onSelect={(e) => e.preventDefault()}
              >
                {(column.columnDef.meta as { title?: string })?.title ??
                  (typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : column.id)}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </FloatCard>
  )
}
