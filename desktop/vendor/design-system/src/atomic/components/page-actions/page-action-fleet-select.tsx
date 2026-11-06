import { useMemo, useState } from 'react'

import { t } from 'i18next'

import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'

import { FleetIcon } from '@/atomic/features/fleet/components/fleet-icon'
import { FleetSharedBadge } from '@/atomic/features/fleet/components/fleet-shared-badge'
import { useFleetQuery } from '@/atomic/features/fleet/hooks/use-fleet-queries'
import type { Fleet } from '@/atomic/features/fleet/models/fleet'

import { cn } from '@/lib/tailwind/utils'

import { PageActionSelectTail } from './page-action-select-clear'

export const ALL_FLEETS_COLOR = '#3b82f6'

/** Frota selecionada no page action — 'all' agrega todas as frotas do
 *  cliente (monitorableIds já unificados). */
export interface SelectedFleet {
  id: number | 'all'
  name: string
  color: string
  customerId: number
  monitorableIds: number[]
}

/**
 * Select de frota padrão das page actions (header do Pages): float card com
 * trigger (chip da frota + nome + chevron) e bandeja com "Todas as Frotas" +
 * cada frota do cliente — fecha ao selecionar. Usado em operational-status e
 * fleets (details).
 */
const EMPTY_FLEETS: Fleet[] = []

export function PageActionFleetSelect({
  fleet,
  onSelect,
  deselect,
  placeholder,
  fleets: fleetsProp,
  showAllOption = true,
}: {
  fleet: SelectedFleet | undefined
  onSelect: (fleet: SelectedFleet) => void
  /** Com seleção ativa, troca o chevron por um X que limpa a frota. */
  deselect?: () => void
  /** Texto quando não há frota selecionada (default: t('select-fleet')). */
  placeholder?: string
  /** Restringe a lista (ex.: frotas com underspeed report); default: todas
   *  as frotas do cliente. */
  fleets?: Fleet[]
  /** Exibe a opção "Todas as Frotas" no topo (default true). */
  showAllOption?: boolean
}) {
  // Com a lista vinda por prop a query não precisa ficar ativa.
  const { data: allFleets = EMPTY_FLEETS } = useFleetQuery(fleetsProp === undefined)
  const fleets = fleetsProp ?? allFleets
  const [open, setOpen] = useState(false)

  // Memo: antes o Set de todos os monitorables era refeito em todo render.
  const allIds = useMemo(() => [...new Set(fleets.flatMap((f) => f.monitorables_id))], [fleets])
  const customerId = fleets[0]?.customer?.customer_id

  function select(next: SelectedFleet) {
    onSelect(next)
    setOpen(false)
  }

  return (
    <FloatCard className="flex h-9 items-center">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-full w-44 justify-between gap-2 rounded-xl bg-white/5 px-2.5 hover:bg-white/5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* Sem frota selecionada o chip fica transparente (ícone muted) */}
              <FleetIcon
                color={fleet?.color ?? 'transparent'}
                className="h-5 w-5 shrink-0"
                iconClassName={cn('size-2.5', !fleet && 'text-muted-foreground')}
              />
              <span className="flex-1 truncate text-center text-xs font-medium">
                {fleet?.name ?? placeholder ?? t('select-fleet')}
              </span>
            </div>
            <PageActionSelectTail deselect={deselect} hasSelection={!!fleet} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="flex w-64 max-h-80 flex-col gap-0.5 overflow-auto p-2"
          align="center"
          sideOffset={8}
        >
          {/* Sem frotas para listar (a opção "Todas" também não faz sentido) */}
          {fleets.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t('details-no-fleets')}
            </div>
          )}
          {showAllOption && fleets.length > 0 && (
            <FleetMenuItem
              label={t('details-fleet-all-fleets')}
              count={allIds.length}
              color={ALL_FLEETS_COLOR}
              selected={fleet?.id === 'all'}
              onSelect={() =>
                select({
                  id: 'all',
                  name: t('details-fleet-all-fleets'),
                  color: ALL_FLEETS_COLOR,
                  customerId,
                  monitorableIds: allIds,
                })
              }
            />
          )}
          {fleets.map((item) => (
            <FleetMenuItem
              key={item.id}
              label={item.name}
              count={item.monitorables_id.length}
              color={item.color}
              fleet={item}
              selected={fleet?.id === item.id}
              onSelect={() =>
                select({
                  id: item.id,
                  name: item.name,
                  color: item.color,
                  customerId: item.customer?.customer_id,
                  monitorableIds: item.monitorables_id,
                })
              }
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </FloatCard>
  )
}

function FleetMenuItem({
  label,
  count,
  color,
  fleet,
  selected,
  onSelect,
}: {
  label: string
  count: number
  color: string
  /** Frota do item — habilita o badge de compartilhada (a opção "Todas" não passa). */
  fleet?: Fleet
  selected: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={
        selected
          ? 'bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground'
          : undefined
      }
    >
      <FleetIcon color={color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{label}</p>
        <div className="flex items-center gap-2 min-w-0">
          <p className={cn('text-xs', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
            {count} {t('details-fleet-vessels-count')}
          </p>
          {/* Fleet do customer todo (sem dono pessoal) */}
          {fleet && <FleetSharedBadge fleet={fleet} />}
        </div>
      </div>
    </DropdownMenuItem>
  )
}
