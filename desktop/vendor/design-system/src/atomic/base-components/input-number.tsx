import React from 'react'

import { cn } from '@/lib/tailwind/utils'

import { Button } from './button'
import { InputBase } from './input-base'

const InputNumber = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    showIncrementDecrement?: boolean
    icon?: React.ReactNode
    onValueChange?: (value: number | undefined) => void
  }
>(
  (
    {
      className,
      value,
      defaultValue,
      step = 1,
      max = Number.MAX_SAFE_INTEGER,
      min = 0,
      showIncrementDecrement = false,
      icon,
      onValueChange,
      ...props
    },
    ref
  ) => {
    // Helper to normalize any incoming value to a string for the input element
    const toStringValue = React.useCallback(
      (v: React.ComponentProps<'input'>['value'] | undefined): string => {
        if (v === undefined || v === null) return ''
        if (Array.isArray(v)) return String(v[0] ?? '')
        return String(v)
      },
      []
    )

    const isControlled = value !== undefined

    // Internal state used when the component is uncontrolled externally
    const [internalValue, setInternalValue] = React.useState<string>(() =>
      toStringValue(value ?? defaultValue)
    )

    // Sync internal value when external value changes (for controlled mode)
    React.useEffect(() => {
      if (isControlled) {
        setInternalValue(toStringValue(value))
      }
    }, [isControlled, value, toStringValue])

    // Always use internal value for display to allow typing freely
    const displayValue = internalValue

    const clamp = React.useCallback(
      (n: number) => {
        const nn = Number.isNaN(n) ? 0 : n
        return Math.max(Number(min), Math.min(Number(max), nn))
      },
      [min, max]
    )

    const handleIncrement = React.useCallback(() => {
      const current = parseFloat(displayValue)
      const base = Number.isNaN(current) ? 0 : current
      const next = clamp(base + Number(step))

      if (!isControlled) setInternalValue(String(next))
      onValueChange?.(next)
    }, [displayValue, clamp, isControlled, onValueChange, step])

    const handleDecrement = React.useCallback(() => {
      const current = parseFloat(displayValue)
      const base = Number.isNaN(current) ? 0 : current
      const next = clamp(base - Number(step))

      if (!isControlled) setInternalValue(String(next))
      onValueChange?.(next)
    }, [displayValue, clamp, isControlled, onValueChange, step])

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value
        setInternalValue(next)
        props.onChange?.(event)

        if (next === '') {
          onValueChange?.(undefined)
        } else {
          const parsed = parseFloat(next)
          if (!Number.isNaN(parsed)) {
            onValueChange?.(clamp(parsed))
          }
        }
      },
      [clamp, onValueChange, props]
    )

    const isEmpty = displayValue === ''

    return (
      <div className="w-fit relative rounded-md">
        {icon && (
          <div
            className={
              'absolute top-1/2 transform -translate-y-1/2 h-7 w-7 flex justify-center items-center bg-muted rounded-l-md cursor-text pointer-events-none'
            }
          >
            {icon}
          </div>
        )}

        <InputBase
          {...props}
          ref={ref}
          type={'number'}
          onChange={handleChange}
          className={cn(
            'appearance-none',
            showIncrementDecrement && 'pr-14',
            icon ? 'pl-9' : 'pl-2',
            className
          )}
          max={max}
          min={min}
          step={step}
          value={displayValue}
        />

        {showIncrementDecrement && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 h-7 flex gap-1 p-1">
            <Button
              disabled={isEmpty}
              variant={'outline'}
              className="h-5 w-5"
              onClick={handleIncrement}
            >
              +
            </Button>
            <Button
              disabled={isEmpty}
              variant={'outline'}
              className="h-5 w-5"
              onClick={handleDecrement}
            >
              -
            </Button>
          </div>
        )}
      </div>
    )
  }
)

InputNumber.displayName = 'InputNumber'

export { InputNumber }
