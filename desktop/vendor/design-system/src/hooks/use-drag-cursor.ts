import { useEffect } from 'react'

/**
 * Cursor GLOBAL durante um arrasto/resize.
 *
 * Por que: `cursor-grabbing`/`cursor-col-resize` só no handle vale enquanto o
 * ponteiro está SOBRE o handle. Num arrasto real o ponteiro sai dele no
 * primeiro movimento rápido e o cursor passa a refletir o que está embaixo
 * (em geral o canvas do mapa, que o deck.gl reescreve a cada frame) — o
 * cursor fica alternando. Fixar no `<body>` enquanto `active` for true faz o
 * cursor valer para a página inteira, e `user-select: none` evita selecionar
 * texto pelo caminho.
 *
 * O `style.cursor` do body sozinho não vence elementos com cursor próprio (o
 * canvas do mapa recebe `style.cursor` inline do deck a cada frame), então o
 * hook também marca `body[data-drag-cursor]`, que o global.css usa para impor
 * o cursor com `!important` em todos os descendentes.
 *
 * Vocabulário (ver claude/architecture.md → "Cursores"): `grabbing` para
 * mover algo, `col-resize`/`ew-resize` para redimensionar.
 *
 * @example
 * const [dragging, setDragging] = useState(false)
 * useDragCursor(dragging, 'grabbing')
 */
export function useDragCursor(
  active: boolean,
  cursor: 'grabbing' | 'col-resize' | 'ew-resize' | 'row-resize'
) {
  useEffect(() => {
    if (!active) return
    const { style } = document.body
    const { dataset } = document.body
    const previous = {
      cursor: style.cursor,
      userSelect: style.userSelect,
      dragCursor: dataset.dragCursor,
    }
    style.cursor = cursor
    style.userSelect = 'none'
    dataset.dragCursor = cursor
    return () => {
      style.cursor = previous.cursor
      style.userSelect = previous.userSelect
      if (previous.dragCursor === undefined) delete dataset.dragCursor
      else dataset.dragCursor = previous.dragCursor
    }
  }, [active, cursor])
}
