import { ChangeEvent, ReactNode } from 'react'

import { t } from 'i18next'
import { Search } from 'lucide-react'

import { InputText } from '@/atomic/base-components/input-text'
import { Loading } from '@/atomic/base-components/loading'

import { cn } from '@/lib/tailwind/utils'

interface ListSearchHeaderProps {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** When the list is scrolled, draws the bottom border + shadow. */
  scrolled?: boolean
  /** Shows a spinner in place of the search icon while loading. */
  isLoading?: boolean
  placeholder?: string
  /** Padding/layout classes for the header container (kept per-window). */
  className?: string
  /** Trailing controls (filter popover, mode toggle, …). */
  children?: ReactNode
}

/**
 * Search header shared by list windows: a search input (with loading/search
 * icon) plus an optional trailing slot, gaining a bottom border once scrolled.
 * Padding is supplied by the caller via `className` to stay pixel-identical.
 */
export function ListSearchHeader({
  value,
  onChange,
  scrolled,
  isLoading,
  placeholder,
  className,
  children,
}: ListSearchHeaderProps) {
  return (
    <div className={cn('w-full flex gap-2', scrolled && 'border-b shadow-sm', className)}>
      <InputText
        className="flex-1"
        icon={isLoading ? <Loading /> : <Search />}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? t('search')}
      />
      {children}
    </div>
  )
}
