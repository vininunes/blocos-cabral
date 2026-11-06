import type { Navegacao, RespostaRelatorio } from '@server/relatorio/api-tipos'
import { useSetAtom } from 'jotai'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'
import Tooltip from '@/atomic/base-components/tooltip'

import { relatorioFiltrosAtom } from '../store/relatorio-filtros-state'

/** Período selecionado em destaque, com as setas ‹ › para o anterior/próximo. */
export function RelatorioPeriodoFaixa({
  rel,
  carregando,
}: {
  rel: RespostaRelatorio
  carregando?: boolean
}) {
  const { t } = useTranslation()
  const setF = useSetAtom(relatorioFiltrosAtom)
  const ir = (n: Navegacao) =>
    setF((x) => ({ ...x, ancora: n.ancora, de: n.de ?? x.de, ate: n.ate ?? x.ate }))
  const sub = rel.b
    ? t('relatorioFiltros.comparando', { b: rel.b.rotulo, modo: rel.modo.toLowerCase() })
    : t('relatorioFiltros.semComparacao')

  return (
    <FloatCard className="flex min-w-72 flex-1 items-center gap-1 px-1 py-1">
      <Tooltip text={t('relatorioFiltros.anterior')}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => ir(rel.navegacao.anterior)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </Tooltip>
      <div
        className={`min-w-0 flex-1 text-center leading-tight transition-opacity ${carregando ? 'opacity-60' : ''}`}
      >
        <div className="truncate text-sm font-bold text-primary dark:text-foreground">
          {rel.a.rotulo}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <Tooltip text={t('relatorioFiltros.proximo')}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => ir(rel.navegacao.proximo)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </Tooltip>
    </FloatCard>
  )
}
