import { createContext, ReactNode, useContext } from 'react'

import { cn } from '@/lib/tailwind/utils'

/**
 * Dentro de um `ValueIndicatorGroup` a linha usa as colunas do grupo (subgrid): a
 * coluna dos rótulos tem a MESMA largura em todas as linhas (a do maior rótulo).
 */
const InGroupContext = createContext(false)

interface ValueIndicatorProps {
  label: string
  value?: string
  unit?: string
  top?: boolean
  middle?: boolean
  bottom?: boolean
  render?: ReactNode
}

export function ValueIndicator({
  label,
  value,
  unit,
  bottom,
  middle,
  top,
  render,
}: ValueIndicatorProps) {
  const inGroup = useContext(InGroupContext)
  return (
    <div
      className={cn(
        'w-full select-text',
        inGroup ? 'grid grid-cols-subgrid' : 'flex',
        top && 'rounded-t-lg',
        middle && 'rounded-none',
        bottom && 'rounded-b-lg',
        !top && !middle && !bottom && 'rounded-lg'
      )}
    >
      <div
        className={cn(
          'flex flex-1/3 items-center h-7 bg-muted px-2 align-middle w-full',
          top && 'rounded-tl-lg border',
          middle && 'rounded-none border border-t-0',
          bottom && 'rounded-bl-lg border-b border-x',
          !top && !middle && !bottom && 'rounded-l-lg border'
        )}
      >
        {/* Sem quebra de linha (a linha tem altura fixa): a coluna do rótulo cresce
            até caber o texto e a do valor (min-w-0) encolhe/trunca. */}
        <p className="text-xs whitespace-nowrap">{label}</p>
      </div>
      <div
        className={cn(
          // min-w-0 + overflow-hidden: sem eles o conteúdo nowrap (ex.: nome
          // de categoria longo) impede o truncate e estoura a célula do card
          'flex flex-2/3 min-w-0 overflow-hidden items-center h-7 bg-background/50 justify-end gap-2',
          unit ? 'pl-2' : 'px-2',
          top && 'rounded-tr-lg border border-l-0',
          middle && 'rounded-none border border-t-0 border-l-0',
          bottom && 'rounded-br-lg border-b border-r',
          !top && !middle && !bottom && 'rounded-r-lg border border-l-0'
        )}
      >
        {value === undefined && render}
        {value !== undefined && (
          <>
            <p className="text-sm font-bold truncate whitespace-nowrap flex-1 text-right">
              {!value || value === 'null' || value === 'undefined' ? '-' : value}
            </p>
            {unit && (
              <div className="h-7 min-w-8 bg-transparent rounded-r-md flex items-center justify-center border-l px-2">
                <p className="text-sm">{unit}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function ValueIndicatorGroup({ indicators }: { indicators: ReactNode[] }) {
  return (
    // Coluna dos rótulos = o maior rótulo (mín. 1/3); o valor fica com o resto. Todo
    // filho ocupa as duas colunas; os ValueIndicator as herdam (subgrid).
    <div className="grid grid-cols-[minmax(33%,max-content)_minmax(0,1fr)] rounded-lg *:col-span-2">
      <InGroupContext.Provider value>{indicators}</InGroupContext.Provider>
    </div>
  )
}
