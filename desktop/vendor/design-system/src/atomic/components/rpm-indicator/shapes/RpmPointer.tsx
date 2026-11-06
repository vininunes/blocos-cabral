import type { ComponentProps, JSX } from 'react'

export default function RpmPointer(props: ComponentProps<'svg'>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 580 580"
      {...props}
    >
      <g clipPath="url(#rpmPointerClip)">
        {/* Upper needle triangle: tip at y=105, base at y=282, width 10px */}
        <path
          fill="#C81E1E"
          d="M290 105 L295 282 L285 282 Z"
        />
        {/* Lower tail triangle: from y=282 to y=316, width 10px */}
        <path
          fill="#C81E1E"
          d="M290 316 L285 282 L295 282 Z"
        />
        {/* Teardrop at tail end */}
        <path
          fill="#C81E1E"
          d="M290 305 L293.5 314 A3.5 3.5 0 1 1 286.5 314 Z"
        />
        {/* Hub */}
        <circle cx="290" cy="290" r="13" fill="#1a1b1f" />
      </g>
      <defs>
        <clipPath id="rpmPointerClip">
          <path fill="#fff" d="M282 105h16v211h-16z" />
        </clipPath>
      </defs>
    </svg>
  )
}
