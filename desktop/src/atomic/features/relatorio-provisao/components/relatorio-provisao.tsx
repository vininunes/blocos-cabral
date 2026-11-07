import { useMemo, useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtNum, fmtPct } from '@server/relatorio/utils'
import { LineChart, Target } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'
import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import {
  GraficoAcumulado,
  type PontoAcumulado,
} from '@/atomic/features/relatorio-graficos/components/grafico-acumulado'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

import { cn } from '@/lib/tailwind/utils'

import { GraficoProvisaoClientes, type ItemProvisao } from './grafico-provisao-clientes'
import { RelatorioProvisaoClientes } from './relatorio-provisao-clientes'

const eixoMil = (v: number) => `R$ ${fmtNum(v / 1000)} mil`
const MAX_CLIENTES_GRAFICO = 15

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
 * Provisão x realizado no período: o que se esperava vender (total mensal de cada cliente,
 * dividido pelos dias úteis do mês) contra o faturamento (notas) desses clientes.
 */
export function RelatorioProvisao({ rel }: { rel: RespostaRelatorio }) {
  const [vista, setVista] = useState<'acompanhamento' | 'lancar'>(
    rel.provisao.clientesComProvisao ? 'acompanhamento' : 'lancar'
  )
  const [busca, setBusca] = useState('')
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
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
        {vista === 'acompanhamento' && rel.provisao.clientesComProvisao > 0 && (
          <PageActionSearch
            value={busca}
            onChange={setBusca}
            placeholder="Buscar cliente ou grupo"
            className="w-72"
          />
        )}
      </div>
      {vista === 'lancar' ? (
        <RelatorioProvisaoClientes />
      ) : (
        <Acompanhamento rel={rel} busca={busca} onLancar={() => setVista('lancar')} />
      )}
    </div>
  )
}

/** Provisionado x realizado no período (cartões, acumulado e tabela por cliente). */
function Acompanhamento({
  rel,
  busca,
  onLancar,
}: {
  rel: RespostaRelatorio
  busca: string
  onLancar: () => void
}) {
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
  const tabela = useMemo(() => filtrarTabela(p.tabela, busca), [p.tabela, busca])
  /** Clientes com provisão (os da busca), maiores provisões primeiro. */
  const porCliente = useMemo(() => {
    const j = (c: string) => tabela.colunas.indexOf(c)
    return tabela.linhas
      .map(
        (l): ItemProvisao => ({
          cliente: String(l[j('Cliente')]),
          provisao: Number(l[j('Provisionado')] ?? 0),
          realizado: Number(l[j('Realizado')] ?? 0),
        })
      )
      .filter((i) => i.provisao > 0)
      .sort((a, b) => b.provisao - a.provisao)
  }, [tabela])
  const grafico = porCliente.slice(0, MAX_CLIENTES_GRAFICO)

  if (!p.clientesComProvisao) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <DetailsEmptyState
          className="h-auto"
          icon={<Target />}
          title="Nenhum cliente com provisão neste período"
          description="Lance a provisão mensal (total R$ por mês) dos clientes na aba Lançar provisão — um a um ou vários de uma vez."
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
          detalhe={rel.todo.rotulo}
        />
      </div>
      <div className="grid shrink-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <GraficoMoldura altura={260} titulo="Acumulado no período: realizado x provisão">
          <GraficoAcumulado
            pontos={pontos}
            dias={dias}
            nomeA="Realizado"
            nomeB="Provisão"
            formatar={fmtMoeda}
            formatarEixo={eixoMil}
          />
        </GraficoMoldura>
        <GraficoMoldura
          altura={260}
          titulo={`Por cliente: realizado x provisão${porCliente.length > grafico.length ? ` · ${grafico.length} maiores provisões de ${fmtNum(porCliente.length)}` : ''}`}
        >
          {grafico.length ? (
            <GraficoProvisaoClientes itens={grafico} formatar={fmtMoeda} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Nenhum cliente com provisão na busca.
            </div>
          )}
        </GraficoMoldura>
      </div>
      <RelatorioTabela
        tabela={tabela}
        preencher
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem provisão nem faturamento no período.'}
      />
    </div>
  )
}
