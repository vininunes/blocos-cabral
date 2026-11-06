import type { DiaIso, Filtro, ModoComparacao, TipoPeriodo } from '@server/relatorio/api-tipos'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'

import { DatePicker } from '@/atomic/base-components/date-picker'
import { FloatCard } from '@/atomic/base-components/float-card'
import { Select } from '@/atomic/base-components/select'

import { PageActionSelect } from '@/atomic/components/page-actions/page-action-select'

import { dateParaDia, diaParaDate } from '../helpers/datas'
import { relatorioFiltrosAtom } from '../store/relatorio-filtros-state'

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
const MODOS: ModoComparacao[] = [
  'Até a mesma data',
  'Período anterior',
  'Mesmo período do ano anterior',
  'Personalizado',
  'Sem comparação',
]
const itens = (xs: string[]) => [xs.map((x) => ({ value: x, name: x }))]

/**
 * Tipo de período, à esquerda do seletor de período: mesmo float card do PageActionSelect do
 * design system, mas esticado na altura da linha (a do navegador do período, que tem duas linhas).
 */
export function RelatorioTipoPeriodo() {
  const [f, setF] = useAtom(relatorioFiltrosAtom)
  return (
    <FloatCard className="flex items-center self-stretch">
      <Select
        variant="float"
        className="h-full w-36"
        items={itens(TIPOS)}
        value={f.tipo}
        onValueChange={(v) => {
          const tipo = v as TipoPeriodo
          // ao entrar em Personalizado, começa no período que estava na tela
          setF((x) => ({
            ...x,
            tipo,
            ...(tipo === 'Personalizado' && !x.de ? { de: x.ancora, ate: x.ancora } : {}),
          }))
        }}
      />
    </FloatCard>
  )
}

/**
 * Status e "Comparar com" como page actions do design system (float cards, sem rótulo nem tooltip), na
 * linha das abas do relatório.
 */
export function RelatorioFiltrosAcoes({
  periodoB,
}: {
  periodoB?: { inicio: DiaIso; fim: DiaIso } | null
}) {
  const [f, setF] = useAtom(relatorioFiltrosAtom)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PageActionSelect
        className="w-36"
        items={itens(FILTROS)}
        value={f.filtro}
        onValueChange={(v) => setF((x) => ({ ...x, filtro: v as Filtro }))}
      />
      <PageActionSelect
        className="w-60"
        items={itens(MODOS)}
        value={f.modo}
        onValueChange={(v) => {
          const modo = v as ModoComparacao
          setF((x) => ({
            ...x,
            modo,
            ...(modo === 'Personalizado' && !x.cmpDe && periodoB
              ? { cmpDe: periodoB.inicio, cmpAte: periodoB.fim }
              : {}),
          }))
        }}
      />
    </div>
  )
}

function Data({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string
  valor: DiaIso | null
  onChange: (d: DiaIso | null) => void
}) {
  return (
    <FloatCard className="flex h-9 items-center gap-2 pl-3 pr-1">
      <span className="text-xs whitespace-nowrap text-muted-foreground">{rotulo}</span>
      <DatePicker
        value={diaParaDate(valor)}
        onChange={(d) => onChange(dateParaDia(d))}
        format="DD/MM/YYYY"
        buttonClassName="h-7 w-32 border-transparent bg-transparent shadow-none"
      />
    </FloatCard>
  )
}

/** Datas do período e da comparação personalizados (só aparecem quando escolhidos). */
export function RelatorioFiltrosDatas() {
  const { t } = useTranslation()
  const [f, setF] = useAtom(relatorioFiltrosAtom)
  if (f.tipo !== 'Personalizado' && f.modo !== 'Personalizado') return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {f.tipo === 'Personalizado' && (
        <>
          <Data
            rotulo={t('relatorioFiltros.de')}
            valor={f.de}
            onChange={(de) => setF((x) => ({ ...x, de }))}
          />
          <Data
            rotulo={t('relatorioFiltros.ate')}
            valor={f.ate}
            onChange={(ate) => setF((x) => ({ ...x, ate }))}
          />
        </>
      )}
      {f.modo === 'Personalizado' && (
        <>
          <Data
            rotulo={t('relatorioFiltros.cmpDe')}
            valor={f.cmpDe}
            onChange={(cmpDe) => setF((x) => ({ ...x, cmpDe }))}
          />
          <Data
            rotulo={t('relatorioFiltros.cmpAte')}
            valor={f.cmpAte}
            onChange={(cmpAte) => setF((x) => ({ ...x, cmpAte }))}
          />
        </>
      )}
    </div>
  )
}
