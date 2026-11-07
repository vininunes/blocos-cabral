import { useState } from 'react'

import { fmtMoeda, fmtNum } from '@server/relatorio/utils'
import { Target } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/atomic/base-components/dialog'

import { ProvisaoMeses } from '@/atomic/features/banco-clientes/components/provisao-meses'

import {
  mesDoAno,
  mesesInvalidos,
  numeroOuNulo,
  type MesesDigitados,
} from '@/atomic/features/banco-clientes/helpers/provisao-meses'

import { useLancarProvisaoEmLoteMutation } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

/** Os mesmos valores mensais para os clientes selecionados; meses vazios não mexem em nada. */
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
  const [ano, setAno] = useState(() => new Date().getFullYear())
  const [valores, setValores] = useState<MesesDigitados>({})
  const lancar = useLancarProvisaoEmLoteMutation()

  const meses = Array.from({ length: 12 }, (_, i) => {
    const mes = mesDoAno(ano, i)
    return { mes, valor: numeroOuNulo(valores[mes] ?? '') }
  }).filter((l) => l.valor !== null)
  const valido = meses.length > 0 && mesesInvalidos(ano, valores).length === 0
  const total = meses.reduce((s, l) => s + (l.valor ?? 0), 0)

  const onLancar = () =>
    lancar.mutate(
      { clientes: clientes.map((c) => c.chave), meses },
      {
        onSuccess: ({ clientes: n }) => {
          toast.success(`Provisão lançada para ${fmtNum(n)} ${n === 1 ? 'cliente' : 'clientes'}.`)
          setValores({})
          onLancado()
        },
      }
    )

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-4" /> Lançar provisão para {fmtNum(clientes.length)}{' '}
            {clientes.length === 1 ? 'cliente' : 'clientes'}
          </DialogTitle>
          <DialogDescription>
            O total de cada mês preenchido vale para cada cliente selecionado, substituindo o que
            ele tinha nesse mês. Meses vazios não mudam a provisão dos clientes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="max-h-20 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {clientes.map((c) => c.nome).join(' · ')}
          </div>
          <ProvisaoMeses
            ano={ano}
            onAno={setAno}
            valores={valores}
            onValor={(m, v) => setValores((vs) => ({ ...vs, [m]: v }))}
            placeholder="não mexer"
          />
          {valido && clientes.length > 1 && (
            <p className="text-right text-xs text-muted-foreground">
              {fmtMoeda(total)} por cliente · {fmtMoeda(total * clientes.length)} no total.
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
