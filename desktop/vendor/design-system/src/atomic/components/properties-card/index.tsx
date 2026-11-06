import { useEffect, useState } from 'react'
import { Pencil} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/atomic/base-components/button'
import { Card } from '@/atomic/base-components/card'
import { DatePicker } from '@/atomic/base-components/date-picker'
import { InputBase } from '@/atomic/base-components/input-base'
import { Textarea } from '@/atomic/base-components/text-area'
import { ValueIndicator } from '@/atomic/components/value-indicator'
import { parseDateFromString } from '@/utils/parse'
import { formatDateToString } from '@/utils/time'

export type PropertyFieldType = 'text' | 'number' | 'datetime' | 'textarea'

export interface PropertyField {
  field_name: string
  field_type: PropertyFieldType
  label_key: string
  unit?: string
}

export interface PropertyGroup {
  group: string
  label_key: string
  fields: PropertyField[]
}

export interface PropertyValue {
  field_name: string
  value: string
}

interface PropertiesCardProps {
  groups: PropertyGroup[]
  groupName: string
  properties?: PropertyValue[]
  onSave: (changed: PropertyValue[]) => Promise<void>
  isSaving: boolean
  saveLabel: string
  savingLabel: string
  cancelLabel: string
  /** Desabilita o botão de edição (ex.: usuário sem escopo `.write` da feature). */
  readOnly?: boolean
}

function getFieldPosition(index: number, total: number): 'top' | 'middle' | 'bottom' {
  if (total === 1 || index === 0) return 'top'
  if (index === total - 1) return 'bottom'
  return 'middle'
}

export function PropertiesCard({
  groups,
  groupName,
  properties,
  onSave,
  isSaving,
  saveLabel,
  savingLabel,
  cancelLabel,
  readOnly = false,
}: PropertiesCardProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const group = groups.find((g) => g.group === groupName)

  const groupProperties = properties?.filter((prop) =>
    group?.fields.some((field) => field.field_name === prop.field_name)
  )

  useEffect(() => {
    if (!group) return
    const filtered = properties?.filter((prop) =>
      group.fields.some((field) => field.field_name === prop.field_name)
    )
    const propertiesMap = new Map(filtered?.map((p) => [p.field_name, p.value]))
    const initialValues = group.fields.reduce(
      (acc, field) => {
        acc[field.field_name] = propertiesMap.get(field.field_name) || ''
        return acc
      },
      {} as Record<string, string>
    )
    setFormValues(initialValues)
  }, [group, properties])

  if (!group) return null

  async function handleSave() {
    const propertiesMap = new Map(groupProperties?.map((p) => [p.field_name, p.value]))
    const changedProperties = group!.fields
      .filter((field) => {
        const originalValue = propertiesMap.get(field.field_name) || ''
        return formValues[field.field_name] !== originalValue
      })
      .map((field) => ({ field_name: field.field_name, value: formValues[field.field_name] }))

    if (changedProperties.length === 0) {
      setIsEditing(false)
      return
    }

    try {
      await onSave(changedProperties)
      setIsEditing(false)
    } catch {
      // error handled by the caller, keep editing open
    }
  }

  function handleCancel() {
    const propertiesMap = new Map(groupProperties?.map((p) => [p.field_name, p.value]))
    const resetValues = group!.fields.reduce(
      (acc, field) => {
        acc[field.field_name] = propertiesMap.get(field.field_name) || ''
        return acc
      },
      {} as Record<string, string>
    )
    setFormValues(resetValues)
    setIsEditing(false)
  }

  function handleInputChange(fieldName: string, value: string) {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  function handleDateChange(fieldName: string, date: Date | undefined) {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: date ? formatDateToString(date) : '',
    }))
  }

  return (
    <Card className="h-full">
      <div className="p-2 flex flex-col gap-0 h-full">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">{t(group.label_key)}</h3>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={readOnly}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {cancelLabel}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-6 px-2 text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? savingLabel : saveLabel}
              </Button>
            </div>
          )}
        </div>

        {group.fields.map((field, index) => {
          const label = t(field.label_key)
          const value = formValues[field.field_name] || '-'
          const position = getFieldPosition(index, group!.fields.length)

          if (isEditing) {
            const isTextarea = field.field_type === 'textarea'
            return (
              <div
                key={field.field_name}
                className={`flex flex-col gap-1 px-2 py-1 bg-muted/30 rounded-sm ${isTextarea ? 'flex-1 min-h-0' : ''}`}
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className={`flex items-center gap-1.5 ${isTextarea ? 'flex-1 min-h-0' : ''}`}>
                  {field.field_type === 'datetime' ? (
                    <DatePicker
                      value={parseDateFromString(formValues[field.field_name])}
                      onChange={(date) => handleDateChange(field.field_name, date)}
                      showTime={true}
                      className="w-auto flex-1"
                    />
                  ) : field.field_type === 'textarea' ? (
                    <Textarea
                      value={formValues[field.field_name]}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleInputChange(field.field_name, e.target.value)
                      }
                      className="text-xs flex-1 h-full resize-none"
                    />
                  ) : (
                    <InputBase
                      type="text"
                      inputMode={field.field_type === 'number' ? 'decimal' : 'text'}
                      value={formValues[field.field_name]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(field.field_name, e.target.value)
                      }
                      className="h-7 text-xs flex-1"
                    />
                  )}
                  {field.unit && (
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                      {field.unit}
                    </span>
                  )}
                </div>
              </div>
            )
          }

          if (field.field_type === 'textarea') {
            return (
              <div
                key={field.field_name}
                className="flex flex-col gap-1 px-2 py-2 border rounded-lg bg-background/50 flex-1 min-h-0"
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <p className="text-sm whitespace-pre-wrap break-words flex-1 min-h-0 overflow-y-auto">
                  {value === '-' ? '-' : value}
                </p>
              </div>
            )
          }

          return (
            <ValueIndicator
              key={field.field_name}
              label={label}
              value={value}
              unit={field.unit}
              {...{ [position]: true }}
            />
          )
        })}
      </div>
    </Card>
  )
}
