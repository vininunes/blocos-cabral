import { ReactNode } from 'react'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'

import { cn } from '@/lib/tailwind/utils'

export interface PageActionTab {
  value: string
  label: string
  icon?: ReactNode
}

/**
 * Tabs padrão das page actions (header do Pages): float card com um botão por
 * aba — a ativa destacada em primary. A troca de conteúdo fica por conta da
 * página (estado compartilhado via atom, como os demais page actions).
 */
export function PageActionTabs({
  tabs,
  value,
  onValueChange,
}: {
  tabs: PageActionTab[]
  /** Valor da aba ativa. */
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <FloatCard className="flex h-9 items-center gap-0.5 px-1">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant="ghost"
          size="sm"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
            value === tab.value &&
              'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
          )}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </FloatCard>
  )
}
