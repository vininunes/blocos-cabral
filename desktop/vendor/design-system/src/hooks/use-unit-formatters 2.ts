import { useMemo } from 'react'

import { useUom } from './use-uom'

type Numeric = number | null | undefined

/** Formats a measurement value with the given decimals, '-' for nullish. */
type Formatter = (value: Numeric, digits?: number) => string

export type UnitFormatters = {
  /** Speed from knots → user unit. '-' when nullish. */
  fmtSpeed: Formatter
  /** Angle from degrees → user unit. '-' when nullish. */
  fmtAngle: Formatter
  /** Depth from meters → user unit. '-' when nullish. */
  fmtDepth: Formatter
  /** Length from meters → user unit. '-' when nullish. */
  fmtLength: Formatter
  /** Distance from meters → user unit. '-' when nullish. */
  fmtDistance: Formatter
  /** Area from square meters → user unit. '-' when nullish. */
  fmtArea: Formatter
}

/**
 * Returns value formatters that convert from each metric's base unit
 * (kn/deg/m/m²) to the user's configured unit and render with `digits` decimals
 * (default 1), falling back to '-' for nullish values. Symbols come from
 * `useUom().units`.
 *
 * Replaces the per-screen `fmtSpeed/fmtAngle/fmtDepth/fmtLength` helpers (A7) and
 * inline `convert.X.toUser(...).toFixed(...)` calls scattered across the app.
 */
export function useUnitFormatters(): UnitFormatters {
  const { convert } = useUom()

  return useMemo(
    () => ({
      fmtSpeed: (value, digits = 1) =>
        value == null ? '-' : convert.speed.toUser(value, 'kn').toFixed(digits),
      fmtAngle: (value, digits = 1) =>
        value == null ? '-' : convert.angle.toUser(value, 'deg').toFixed(digits),
      fmtDepth: (value, digits = 1) =>
        value == null ? '-' : convert.depth.toUser(value, 'm').toFixed(digits),
      fmtLength: (value, digits = 1) =>
        value == null ? '-' : convert.length.toUser(value, 'm').toFixed(digits),
      fmtDistance: (value, digits = 1) =>
        value == null ? '-' : convert.distance.toUser(value, 'm').toFixed(digits),
      fmtArea: (value, digits = 1) =>
        value == null ? '-' : convert.area.toUser(value, 'm2').toFixed(digits),
    }),
    [convert]
  )
}
