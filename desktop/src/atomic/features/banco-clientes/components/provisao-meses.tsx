import { diasUteisDoMes } from '@server/relatorio/dias-uteis'
import { fmtMoeda, MESES } from '@server/relatorio/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { InputText } from '@/atomic/base-components/input-text'

import {
  mesDoAno,
  mesesInvalidos,
  numeroOuNulo,
  type MesesDigitados,
} from '../helpers/provisao-meses'

/** Grade de 12 meses (Jan–Dez) com seletor de ano: total previsto (R$) por mês. */
export function ProvisaoMeses({
  ano,
  onAno,
  valores,
  onValor,
  placeholder = 'R$ no mês',
}: {
  ano: number
  onAno: (ano: number) => void
  valores: MesesDigitados
  onValor: (mes: string, valor: string) => void
  placeholder?: string
}) {
  const invalidos = new Set(mesesInvalidos(ano, valores))
  const total = Array.from({ length: 12 }, (_, i) => numeroOuNulo(valores[mesDoAno(ano, i)] ?? ''))
    .filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0)
    .reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ano anterior"
          onClick={() => onAno(ano - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums">{ano}</span>
        <Button variant="ghost" size="icon" aria-label="Próximo ano" onClick={() => onAno(ano + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {MESES.map((nome, i) => {
          const m = mesDoAno(ano, i)
          return (
            <label key={m} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{nome}</span>
                <span className="text-[11px] text-muted-foreground">
                  {diasUteisDoMes(m)} dias úteis
                </span>
              </div>
              <InputText
                className={
                  invalidos.has(m) ? 'h-8 border-destructive tabular-nums' : 'h-8 tabular-nums'
                }
                inputMode="decimal"
                placeholder={placeholder}
                value={valores[m] ?? ''}
                onChange={(e) => onValor(m, e.target.value)}
              />
            </label>
          )
        })}
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Total de {ano}:{' '}
        <span className="font-semibold text-foreground tabular-nums">{fmtMoeda(total)}</span>
      </p>
    </div>
  )
}
