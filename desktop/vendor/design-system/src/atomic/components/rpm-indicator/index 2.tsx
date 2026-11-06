import { useMemo, type JSX } from 'react'

import RpmPointer from './shapes/RpmPointer'
import RpmShape from './shapes/RpmShape'
import type { RpmIndicatorProps } from './types'

const SVG_SIZE = 580
const DISPLAY_X = 221
const DISPLAY_Y = 403
const DISPLAY_W = 138
const DISPLAY_H = 38

export default function RpmIndicator({
  value,
  min = -120,
  max = 120,
  size = 580,
}: RpmIndicatorProps): JSX.Element {
  const clamped = useMemo(() => Math.max(min, Math.min(max, value)), [value, min, max])

  const rotation = useMemo(
    () => ((clamped - min) / (max - min)) * 240 - 120,
    [clamped, min, max]
  )

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <RpmShape className="w-full h-full" min={min} max={max} />
      <RpmPointer
        className="absolute inset-0 w-full h-full"
        style={{
          rotate: `${rotation}deg`,
          transition: 'rotate 0.5s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${(DISPLAY_Y / SVG_SIZE) * 100}%`,
          left: `${(DISPLAY_X / SVG_SIZE) * 100}%`,
          width: `${(DISPLAY_W / SVG_SIZE) * 100}%`,
          height: `${(DISPLAY_H / SVG_SIZE) * 100}%`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: `${(size * 24) / SVG_SIZE}px`,
          color: '#ff3b3b',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
          textShadow: '0 0 8px #ff000099, 0 0 2px #ff0000cc',
          userSelect: 'none',
        }}
      >
        {clamped.toFixed(1).replace('.', ',')}
      </div>
    </div>
  )
}
