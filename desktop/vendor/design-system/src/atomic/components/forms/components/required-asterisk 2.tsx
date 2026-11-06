import { cn } from '@/lib/tailwind/utils'

/**
 * Displays a red asterisk (*) to indicate required fields
 *
 * @example
 * ```tsx
 * <label>
 *   Name <RequiredAsterisk />
 * </label>
 * ```
 */
export interface RequiredAsteriskProps {
  /** Additional CSS classes */
  className?: string
}

export function RequiredAsterisk({ className }: RequiredAsteriskProps) {
  return (
    <span className={cn('text-destructive ml-0.5', className)} aria-label="required">
      *
    </span>
  )
}
