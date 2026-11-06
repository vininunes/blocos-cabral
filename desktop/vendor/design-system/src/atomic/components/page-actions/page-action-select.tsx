import { ComponentProps } from 'react'

import { FloatCard } from '@/atomic/base-components/float-card'
import { Select } from '@/atomic/base-components/select'

import { cn } from '@/lib/tailwind/utils'

/**
 * Select genérico padrão das page actions (header do Pages): float card com
 * o Select base no visual float — para filtros/agrupamentos simples
 * (ex.: group by do calendar, monitorable do machinery, manobra do pilot
 * schedule). Selects ricos (porto, frota) têm page actions próprios.
 */
export function PageActionSelect({
  items,
  value,
  onValueChange,
  placeholder,
  className,
  disabled = false,
}: {
  items: ComponentProps<typeof Select>['items']
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Classes extras do select (ex.: largura; default w-44). */
  className?: string
  disabled?: boolean
}) {
  return (
    <FloatCard className="flex h-9 items-center">
      <Select
        items={items}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        variant="float"
        disabled={disabled}
        className={cn('h-full w-44', className)}
      />
    </FloatCard>
  )
}
