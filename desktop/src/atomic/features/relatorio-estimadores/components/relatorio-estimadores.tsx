import { useMemo } from 'react'

import type { ClienteIndicadores, Tabela } from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtNum, fmtPct } from '@server/relatorio/utils'

import { Loading } from '@/atomic/base-components/loading'

import { SeloAbc } from '@/atomic/features/banco-dados/components/selo-abc'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import {
  GraficoPareto,
  type ItemPareto,
} from '@/atomic/features/relatorio-graficos/components/grafico-pareto'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { COR_ABC } from '@/atomic/features/banco-dados/helpers/cor-abc'
import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

import { useClientesQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { cn } from '@/lib/tailwind/utils'

/** Coluna ABC com o selo colorido (fora do render: referência estável para a tabela). */
const CELULAS = { ABC: (v: unknown) => <SeloAbc classe={String(v ?? '-')} /> }
const MAX_PARETO = 60

/**
 * Estimadores dos clientes (Curva ABC / potencial), calculados sobre toda a base — não
 * dependem do período escolhido. Por grupo econômico (sem grupo, o próprio cliente).
 */
export function RelatorioEstimadores({ busca = '' }: { busca?: string }) {
  const { data, isPending } = useClientesQuery()

  const { pareto, tabela } = useMemo(() => {
    const clientes = data?.clientes ?? []
    // um ponto por grupo econômico (o estimador é por grupo)
    const grupos = new Map<
      string,
      { nome: string; valor: number; acumulado: number; classe: ClienteIndicadores['abc'] }
    >()
    for (const c of clientes) {
      const g = grupos.get(c.grupo_chave)
      if (g) g.valor += c.faturamento
      else
        grupos.set(c.grupo_chave, {
          nome: c.grupo_nome,
          valor: c.faturamento,
          acumulado: c.participacao_acumulada,
          classe: c.abc,
        })
    }
    const pareto = [...grupos.values()]
      .filter((g) => g.valor > 0 && g.classe !== '-')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, MAX_PARETO) as ItemPareto[]
    const tabela: Tabela = {
      colunas: [
        'Cliente',
        'Grupo',
        'ABC',
        'Participação',
        'Acumulado',
        'Faturamento',
        'Tendência',
        'Potencial',
        'Última compra',
        'Dias sem comprar',
        'Segmento',
      ],
      linhas: clientes
        .filter((c) => c.faturamento > 0 || c.potencial > 0)
        .map((c) => [
          c.nome,
          c.grupo || '',
          c.abc,
          c.participacao,
          c.participacao_acumulada,
          c.faturamento,
          c.tendencia,
          c.potencial,
          c.ultima_compra ? fmtData(c.ultima_compra) : '',
          c.dias_sem_comprar,
          c.segmento,
        ]),
    }
    return { pareto, tabela }
  }, [data])

  if (isPending || !data) return <Loading text="" className="h-48" />
  const { resumo } = data
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-4">
        {(['A', 'B', 'C'] as const).map((k) => (
          <div key={k} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded text-xs font-bold',
                  COR_ABC[k]
                )}
              >
                {k}
              </span>
              <span className="text-xs text-muted-foreground">
                {k === 'A' ? 'até 80% do faturamento' : k === 'B' ? 'de 80% a 95%' : 'últimos 5%'}
              </span>
            </div>
            <div className="mt-1 text-base font-bold">
              {fmtNum(resumo[k].grupos)}{' '}
              {resumo[k].grupos === 1 ? 'cliente/grupo' : 'clientes/grupos'}
            </div>
            <div className="text-xs text-muted-foreground">
              {fmtMoeda(resumo[k].faturamento)} ·{' '}
              {resumo.total ? fmtPct(resumo[k].faturamento / resumo.total) : '0,0%'}
            </div>
          </div>
        ))}
        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Toda a base, não só o período</div>
          Faturamento (notas){resumo.referencia ? ` até ${fmtData(resumo.referencia)}` : ''} por
          grupo econômico. Tendência: últimos 90 dias x 90 anteriores. Potencial: propostas em
          aberto (até 90 dias) + pedidos aguardando nota. Grupo e segmento são editados em Banco de
          dados → Clientes.
        </div>
      </div>
      <GraficoMoldura
        altura={230}
        className="shrink-0"
        titulo={`Curva ABC — ${Math.min(pareto.length, MAX_PARETO)} maiores clientes/grupos`}
      >
        <GraficoPareto itens={pareto} formatar={fmtMoeda} formatarPct={(v) => fmtPct(v)} />
      </GraficoMoldura>
      <RelatorioTabela
        tabela={filtrarTabela(tabela, busca)}
        celulas={CELULAS}
        preencher
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem faturamento na base.'}
      />
    </div>
  )
}
