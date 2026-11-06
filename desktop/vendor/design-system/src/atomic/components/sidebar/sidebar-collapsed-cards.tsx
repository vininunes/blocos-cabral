import { ReactNode, useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { t } from 'i18next'
import { ChevronDown, PanelLeft } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/atomic/base-components/popover'

import { cn } from '@/lib/tailwind/utils'

/**
 * Controlador do collapse da sidebar em layouts Sidebar + Pages.
 *
 * Consumido pelo composite SidebarPages, que faz o wiring completo:
 *   const collapse = useSidebarCollapse({ canCollapse: !!selectedItem })
 *   <Sidebar close={collapse.close} ... />                  // botão de colapsar
 *   <SidebarCollapsedCards controller={collapse}
 *     onWidthChange={setCardsWidth} ... />                   // cards absolutos
 *   <Pages offsetLeft={cardsWidth + 8} ... />                // desloca os botões
 */
export interface SidebarCollapseController {
  /** Sidebar efetivamente colapsada (estado do usuário + canCollapse). */
  isCollapsed: boolean
  collapse: () => void
  expand: () => void
  /** Para a prop `close` das sidebars — undefined quando não pode colapsar. */
  close?: () => void
}

export function useSidebarCollapse({
  canCollapse = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: {
  canCollapse?: boolean
  /** Estado controlado (ex.: atom compartilhado com um botão de header). */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
} = {}): SidebarCollapseController {
  const [internalCollapsed, setInternalCollapsed] = useState(false)

  const isControlled = controlledCollapsed !== undefined
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed
  const setCollapsed = isControlled
    ? (onCollapsedChange ?? (() => {}))
    : setInternalCollapsed

  // Sem item selecionado (canCollapse false) a sidebar permanece aberta,
  // mesmo que o usuário tenha colapsado antes — reabre e volta a colapsar
  // quando houver seleção novamente.
  const isCollapsed = collapsed && canCollapse

  return {
    isCollapsed,
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false),
    close: canCollapse ? () => setCollapsed(true) : undefined,
  }
}

export interface SidebarCollapsedItem {
  id: string
  title: string
  icon?: ReactNode
  /** Cabeçalho de agrupamento (não-clicável) — espelha os grupos da sidebar. */
  header?: boolean
}

interface SidebarCollapsedCardsProps {
  controller: SidebarCollapseController
  /** Força esconder (ex.: páginas que ocultam a sidebar por completo). */
  hidden?: boolean
  /** Reporta a largura real do card (0 quando escondido) — usado pelo
   *  SidebarPages para deslocar os botões do Pages via `offsetLeft`. */
  onWidthChange?: (width: number) => void
}

/**
 * Card flutuante com o botão de expandir, exibido quando a sidebar está
 * colapsada (única forma de reabri-la). Entra deslizando de fora da tela
 * (esquerda → direita) e sai em fade rápido.
 *
 * Posicionado em absolute top-2 left-2 sobre o container do SidebarPages
 * (`relative`): mesma faixa do float card dos botões backward/forward (h-9,
 * no topo do header do Pages em `pt-2`) — centros alinhados. A largura é
 * reportada via `onWidthChange` para o SidebarPages deslocar os botões
 * (`offsetLeft`). O seletor do item fica em `SidebarCollapsedSelector`,
 * renderizado à direita dos botões via `navigationTrailing` do Pages.
 */
export function SidebarCollapsedCards({
  controller,
  hidden = false,
  onWidthChange,
}: SidebarCollapsedCardsProps) {
  const cardsRef = useRef<HTMLDivElement>(null)
  const { isCollapsed, expand } = controller

  const visible = !hidden && isCollapsed

  // Reporta a largura real do card ao SidebarPages (offsetLeft dos botões).
  useEffect(() => {
    if (!onWidthChange) return
    if (!visible) {
      onWidthChange(0)
      return
    }
    const el = cardsRef.current
    if (!el) return

    onWidthChange(el.offsetWidth)
    const observer = new ResizeObserver(() => onWidthChange(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, onWidthChange])

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="sidebar-collapsed-cards"
          ref={cardsRef}
          className="absolute top-2 left-2 z-30 flex items-center gap-2"
          initial={{ x: '-110%', opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <FloatCard className="flex h-9 items-center p-1">
            <Button size="icon" variant="ghost" className="size-7" onClick={expand}>
              <PanelLeft className="size-3.5" />
            </Button>
          </FloatCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface SidebarCollapsedSelectorProps {
  controller: SidebarCollapseController
  /** Item selecionado exibido no card; sem ele nada é renderizado. */
  selected?: { title: string; icon?: ReactNode } | null
  /** Itens da bandeja de seleção; omitido → card estático, sem bandeja. */
  items?: SidebarCollapsedItem[]
  /** Id do item ativo, destacado na bandeja. */
  selectedId?: string
  onSelect?: (id: string) => void
  /** Força esconder (ex.: páginas que ocultam a sidebar por completo). */
  hidden?: boolean
}

/**
 * Seletor do item da sidebar (float select): float card com ícone + nome do
 * item selecionado e bandeja (popover) para trocar de item. Representa a
 * root page no header do Pages enquanto a sidebar está colapsada — o nó raiz
 * do breadcrumb fica oculto em favor dele; com a sidebar aberta, some.
 * Renderizado à direita dos botões backward/forward via a prop
 * `navigationTrailing` — o SidebarPages faz o wiring.
 */
export function SidebarCollapsedSelector({
  controller,
  selected,
  items,
  selectedId,
  onSelect,
  hidden = false,
}: SidebarCollapsedSelectorProps) {
  const [trayOpen, setTrayOpen] = useState(false)
  const { isCollapsed } = controller

  const hasTray = !!items?.length && !!onSelect
  // Sem seleção o seletor continua visível (com placeholder), desde que haja
  // bandeja — colapsada, ele é o único acesso às seções da sidebar.
  const visible = !hidden && isCollapsed && (!!selected || hasTray)

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="sidebar-collapsed-selector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {hasTray ? (
            <Popover open={trayOpen} onOpenChange={setTrayOpen}>
              <PopoverTrigger asChild>
                <FloatCard className="flex h-9 cursor-pointer items-center gap-1.5 px-2.5 hover:bg-muted/50">
                  {selected?.icon}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      selected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {selected ? selected.title : t('select-section')}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </FloatCard>
              </PopoverTrigger>
              {/* Bandeja: réplica da sidebar em escala menor (h-8/text-xs vs
                  h-9/text-sm), com os mesmos cabeçalhos de agrupamento e o
                  mesmo destaque do item ativo (bg-primary). */}
              <PopoverContent align="center" className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  {items!.map((item) =>
                    item.header ? (
                      <p
                        key={item.id}
                        className="px-2 py-1 text-[11px] font-medium text-muted-foreground select-none"
                      >
                        {item.title}
                      </p>
                    ) : (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={cn(
                          'h-8 rounded-lg gap-0 flex justify-start items-center p-0 transition-all',
                          selectedId === item.id &&
                            'bg-primary hover:bg-primary shadow-sm text-primary-foreground hover:text-primary-foreground'
                        )}
                        onClick={() => {
                          setTrayOpen(false)
                          onSelect!(item.id)
                        }}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center p-2 w-8 h-8 rounded-lg [&_svg]:size-3.5',
                            selectedId === item.id && '[&_svg]:text-primary-foreground'
                          )}
                        >
                          {item.icon}
                        </div>
                        <div className="pr-2">
                          <p className="text-xs truncate">{item.title}</p>
                        </div>
                      </Button>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            selected && (
              <FloatCard className="flex h-9 items-center gap-1.5 px-2.5">
                {selected.icon}
                <span className="text-xs font-medium text-foreground">{selected.title}</span>
              </FloatCard>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
