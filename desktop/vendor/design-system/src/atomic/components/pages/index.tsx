import { Dispatch, Fragment, JSX, useCallback, useMemo, useState } from 'react'

import { t } from 'i18next'
import { SetStateAction } from 'jotai'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { type FeatureName, type RoleName } from '@/accounts/scope-catalog'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/atomic/base-components/breadcrumb'
import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'

import { cn } from '@/lib/tailwind/utils'

export interface RenderPage {
  path: string
  props?: Record<string, unknown>
}

export interface PageRenderProps {
  newPage: PagesProps['newPage']
  props?: Record<string, unknown>
}

export type Page = {
  path: string
  title: string
  render: (props: PageRenderProps) => JSX.Element
  renderHeaderActions?: (props: PageRenderProps) => JSX.Element
  /** Ícone exibido à esquerda do nó desta página no breadcrumb (ex.: cor da
   *  frota). Recebe as props da página (fleetId etc.). */
  breadcrumbIcon?: (props?: Record<string, unknown>) => JSX.Element
  actionsRight?: JSX.Element
  fillContainer?: boolean
  fillContainerNoPadding?: boolean
  /** Classes extras aplicadas ao wrapper de conteúdo da página (ex.: 'pl-0') */
  contentClassName?: string
  /** Feature do catálogo que controla o acesso à página. Sem valor = sem gate. */
  feature?: FeatureName
  /** Ação exigida sobre a feature: 'read' (padrão), 'write' ou 'delete'. */
  action?: 'read' | 'write' | 'delete'
  /** Papel exigido além do escopo (ver `FeatureGated.role`). */
  role?: RoleName
}

export type PagesProps = {
  pages: Page[]
  navigate: RenderPage[]
  indexState: [number, Dispatch<SetStateAction<number>>]
  newPage: (path: string, props?: Record<string, unknown>) => void
  defaultPage?: JSX.Element
  className?: string
  actionsLeft?: JSX.Element
  actionsCenter?: JSX.Element
  actionsRight?: JSX.Element
  hideBreadcrumb?: boolean
  /** Omite o nó raiz do breadcrumb, mantendo só as páginas internas —
   *  usado quando a página principal já é exibida em outro lugar
   *  (ex.: float card da sidebar colapsada). */
  hideBreadcrumbRoot?: boolean
  /** Envolve os botões backward/forward num float card (visual dos cards da
   *  sidebar colapsada). Desligado, os botões ficam planos (outline). */
  navigationFloat?: boolean
  /** Renderizado logo após os botões backward/forward, antes do breadcrumb
   *  (ex.: seletor do item da sidebar colapsada). */
  navigationTrailing?: JSX.Element
  /** Comportamento do header (backward/forward, breadcrumb, actions):
   *  - 'normal': header em fluxo, conteúdo rola abaixo dele (padrão);
   *  - 'scroll': header flutua sobre o conteúdo, que rola por baixo dos
   *    componentes com um fade out longo no topo (estilo macOS). */
  actionsLeftFloat?: 'normal' | 'scroll'
  /** Deslocamento (px) aplicado à esquerda dos botões backward/forward,
   *  ex.: para abrir espaço a elementos flutuantes sobrepostos ao header. */
  offsetLeft?: number
}

export function Pages({
  pages,
  navigate,
  indexState,
  newPage,
  defaultPage,
  className,
  actionsLeft,
  actionsCenter,
  actionsRight,
  hideBreadcrumb,
  hideBreadcrumbRoot = false,
  navigationFloat = false,
  navigationTrailing,
  actionsLeftFloat = 'normal',
  offsetLeft = 0,
}: PagesProps) {
  const [index, setIndex] = indexState

  const [scrolled, setScrolled] = useState(false)

  const nextPage = useCallback(() => {
    setIndex((p) => (p === navigate.length - 1 ? navigate.length - 1 : p + 1))
  }, [navigate.length, setIndex])

  const prevPage = useCallback(() => {
    setIndex((p) => (p === 0 ? 0 : p - 1))
  }, [setIndex])

  const renderPage = useMemo(() => {
    const current = navigate[index]
    if (!current) return undefined

    const page = pages.find((page) => page.path === current.path)

    if (page === undefined) return page

    return { ...page, props: current.props }
  }, [pages, navigate, index])

  const breadCrumb = useMemo(() => {
    if (renderPage === undefined) return []

    const parts = renderPage.path
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)

    return parts.map((segment, index) => {
      let title = segment
      let shouldTranslate = true

      // Try to get a display name from props (e.g., segment 'vessel' -> props.vesselName)
      const displayNameKey = `${segment.replace('Id', '')}Name`
      const displayName = renderPage.props?.[displayNameKey] as string | undefined

      if (displayName) {
        title = displayName
        shouldTranslate = false
      }

      return {
        path: parts.slice(0, index + 1).join('/'),
        title,
        shouldTranslate,
      }
    })
  }, [renderPage])

  const headerActions = useMemo(() => {
    if (!renderPage?.renderHeaderActions) return null
    return renderPage.renderHeaderActions({ newPage, props: renderPage.props })
  }, [renderPage, newPage])

  // Colapsado, a página principal já aparece no float card — o breadcrumb
  // mostra apenas os nós internos a ela.
  const visibleBreadCrumb = hideBreadcrumbRoot ? breadCrumb.slice(1) : breadCrumb

  const floatHeader = actionsLeftFloat === 'scroll'

  return (
    <div
      className={cn('flex flex-col h-full min-h-0 w-full', floatHeader && 'relative', className)}
    >
      <div
        className={cn(
          'w-full shrink-0 pt-0 pb-2 px-2 flex items-center gap-2 border-b border-transparent',
          // Hover uniforme em todos os float cards do header (navegação,
          // seletor da sidebar, page actions) — mesmo tom dos widgets do vts
          '[&_[data-float-card]]:transition-colors [&_[data-float-card]:hover]:bg-muted/50',
          scrolled && !floatHeader && 'border-muted shadow',
          // Páginas fillContainer não rolam (o shadow de scroll nunca ativa):
          // borda fixa separando o header do conteúdo
          renderPage?.fillContainer && !floatHeader && 'border-muted',
          // Header flutuante: sobreposto ao conteúdo, sem fundo; apenas os
          // filhos recebem cliques (áreas vazias deixam passar para a página).
          // top-2 repõe o deslocamento do pt-2 do container (o absolute
          // ignora o padding em fluxo), mantendo os cards do header na mesma
          // faixa dos float cards da sidebar (h-9 em top-2)
          floatHeader &&
            'absolute top-2 left-0 right-0 z-20 pointer-events-none [&>*]:pointer-events-auto'
        )}
      >
        <div
          className="flex items-center gap-2 transition-[padding-left] duration-[250ms] ease-in-out"
          style={{ paddingLeft: offsetLeft }}
        >
          {actionsLeft}
          {navigationFloat ? (
            <FloatCard className="flex h-9 items-center gap-1 p-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={prevPage}
                className="size-7"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === navigate.length - 1}
                onClick={nextPage}
                className="size-7"
              >
                <ChevronRight />
              </Button>
            </FloatCard>
          ) : (
            // h-9: mantém os botões planos na mesma faixa/centro do modo
            // com float card (e do header da sidebar, min-h-11)
            <div className="flex h-9 items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={index === 0}
                onClick={prevPage}
                className="h-7 w-7"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={index === navigate.length - 1}
                onClick={nextPage}
                className="h-7 w-7"
              >
                <ChevronRight />
              </Button>
            </div>
          )}

          {navigationTrailing}

          {renderPage && !hideBreadcrumb && visibleBreadCrumb.length > 0 && (
            <div className="h-7 flex items-center">
              {newPage && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {visibleBreadCrumb.map(({ path, title, shouldTranslate }, index) => {
                      const displayTitle = shouldTranslate ? t(title) : title
                      const isLast = index === visibleBreadCrumb.length - 1

                      const itemContent = isLast ? (
                        <BreadcrumbPage className="h-6 inline-flex items-center gap-1.5 text-sm">
                          {renderPage.breadcrumbIcon?.(renderPage.props)}
                          {displayTitle}
                        </BreadcrumbPage>
                      ) : (
                        <Button
                          variant={'ghost'}
                          className="h-6 hover:bg-transparent hover:text-muted-foreground p-0"
                          onClick={() => newPage(path)}
                        >
                          {displayTitle}
                        </Button>
                      )

                      if (index === 0)
                        return <BreadcrumbItem key={path}>{itemContent}</BreadcrumbItem>

                      return (
                        <Fragment key={path}>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>{itemContent}</BreadcrumbItem>
                        </Fragment>
                      )
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
          )}
        </div>

        {actionsCenter && (
          <div className="flex-1 flex items-center justify-center">{actionsCenter}</div>
        )}

        <div className={cn('flex items-center justify-end gap-2', !actionsCenter && 'flex-1')}>
          {/* Componentes injetados pela página (busca, filtros…) — cada
              toolbar embrulha seus elementos em float cards individuais */}
          {headerActions}
          {actionsRight}
        </div>
      </div>

      {!renderPage && <div className="flex-1">{defaultPage}</div>}

      {/* Conteúdo sem padding por padrão — cada página define o seu.
          O pt-11 do modo flutuante é estrutural (área sob o header sticky). */}
      {renderPage && renderPage.fillContainer && (
        <div
          className={cn(
            'flex-1 min-h-0 overflow-hidden',
            // 44px (pt-11): conteúdo começa 8px abaixo dos float cards do
            // header (top-2 + h-9 = 36px dentro do container com pt-2)
            floatHeader &&
              'pt-11 [mask-image:linear-gradient(to_bottom,transparent_0px,black_64px)]',
            renderPage.contentClassName
          )}
        >
          {renderPage.render({ newPage, props: renderPage.props })}
        </div>
      )}

      {renderPage && !renderPage.fillContainer && (
        <div
          // Marcador para listas virtualizadas usarem este scroller como
          // customScrollParent (ex.: VirtuosoGrid da lista de vessels)
          data-pages-scroll
          className={cn(
            'flex-1 min-h-0 overflow-y-auto',
            // Fade out longo: o conteúdo esmaece gradualmente ao passar por
            // baixo dos componentes flutuantes do header
            floatHeader && '[mask-image:linear-gradient(to_bottom,transparent_0px,black_64px)]'
          )}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        >
          <div className={cn('min-h-full', floatHeader && 'pt-11', renderPage.contentClassName)}>
            {renderPage.render({ newPage, props: renderPage.props })}
          </div>
        </div>
      )}
    </div>
  )
}
