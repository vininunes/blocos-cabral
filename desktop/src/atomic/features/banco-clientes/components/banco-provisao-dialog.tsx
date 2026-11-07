import { useEffect, useState } from 'react'

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
import { Loading } from '@/atomic/base-components/loading'

import {
  mesDoAno,
  mesesInvalidos,
  numeroOuNulo,
  type MesesDigitados,
} from '@/atomic/features/banco-clientes/helpers/provisao-meses'

import {
  useProvisoesQuery,
  useSalvarProvisoesMutation,
} from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { ProvisaoMeses } from './provisao-meses'

const anoAtual = () => new Date().getFullYear()

/**
 * Provisão do cliente: total previsto (R$) para cada mês do ano. O relatório divide o total do
 * mês igualmente pelos dias úteis dele.
 */
export function BancoProvisaoDialog({
  cliente,
  nome,
  onClose,
}: {
  cliente: string | null
  nome: string
  onClose: () => void
}) {
  const { data, isPending } = useProvisoesQuery(cliente)
  const salvar = useSalvarProvisoesMutation()
  const [ano, setAno] = useState(anoAtual)
  const [valores, setValores] = useState<MesesDigitados>({})

  useEffect(() => {
    if (cliente !== null) setAno(anoAtual())
  }, [cliente])

  useEffect(() => {
    if (data)
      setValores(Object.fromEntries(data.map((p) => [p.mes, String(p.valor).replace('.', ',')])))
  }, [data])

  const invalidos = mesesInvalidos(ano, valores)

  const onSalvar = () => {
    if (!cliente) return
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = mesDoAno(ano, i)
      return { mes, valor: numeroOuNulo(valores[mes] ?? '') }
    })
    salvar.mutate(
      { cliente, pedido: { ano, meses } },
      {
        onSuccess: () => {
          toast.success(`Provisão de ${ano} salva.`)
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open={cliente !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-4" /> Provisão — {nome}
          </DialogTitle>
          <DialogDescription>
            Quanto se espera faturar para o cliente em cada mês (total do mês, em R$). No relatório,
            o total é dividido igualmente pelos dias úteis do mês (segunda a sexta, sem feriados
            nacionais). Mês vazio = sem provisão.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <Loading text="" className="h-24" />
        ) : (
          <ProvisaoMeses
            ano={ano}
            onAno={setAno}
            valores={valores}
            onValor={(m, v) => setValores((vs) => ({ ...vs, [m]: v }))}
          />
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={salvar.isPending || invalidos.length > 0} onClick={onSalvar}>
            {salvar.isPending ? 'Salvando…' : `Salvar provisão de ${ano}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
