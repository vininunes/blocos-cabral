import {
  DatePeriodNavigator,
  type PeriodGranularity,
} from '@/atomic/base-components/date-period-navigator'
import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * Navegador de período padrão das page actions (header do Pages): float card
 * com DatePeriodNavigator (dia/semana/mês com setas) no visual float.
 */
export function PageActionNavigator({
  startDate,
  endDate,
  period,
  onChange,
  granularities,
}: {
  startDate: Date
  endDate: Date
  period: PeriodGranularity
  onChange: (start: Date, end: Date, period: PeriodGranularity) => void
  /** Restringe as granularidades disponíveis (ex.: ['month'] no market-share). */
  granularities?: PeriodGranularity[]
}) {
  return (
    <FloatCard className="flex h-9 items-center">
      <DatePeriodNavigator
        startDate={startDate}
        endDate={endDate}
        period={period}
        onChange={onChange}
        granularities={granularities}
        variant="float"
        className="h-full"
      />
    </FloatCard>
  )
}
