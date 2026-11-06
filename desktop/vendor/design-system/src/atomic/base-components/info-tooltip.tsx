import { type ReactNode } from 'react'

import { Info } from 'lucide-react'

import { cn } from '@/lib/tailwind/utils'

import Tooltip from './tooltip'

/** Reformata a pílula do `Tooltip` base em um bloco de texto de uma ou duas frases. */
const INFO_TOOLTIP_CONTENT_CLASSNAME =
  'max-w-72 rounded-md px-2.5 py-1.5 text-left leading-snug whitespace-normal'

/**
 * Ícone de ajuda com tooltip explicativo, para pendurar ao lado de um label.
 *
 * Abre à DIREITA por padrão: em uma linha de formulário o label fica à esquerda e sobra
 * espaço vazio ao lado dele, enquanto `top` cobriria o campo de cima.
 */
export function InfoTooltip({
  text,
  side = 'right',
  className,
  children,
}: {
  text: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  /** Gatilho alternativo ao ícone padrão (ex.: o ícone de título de uma seção). */
  children?: ReactNode
}) {
  return (
    <Tooltip text={text} side={side} className={INFO_TOOLTIP_CONTENT_CLASSNAME}>
      {/* `type="button"`: dentro de um <form>, um <button> sem type submeteria.
          Focável de propósito: o Radix abre o tooltip no foco, então quem navega por
          teclado alcança a explicação — custa um tab stop por campo. */}
      <button
        type="button"
        aria-label={text}
        className={cn(
          'text-muted-foreground/70 hover:text-foreground shrink-0 cursor-help transition-colors',
          className
        )}
      >
        {children ?? <Info className="size-3.5" />}
      </button>
    </Tooltip>
  )
}
