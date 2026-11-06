import { ReactNode, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { t } from 'i18next'
import { PanelLeft, Search } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { FloatCard } from '@/atomic/base-components/float-card'
import { InputText } from '@/atomic/base-components/input-text'
import { ScrollArea } from '@/atomic/base-components/scroll-area'

import { useDebounce } from '@/hooks/use-debounce'

import { cn } from '@/lib/tailwind/utils'

interface SidebarElement {
  id: string
  title: string
  icon?: ReactNode
  disabled?: boolean
  /** Rótulo de grupo não-clicável (cabeçalho de seção). Ignora seleção/ícone. */
  header?: boolean
  subElements?: Omit<SidebarElement, 'subElements'>[]
}

function Sidebar({
  opened = true,
  close,
  elements,
  onSelect,
  onSearch,
  selected,
  className,
  searchDisabled = false,
}: {
  opened?: boolean
  close?: () => void
  elements: SidebarElement[]
  onSelect: (id: string) => void
  onSearch?: (value: string) => void
  selected: string
  className?: string
  searchDisabled?: boolean
}) {
  const [scrolled, setScrolled] = useState(false)

  const [searchText, setSearchText] = useState('')

  const {
    debounced: onSearchDebounced,
    cancel,
    flush,
  } = useDebounce(
    (value: string) => {
      onSearch?.(value)
    },
    300,
    {
      trailing: true,
      leading: false,
    }
  )

  return (
    <AnimatePresence>
      {opened && (
        <motion.div
          // Só opacidade: a largura já é animada pelo wrapper do SidebarPages e
          // o min-w-52 anulava a animação de width (layout por frame sem efeito).
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn('flex flex-col min-w-52 h-full border-r', className)}
        >
          <div
            className={cn(
              // min-h-11 (36px de conteúdo + pb-2): busca/botão centralizados
              // na mesma faixa dos float cards (h-9) do header do Pages;
              // sem colapso (close ausente, ex.: janela de settings) a faixa
              // tem altura fixa de 45px
              'flex items-center gap-2 pt-0 pb-2 pl-2 pr-2 border-b border-transparent',
              close ? 'min-h-11' : 'h-[45px]',
              scrolled && 'border-muted shadow'
            )}
          >
            {onSearch &&
              (() => {
                // Sem colapso (close ausente) a busca é um input comum — sem
                // float card e sem a variante float
                const searchInput = (
                  <InputText
                    icon={<Search />}
                    placeholder={t('search')}
                    variant={close ? 'float' : undefined}
                    className={close ? 'w-full' : 'flex-1'}
                    disabled={searchDisabled}
                    onChange={(event) => {
                      onSearchDebounced(event.target.value)
                      setSearchText(event.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') flush()
                      if (e.key === 'Escape') {
                        cancel()
                        e.currentTarget.value = ''
                        onSearch?.('')
                        setSearchText('')
                      }
                    }}
                  />
                )
                return close ? (
                  <FloatCard className="flex h-9 flex-1 items-center">{searchInput}</FloatCard>
                ) : (
                  searchInput
                )
              })()}
            {close && (
              <FloatCard className="flex h-9 items-center p-1">
                <Button size={'icon'} variant={'ghost'} className="size-7" onClick={close}>
                  <PanelLeft />
                </Button>
              </FloatCard>
            )}
          </div>
          {elements.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center pr-2">
              <Search className="opacity-45" />
              <p className="text-sm">No results</p>
              {searchText !== '' && (
                <p className="text-xs text-center max-w-full truncate">{`No results for "${searchText}"`}</p>
              )}
            </div>
          )}

          {elements.length !== 0 && (
            <ScrollArea
              className="w-full flex-1 min-h-0 pr-2 pl-2"
              onScroll={(event) => {
                setScrolled(event.currentTarget.scrollTop > 0)
              }}
            >
              <div className="w-full min-h-full flex flex-col gap-1 pb-2">
                {elements.map((element) => {
                  if (element.header) {
                    return (
                      <p
                        key={element.id}
                        className="px-2 py-1 text-xs font-medium text-muted-foreground select-none"
                      >
                        {t(element.title)}
                      </p>
                    )
                  }

                  return (
                    <SidebarElement
                      key={element.id}
                      id={element.id}
                      icon={element.icon}
                      title={element.title}
                      subElements={element.subElements}
                      selected={selected === element.id}
                      disabled={element.disabled}
                      onSelect={onSelect}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SidebarElement({
  id,
  icon,
  title,
  selected = false,
  disabled = false,
  subElements,
  onSelect,
}: {
  id: string
  icon: ReactNode
  title: string
  subElements?: SidebarElement['subElements']
  selected?: boolean
  disabled?: boolean
  onSelect: (id: string, subId?: string) => void
}) {
  return (
    <>
      <Button
        className={cn(
          'h-9 rounded-lg gap-0 flex justify-start items-center p-0 border-b-0 focus-visible:ring-0 focus-visible:bg-primary transition-all',
          selected &&
            'bg-primary hover:bg-primary shadow-sm transition-shadow text-primary-foreground hover:text-primary-foreground',
          disabled && !selected && 'opacity-40 pointer-events-none'
        )}
        variant={'ghost'}
        disabled={disabled && !selected}
        onClick={() => onSelect(id)}
      >
        <div
          className={cn(
            'flex items-center justify-center p-2 w-9 h-9 rounded-lg',
            selected && '[&_svg]:text-primary-foreground'
          )}
        >
          {icon}
        </div>
        <div className="pr-2">
          <p className="text-sm truncate">{t(title)}</p>
        </div>
      </Button>
      {!!subElements?.length && (
        <div className="flex flex-col">
          {subElements.map((subElement) => (
            <Button
              variant={'ghost'}
              key={subElement.id}
              className="flex justify-between align-top truncate mx-1"
              onClick={() => onSelect(subElement.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-bl-md border-l-2 border-b-2" />
                <p className="text-xs truncate">{t(subElement.title)}</p>
              </div>

              {subElement.icon}
            </Button>
          ))}
        </div>
      )}
    </>
  )
}

export { Sidebar, SidebarElement }
