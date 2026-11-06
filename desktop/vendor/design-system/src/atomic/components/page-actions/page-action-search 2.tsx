import { t } from 'i18next'
import { Search } from 'lucide-react'

import { FloatCard } from '@/atomic/base-components/float-card'
import { InputText } from '@/atomic/base-components/input-text'

import { cn } from '@/lib/tailwind/utils'

/**
 * Busca padrão das page actions (header do Pages): float card com input de
 * texto no visual float — mesmo em todas as páginas (admin e details).
 */
export function PageActionSearch({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  /** Placeholder do input (default: t('search')). */
  placeholder?: string
  /** Classes extras do input (ex.: largura; default w-64). */
  className?: string
  /** Visível mas inativo (ex.: modo da página em que a busca não se aplica). */
  disabled?: boolean
}) {
  return (
    <FloatCard className="flex h-9 items-center">
      <InputText
        icon={<Search className="size-3.5" />}
        placeholder={placeholder ?? t('search')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant="float"
        disabled={disabled}
        className={cn('w-64', disabled && 'cursor-not-allowed opacity-50', className)}
      />
    </FloatCard>
  )
}
