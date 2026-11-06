import * as React from 'react'

import { Pipette } from 'lucide-react'
import { InputContext, useContextProps } from 'react-aria-components'

import { InputNumber } from '@/atomic/base-components/input-number'
import { InputText } from '@/atomic/base-components/input-text'

import { cn } from '@/lib/tailwind/utils'

import { Button } from './button'
import {
  ColorArea,
  ColorField,
  ColorPickerBase,
  ColorPickerStateContext,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPickerBase,
  ColorSwatchPickerItem,
  ColorThumb,
  parseColor,
  SliderTrack,
  type ColorSpace,
} from './color-base'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Select } from './select'

type NativeInputProps = React.ComponentProps<'input'>

function EyeDropperButton() {
  const state = React.useContext(ColorPickerStateContext)

  if (
    !state ||
    typeof window === 'undefined' ||
    typeof (window as any).EyeDropper === 'undefined'
  ) {
    return null
  }

  return (
    <Button
      aria-label="Eye dropper"
      size="icon"
      variant="outline"
      className={'h-7 w-7'}
      onClick={() => {
        // @ts-ignore
        new EyeDropper().open().then((result: { sRGBHex: string }) => {
          state.setColor(parseColor(result.sRGBHex))
        })
      }}
    >
      <Pipette />
    </Button>
  )
}

/** Input numérico do canal ALPHA (0–100%): o ColorField do react-aria formata
 * alpha como texto com "%", que não conversa com o InputNumber — este campo
 * fala direto com o estado do picker. */
function AlphaNumberInput() {
  const state = React.useContext(ColorPickerStateContext)
  if (!state) return null

  const alphaPct = Math.round(state.color.getChannelValue('alpha') * 100)
  const setAlpha = (num: number) => {
    if (!Number.isFinite(num)) return
    const clamped = Math.min(Math.max(num, 0), 100)
    state.setColor(state.color.withChannelValue('alpha', clamped / 100))
  }

  return (
    <InputNumber
      aria-label="alpha"
      value={alphaPct}
      min={0}
      max={100}
      step={1}
      className="w-10 px-1"
      onChange={(e) => setAlpha(Number(e.target.value))}
      onValueChange={(num) => num !== undefined && setAlpha(num)}
    />
  )
}

/** Input de HEX com alpha (#rrggbbaa): o ColorField padrão só exibe #rrggbb.
 * Draft local permite digitação parcial; blur re-sincroniza com a cor. */
function HexaTextInput() {
  const state = React.useContext(ColorPickerStateContext)
  const [draft, setDraft] = React.useState<string | null>(null)
  if (!state) return null

  return (
    <InputText
      aria-label="hex"
      className="w-full"
      value={draft ?? state.color.toString('hexa')}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        try {
          state.setColor(parseColor(next))
        } catch {
          // hex incompleto durante a digitação: mantém só o draft
        }
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

export const AriaNumberInput = React.forwardRef<
  HTMLInputElement,
  NativeInputProps & {
    showIncrementDecrement?: boolean
    icon?: React.ReactNode
  }
>((props, ref) => {
  // Consome os props do slot "input" do ColorField através do contexto do RAC
  const [mergedProps, inputRef] = useContextProps(props, ref, InputContext)

  const { onChange, value, defaultValue, className, ...rest } = mergedProps

  // Quando o usuário clica +/− no InputNumber, avisamos o "dono" via onChange sintético.
  const handleValueChange = React.useCallback(
    (num: number | undefined) => {
      if (!onChange || num === undefined) return
      const target = { value: String(num) } as unknown as EventTarget & HTMLInputElement
      const synthetic = {
        target,
      } as unknown as React.ChangeEvent<HTMLInputElement>
      onChange(synthetic)
    },
    [onChange]
  )

  return (
    <InputNumber
      {...rest}
      ref={inputRef}
      // Mantém compatível com controlado/não-controlado e também com controlado pelo ColorField
      value={value}
      defaultValue={defaultValue}
      // Repassa o onChange nativo (digitação manual)
      onChange={onChange}
      // Garante que +/− também notifiquem o pai
      onValueChange={handleValueChange}
      // valores padrão comuns para canal de cor; pode sobrescrever via props
      step={rest.step ?? 1}
      min={rest.min ?? 0}
      max={rest.max ?? 255}
      className={cn('w-14', className)}
    />
  )
})

AriaNumberInput.displayName = 'AriaNumberInput'

export const AriaTextInput = React.forwardRef<
  HTMLInputElement,
  NativeInputProps & { icon?: React.ReactNode }
>((props, ref) => {
  // Merge props from ColorField's input slot via RAC context
  const [mergedProps, inputRef] = useContextProps(props, ref, InputContext)
  const { value, defaultValue, onChange, ...rest } = mergedProps

  return (
    <InputText
      {...rest}
      ref={inputRef}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      className={'text-center'}
    />
  )
})

AriaTextInput.displayName = 'AriaTextInput'

const COLOR_SPACES = [[{ value: 'rgb', name: 'RGB' }], [{ value: 'hex', name: 'HEX' }]]

export function ColorPicker({
  text,
  colorSwatchValue = [],
  onChange,
  value,
  eyeDropper = false,
  disabled = false,
  className,
  withAlpha = false,
  open,
  onOpenChange,
}: {
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
}) {
  const [space, setSpace] = React.useState<ColorSpace | 'hex'>('rgb')
  const [internalColor, setInternalColor] = React.useState(parseColor(value ?? `#fff`))

  React.useEffect(() => {
    if (!value) return
    // Round-trip controlado: o `value` que volta do pai é o hex que acabamos de
    // emitir. Sem comparar, cada pointermove do drag fazia parseColor + um
    // segundo render.
    setInternalColor((current) =>
      current.toString(withAlpha ? 'hexa' : 'hex').toLowerCase() === value.toLowerCase()
        ? current
        : parseColor(value)
    )
  }, [value, withAlpha])

  const colorSpaces = COLOR_SPACES

  const handleChange = (colorObj: any) => {
    // Emite #RRGGBBAA quando withAlpha, preservando a opacidade do slider de alpha.
    const hex = colorObj.toString(withAlpha ? 'hexa' : 'hex')
    if (onChange) {
      onChange(hex)
    }
    setInternalColor(colorObj)
  }

  return (
    <ColorPickerBase value={internalColor} onChange={handleChange}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button variant="ghost" className={cn(className)}>
            <ColorSwatch className="size-4 rounded-md border-2" />
            {text ?? 'Pick color'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-3 outline-none">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <ColorArea
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
                className="h-[164px]"
              >
                <ColorThumb className="z-50" />
              </ColorArea>
              <ColorSlider colorSpace="hsb" channel="hue">
                <SliderTrack>
                  <ColorThumb className="top-1/2" />
                </SliderTrack>
              </ColorSlider>
              <ColorSlider channel="alpha">
                <SliderTrack>
                  <ColorThumb className="top-1/2" />
                </SliderTrack>
              </ColorSlider>
            </div>

            <div className={'flex gap-2'}>
              {eyeDropper && <EyeDropperButton />}

              <Select
                items={colorSpaces}
                placeholder="Select color space"
                value={space}
                onValueChange={(val) => setSpace(val as ColorSpace | 'hex')}
                className="w-full"
              />
            </div>

            <div className="w-[192px] flex gap-2 justify-between">
              {space === 'rgb' ? (
                <>
                  {/* modo RGB: inputs estreitos p/ os 4 canais caberem nos 192px */}
                  <ColorField colorSpace="rgb" channel="red" className="min-w-0 flex-1">
                    <AriaNumberInput aria-label="red" className="w-10 px-1" />
                  </ColorField>
                  <ColorField colorSpace="rgb" channel="green" className="min-w-0 flex-1">
                    <AriaNumberInput aria-label="green" className="w-10 px-1" />
                  </ColorField>
                  <ColorField colorSpace="rgb" channel="blue" className="min-w-0 flex-1">
                    <AriaNumberInput aria-label="blue" className="w-10 px-1" />
                  </ColorField>
                  {withAlpha && (
                    <div className="min-w-0 flex-1">
                      <AlphaNumberInput />
                    </div>
                  )}
                </>
              ) : withAlpha ? (
                <HexaTextInput />
              ) : (
                <ColorField className={'w-full'}>
                  <AriaTextInput aria-label="hex" />
                </ColorField>
              )}
            </div>

            {colorSwatchValue !== undefined && colorSwatchValue.length > 0 && (
              <ColorSwatchPickerBase className="w-[192px] flex justify-between gap-2">
                {colorSwatchValue.map((c) => (
                  <ColorSwatchPickerItem key={c} color={c}>
                    <ColorSwatch />
                  </ColorSwatchPickerItem>
                ))}
              </ColorSwatchPickerBase>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </ColorPickerBase>
  )
}

interface ColorSwatchPickerProps {
  colors: string[]
  value?: string
  onChange?: (color: string) => void
  className?: string
}

export function ColorSwatchPicker({ colors, value, onChange, className }: ColorSwatchPickerProps) {
  const [internalColor, setInternalColor] = React.useState(parseColor(value ?? colors[0]))

  const handleChange = (colorObj: any) => {
    const hex = colorObj.toString('hex')
    if (onChange) {
      onChange(hex)
    }
    setInternalColor(colorObj)
  }

  return (
    <ColorSwatchPickerBase value={internalColor} onChange={handleChange} className={className}>
      {colors.map((color) => (
        <ColorSwatchPickerItem key={color} color={color}>
          <ColorSwatch />
        </ColorSwatchPickerItem>
      ))}
    </ColorSwatchPickerBase>
  )
}
