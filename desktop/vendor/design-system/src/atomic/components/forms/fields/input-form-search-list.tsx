import { ReactNode } from 'react'

import { useController, useFormContext } from 'react-hook-form'

import { cn } from '@/lib/tailwind/utils'

import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface InputFormSearchListItem<T> {
  id: string | number
  value: T
  data: T
}

export interface InputFormSearchListProps<T> {
  name: string
  label?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  className?: string
  emptyMessage?: string
  renderSearch: (onSelect: (item: InputFormSearchListItem<T>) => void) => ReactNode
  renderItem?: (item: InputFormSearchListItem<T>, onRemove: () => void) => ReactNode
  /**
   * Renderização alternativa da lista inteira (ex.: tabela). Quando fornecido,
   * substitui o layout padrão de cards e ignora `renderItem`. Recebe os itens e
   * um callback de remoção por item.
   */
  renderList?: (
    items: InputFormSearchListItem<T>[],
    onRemove: (item: InputFormSearchListItem<T>) => void
  ) => ReactNode
  items: InputFormSearchListItem<T>[]
  onItemAdd: (item: InputFormSearchListItem<T>) => void
  onItemRemove: (item: InputFormSearchListItem<T>) => void
}

export function InputFormSearchList<T>({
  name,
  label,
  required = false,
  layout = 'vertical',
  className,
  emptyMessage = 'No items added',
  renderSearch,
  renderItem,
  renderList,
  items,
  onItemAdd,
  onItemRemove,
}: InputFormSearchListProps<T>) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  function handleSelect(item: InputFormSearchListItem<T>) {
    const currentValues: (string | number)[] = field.value ?? []

    if (currentValues.includes(item.id)) {
      return
    }

    field.onChange([...currentValues, item.id])
    onItemAdd(item)
  }

  function handleRemove(item: InputFormSearchListItem<T>) {
    const currentValues: (string | number)[] = field.value ?? []
    field.onChange(currentValues.filter((v) => v !== item.id))
    onItemRemove(item)
  }

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormFieldContainer layout={layout}>
          <div className="w-full flex justify-between">
            {label && (
              <FormLabel>
                {label}
                {required && <RequiredAsterisk />}
              </FormLabel>
            )}
            {renderSearch(handleSelect)}
          </div>
          <div className={cn('flex flex-col rounded', className)}>
            {items.length > 0 &&
              (renderList ? (
                renderList(items, handleRemove)
              ) : (
                <div className="flex flex-row flex-wrap gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-row bg-secondary rounded-lg border items-center"
                    >
                      {renderItem?.(item, () => handleRemove(item))}
                    </div>
                  ))}
                </div>
              ))}

            {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}
          </div>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}
