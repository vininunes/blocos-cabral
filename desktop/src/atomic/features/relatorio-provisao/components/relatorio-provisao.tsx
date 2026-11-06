import { useMemo, useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtNum, fmtPct } from '@server/relatorio/utils'
import { LineChart, Target } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import {
  GraficoAcumulado,
  type PontoAcumulado,
} from '@/atomic/features/relatorio-graficos/components/grafico-acumulado'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { cn } from '@/lib/tailwind/utils'

import { RelatorioProvisaoClientes } from './relatorio-provisao-clientes'

const eixoMil = (v: number) => `R$ ${fmtNum(v / 1000)} mil`

function Cartao({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: 'pos' | 'neg'
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {rotulo}
      </div>
      <div
        className={cn(
          'text-xl font-bold tabular-nums text-primary dark:text-foreground',
          tom === 'pos' && 'text-cabral-verde dark:text-cabral-verde',
          tom === 'neg' && 'text-cabral-vermelho dark:text-cabral-vermelho'
        )}
      >
        {valor}
      </div>
      {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  )
}

/**
 * Provisão x realizado no período: o que se esperava vender (R$ por dia útil de cada cliente,
 * cadastrado em Banco de dados → Clientes) contra o faturamento (notas) desses clientes.
 */
export function RelatorioProvisao({ rel }: { rel: RespostaRelatorio }) {
  const [vista, setVista] = useState<'acompanhamento' | 'lancar'>(
    rel.provisao.clientesComProvisao ? 'acompanhamento' : 'lancar'
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0">
        <PageActionTabs
          tabs={[
            {
              value: 'acompanhamento',
              label: 'Acompanhamento',
              icon: <LineChart className="size-3.5" />,
            },
            { value: 'lancar', label: 'Lançar provisão', icon: <Target className="size-3.5" /> },
          ]}
          value={vista}
          onValueChange={(v) => setVista(v as typeof vista)}
        />
      </div>
      {vista === 'lancar' ? (
        <RelatorioProvisaoClientes />
      ) : (
        <Acompanhamento rel={rel} onLancar={() => setVista('lancar')} />
      )}
    </div>
  )
}

/** Provisionado x realizado no período (cartões, acumulado e tabela por cliente). */
function Acompanhamento({ rel, onLancar }: { rel: RespostaRelatorio; onLancar: () => void }) {
  const p = rel.provisao
  const { pontos, dias } = useMemo(() => {
    const ac = p.acumulado
    const dias = ac.linhas.map((l) => String(l[1]))
    const pontos: PontoAcumulado[] = []
    ac.linhas.forEach((l, i) => {
      if (typeof l[2] === 'number')
        pontos.push({ dia: i + 1, rotulo: dias[i], periodo: 'Realizado', valor: l[2] })
      if (typeof l[3] === 'number')
        pontos.push({ dia: i + 1, rotulo: dias[i], periodo: 'Provisão', valor: l[3] })
    })
    return { pontos, dias }
  }, [p])

  if (!p.clientesComProvisao) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <DetailsEmptyState
          className="h-auto"
          icon={<Target />}
          title="Nenhum cliente com provisão neste período"
          description="Lance a provisão (R$ por dia útil) dos clientes na aba Lançar provisão — um a um ou vários de uma vez."
        />
        <Button variant="outline" onClick={onLancar}>
          <Target className="size-4" /> Lançar provisão
        </Button>
      </div>
    )
  }

  const atingido = p.atingido
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-5">
        <Cartao
          rotulo="Provisionado"
          valor={fmtMoeda(p.provisionado)}
          detalhe={`${fmtNum(p.clientesComProvisao)} clientes · ${fmtNum(p.diasUteis)} dias úteis`}
        />
        <Cartao
          rotulo="Realizado"
          valor={fmtMoeda(p.realizado)}
          detalhe="faturamento (notas) desses clientes"
        />
        <Cartao
          rotulo="Atingido"
          valor={atingido === null ? '-' : fmtPct(atingido)}
          detalhe={`${p.realizado - p.provisionado >= 0 ? '+' : '-'}${fmtMoeda(Math.abs(p.realizado - p.provisionado))} da provisão`}
          tom={atingido === null ? undefined : atingido >= 1 ? 'pos' : 'neg'}
        />
        <Cartao
          rotulo="Sem provisão"
          valor={fmtMoeda(p.realizadoSemProvisao)}
          detalhe="faturamento de clientes sem provisão"
        />
        <Cartao
          rotulo="Faturamento total"
          valor={fmtMoeda(p.realizado + p.realizadoSemProvisao)}
          detalhe={rel.a.rotulo}
        />
      </div>
      <GraficoMoldura
        altura={220}
        className="shrink-0"
        titulo="Acumulado no período: realizado x provisão"
      >
        <GraficoAcumulado
          pontos={pontos}
          dias={dias}
          nomeA="Realizado"
          nomeB="Provisão"
          formatar={fmtMoeda}
          formatarEixo={eixoMil}
        />
      </GraficoMoldura>
      <RelatorioTabela
        tabela={p.tabela}
        preencher
        vazio="Sem provisão nem faturamento no período."
      />
    </div>
  )
}
