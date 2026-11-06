import { useEffect, useState } from 'react'

import type { LancamentoProvisao } from '@server/relatorio/api-tipos'
import { fmtMoeda } from '@server/relatorio/utils'
import { Plus, Target, Trash2 } from 'lucide-react'
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
import { Loading } from '@/atomic/base-components/loading'
import Tooltip from '@/atomic/base-components/tooltip'

import { dateParaDia, diaParaDate } from '@/atomic/features/relatorio-filtros/helpers/datas'

import {
  useProvisoesQuery,
  useSalvarProvisoesMutation,
} from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

type Linha = { inicio: string | null; valor: string; observacao: string }

const hoje = () => dateParaDia(new Date())!
/** '1.234,56' ou '1234.56' -> 1234.56 */
const numero = (s: string) => Number(s.includes(',') ? s.replaceAll('.', '').replace(',', '.') : s)

/**
 * Provisão do cliente: lançamentos de R$ por dia útil, cada um valendo a partir da sua data
 * até o próximo (valor 0 encerra). O relatório soma a taxa vigente em cada dia útil do período.
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
  const [linhas, setLinhas] = useState<Linha[]>([])

  useEffect(() => {
    if (data)
      setLinhas(
        data.map((p) => ({
          inicio: p.inicio,
          valor: String(p.valor_dia).replace('.', ','),
          observacao: p.observacao,
        }))
      )
  }, [data])

  const mudar = (i: number, campo: keyof Linha, v: string | null) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: v } : l)))
  const invalidas = linhas.filter(
    (l) => !l.inicio || !Number.isFinite(numero(l.valor)) || numero(l.valor) < 0
  )

  const onSalvar = () => {
    if (!cliente) return
    const lancamentos: LancamentoProvisao[] = linhas.map((l) => ({
      inicio: l.inicio!,
      valor_dia: numero(l.valor),
      observacao: l.observacao,
    }))
    salvar.mutate(
      { cliente, pedido: { lancamentos } },
      {
        onSuccess: () => {
          toast.success('Provisão salva.')
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
            Quanto se espera vender para o cliente, em R$ por dia útil (segunda a sexta, sem
            feriados nacionais). Cada lançamento vale a partir da sua data até o próximo; valor 0
            encerra a provisão.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <Loading text="" className="h-24" />
        ) : (
          <div className="space-y-2">
            {linhas.length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Sem provisão. Inclua um lançamento.
              </p>
            )}
            {linhas.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <DatePicker
                  value={diaParaDate(l.inicio)}
                  onChange={(d) => mudar(i, 'inicio', dateParaDia(d))}
                  format="DD/MM/YYYY"
                  buttonClassName="h-8 w-36"
                />
                <InputText
                  className="h-8 w-40"
                  inputMode="decimal"
                  placeholder="R$ por dia útil"
                  value={l.valor}
                  onChange={(e) => mudar(i, 'valor', e.target.value)}
                />
                <InputText
                  className="h-8 flex-1"
                  placeholder="Observação"
                  value={l.observacao}
                  onChange={(e) => mudar(i, 'observacao', e.target.value)}
                />
                <Tooltip text="Remover lançamento">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Tooltip>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLinhas((ls) => [...ls, { inicio: hoje(), valor: '', observacao: '' }])
              }
            >
              <Plus className="size-4" /> Incluir lançamento
            </Button>
            {linhas.some((l) => Number.isFinite(numero(l.valor)) && l.valor) && (
              <p className="text-xs text-muted-foreground">
                Ex.: {fmtMoeda(numero(linhas.at(-1)!.valor) || 0)} por dia útil ≈{' '}
                {fmtMoeda((numero(linhas.at(-1)!.valor) || 0) * 21)} num mês de 21 dias úteis.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={salvar.isPending || invalidas.length > 0} onClick={onSalvar}>
            {salvar.isPending ? 'Salvando…' : 'Salvar provisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
