import { lazy, Suspense } from 'react'

import { Loading } from '@/atomic/base-components/loading'

const ColorPickerImpl = lazy(() =>
  import('./color-picker-impl').then((m) => ({ default: m.ColorPicker }))
)

const ColorSwatchPickerImpl = lazy(() =>
  import('./color-picker-impl').then((m) => ({ default: m.ColorSwatchPicker }))
)

export interface ColorPickerProps {
  text?: string
  colorSwatchValue?: string[]
  onChange?: (color: string) => void
  value?: string
  eyeDropper?: boolean
  disabled?: boolean
  className?: string
  withAlpha?: boolean
  /** Popover controlado (omitido = não-controlado, comportamento atual). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface ColorSwatchPickerProps {
  colors: string[]
  value?: string
  onChange?: (color: string) => void
  className?: string
}

export function ColorPicker(props: ColorPickerProps) {
  return (
    <Suspense fallback={<Loading text="" className="h-7 w-24" />}>
      <ColorPickerImpl {...props} />
    </Suspense>
  )
}

export function ColorSwatchPicker(props: ColorSwatchPickerProps) {
  return (
    <Suspense fallback={<Loading text="" className="h-7" />}>
      <ColorSwatchPickerImpl {...props} />
    </Suspense>
  )
}
