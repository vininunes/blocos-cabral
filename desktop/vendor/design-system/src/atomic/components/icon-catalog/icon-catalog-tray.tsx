import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from '@/atomic/base-components/button'

import { cn } from '@/lib/tailwind/utils'

export interface IconCatalogItem {
  /** Valor persistido/devolvido em `onSelect`. */
  value: string
  /** Tooltip/aria-label da célula. */
  label: string
  icon: ReactNode
}

export interface IconCatalogCategory {
  key: string
  /** Título da seção (fixo no topo enquanto ela rola). Vazio = sem título. */
  label: string
  items: IconCatalogItem[]
}

/**
 * Bandeja de SELEÇÃO DE ÍCONE compartilhada (painéis de KPI, canvas de
 * machinery, dynamic objects): seções por categoria com título, grade de
 * células quadradas e o selecionado em primary. A lista rola dentro de
 * `max-h` e, ao abrir, traz o selecionado para a vista.
 * Vai DENTRO de um PopoverContent (sem padding próprio — use `p-0`/`p-1`).
 */
export function IconCatalogTray({
  categories,
  value,
  onSelect,
  columns = 8,
  cellSize = 'size-8',
  className,
}: {
  categories: IconCatalogCategory[]
  value: string | undefined
  onSelect: (value: string) => void
  /** Células por linha. */
  columns?: number
  /** Classe de tamanho da célula (quadrada). */
  cellSize?: string
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Abre com o selecionado visível (catálogos longos passam da altura).
  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <div
      ref={scrollRef}
      className={cn('flex max-h-80 flex-col gap-2 overflow-y-auto overscroll-contain', className)}
      // Dentro de um Dialog modal (ex.: informações do painel de KPI), o
      // bloqueio de scroll dele cancela a roda/toque fora do conteúdo do
      // dialog — e o popover é portalado para fora. Parar a propagação aqui
      // impede o bloqueio de ver o evento e deixa a bandeja rolar.
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      {categories.map((category) => (
        <section key={category.key} className="flex flex-col gap-1">
          {category.label && (
            <h4 className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {category.label}
            </h4>
          )}
          <div
            className="grid gap-1 px-0.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {category.items.map((item) => {
              const selected = item.value === value
              return (
                <Button
                  key={item.value}
                  type="button"
                  size="icon"
                  variant={selected ? 'default' : 'ghost'}
                  className={cn(cellSize, !selected && 'text-muted-foreground')}
                  aria-pressed={selected}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onSelect(item.value)}
                >
                  {item.icon}
                </Button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
