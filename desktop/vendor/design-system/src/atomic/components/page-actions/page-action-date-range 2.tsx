import { DateRangeSelect } from '@/atomic/base-components/date-range-select'
import { FloatCard } from '@/atomic/base-components/float-card'

/**
 * Seletor de intervalo de datas padrão das page actions (header do Pages):
 * float card com DateRangeSelect no visual float.
 */
export function PageActionDateRange({
  startDate,
  endDate,
  onChange,
  showTime = false,
  hidePresets = false,
  align = 'center',
}: {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
  showTime?: boolean
  hidePresets?: boolean
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <FloatCard className="flex h-9 items-center">
      <DateRangeSelect
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        showTime={showTime}
        hidePresets={hidePresets}
        variant="float"
        className="h-full"
        align={align}
      />
    </FloatCard>
  )
}
