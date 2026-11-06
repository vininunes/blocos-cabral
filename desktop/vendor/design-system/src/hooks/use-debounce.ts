/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from 'react'

type DebounceOptions = {
  leading?: boolean
  trailing?: boolean
}

export function useDebounce<T extends any[]>(
  callback: (...args: T) => void,
  delay = 300,
  options: DebounceOptions = {}
) {
  const { leading = false, trailing = true } = options

  const cbRef = useRef(callback)
  const timerRef = useRef<number | undefined>(undefined)
  const lastArgsRef = useRef<T | null>(null)
  const leadingInvokedRef = useRef(false)

  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const debounced = useCallback(
    (...args: T) => {
      lastArgsRef.current = args

      const invokeLeadingNow = leading && !timerRef.current && !leadingInvokedRef.current
      if (invokeLeadingNow) {
        cbRef.current(...args)
        leadingInvokedRef.current = true
      }

      if (timerRef.current) window.clearTimeout(timerRef.current)

      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined
        leadingInvokedRef.current = false

        if (trailing && lastArgsRef.current) {
          cbRef.current(...(lastArgsRef.current as T))
          lastArgsRef.current = null
        }
      }, delay)
    },
    [delay, leading, trailing]
  )

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    lastArgsRef.current = null
    leadingInvokedRef.current = false
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
      leadingInvokedRef.current = false
      if (trailing && lastArgsRef.current) {
        cbRef.current(...(lastArgsRef.current as T))
        lastArgsRef.current = null
      }
    }
  }, [trailing])

  return { debounced, cancel, flush }
}
