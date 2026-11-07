import { forwardRef, useState, type CSSProperties, type ReactNode } from 'react'

import { TableVirtuoso, type TableComponents } from 'react-virtuoso'

import { cn } from '@/lib/tailwind/utils'

/** Altura aproximada do cabeçalho (h-10 + borda), para o modo de altura automática. */
const ALTURA_CABECALHO = 41

/**
 * Tabela virtualizada (react-virtuoso) no visual do DataTable do design system: cabeçalho fixo,
 * zebrado, hover e bordas. Só as linhas visíveis vão para o DOM — para listas da base inteira.
 *
 * `cabecalho` devolve os <th> (use `thClasse`); `linha` devolve os <td> (use `tdClasse`).
 * Sem `preencher`, a altura acompanha o conteúdo até `alturaMax`.
 *
 * `larguras` (px por coluna) fixa o layout da tabela: sem isso, a largura das colunas seguiria
 * só as linhas visíveis e mudaria durante o scroll. Texto que não cabe é cortado com "…".
 */
export function TabelaVirtual<T>({
  dados,
  cabecalho,
  linha,
  chave,
  preencher = true,
  alturaMax = 520,
  linhaClasse,
  larguras,
  className,
}: {
  dados: readonly T[]
  cabecalho: () => ReactNode
  linha: (item: T, index: number) => ReactNode
  chave: (item: T, index: number) => React.Key
  preencher?: boolean
  alturaMax?: number
  /** Classe extra da linha (ex.: selecionada). */
  linhaClasse?: (item: T, index: number) => string | undefined
  larguras?: readonly number[]
  className?: string
}) {
  const [altura, setAltura] = useState<number>(alturaMax)
  const estilo: CSSProperties = preencher ? { height: '100%' } : { height: altura }
  return (
    <div className={cn('flex min-h-0 w-full', preencher && 'flex-1', className)}>
      <TableVirtuoso
        className="w-full rounded-md border bg-card text-card-foreground"
        style={estilo}
        data={dados as T[]}
        components={componentes as TableComponents<T>}
        context={{ linhaClasse, larguras }}
        computeItemKey={(i, item) => chave(item, i)}
        fixedHeaderContent={cabecalho}
        itemContent={(i, item) => linha(item, i)}
        increaseViewportBy={400}
        totalListHeightChanged={
          preencher ? undefined : (h) => setAltura(Math.min(alturaMax, h + ALTURA_CABECALHO + 2))
        }
      />
    </div>
  )
}

type Contexto = {
  linhaClasse?: (item: unknown, index: number) => string | undefined
  larguras?: readonly number[]
}

const Cabecalho = forwardRef<HTMLTableSectionElement>((props, ref) => (
  <thead
    {...props}
    ref={ref}
    className="[&_th]:z-10 [&_th]:border-b [&_th]:bg-background [&_tr:hover]:bg-transparent"
  />
))
Cabecalho.displayName = 'Cabecalho'

/** Componentes estáveis (módulo): recriá-los a cada render remontaria as linhas. */
const componentes: TableComponents<unknown, Contexto> = {
  Table: ({ style, context, children, ...props }) => {
    const larguras = context?.larguras
    const total = larguras?.reduce((a, b) => a + b, 0)
    return (
      <table
        {...props}
        style={larguras ? { ...style, tableLayout: 'fixed', width: total } : style}
        className={cn(
          'min-w-full caption-bottom border-separate border-spacing-0 text-sm',
          larguras && '[&_td]:overflow-hidden [&_td]:text-ellipsis [&_th]:overflow-hidden'
        )}
      >
        {larguras && (
          <colgroup>
            {larguras.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        {children}
      </table>
    )
  },
  TableHead: Cabecalho,
  TableRow: ({ item, context, ...props }) => {
    const i = props['data-index']
    return (
      <tr
        {...props}
        className={cn(
          // zebrado pelo índice (nth-child mudaria com as linhas que entram e saem do DOM)
          'transition-colors hover:bg-black/10',
          i % 2 ? 'bg-black/5' : 'bg-card',
          context?.linhaClasse?.(item, i)
        )}
      />
    )
  },
}
