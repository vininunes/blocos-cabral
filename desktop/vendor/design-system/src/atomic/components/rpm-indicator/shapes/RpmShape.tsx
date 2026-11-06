import { memo, type ComponentProps, type JSX } from 'react'

interface RpmShapeProps extends ComponentProps<'svg'> {
  min: number
  max: number
}

// Maps a gauge angle (-120° to +120°) to the real value given the range
function angleToValue(angle: number, min: number, max: number): number {
  return min + ((angle + 120) / 240) * (max - min)
}

const CX = 290
const CY = 290
const OUTER_R = 240
const INNER_R = 211
const MAJOR_OUTER_R = 237
const MAJOR_INNER_R = 208
const MINOR_OUTER_R = 237
const MINOR_INNER_R = 222
const LABEL_R = 162

function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.sin(rad),
    y: CY - radius * Math.cos(rad),
  }
}

function describeArc(startAngle: number, endAngle: number, r: number): string {
  const start = polarToXY(startAngle, r)
  const end = polarToXY(endAngle, r)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

// Mask path: visible pie from -120° to +120° (through top), closing back to center
function maskPath(r: number): string {
  const start = polarToXY(-120, r)
  const end = polarToXY(120, r)
  return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y} L ${CX} ${CY} Z`
}

function RpmShape({ min, max, ...props }: RpmShapeProps): JSX.Element {
  const ticks = []
  for (let angle = -120; angle <= 120; angle += 5) {
    const isMajor = angle % 15 === 0
    const outer = polarToXY(angle, isMajor ? MAJOR_OUTER_R : MINOR_OUTER_R)
    const inner = polarToXY(angle, isMajor ? MAJOR_INNER_R : MINOR_INNER_R)
    ticks.push(
      <line
        key={angle}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke={isMajor ? '#ffffff' : '#d0d3db'}
        strokeWidth={isMajor ? 3 : 1.5}
        strokeLinecap="round"
      />
    )
  }

  const labelAngles = [-120, -90, -45, 0, 45, 90, 120]
  const labels = labelAngles.map((angle) => {
    const pos = polarToXY(angle, LABEL_R)
    const label = Math.round(angleToValue(angle, min, max))
    return (
      <text
        key={angle}
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="24"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    )
  })

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 580" fill="none" {...props}>
      <defs>
        {/* Mask: show only the active arc (-120° to +120°) */}
        <mask id="rpmArcMask" maskUnits="userSpaceOnUse">
          <path fill="#D9D9D9" d={maskPath(OUTER_R + 10)} />
        </mask>

        {/* Ring band mask for graduation lines */}
        <mask id="rpmRingMask" maskUnits="userSpaceOnUse">
          <circle cx={CX} cy={CY} r={OUTER_R} fill="white" />
          <circle cx={CX} cy={CY} r={INNER_R - 2} fill="black" />
        </mask>
      </defs>

      {/* Outer dark ring (full circle baseline) */}
      <circle cx={CX} cy={CY} r={OUTER_R} fill="#2e3039" stroke="#23252c" strokeWidth="1" />

      {/* Active arc ring band — same color as hygrometer outer */}
      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill="#40434C"
        stroke="#383A42"
        strokeWidth="1"
        mask="url(#rpmArcMask)"
      />

      {/* Inner face */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="#3a3d46" />

      {/* Inner rim separator */}
      <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#282a31" strokeWidth="2" />

      {/* Tick marks */}
      {ticks}

      {/* Arc accent line at tick base */}
      <path
        d={describeArc(-120, 120, INNER_R - 1)}
        fill="none"
        stroke="#555869"
        strokeWidth="1"
      />

      {/* Labels */}
      {labels}

      {/* "rpm" label */}
      <text
        x={CX}
        y={CY + 52}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="30"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        letterSpacing="4"
        opacity="0.9"
      >
        rpm
      </text>

      {/* Display outer shell */}
      <rect
        x={CX - 72}
        y={CY + 110}
        width="144"
        height="44"
        rx="4"
        ry="4"
        fill="#0d0e12"
        stroke="#383A42"
        strokeWidth="1.5"
      />
      {/* Display inner screen */}
      <rect
        x={CX - 69}
        y={CY + 113}
        width="138"
        height="38"
        rx="3"
        ry="3"
        fill="#08090d"
      />
    </svg>
  )
}

// Memo: o mostrador (~70 elementos SVG) só depende de min/max/className — o
// ponteiro (RpmPointer) é que muda a cada leitura do sensor.
export default memo(RpmShape)
