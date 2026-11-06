import { useState } from 'react'

import { t } from 'i18next'
import { Anchor } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'

import { WidgetPortTabs } from '@/atomic/features/port/components/widget-port-tabs'

import type { Port } from '@/atomic/features/port/models/port'

import { PageActionSelectTail } from './page-action-select-clear'

/**
 * Select de porto padrão das page actions (header do Pages): float card com
 * trigger (âncora + nome + chevron) e bandeja WidgetPortTabs — fecha ao
 * selecionar. Mesmo visual em maneuvers (details), cameras e pilot schedule.
 */
export function PageActionPortSelect({
  ports,
  selectedPort,
  onSelect,
  deselect,
  placeholder,
  disabled = false,
}: {
  ports: Port[]
  selectedPort: Port | undefined
  onSelect: (port: Port) => void
  /** Com seleção ativa, troca o chevron por um X que limpa o porto. */
  deselect?: () => void
  /** Texto quando não há porto selecionado (default: t('select-port')). */
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  function handleSelect(port: Port) {
    onSelect(port)
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
            disabled={disabled}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Anchor className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-center text-xs font-medium">
                {selectedPort?.name ?? placeholder ?? t('select-port')}
              </span>
            </div>
            <PageActionSelectTail deselect={deselect} hasSelection={!!selectedPort} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-0" align="center" sideOffset={8}>
          <WidgetPortTabs
            ports={ports}
            onPortSelect={handleSelect}
            selectedPortId={selectedPort?.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </FloatCard>
  )
}
