import React, { JSX, memo, useCallback, useMemo } from 'react'

import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'

import { cn } from '@/lib/tailwind/utils'

import { ScrollArea } from './scroll-area'

export type RenderItem<T> = (item: T, index: number) => React.ReactNode
export type GetItemKey<T> = (item: T, index: number) => React.Key

export type BaseVirtualListProps<T> = {
  items: readonly T[]
  renderItem: RenderItem<T>
  getItemKey: GetItemKey<T>
  className?: string
  virtuosoRef?: React.RefObject<VirtuosoHandle>
  placeHolder?: React.ReactNode
  isScrolling?: (scrolling: boolean) => void
  onScroll?: (event: React.UIEvent<HTMLElement>) => void
  paddingBottom?: string
  gap?: boolean
  gapTop?: boolean
  gapBottom?: boolean
  initialScrollTop?: number
}

// Exportado para outros virtualizadores (ex.: VirtuosoGrid) usarem o mesmo
// scroller com a ScrollArea do design system.
export const ScrollAreaScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...rest }, ref) => (
  <ScrollArea className={cn('h-full w-full pr-2.5', className)} {...rest} ref={ref}>
    {children}
  </ScrollArea>
))
ScrollAreaScroller.displayName = 'ScrollAreaScroller'

const ListContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 pt-2', className)} {...rest} />
  )
)
ListContainer.displayName = 'ListContainer'

function ListSpace() {
  return <div className="p-1" />
}

function BaseList<T>({
  items,
  renderItem,
  getItemKey,
  className,
  virtuosoRef,
  placeHolder,
  isScrolling,
  onScroll,
  gap = false,
  gapTop = false,
  gapBottom = true,
  initialScrollTop,
}: BaseVirtualListProps<T>) {
  const PlaceHolder = useMemo(() => {
    function FooterComponent() {
      return placeHolder
    }
    FooterComponent.displayName = 'ListHeader'
    return FooterComponent
  }, [placeHolder])

  // Callbacks/objetos estáveis: antes `itemContent` e `components` eram
  // recriados a cada render, então o memo(BaseList) nunca poupava as linhas.
  // Callers com renderItem/getItemKey estáveis (useCallback) ganham de fato.
  const itemContent = useCallback(
    (index: number, item: T) => <div>{renderItem(item, index)}</div>,
    [renderItem]
  )
  // Chave pelo item (não pelo índice): preserva o estado de cada linha ao
  // reordenar/filtrar.
  const computeItemKey = useCallback(
    (index: number, item: T) => getItemKey(item, index),
    [getItemKey]
  )
  const components = useMemo(
    () => ({
      Scroller: ScrollAreaScroller,
      Footer: gapBottom ? ListSpace : undefined,
      Header: gapTop ? ListSpace : undefined,
      List: gap ? ListContainer : undefined,
      EmptyPlaceholder: PlaceHolder,
    }),
    [gapBottom, gapTop, gap, PlaceHolder]
  )

  return (
    <div className={cn(className)}>
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        itemContent={itemContent}
        computeItemKey={computeItemKey}
        isScrolling={isScrolling}
        onScroll={onScroll}
        initialScrollTop={initialScrollTop}
        components={components}
      />
    </div>
  )
}

export const List = memo(BaseList) as <T>(props: BaseVirtualListProps<T>) => JSX.Element
