import { useController, useFormContext } from 'react-hook-form'

import { InfoTooltip } from '@/atomic/base-components/info-tooltip'
import { InputNumber } from '@/atomic/base-components/input-number'
import { Slider } from '@/atomic/base-components/slider'

import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormSliderProps {
  name: string
  label?: string
  /** Explicação do campo, exibida em um ícone de ajuda ao lado do label. */
  tooltip?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
  /**
   * Valor mostrado enquanto o campo está `null`/vazio (ex.: um default que o backend
   * aplica). O slider apenas EXIBE esse valor — só arrastá-lo escreve no form, então um
   * campo não calibrado continua `null` até o usuário mexer.
   */
  fallbackValue?: number
  /**
   * Acrescenta um campo numérico ao lado do slider, ligado ao MESMO campo do form. O
   * slider serve o ajuste grosso (e o feedback visual); o input aceita o valor exato.
   */
  showInput?: boolean
  /** Passo do input numérico — normalmente mais fino que o do slider. */
  inputStep?: number
  /** Texto à direita (ex.: valor derivado). Ignorado quando `showInput` está ligado. */
  renderValue?: (value: number | null) => string
}

export function InputFormSlider({
  name,
  label,
  tooltip,
  required = false,
  layout = 'horizontal',
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
  fallbackValue = 0,
  showInput = false,
  inputStep,
  renderValue,
}: InputFormSliderProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  const value: number | null = typeof field.value === 'number' ? field.value : null
  const sliderValue = value ?? fallbackValue

  const handleInputChange = (next: number | string | undefined) => {
    if (next === '' || next == null) {
      field.onChange(null)
      return
    }
    const parsed = typeof next === 'string' ? parseFloat(next) : next
    field.onChange(Number.isFinite(parsed) ? parsed : null)
  }

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormFieldContainer layout={layout}>
          {label && (
            <FormLabel className="flex items-center gap-1.5">
              {label}
              {required && <RequiredAsterisk />}
              {tooltip && <InfoTooltip text={tooltip} />}
            </FormLabel>
          )}
          <FormControl>
            <div
              className={cn(
                'flex items-center gap-2',
                // Um slider precisa de mais trilha que um input de texto para ser
                // utilizável, então a linha é mais larga que o w-64 dos outros campos.
                layout === 'horizontal' && 'w-80'
              )}
            >
              {/* `flex-1 min-w-0` é obrigatório: o wrapper do Slider não cresce sozinho,
                  e sem isto a trilha colapsa para largura zero ao lado do input.
                  Esmaecido enquanto o campo está vazio: a trilha preenchida até o
                  `fallbackValue` senão se leria como um valor já calibrado. */}
              <Slider
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                value={[sliderValue]}
                onValueChange={([next]) => field.onChange(next)}
                className={cn('flex-1 min-w-0', value == null && 'opacity-50', className)}
              />
              {showInput ? (
                // O `className` do InputNumber cai no <input>, não no wrapper — o
                // shrink-0 do item flex tem de vir de fora.
                <div className="shrink-0">
                  <InputNumber
                    type="number"
                    min={min}
                    max={max}
                    step={inputStep ?? step}
                    disabled={disabled}
                    value={value ?? ''}
                    onValueChange={handleInputChange}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-20"
                  />
                </div>
              ) : (
                renderValue && (
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap shrink-0 min-w-12 text-right">
                    {renderValue(value)}
                  </span>
                )
              )}
            </div>
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}
