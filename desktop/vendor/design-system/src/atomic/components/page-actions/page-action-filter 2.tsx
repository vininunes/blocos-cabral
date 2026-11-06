import { ReactNode, useState } from 'react'

import { t } from 'i18next'
import { Filter } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * Botão de filtro padrão das page actions (header do Pages): float card com
 * dropdown e indicador estilo notificação (bg-primary) no canto superior
 * direito sempre que houver filtros ativos.
 */
export function PageActionFilter({
  activeCount = 0,
  children,
  align = 'center',
  contentClassName,
  label,
  iconOnly = false,
}: {
  /** Quantidade de filtros ativos — > 0 exibe o indicador. */
  activeCount?: number
  /** Conteúdo do dropdown (itens de filtro). */
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  contentClassName?: string
  label?: string
  /** Só o ícone, num card quadrado (sem label). */
  iconOnly?: boolean
}) {
  // Controlado + modal=false com fechamento explícito no clique fora: os
  // itens usam preventDefault para manter o menu aberto ao marcar filtros,
  // mas clique fora/ESC sempre fecham.
  const [open, setOpen] = useState(false)

  return (
    <FloatCard
      className={
        iconOnly
          ? 'relative flex size-9 items-center justify-center'
          : 'relative flex h-9 items-center'
      }
    >
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={iconOnly ? 'h-full w-full rounded-xl' : 'h-full rounded-xl'}
            title={iconOnly ? (label ?? t('details-filter')) : undefined}
          >
            <Filter className="size-3.5" />
            {!iconOnly && (label ?? t('details-filter'))}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className={contentClassName}
          onPointerDownOutside={() => setOpen(false)}
          onEscapeKeyDown={() => setOpen(false)}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      {activeCount > 0 && (
        <span className="pointer-events-none absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground shadow">
          {activeCount}
        </span>
      )}
    </FloatCard>
  )
}
