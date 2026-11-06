import { useState } from 'react'

import { fmtMoeda, fmtNum } from '@server/relatorio/utils'
import { Target } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import { DatePicker } from '@/atomic/base-components/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/atomic/base-components/dialog'
import { InputText } from '@/atomic/base-components/input-text'

import { dateParaDia, diaParaDate } from '@/atomic/features/relatorio-filtros/helpers/datas'

import { useLancarProvisaoEmLoteMutation } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

/** '1.234,56' ou '1234.56' -> 1234.56 */
const numero = (s: string) => Number(s.includes(',') ? s.replaceAll('.', '').replace(',', '.') : s)

/** O mesmo lançamento (R$ por dia útil a partir de uma data) para os clientes selecionados. */
export function RelatorioProvisaoLoteDialog({
  clientes,
  aberto,
  onClose,
  onLancado,
}: {
  clientes: { chave: string; nome: string }[]
  aberto: boolean
  onClose: () => void
  onLancado: () => void
}) {
  const [inicio, setInicio] = useState<string | null>(dateParaDia(new Date()))
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const lancar = useLancarProvisaoEmLoteMutation()
  const v = numero(valor)
  const valido = !!inicio && valor !== '' && Number.isFinite(v) && v >= 0

  const onLancar = () =>
    lancar.mutate(
      {
        clientes: clientes.map((c) => c.chave),
        lancamento: { inicio: inicio!, valor_dia: v, observacao },
      },
      {
        onSuccess: ({ clientes: n }) => {
          toast.success(`Provisão lançada para ${fmtNum(n)} ${n === 1 ? 'cliente' : 'clientes'}.`)
          setValor('')
          setObservacao('')
          onLancado()
        },
      }
    )

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-4" /> Lançar provisão para {fmtNum(clientes.length)}{' '}
            {clientes.length === 1 ? 'cliente' : 'clientes'}
          </DialogTitle>
          <DialogDescription>
            O mesmo valor por dia útil para cada cliente selecionado, a partir da data escolhida. Os
            lançamentos anteriores continuam no histórico; um lançamento na mesma data é
            substituído.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="max-h-28 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {clientes.map((c) => c.nome).join(' · ')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={diaParaDate(inicio)}
              onChange={(d) => setInicio(dateParaDia(d))}
              format="DD/MM/YYYY"
              buttonClassName="h-8 w-36"
            />
            <InputText
              className="h-8 w-44"
              inputMode="decimal"
              placeholder="R$ por dia útil"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <InputText
              className="h-8 min-w-40 flex-1"
              placeholder="Observação"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
          {valido && (
            <p className="text-xs text-muted-foreground">
              {fmtMoeda(v)} por dia útil por cliente ≈ {fmtMoeda(v * 21)} por cliente num mês de 21
              dias úteis · {fmtMoeda(v * 21 * clientes.length)} no total.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valido || !clientes.length || lancar.isPending} onClick={onLancar}>
            {lancar.isPending ? 'Lançando…' : 'Lançar provisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
