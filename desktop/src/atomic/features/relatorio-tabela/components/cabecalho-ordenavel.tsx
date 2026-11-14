import type { ReactNode } from 'react'

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

import type { Ordem } from '../hooks/use-ordenacao'

/** Título de coluna clicável com o ícone da ordem (mesmo visual da tabela padrão). */
export function CabecalhoOrdenavel({
  coluna,
  ordem,
  onOrdenar,
  direita = false,
  centro = false,
  className,
  children,
}: {
  coluna: string
  ordem: Ordem
  onOrdenar: (coluna: string) => void
  direita?: boolean
  centro?: boolean
  className?: string
  children: ReactNode
}) {
  const atual = ordem?.coluna === coluna ? ordem.dir : null
  const Icone = atual === 'desc' ? ArrowDown : atual === 'asc' ? ArrowUp : ChevronsUpDown
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-1 font-[inherit] whitespace-nowrap',
        direita && 'justify-end',
        centro && 'justify-center',
        atual && 'text-primary dark:text-foreground',
        className
      )}
      onClick={() => onOrdenar(coluna)}
    >
      {children}
      <Icone className="size-3 shrink-0 opacity-60" />
    </button>
  )
}
