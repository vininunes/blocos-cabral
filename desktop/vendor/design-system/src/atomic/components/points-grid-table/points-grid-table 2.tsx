import { useEffect, useRef, useState } from 'react'

import { t } from 'i18next'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'

import { cn } from '@/lib/tailwind/utils'

import { isEditableTarget } from '@/utils/is-editable-target'

import { parsePointsGridCell as parseCell } from './points-grid'
import type { PointsGridRow } from './points-grid'

export type { PointsGridRow }

export interface PointsGridColumn {
  /** Rótulo do cabeçalho. */
  label: string
  /** Faixa válida (inclusiva); fora dela a célula fica vermelha. */
  min: number
  max: number
}

/** Seta com UMA linha selecionada → coluna que muda e o sentido. */
export type PointsGridNudgeKeys = Partial<
  Record<'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight', [column: number, sign: 1 | -1]>
>

export interface PointsGridTableProps {
  columns: PointsGridColumn[]
  /** Linhas CONTROLADAS (texto das células). */
  rows: PointsGridRow[]
  onRowsChange: (rows: PointsGridRow[]) => void
  /** Casas decimais aplicadas no nudge e no ponto médio inserido. */
  decimals?: number
  /** Passo das setas com uma linha selecionada (Shift = x10). */
  nudgeStep?: number
  nudgeKeys?: PointsGridNudgeKeys
  /** Limites de linhas: inserir/colar não passa do máximo; remover não
   * desce do mínimo. */
  minRows?: number
  maxRows?: number
  /** Linha em foco (célula focada ou linha selecionada) — ex.: destacar o
   * vértice na prévia. null ao sair. */
  onFocusRow?: (index: number | null) => void
  /** Classe da área de ROLAGEM (ex.: 'max-h-64 overflow-y-auto'): o
   * cabeçalho vira sticky DENTRO do scroll. */
  bodyClassName?: string
  /** Colagem customizada, consultada ANTES da de planilha (célula focada ou
   * faixa selecionada): devolver true = tratada (ex.: um JSON de pontos que
   * substitui a tabela). */
  onPasteText?: (text: string) => boolean
  /** Classe da moldura (ex.: 'flex min-h-0 flex-1 flex-col' para ocupar a
   * altura do pai, com o corpo rolando). */
  className?: string
  disabled?: boolean
}

type CellPos = { row: number; col: number }

function cellValid(value: string, column: PointsGridColumn): boolean {
  const n = parseCell(value)
  return Number.isFinite(n) && n >= column.min && n <= column.max
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** Texto colado de planilha/Excel: linhas por \n, células por TAB/;/, */
function parseClipboardTable(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|;|,/).map((cell) => cell.trim()))
}

/**
 * Grid de PONTOS estilo planilha — a mesma experiência da tabela de
 * coordenadas do Area Editor, para qualquer par/tupla numérica (ex.: os
 * `[fwd, right]` da silhueta 2D). Todas as células bordadas (índice, colunas
 * e ação). Navegação como Excel: Tab/Shift+Tab percorre células, setas movem
 * quando o caret está na borda do texto, Enter desce. Seleção por LINHA:
 * clique no número, arrasto ou Shift+clique/setas verticais estendem a faixa
 * (Ctrl/Cmd+C copia TSV, Delete limpa, Escape sai); com UMA linha selecionada
 * e nenhum input focado, as SETAS movem o ponto (`nudgeKeys`, Shift x10).
 * Colar do Excel preenche a partir da célula focada (ou da 1ª linha
 * selecionada), criando linhas. Botões nos cantos da linha inserem um ponto
 * acima/abaixo (no ponto médio dos vizinhos).
 */
export function PointsGridTable({
  columns,
  rows,
  onRowsChange,
  decimals = 4,
  nudgeStep = 0.001,
  nudgeKeys,
  minRows = 0,
  maxRows = Infinity,
  onFocusRow,
  bodyClassName,
  className,
  onPasteText,
  disabled = false,
}: PointsGridTableProps) {
  const [selection, setSelection] = useState<{ anchor: number; focus: number } | null>(null)
  const draggingRef = useRef(false)
  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  const gridRef = useRef<HTMLDivElement>(null)

  // Linhas e callbacks mais recentes para os listeners de document (não
  // re-registrados a cada tecla).
  const latest = useRef({ rows, onRowsChange, onFocusRow, onPasteText })
  latest.current = { rows, onRowsChange, onFocusRow, onPasteText }
  const update = (fn: (prev: PointsGridRow[]) => PointsGridRow[]) =>
    latest.current.onRowsChange(fn(latest.current.rows))
  const emptyRow = (): PointsGridRow => columns.map(() => '')
  const cap = (next: PointsGridRow[], prevLength: number) =>
    next.length > maxRows ? next.slice(0, Math.max(maxRows, prevLength)) : next

  useEffect(() => {
    const onPointerUp = () => {
      draggingRef.current = false
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [])

  // Seleção limpa: sai o destaque externo.
  useEffect(() => {
    if (!selection) latest.current.onFocusRow?.(null)
  }, [selection])
  useEffect(() => () => latest.current.onFocusRow?.(null), [])

  // Atalhos da SELEÇÃO DE LINHAS (no document — após arrastar ou clicar no
  // número nenhum input fica focado). Com uma linha só e input focado, as
  // teclas são do input (edição da célula).
  useEffect(() => {
    if (!selection || disabled) return
    const minRow = Math.min(selection.anchor, selection.focus)
    const maxRow = Math.max(selection.anchor, selection.focus)
    const singleRow = minRow === maxRow

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const inGrid = target != null && gridRef.current?.contains(target) === true
      if (isEditableTarget(target) && !inGrid) return
      const inputFocused = inGrid && target instanceof HTMLInputElement
      if (inputFocused && singleRow) return
      const current = latest.current.rows

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        const tsv = current
          .slice(minRow, maxRow + 1)
          .map((row) => row.join('\t'))
          .join('\n')
        void navigator.clipboard?.writeText(tsv)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        update((prev) => prev.map((row, i) => (i < minRow || i > maxRow ? row : emptyRow())))
      } else if (e.key === 'Escape') {
        setSelection(null)
      } else if (singleRow && !(e.ctrlKey || e.metaKey)) {
        const nudge = nudgeKeys?.[e.key as keyof PointsGridNudgeKeys]
        if (!nudge) return
        e.preventDefault()
        const [col, sign] = nudge
        const value = parseCell(current[minRow]?.[col] ?? '')
        if (!Number.isFinite(value)) return
        const column = columns[col]
        const next = Math.min(
          column.max,
          Math.max(column.min, round(value + sign * nudgeStep * (e.shiftKey ? 10 : 1), decimals))
        )
        update((prev) =>
          prev.map((row, i) =>
            i !== minRow ? row : row.map((cell, j) => (j === col ? String(next) : cell))
          )
        )
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, disabled, columns, nudgeKeys, nudgeStep, decimals])

  // Colar com faixa selecionada e sem input focado: a partir da 1ª linha
  // selecionada; um valor 1x1 numa faixa preenche as linhas.
  useEffect(() => {
    if (!selection || disabled) return
    const minRow = Math.min(selection.anchor, selection.focus)
    const maxRow = Math.max(selection.anchor, selection.focus)

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const inGrid = target != null && gridRef.current?.contains(target) === true
      if (inGrid && target instanceof HTMLInputElement) return
      if (isEditableTarget(target)) return

      const text = e.clipboardData?.getData('text') ?? ''
      if (latest.current.onPasteText?.(text)) {
        e.preventDefault()
        return
      }
      const table = parseClipboardTable(text)
      if (table.length === 0) return
      e.preventDefault()
      if (maxRow > minRow && table.length === 1 && table[0].length === 1) {
        const value = table[0][0]
        update((prev) =>
          prev.map((row, i) => (i < minRow || i > maxRow ? row : row.map(() => value)))
        )
        return
      }
      update((prev) => cap(pasteInto(prev, minRow, 0, table), prev.length))
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, disabled, maxRows])

  // Interagir fora do grid tira a seleção (e desarma os listeners globais).
  useEffect(() => {
    if (!selection) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Node ? e.target : null
      if (target && gridRef.current?.contains(target)) return
      setSelection(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [selection])

  /** Aplica a matriz colada a partir de (startRow, startCol), criando linhas;
   * colunas além das da tabela são descartadas. */
  function pasteInto(prev: PointsGridRow[], startRow: number, startCol: number, table: string[][]) {
    const next = prev.map((row) => [...row])
    table.forEach((cells, i) => {
      const target = startRow + i
      while (next.length <= target) next.push(emptyRow())
      cells.slice(0, columns.length - startCol).forEach((value, j) => {
        next[target][startCol + j] = value
      })
    })
    return next
  }

  const range = selection
    ? {
        minRow: Math.min(selection.anchor, selection.focus),
        maxRow: Math.max(selection.anchor, selection.focus),
      }
    : null
  const isRowSelected = (row: number) => range != null && row >= range.minRow && row <= range.maxRow

  const clampPos = (row: number, col: number): CellPos => ({
    row: Math.min(Math.max(row, 0), rows.length - 1),
    col: Math.min(Math.max(col, 0), columns.length - 1),
  })

  const focusCell = (row: number, col: number) => {
    const input = inputRefs.current.get(`${row}:${col}`)
    if (!input) return
    input.focus()
    input.select()
  }

  const setCell = (rowIndex: number, col: number, value: string) =>
    update((prev) =>
      prev.map((row, i) => (i !== rowIndex ? row : row.map((c, j) => (j === col ? value : c))))
    )

  const handlePaste = (rowIndex: number, col: number) => (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (onPasteText?.(text)) {
      e.preventDefault()
      return
    }
    const table = parseClipboardTable(text)
    // colagem simples numa célula: o input trata
    if (table.length === 0 || (table.length === 1 && table[0].length <= 1)) return
    e.preventDefault()
    update((prev) => cap(pasteInto(prev, rowIndex, col, table), prev.length))
  }

  const handlePointerDown = (row: number) => (e: React.PointerEvent) => {
    if (e.shiftKey && selection) {
      e.preventDefault()
      setSelection({ anchor: selection.anchor, focus: row })
      return
    }
    draggingRef.current = true
    setSelection({ anchor: row, focus: row })
  }

  const handlePointerEnter = (row: number) => () => {
    if (!draggingRef.current) return
    // saiu da linha de origem arrastando: vira seleção de faixa de linhas
    if (selection && selection.anchor !== row) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      document.getSelection()?.removeAllRanges()
    }
    setSelection((prev) => (prev ? { anchor: prev.anchor, focus: row } : prev))
  }

  const handleKeyDown =
    (row: number, col: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = e.currentTarget
      const moveTo = (r: number, c: number) => {
        e.preventDefault()
        const pos = clampPos(r, c)
        setSelection({ anchor: pos.row, focus: pos.row })
        focusCell(pos.row, pos.col)
      }

      // Shift+setas VERTICAIS estendem a seleção de linhas
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        const delta = e.key === 'ArrowUp' ? -1 : 1
        setSelection((prev) => {
          const base = prev ?? { anchor: row, focus: row }
          return {
            anchor: base.anchor,
            focus: Math.min(Math.max(base.focus + delta, 0), rows.length - 1),
          }
        })
        return
      }

      const caretStart = input.selectionStart ?? 0
      const caretEnd = input.selectionEnd ?? 0
      const allSelected =
        caretStart === 0 && caretEnd === input.value.length && input.value.length > 0

      switch (e.key) {
        case 'ArrowDown':
        case 'Enter':
          moveTo(row + 1, col)
          break
        case 'ArrowUp':
          moveTo(row - 1, col)
          break
        // horizontais só trocam de célula na borda do texto (ou tudo selecionado)
        case 'ArrowLeft':
          if (allSelected || (caretStart === 0 && caretEnd === 0)) moveTo(row, col - 1)
          break
        case 'ArrowRight':
          if (allSelected || caretStart === input.value.length) moveTo(row, col + 1)
          break
        case 'Tab': {
          e.preventDefault()
          const step = e.shiftKey ? -1 : 1
          let r = row
          let c = col + step
          if (c >= columns.length) {
            c = 0
            r = row + 1
          }
          if (c < 0) {
            c = columns.length - 1
            r = row - 1
          }
          if (r < 0 || r >= rows.length) {
            r = row
            c = col
          }
          moveTo(r, c)
          break
        }
      }
    }

  const removeRow = (rowIndex: number) => {
    setSelection(null)
    update((prev) => prev.filter((_, i) => i !== rowIndex))
  }

  // Linha nova: PONTO MÉDIO dos vizinhos (na borda copia o único; sem
  // nenhum válido, zeros) — nasce sobre a aresta, sem deformar a forma.
  const midpointRow = (prev: PointsGridRow[], at: number): PointsGridRow => {
    const valid = (row: PointsGridRow | undefined) =>
      row && row.every((cell, j) => cellValid(cell, columns[j])) ? row.map(parseCell) : null
    const above = at > 0 ? valid(prev[at - 1]) : null
    const below = at < prev.length ? valid(prev[at]) : null
    if (above && below) return above.map((v, j) => String(round((v + below[j]) / 2, decimals)))
    const single = above ?? below
    if (single) return single.map(String)
    return columns.map(() => '0')
  }

  const insertRow = (at: number) => {
    if (rows.length >= maxRows) return
    update((prev) => {
      const next = [...prev]
      next.splice(at, 0, midpointRow(prev, at))
      return next
    })
    setSelection({ anchor: at, focus: at })
    // o input da linha nova só existe após o commit
    requestAnimationFrame(() => focusCell(at, 0))
  }

  const gridCellClass = 'h-6 border-b border-r border-foreground/15'
  // corpo rolável: o cabeçalho vira sticky DENTRO do scroll (bg sólido)
  const headerCellClass = cn(
    gridCellClass,
    bodyClassName ? 'sticky top-0 z-10 bg-muted' : 'bg-black/5'
  )
  const canInsert = !disabled && rows.length < maxRows

  return (
    <div className={cn('min-w-0', className)}>
      {/* Área de ROLAGEM (bodyClassName), sem folga: os botões de inserir
          ficam DENTRO da célula do índice na horizontal (o overflow do scroll
          cortaria o que vazasse para a esquerda) e só vazam meio corpo na
          vertical, entre as linhas. */}
      <div className={bodyClassName}>
        <div className="rounded-sm border border-foreground/15">
          <div
            ref={gridRef}
            className="grid cursor-default [&>*:last-child>*]:border-b-0"
            style={{
              gridTemplateColumns: `2.25rem repeat(${columns.length}, minmax(0, 1fr)) 1.75rem`,
            }}
          >
            <span className={headerCellClass} />
            {columns.map((column) => (
              <span
                key={column.label}
                className={cn(
                  headerCellClass,
                  'flex items-center pl-1 text-[10px] font-medium text-muted-foreground'
                )}
              >
                {column.label}
              </span>
            ))}
            <span className={cn(headerCellClass, 'border-r-0')} />

            {rows.map((row, index) => {
              const rowInSelection = isRowSelected(index)
              return (
                // hover da linha por CSS (group/row num wrapper `contents`)
                <div key={index} className="group/row contents">
                  <span
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return
                      setSelection({ anchor: index, focus: index })
                      onFocusRow?.(index)
                    }}
                    className={cn(
                      gridCellClass,
                      'relative flex cursor-pointer select-none items-center justify-end bg-black/5 pr-1 font-mono text-[10px] text-muted-foreground',
                      rowInSelection
                        ? 'bg-primary/20 text-foreground'
                        : 'group-hover/row:bg-foreground/10'
                    )}
                  >
                    {canInsert && (
                      <span
                        className={cn(
                          'contents',
                          !rowInSelection &&
                            '[&>button]:invisible group-hover/row:[&>button]:visible'
                        )}
                      >
                        <button
                          type="button"
                          tabIndex={-1}
                          title={t('points-grid-add-above')}
                          onClick={() => insertRow(index)}
                          className="absolute left-0.5 top-0 z-10 flex size-3.5 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/20 bg-background text-muted-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="size-2.5" />
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          title={t('points-grid-add-below')}
                          onClick={() => insertRow(index + 1)}
                          className="absolute bottom-0 left-0.5 z-10 flex size-3.5 translate-y-1/2 items-center justify-center rounded-full border border-foreground/20 bg-background text-muted-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </span>
                    )}
                    {index + 1}
                  </span>
                  {columns.map((column, colIndex) => (
                    <div
                      key={column.label}
                      onPointerEnter={handlePointerEnter(index)}
                      className={cn(
                        gridCellClass,
                        'focus-within:bg-primary/15 focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary',
                        rowInSelection ? 'bg-primary/15' : 'group-hover/row:bg-foreground/5'
                      )}
                    >
                      <input
                        ref={(el) => {
                          const key = `${index}:${colIndex}`
                          if (el) inputRefs.current.set(key, el)
                          else inputRefs.current.delete(key)
                        }}
                        className={cn(
                          'h-full w-full cursor-default bg-transparent px-1 font-mono text-[11px] outline-none',
                          row[colIndex].trim() !== '' &&
                            !cellValid(row[colIndex], column) &&
                            'text-destructive'
                        )}
                        value={row[colIndex]}
                        disabled={disabled}
                        onChange={(e) => setCell(index, colIndex, e.target.value)}
                        onFocus={() => onFocusRow?.(index)}
                        onBlur={() => onFocusRow?.(null)}
                        onPaste={handlePaste(index, colIndex)}
                        onPointerDown={handlePointerDown(index)}
                        onKeyDown={handleKeyDown(index, colIndex)}
                        spellCheck={false}
                      />
                    </div>
                  ))}
                  <div
                    className={cn(
                      gridCellClass,
                      'flex items-center justify-center border-r-0 group-hover/row:bg-foreground/5'
                    )}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      tabIndex={-1}
                      className="size-5 shrink-0 text-muted-foreground"
                      disabled={disabled || rows.length <= minRows}
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
