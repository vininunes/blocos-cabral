import { useCallback, useState, type ReactNode } from 'react'

import type { DiaIso } from '@server/relatorio/api-tipos'
import { Check } from 'lucide-react'

import { Box, BoxElementHandler } from '@/atomic/base-components/box'
import { Button } from '@/atomic/base-components/button'
import { DatePicker } from '@/atomic/base-components/date-picker'
import { Popover, PopoverAnchor, PopoverContent } from '@/atomic/base-components/popover'
import {
  SelectBase,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/atomic/base-components/select-base'

import { cn } from '@/lib/tailwind/utils'

import { dateParaDia, diaParaDate } from '../helpers/datas'

export const PERSONALIZADO = 'Personalizado'

/**
 * Select de page action com a opção "Personalizado" que abre uma bandeja (popover ancorado no
 * select) para escolher início e fim — como o intervalo personalizado do DateRangeSelect
 * do design system: reabrir o select cancela a bandeja, o rascunho parte do intervalo
 * vigente a cada abertura e só vale ao clicar em Aplicar (Cancelar mantém o que estava).
 */
export function SelectComIntervalo({
  valor,
  opcoes,
  onEscolher,
  intervalo,
  onIntervalo,
  titulo,
  className,
}: {
  valor: string
  opcoes: { value: string; name: string; icon?: ReactNode }[]
  /** Escolha de uma opção que não é "Personalizado". */
  onEscolher: (valor: string) => void
  /** Intervalo atual (ou o sugerido) para abrir a bandeja. */
  intervalo: { de: DiaIso | null; ate: DiaIso | null }
  onIntervalo: (de: DiaIso, ate: DiaIso) => void
  /** Título da bandeja (ex.: 'Período personalizado'). */
  titulo: string
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [de, setDe] = useState<DiaIso | null>(null)
  const [ate, setAte] = useState<DiaIso | null>(null)

  const abrir = useCallback(
    (v: boolean) => {
      if (v) {
        setDe(intervalo.de)
        setAte(intervalo.ate ?? intervalo.de)
      }
      setAberto(v)
    },
    [intervalo.de, intervalo.ate]
  )
  // Adia a abertura para depois do fechamento do Select (o Radix devolve o foco ao trigger e
  // isso fecharia a bandeja na hora), como no DateRangeSelect
  const abrirBandeja = useCallback(() => setTimeout(() => abrir(true), 0), [abrir])

  const valido = !!de && !!ate && de <= ate
  const aplicar = () => {
    if (!de || !ate) return
    onIntervalo(de, ate)
    setAberto(false)
  }

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <SelectBase
        value={valor}
        onValueChange={(v) => (v === PERSONALIZADO ? abrirBandeja() : onEscolher(v))}
        // reabrir o select com a bandeja aberta descarta (cancela) a bandeja
        onOpenChange={(v) => v && setAberto(false)}
      >
        <PopoverAnchor asChild>
          <SelectTrigger
            className={cn(
              'cursor-pointer px-2.5 data-[size=default]:h-full rounded-xl bg-white/5 border-transparent shadow-none dark:hover:bg-white/5',
              className
            )}
          >
            <SelectValue />
          </SelectTrigger>
        </PopoverAnchor>
        <SelectContent align="center">
          <SelectGroup>
            {opcoes.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                // já em "Personalizado": o Radix não dispara onValueChange, então reabre aqui
                onPointerUp={o.value === PERSONALIZADO ? abrirBandeja : undefined}
              >
                {o.icon}
                {o.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </SelectBase>
      <PopoverContent
        // largura com folga entre os rótulos (Início/Fim) e os campos de data
        className="w-80 p-2"
        align="center"
        side="bottom"
        sideOffset={8}
        // o foco que o Select devolve ao trigger ao fechar não deve fechar a bandeja
        onFocusOutside={(e) => e.preventDefault()}
      >
        <p className="pb-1 text-center text-xs text-muted-foreground">{titulo}</p>
        <Box
          elements={[
            {
              key: 'inicio',
              element: (
                <BoxElementHandler
                  title="Início"
                  handler={
                    <DatePicker
                      fixedWeeks
                      format="DD/MM/YYYY"
                      className="min-w-0 flex-1 justify-end"
                      buttonClassName="w-44"
                      value={diaParaDate(de)}
                      onChange={(d) => d && setDe(dateParaDia(d))}
                    />
                  }
                />
              ),
            },
            {
              key: 'fim',
              element: (
                <BoxElementHandler
                  title="Fim"
                  handler={
                    <DatePicker
                      fixedWeeks
                      format="DD/MM/YYYY"
                      className="min-w-0 flex-1 justify-end"
                      buttonClassName="w-44"
                      value={diaParaDate(ate)}
                      onChange={(d) => d && setAte(dateParaDia(d))}
                    />
                  }
                />
              ),
            },
          ]}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="w-24" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="w-24" onClick={aplicar} disabled={!valido}>
            <Check />
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
