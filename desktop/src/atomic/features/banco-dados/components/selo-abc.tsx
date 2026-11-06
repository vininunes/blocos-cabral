import { cn } from '@/lib/tailwind/utils'

import { COR_ABC } from '../helpers/cor-abc'

/** Selo da classe ABC (A verde, B azul, C cinza; '-' sem compra). */
export function SeloAbc({ classe, className }: { classe: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold',
        COR_ABC[classe] ?? COR_ABC['-'],
        className
      )}
    >
      {classe}
    </span>
  )
}
