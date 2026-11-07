import type { DiaIso, Filtro, ModoComparacao, TipoPeriodo } from '@server/relatorio/api-tipos'
import { useAtom } from 'jotai'
import { GitCompareArrows } from 'lucide-react'

import { FloatCard } from '@/atomic/base-components/float-card'
import { Select } from '@/atomic/base-components/select'

import { ICONE_STATUS } from '../helpers/icone-status'
import { MODOS_COMPARACAO } from '../helpers/modos-comparacao'
import { relatorioFiltrosAtom } from '../store/relatorio-filtros-state'
import { PERSONALIZADO, SelectComIntervalo } from './select-com-intervalo'

const TIPOS: TipoPeriodo[] = [
  'Dia',
  'Semana',
  'Mês',
  'Trimestre',
  'Semestre',
  'Ano',
  'Personalizado',
]
const FILTROS: Filtro[] = ['Todos', 'Em processo', 'Aprovado', 'Entregue', 'Faturado', 'Cancelado']

type Intervalo = { inicio: DiaIso; fim: DiaIso } | null | undefined

/**
 * Status do relatório (Todos, Em processo, Aprovado...), à esquerda do tipo de período: mesmo
 * float card, esticado na altura da linha. Vale também nas abas da base inteira.
 */
export function RelatorioFiltroStatus() {
  const [f, setF] = useAtom(relatorioFiltrosAtom)
  return (
    <FloatCard className="flex items-center self-stretch">
      <Select
        variant="float"
        className="h-full w-36"
        items={[
          FILTROS.map((x) => {
            const Icone = ICONE_STATUS[x]
            return {
              value: x,
              name: x,
              icon: <Icone className="size-3.5 text-muted-foreground" />,
            }
          }),
        ]}
        value={f.filtro}
        onValueChange={(v) => setF((x) => ({ ...x, filtro: v as Filtro }))}
      />
    </FloatCard>
  )
}

/**
 * Tipo de período, à esquerda do seletor de período: mesmo float card do PageActionSelect do
 * design system, mas esticado na altura da linha (a do navegador do período, que tem duas linhas).
 */
export function RelatorioTipoPeriodo({ periodoA }: { periodoA?: Intervalo }) {
  const [f, setF] = useAtom(relatorioFiltrosAtom)
  return (
    <FloatCard className="flex items-center self-stretch">
      <SelectComIntervalo
        className="w-36"
        valor={f.tipo}
        opcoes={TIPOS.map((x) => ({ value: x, name: x }))}
        onEscolher={(v) => setF((x) => ({ ...x, tipo: v as TipoPeriodo }))}
        // a bandeja abre no intervalo personalizado vigente ou no período que está na tela
        intervalo={{ de: f.de ?? periodoA?.inicio ?? null, ate: f.ate ?? periodoA?.fim ?? null }}
        onIntervalo={(de, ate) => setF((x) => ({ ...x, tipo: PERSONALIZADO, de, ate }))}
        titulo="Período personalizado"
      />
    </FloatCard>
  )
}

/**
 * "Comparar com" como page action do design system (float card, sem rótulo nem tooltip), na
 * linha das abas do relatório. Nas abas da base inteira não aparece.
 */
export function RelatorioFiltrosAcoes({
  periodoB,
  semComparacao = false,
}: {
  periodoB?: Intervalo
  /** Abas da base inteira: sem "Comparar com". */
  semComparacao?: boolean
}) {
  const [f, setF] = useAtom(relatorioFiltrosAtom)
  if (semComparacao) return null

  return (
    <FloatCard className="flex h-9 items-center gap-1.5 pl-3">
      <GitCompareArrows className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs whitespace-nowrap text-muted-foreground">Comparar com</span>
      <SelectComIntervalo
        className="w-64"
        valor={f.modo}
        opcoes={MODOS_COMPARACAO.map((m) => ({ value: m.valor, name: m.rotulo }))}
        onEscolher={(v) => setF((x) => ({ ...x, modo: v as ModoComparacao }))}
        intervalo={{
          de: f.cmpDe ?? periodoB?.inicio ?? null,
          ate: f.cmpAte ?? periodoB?.fim ?? null,
        }}
        onIntervalo={(cmpDe, cmpAte) => setF((x) => ({ ...x, modo: PERSONALIZADO, cmpDe, cmpAte }))}
        titulo="Comparar com o período"
      />
    </FloatCard>
  )
}
