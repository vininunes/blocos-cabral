import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtData } from '@server/relatorio/utils'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Aviso quando a base não cobre (ou cobre só parte) do período de comparação. */
export function RelatorioCoberturaAviso({ rel }: { rel: RespostaRelatorio }) {
  const { t } = useTranslation()
  if (!rel.b || rel.coberturaB === 'total') return null
  const args = { b: rel.b.rotulo, ini: fmtData(rel.cobertura[0]), fim: fmtData(rel.cobertura[1]) }
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <Info className="size-4 shrink-0 text-amber-600" />
      <span>
        {t(
          rel.coberturaB === 'nenhuma' ? 'relatorioFiltros.semDadosB' : 'relatorioFiltros.parcialB',
          args
        )}
      </span>
    </div>
  )
}
