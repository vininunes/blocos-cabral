import { cn } from '@/lib/tailwind/utils'

/** Classes do <th> (mesmas do DataTable). */
export const thClasse = (i: number, extra?: string) =>
  cn(
    'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground select-text',
    i > 0 && 'border-l',
    extra
  )

/** Classes do <td> (mesmas do DataTable). */
export const tdClasse = (i: number, extra?: string) =>
  cn('border-b p-2 align-middle whitespace-nowrap select-text', i > 0 && 'border-l', extra)
