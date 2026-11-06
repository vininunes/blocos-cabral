import * as React from 'react'

import { CheckIcon, ChevronDownIcon, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useController, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { InputText } from '@/atomic/base-components/input-text'
import { ScrollArea } from '@/atomic/base-components/scroll-area'

import { matchesNormalized, normalizeSearchText } from '@/lib/search/normalize-text'
import { cn } from '@/lib/tailwind/utils'

import { FormControl } from '../components/form-control'
import { FormFieldContainer } from '../components/form-field-container'
import { FormItem } from '../components/form-item'
import { FormLabel } from '../components/form-label'
import { FormMessage } from '../components/form-message'
import { RequiredAsterisk } from '../components/required-asterisk'
import { FormFieldContext } from '../context'

export interface SelectSearchOption {
  value: number
  label: string
}

export interface InputFormSelectSearchProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  layout?: 'horizontal' | 'vertical'
  options: SelectSearchOption[]
  onSearch?: (query: string) => void
  minSearchLength?: number
  disabled?: boolean
  clearable?: boolean
  className?: string
  triggerClassName?: string
}

export function InputFormSelectSearch({
  name,
  label,
  placeholder,
  required = false,
  layout = 'horizontal',
  options,
  onSearch,
  minSearchLength,
  disabled = false,
  clearable = false,
  className,
  triggerClassName,
}: InputFormSelectSearchProps) {
  const { t } = useTranslation()
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})

  const selected = options.find((o) => o.value === field.value)

  const belowMinLength = !!minSearchLength && search.length < minSearchLength

  const filtered = React.useMemo(() => {
    if (onSearch) return options
    const term = normalizeSearchText(search.trim())
    if (!term) return options
    return options.filter((o) => matchesNormalized(o.label, term))
  }, [options, search, onSearch])

  function handleOpen() {
    if (disabled) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 240),
        zIndex: 9999,
      })
    }
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(option: SelectSearchOption) {
    field.onChange(option.value)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    field.onChange(null)
  }

  function handleSearch(value: string) {
    setSearch(value)
    onSearch?.(value)
  }

  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-lg bg-background outline outline-offset-2 outline-foreground/20 shadow backdrop-blur-xl p-2 pointer-events-auto"
        >
          <div className="mb-2">
            <InputText
              ref={inputRef}
              className="w-full"
              icon={<Search className="size-3.5" />}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('select-search-placeholder')}
            />
          </div>
          <ScrollArea style={{ maxHeight: '240px' }}>
            <div className="flex flex-col gap-1">
              {belowMinLength ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {t('select-search-min-chars', { count: minSearchLength })}
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {t('select-search-no-results')}
                </p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'w-full rounded-md flex justify-between items-center px-2 py-1.5 text-xs border transition-all hover:bg-accent outline-none',
                      field.value === option.value &&
                        'bg-primary hover:bg-primary text-primary-foreground'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {field.value === option.value && (
                      <CheckIcon className="size-3.5 shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>,
        document.body
      )
    : null

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        <FormFieldContainer layout={layout}>
          {label && (
            <FormLabel>
              {label}
              {required && <RequiredAsterisk />}
            </FormLabel>
          )}
          <FormControl>
            {/* Largura padrão dos controles em linha — sobrescrevível com um w-*. */}
            <div className={cn('h-7', layout === 'horizontal' && 'w-64', className)}>
              <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                onClick={handleOpen}
                className={cn(
                  "border-input bg-input/30 [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border px-1.5 py-1 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-7",
                  triggerClassName
                )}
              >
                {selected ? (
                  <span className="flex flex-1 items-center gap-1.5 text-left min-w-0 truncate">
                    {selected.label}
                  </span>
                ) : (
                  <span className="flex flex-1 items-center gap-1.5 text-left min-w-0 truncate text-muted-foreground">
                    {placeholder ?? t('select')}
                  </span>
                )}
                <span className="flex items-center gap-1 shrink-0">
                  {clearable && selected && (
                    <span
                      role="button"
                      aria-label={t('select-clear')}
                      onClick={handleClear}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                  <ChevronDownIcon
                    className={cn('size-4 opacity-50 transition-transform', open && 'rotate-180')}
                  />
                </span>
              </button>
            </div>
          </FormControl>
        </FormFieldContainer>
        <FormMessage />
      </FormItem>
      {dropdown}
    </FormFieldContext.Provider>
  )
}
