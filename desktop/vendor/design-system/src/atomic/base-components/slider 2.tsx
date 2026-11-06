import * as React from 'react'

import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/tailwind/utils'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  label,
  bufferSegments,
  availabilitySegments,
  stepMarkers = false,
  markers,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels?: (string | number)[]
  label?: string
  bufferSegments?: Array<{ start: number; end: number }>
  /**
   * Trechos em que a fonte vigente REALMENTE tem dado (ex.: janelas gravadas de
   * uma câmera). Desenhados como listra na metade inferior do track, para
   * conviver com `bufferSegments` sem virar uma sobreposição ilegível.
   */
  availabilitySegments?: Array<{ start: number; end: number }>
  /** Pontos no track marcando cada parada do `step` (sliders discretos). */
  stepMarkers?: boolean
  /**
   * Linhas verticais sobre o track em posições de 0–100 % (ex.: "agora" no
   * player). Ficam fora do track (que tem overflow-hidden e 1.5 de altura) para
   * poderem ser mais altas que ele.
   */
  markers?: Array<{ position: number; className?: string; title?: string }>
}) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max]
  )

  const stepMarkerPositions = React.useMemo(() => {
    const step = props.step
    if (!stepMarkers || !step || max <= min) return []
    const positions: number[] = []
    for (let v = min; v <= max; v += step) {
      positions.push(((v - min) / (max - min)) * 100)
    }
    return positions
  }, [stepMarkers, props.step, min, max])

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-[10px] font-medium text-primary-foreground bg-primary rounded px-1.5 py-0.5 leading-none whitespace-nowrap shrink-0">
          {label}
        </span>
      )}
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        className={cn(
          'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            'bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5'
          )}
        >
          {bufferSegments?.map((seg, i) => (
            <div
              key={i}
              className="absolute top-0 h-full rounded-full bg-muted-foreground/25"
              style={{ left: `${seg.start}%`, width: `${seg.end - seg.start}%` }}
            />
          ))}
          {availabilitySegments?.map((seg, i) => (
            <div
              key={`availability-${i}`}
              className="absolute bottom-0 h-1/2 rounded-full bg-emerald-500/70"
              style={{ left: `${seg.start}%`, width: `${seg.end - seg.start}%` }}
            />
          ))}
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              'bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
            )}
          />
          {stepMarkerPositions.map((pct) => (
            <div
              key={pct}
              className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral/50"
              style={{ left: `${pct}%` }}
            />
          ))}
        </SliderPrimitive.Track>
        {markers?.map((marker, i) => (
          <div
            key={`marker-${i}`}
            title={marker.title}
            className={cn(
              'pointer-events-none absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
              marker.className
            )}
            style={{ left: `${marker.position}%` }}
          />
        ))}
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className={cn(
              // Branco sólido em todos os temas (não `bg-neutral`, que muda por
              // tema): o handler é o ponto de pegada e não pode se camuflar no
              // trilho. O shadow-sm segura o contraste em fundo claro.
              'shrink-0 bg-white ring-ring/50 shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
              thumbLabels
                ? 'relative flex items-center justify-center h-5 min-w-7 px-1 rounded-full'
                : 'block size-4 rounded-full'
            )}
          >
            {thumbLabels?.[index] !== undefined && (
              <span className="text-[10px] font-bold leading-none text-primary">
                {thumbLabels[index]}
              </span>
            )}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>
    </div>
  )
}

export { Slider }
