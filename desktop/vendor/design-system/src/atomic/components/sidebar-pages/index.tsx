import { Dispatch, JSX, ReactNode, SetStateAction, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { t } from 'i18next'

import { Page, Pages, RenderPage } from '@/atomic/components/pages'
import { Sidebar, SidebarElement } from '@/atomic/components/sidebar'
import {
  SidebarCollapseController,
  SidebarCollapsedCards,
  SidebarCollapsedItem,
  SidebarCollapsedSelector,
  useSidebarCollapse,
} from '@/atomic/components/sidebar/sidebar-collapsed-cards'

import { cn } from '@/lib/tailwind/utils'

export interface SidebarPagesCollapsedCard {
  /** Item exibido no card quando colapsado; null → sem cards. */
  selected?: { title: string; icon?: ReactNode } | null
  /** Itens da bandeja de troca; omitido → card estático. */
  items?: SidebarCollapsedItem[]
  selectedId?: string
  onSelect?: (id: string) => void
}

interface SidebarPagesProps {
  // ---- Pages (passthrough) ----
  pages: Page[]
  navigate: RenderPage[]
  indexState: [number, Dispatch<SetStateAction<number>>]
  newPage: (path: string, props?: Record<string, unknown>) => void
  defaultPage?: JSX.Element
  actionsLeft?: JSX.Element
  actionsCenter?: JSX.Element
  actionsRight?: JSX.Element
  hideBreadcrumb?: boolean
  /** Botões backward/forward num float card:
   *  - true (padrão): sempre em float card;
   *  - false: sempre planos (outline);
   *  - 'collapsed': float card só com a sidebar fechada (ex.: settings do vts). */
  navigationFloat?: boolean | 'collapsed'
  /** Comportamento do header do Pages:
   *  - 'normal': header em fluxo (padrão);
   *  - 'scroll': header sticky sobreposto ao conteúdo, que rola por baixo
   *    dos componentes (botões, breadcrumb, float cards, actions) com um
   *    fade out longo no topo. */
  actionsLeftFloat?: 'normal' | 'scroll'
  pagesClassName?: string

  // ---- Sidebar embutida (ignorada quando `sidebar` é passado) ----
  elements?: SidebarElement[]
  onSearch?: (value: string) => void
  onSelect?: (id: string) => void
  selected?: string
  searchDisabled?: boolean
  sidebarClassName?: string
  /** Slot para sidebar customizada (ex.: sortable); recebe o controller
   *  para ligar o botão de colapsar (`close={controller.close}`). */
  sidebar?: (controller: SidebarCollapseController) => ReactNode

  // ---- Collapse ----
  /** Colapso permitido (ex.: apenas com um item selecionado). Default true. */
  canCollapse?: boolean
  /** Estado controlado (ex.: atom compartilhado com um botão de header). */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Esconde a sidebar por completo (sem animação nem cards). */
  hideSidebar?: boolean
  /** Dispara `window.resize` ao fim da animação para mapas (Mapbox) se
   *  re-ajustarem ao novo espaço. Desligue quando o layout flutua sobre um
   *  mapa (ex.: janela de settings do vts) — o resize redesenharia o mapa
   *  inteiro atrás, causando flicker. Default true. */
  dispatchResizeOnToggle?: boolean

  /** Config dos float cards; omitido → auto-derivado de `elements`+`selected`. */
  collapsedCard?: SidebarPagesCollapsedCard

  /** Classes do container (relative flex). */
  className?: string
}

/**
 * Layout composto Sidebar + Pages com collapse integrado:
 * - wrapper `motion.div` desliza a largura da sidebar (0 ↔ 13rem);
 * - colapsada, exibe os float cards absolutos (expandir + item selecionado
 *   com bandeja) deslizando de fora da tela; a largura medida dos cards
 *   desloca os botões backward/forward do Pages via `offsetLeft` (interno);
 * - colapsada, o breadcrumb omite o nó raiz (a página já aparece no card).
 */
export function SidebarPages({
  pages,
  navigate,
  indexState,
  newPage,
  defaultPage,
  actionsLeft,
  actionsCenter,
  actionsRight,
  hideBreadcrumb,
  navigationFloat = true,
  actionsLeftFloat = 'normal',
  pagesClassName,
  elements,
  onSearch,
  onSelect,
  selected,
  searchDisabled,
  sidebarClassName,
  sidebar,
  canCollapse = true,
  collapsed,
  onCollapsedChange,
  hideSidebar = false,
  dispatchResizeOnToggle = true,
  collapsedCard,
  className,
}: SidebarPagesProps) {
  const controller = useSidebarCollapse({ canCollapse, collapsed, onCollapsedChange })

  // Largura dos float cards (reportada pelo SidebarCollapsedCards) — desloca
  // os botões backward/forward do Pages para a direita dos cards (8px de gap).
  const [cardsWidth, setCardsWidth] = useState(0)
  const offsetLeft = controller.isCollapsed && cardsWidth > 0 ? cardsWidth + 8 : 0

  // Sem config explícita, os cards são derivados da sidebar embutida:
  // o elemento ativo vira o card e os elementos navegáveis viram a bandeja —
  // cabeçalhos de agrupamento passam junto, para a bandeja espelhar a divisão
  // em grupos da sidebar.
  const card = useMemo<SidebarPagesCollapsedCard>(() => {
    if (collapsedCard) return collapsedCard
    if (!elements || !onSelect) return { selected: null }

    // Sem seleção ativa o card ainda existe (placeholder "Selecione") — a
    // bandeja continua sendo o único acesso às seções com a sidebar fechada.
    const active = selected ? elements.find((el) => el.id === selected && !el.header) : undefined
    return {
      selected: active ? { title: t(active.title), icon: active.icon } : null,
      items: elements
        .filter((el) => el.header || !el.disabled)
        .map((el) => ({ id: el.id, title: t(el.title), icon: el.icon, header: el.header })),
      selectedId: selected,
      onSelect,
    }
  }, [collapsedCard, elements, selected, onSelect])

  return (
    <div className={cn('relative flex flex-1 min-w-0 h-full overflow-hidden', className)}>
      {/* Lateral slide: the wrapper width animates while the sidebar keeps its
          fixed width and is clipped, so closing/opening glides horizontally.
          Pages is flex-1 to fill the space the sidebar releases. */}
      {!hideSidebar && (
        <motion.div
          className="h-full shrink-0 overflow-hidden"
          initial={false}
          animate={{ width: controller.isCollapsed ? '0rem' : '13rem' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          // Mapbox canvases don't re-fit on container resize on their own, so
          // nudge every map to resize once the slide finishes.
          onAnimationComplete={() => {
            if (dispatchResizeOnToggle) window.dispatchEvent(new Event('resize'))
          }}
        >
          {sidebar ? (
            sidebar(controller)
          ) : (
            <Sidebar
              elements={elements ?? []}
              onSearch={onSearch}
              onSelect={onSelect ?? (() => {})}
              selected={selected ?? ''}
              searchDisabled={searchDisabled}
              close={controller.close}
              className={cn('w-52 bg-secondary border-r pt-2', sidebarClassName)}
            />
          )}
        </motion.div>
      )}
      <SidebarCollapsedCards
        controller={controller}
        hidden={hideSidebar}
        onWidthChange={setCardsWidth}
      />
      <Pages
        pages={pages}
        navigate={navigate}
        indexState={indexState}
        newPage={newPage}
        defaultPage={defaultPage}
        actionsLeft={actionsLeft}
        actionsCenter={actionsCenter}
        actionsRight={actionsRight}
        hideBreadcrumb={hideBreadcrumb}
        navigationFloat={
          navigationFloat === 'collapsed' ? controller.isCollapsed : navigationFloat
        }
        navigationTrailing={
          <SidebarCollapsedSelector
            controller={controller}
            hidden={hideSidebar}
            selected={card.selected}
            items={card.items}
            selectedId={card.selectedId}
            onSelect={card.onSelect}
          />
        }
        actionsLeftFloat={actionsLeftFloat}
        offsetLeft={offsetLeft}
        className={cn('bg-background pt-2 flex-1 min-w-0', pagesClassName)}
      />
    </div>
  )
}
