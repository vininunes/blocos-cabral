import { type ComponentProps, lazy, Suspense } from 'react'

import type { Calendar as CalendarType } from './calendar'

const CalendarImpl = lazy(() => import('./calendar').then((m) => ({ default: m.Calendar })))

/**
 * Calendar carregado sob demanda: react-day-picker só é baixado quando um
 * popover de data abre (antes entrava no chunk do VTS via widget de tempo do
 * weather → DatePicker). Fallback com a altura aproximada do calendário para o
 * popover não "pular" na primeira abertura.
 */
export function LazyCalendar(props: ComponentProps<typeof CalendarType>) {
  return (
    <Suspense fallback={<div className="h-72 w-64" />}>
      <CalendarImpl {...props} />
    </Suspense>
  )
}
