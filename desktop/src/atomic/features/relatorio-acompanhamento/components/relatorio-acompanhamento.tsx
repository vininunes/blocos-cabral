import { Fragment, useMemo, useState } from 'react'

import type {
  Baixa,
  ItemAcompanhado,
  PedidoAcompanhado,
  RespostaRelatorio,
  Situacao,
} from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtNum, fmtPct, fmtQtd, norm } from '@server/relatorio/utils'
import { ChevronDown, ChevronRight, Truck } from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'
import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'

import { CabecalhoOrdenavel } from '@/atomic/features/relatorio-tabela/components/cabecalho-ordenavel'

import {
  useOrdenacao,
  type ValorOrdenavel,
} from '@/atomic/features/relatorio-tabela/hooks/use-ordenacao'

import { cn } from '@/lib/tailwind/utils'

type Filtro = 'Em aberto' | 'Concluídos' | 'Todos'
type Coluna<T> = [string, (x: T) => ValorOrdenavel, 'esq' | 'dir']

const num = (v: string) => Number(v) || v
const ORDEM_SITUACAO: Record<Situacao, number> = { 'Sem entrega': 1, Parcial: 2, Concluído: 3 }

/** Colunas ordenáveis (sem ordem escolhida: maior restante, concluídos no fim). */
const COLUNAS: Coluna<PedidoAcompanhado>[] = [
  ['Pedido', (p) => num(p.pedido), 'esq'],
  ['Cliente', (p) => p.cliente, 'esq'],
  ['Data', (p) => p.data, 'esq'],
  ['Valor', (p) => p.valor, 'dir'],
  ['Entregue', (p) => p.pct_entregue, 'esq'],
  ['Restante', (p) => p.restante, 'dir'],
  ['Situação', (p) => ORDEM_SITUACAO[p.situacao], 'esq'],
  ['Última entrega', (p) => p.ultima_entrega, 'esq'],
]
const COLUNAS_ITENS: Coluna<ItemAcompanhado>[] = [
  ['Produto', (i) => i.produto, 'esq'],
  ['Pedido', (i) => i.qtd, 'dir'],
  ['Entregue', (i) => i.entregue_qtd, 'dir'],
  ['Restante', (i) => Math.max(0, i.qtd - i.entregue_qtd), 'dir'],
  ['%', (i) => (i.qtd ? i.entregue_qtd / i.qtd : 0), 'esq'],
]
const COLUNAS_ENTREGAS: Coluna<Baixa>[] = [
  ['Data (nota)', (e) => e.data, 'esq'],
  ['Pedido de entrega', (e) => num(e.pedido), 'esq'],
  ['NF', (e) => num(e.nf), 'esq'],
  ['Produto', (e) => e.produto, 'esq'],
  ['Quantidade', (e) => e.qtd, 'dir'],
  ['Valor', (e) => e.valor, 'dir'],
]
const acessores = <T,>(cs: Coluna<T>[]) => Object.fromEntries(cs.map(([t, f]) => [t, f]))
const ACESSORES = acessores(COLUNAS)
const ACESSORES_ITENS = acessores(COLUNAS_ITENS)
const ACESSORES_ENTREGAS = acessores(COLUNAS_ENTREGAS)

/** Linha de cabeçalho com as colunas ordenáveis (e células vazias antes, ex.: o ícone de abrir). */
function CabecalhoColunas<T>({
  colunas,
  classe,
  ordenacao,
  antes = 0,
}: {
  colunas: Coluna<T>[]
  classe: string
  ordenacao: ReturnType<typeof useOrdenacao<T>>
  antes?: number
}) {
  return (
    <tr>
      {Array.from({ length: antes }, (_, k) => (
        <th key={`v${k}`} className={cn(classe, 'w-8')} />
      ))}
      {colunas.map(([t, , lado]) => (
        <th key={t} className={classe}>
          <CabecalhoOrdenavel
            coluna={t}
            ordem={ordenacao.ordem}
            onOrdenar={ordenacao.alternar}
            direita={lado === 'dir'}
          >
            {t}
          </CabecalhoOrdenavel>
        </th>
      ))}
    </tr>
  )
}

const COR_SITUACAO: Record<Situacao, string> = {
  'Sem entrega': 'bg-muted text-muted-foreground',
  Parcial: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  Concluído: 'bg-cabral-verde/15 text-cabral-verde',
}

function Cartao({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {rotulo}
      </div>
      <div className="text-xl font-bold tabular-nums text-primary dark:text-foreground">
        {valor}
      </div>
      {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  )
}

/** Barra de progresso do % entregue. */
function Barra({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', pct >= 1 ? 'bg-cabral-verde' : 'bg-primary')}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <span className="w-12 text-right tabular-nums">{fmtPct(pct)}</span>
    </div>
  )
}

/**
 * Acompanhamento de pedidos: pedidos em aberto (sem nota, de proposta aprovada) com o quanto já
 * foi entregue. As entregas (pedidos com nota do mesmo cliente e produto) dão baixa sozinhas, no
 * pedido em aberto mais antigo. Posição no fim do período escolhido.
 */
export function RelatorioAcompanhamento({ rel }: { rel: RespostaRelatorio }) {
  const ac = rel.acompanhamento
  const [filtro, setFiltro] = useState<Filtro>('Em aberto')
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const linhas = useMemo(() => {
    const termo = norm(busca)
    return ac.pedidos.filter(
      (p) =>
        (filtro === 'Todos' || (filtro === 'Concluídos') === (p.situacao === 'Concluído')) &&
        (!termo ||
          [p.pedido, p.proposta, p.cliente, p.vendedor].some((v) => norm(v).includes(termo)))
    )
  }, [ac, filtro, busca])
  const ordenacao = useOrdenacao(linhas, ACESSORES)

  const alternar = (pedido: string) =>
    setAbertos((s) => {
      const n = new Set(s)
      if (n.has(pedido)) n.delete(pedido)
      else n.add(pedido)
      return n
    })

  if (!ac.pedidos.length)
    return (
      <DetailsEmptyState
        className="h-64"
        icon={<Truck />}
        title="Nenhum pedido em aberto até o fim do período"
        description="Pedidos em aberto são os pedidos sem nota própria gerados de uma proposta aprovada. As entregas (pedidos com nota do mesmo cliente e produto) dão baixa neles."
      />
    )

  const t = ac.totais
  const th =
    'sticky top-0 z-10 border-b bg-background px-3 py-2 text-xs font-medium whitespace-nowrap'
  const td = 'border-b px-3 py-1.5 text-xs align-middle'
  const num = 'text-right tabular-nums whitespace-nowrap'

  return (
    <div className="flex flex-1 flex-col gap-3 pb-2">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao
          rotulo="Pedidos em aberto"
          valor={fmtNum(t.em_aberto)}
          detalhe={`${fmtNum(t.concluidos)} concluídos · posição em ${fmtData(ac.referencia)}`}
        />
        <Cartao
          rotulo="Valor dos pedidos"
          valor={fmtMoeda(t.valor)}
          detalhe={`${fmtNum(t.pedidos)} pedidos`}
        />
        <Cartao
          rotulo="Entregue"
          valor={fmtMoeda(t.entregue)}
          detalhe={t.pct_entregue === null ? undefined : `${fmtPct(t.pct_entregue)} do valor`}
        />
        <Cartao
          rotulo="Restante"
          valor={fmtMoeda(t.restante)}
          detalhe={t.pct_entregue === null ? undefined : `${fmtPct(1 - t.pct_entregue)} do valor`}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filtro}
          onValueChange={(v) => v && setFiltro(v as Filtro)}
        >
          {(['Em aberto', 'Concluídos', 'Todos'] as const).map((o) => (
            <ToggleGroupItem key={o} value={o} className="flex-none px-3 text-xs whitespace-nowrap">
              {o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder="Buscar pedido, proposta, cliente ou vendedor"
          className="w-80"
        />
        <span className="text-xs text-muted-foreground">
          {fmtNum(linhas.length)} pedidos · clique para ver produtos e entregas
        </span>
      </div>

      {linhas.length ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <CabecalhoColunas colunas={COLUNAS} classe={th} ordenacao={ordenacao} antes={1} />
            </thead>
            <tbody>
              {ordenacao.ordenados.map((p) => {
                const aberto = abertos.has(p.pedido)
                return (
                  <Fragment key={p.pedido}>
                    <tr
                      className={cn('cursor-pointer hover:bg-muted/40', aberto && 'bg-muted/30')}
                      onClick={() => alternar(p.pedido)}
                    >
                      <td className={cn(td, 'text-muted-foreground')}>
                        {aberto ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </td>
                      <td className={cn(td, 'tabular-nums')}>
                        <div className="font-medium">{p.pedido}</div>
                        <div className="text-[11px] text-muted-foreground">
                          proposta {p.proposta}
                        </div>
                      </td>
                      <td className={cn(td, 'min-w-64')}>
                        <div className="max-w-96 truncate font-medium" title={p.cliente}>
                          {p.cliente}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{p.vendedor}</div>
                      </td>
                      <td className={cn(td, 'tabular-nums whitespace-nowrap')}>
                        {fmtData(p.data)}
                      </td>
                      <td className={cn(td, num)}>{fmtMoeda(p.valor)}</td>
                      <td className={td}>
                        <div className="flex flex-col gap-0.5">
                          <Barra pct={p.pct_entregue} />
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {fmtMoeda(p.entregue)}
                          </span>
                        </div>
                      </td>
                      <td className={cn(td, num)}>
                        <div className="font-medium">{fmtMoeda(p.restante)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {fmtPct(p.valor ? 1 - p.pct_entregue : 0)}
                        </div>
                      </td>
                      <td className={td}>
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                            COR_SITUACAO[p.situacao]
                          )}
                        >
                          {p.situacao}
                        </span>
                      </td>
                      <td className={cn(td, 'tabular-nums whitespace-nowrap')}>
                        {p.ultima_entrega ? fmtData(p.ultima_entrega) : '-'}
                      </td>
                    </tr>
                    {aberto && (
                      <tr>
                        <td className="border-b bg-muted/20" />
                        <td colSpan={8} className="border-b bg-muted/20 px-3 py-3">
                          <Detalhe p={p} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border bg-card p-6 text-center text-xs text-muted-foreground">
          Nenhum pedido neste filtro.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Pedido em aberto = pedido sem nota própria, gerado de uma proposta aprovada. Cada entrega
        (pedido com nota do mesmo cliente e produto) dá baixa no pedido em aberto mais antigo. %
        pelo valor: quantidade entregue x preço do pedido. Posição no fim do período escolhido.
      </p>
    </div>
  )
}

/** Produtos do pedido (pedido, entregue, restante) e as entregas que deram baixa. */
function Detalhe({ p }: { p: PedidoAcompanhado }) {
  const itens = useOrdenacao(p.itens, ACESSORES_ITENS)
  const entregas = useOrdenacao(p.entregas, ACESSORES_ENTREGAS)
  const th = 'border-b px-2 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap'
  const td = 'border-b px-2 py-1 text-xs'
  const num = 'text-right tabular-nums whitespace-nowrap'
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div>
        <h4 className="mb-1 text-xs font-semibold">Produtos</h4>
        <table className="w-full border-collapse rounded-md bg-card">
          <thead>
            <CabecalhoColunas colunas={COLUNAS_ITENS} classe={th} ordenacao={itens} />
          </thead>
          <tbody>
            {itens.ordenados.map((i) => (
              <tr key={i.sku}>
                <td className={td}>
                  <div className="max-w-72 truncate" title={i.produto}>
                    {i.produto}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtMoeda(i.preco)} / {i.un}
                  </div>
                </td>
                <td className={cn(td, num)}>
                  {fmtQtd(i.qtd)} {i.un}
                </td>
                <td className={cn(td, num)}>
                  {fmtQtd(i.entregue_qtd)} {i.un}
                </td>
                <td className={cn(td, num)}>
                  {fmtQtd(Math.max(0, i.qtd - i.entregue_qtd))} {i.un}
                </td>
                <td className={td}>
                  <Barra pct={i.qtd ? Math.min(1, i.entregue_qtd / i.qtd) : 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold">
          Entregas que deram baixa ({fmtNum(p.entregas.length)})
        </h4>
        {p.entregas.length ? (
          <div className="max-h-64 overflow-auto rounded-md bg-card">
            <table className="w-full border-collapse">
              <thead>
                <CabecalhoColunas colunas={COLUNAS_ENTREGAS} classe={th} ordenacao={entregas} />
              </thead>
              <tbody>
                {entregas.ordenados.map((e, k) => (
                  <tr key={`${e.pedido}-${e.sku}-${k}`}>
                    <td className={cn(td, 'tabular-nums')}>{fmtData(e.data)}</td>
                    <td className={cn(td, 'tabular-nums')}>{e.pedido}</td>
                    <td className={cn(td, 'tabular-nums')}>{e.nf}</td>
                    <td className={td}>
                      <div className="max-w-56 truncate" title={e.produto}>
                        {e.produto}
                      </div>
                    </td>
                    <td className={cn(td, num)}>
                      {fmtQtd(e.qtd)} {e.un}
                    </td>
                    <td className={cn(td, num)}>{fmtMoeda(e.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma entrega até o fim do período.</p>
        )}
      </div>
    </div>
  )
}
