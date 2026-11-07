import { useMemo, useState } from 'react'

import type { RespostaRelatorio, Tabela } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtMoedaCurta } from '@server/relatorio/utils'
import { BarChart3, Sparkles, Table2 } from 'lucide-react'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { RelatorioEstimadores } from '@/atomic/features/relatorio-estimadores/components/relatorio-estimadores'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import {
  GraficoRanking,
  type ItemRanking,
} from '@/atomic/features/relatorio-graficos/components/grafico-ranking'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { COR } from '@/atomic/features/relatorio-graficos/constants/grafico'

import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

export type Ranking = 'vendedores' | 'clientes' | 'produtos' | 'cidades'
type Vista = 'tabela' | 'grafico' | 'estimadores'
const MAX_GRAFICO = 20

/** O que a busca encontra em cada ranking. */
const BUSCA: Record<Ranking, string> = {
  vendedores: 'Buscar vendedor',
  clientes: 'Buscar cliente ou cidade',
  produtos: 'Buscar produto',
  cidades: 'Buscar cidade',
}

const TITULO: Record<Ranking, string> = {
  vendedores: 'vendedores',
  clientes: 'clientes',
  produtos: 'produtos',
  cidades: 'cidades',
}

/** Itens do gráfico: os primeiros do ranking (coluna de valor de A e a de B, renomeada). */
function itensGrafico(t: Tabela, colValor: string): ItemRanking[] {
  const jA = t.colunas.indexOf(colValor)
  const jB = t.colunas.findIndex((c) => c.startsWith(`${colValor} (`))
  return t.linhas.slice(0, MAX_GRAFICO).map((l) => ({
    rotulo: String(l[0]),
    valor: Number(l[jA] ?? 0),
    anterior: jB >= 0 ? Number(l[jB] ?? 0) : null,
  }))
}

/** Vendedores, Clientes, Produtos e Cidades: Tabela | Gráfico (Clientes: + Estimadores). */
export function RelatorioRanking({ rel, ranking }: { rel: RespostaRelatorio; ranking: Ranking }) {
  const [vista, setVista] = useState<Vista>('tabela')
  const [busca, setBusca] = useState('')
  const t: Tabela = rel[ranking]
  const tFiltrada = useMemo(() => filtrarTabela(t, busca), [t, busca])
  const colValor = ranking === 'vendedores' && rel.filtro === 'Todos' ? 'Faturado' : 'Valor'
  const abas = [
    { value: 'tabela', label: 'Tabela', icon: <Table2 className="size-3.5" /> },
    { value: 'grafico', label: 'Gráfico', icon: <BarChart3 className="size-3.5" /> },
    ...(ranking === 'clientes'
      ? [{ value: 'estimadores', label: 'Estimadores', icon: <Sparkles className="size-3.5" /> }]
      : []),
  ]
  const itens = itensGrafico(t, colValor)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PageActionTabs tabs={abas} value={vista} onValueChange={(v) => setVista(v as Vista)} />
        {vista !== 'grafico' && (
          <PageActionSearch
            value={busca}
            onChange={setBusca}
            placeholder={
              vista === 'estimadores' ? 'Buscar cliente, grupo ou segmento' : BUSCA[ranking]
            }
            className="w-72"
          />
        )}
      </div>
      {vista === 'tabela' && (
        <RelatorioTabela
          tabela={tFiltrada}
          preencher
          vazio={busca ? 'Nada encontrado para a busca.' : undefined}
        />
      )}
      {vista === 'grafico' && (
        <GraficoMoldura
          titulo={`${itens.length < t.linhas.length ? `${itens.length} maiores ` : ''}${TITULO[ranking]} · ${colValor.toLowerCase()} (${rel.filtro === 'Todos' ? 'faturamento' : rel.filtro.toLowerCase()})`}
        >
          {itens.length ? (
            <GraficoRanking
              itens={itens}
              nomeA="Período todo"
              nomeB={null}
              formatar={fmtMoeda}
              formatarCurto={fmtMoedaCurta}
              cor={ranking === 'cidades' ? COR.verde : COR.azul}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem dados no período.
            </div>
          )}
        </GraficoMoldura>
      )}
      {vista === 'estimadores' && <RelatorioEstimadores busca={busca} />}
    </div>
  )
}
