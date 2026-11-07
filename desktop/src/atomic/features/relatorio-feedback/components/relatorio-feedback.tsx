import { useMemo, useState } from 'react'

import type {
  EdicaoFeedback,
  PropostaFeedback,
  RespostaRelatorio,
} from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, norm } from '@server/relatorio/utils'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import { DatePicker } from '@/atomic/base-components/date-picker'
import { InputText } from '@/atomic/base-components/input-text'
import { Select } from '@/atomic/base-components/select'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'

import { dateParaDia, diaParaDate } from '@/atomic/features/relatorio-filtros/helpers/datas'

import { useEstadoBaseQuery } from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'

import { cn } from '@/lib/tailwind/utils'

import { useSalvarFeedbackMutation } from '../hooks/queries/use-relatorio-feedback-queries'

const NENHUM = '__nenhum'
type Campo = keyof EdicaoFeedback

/**
 * Aba Feedback: motivo do cancelamento e acompanhamento pós-venda; também corrige datas
 * e o pedido ligado. Só as linhas alteradas são enviadas; ao salvar, a base refaz as ligações.
 */
export function RelatorioFeedback({ rel }: { rel: RespostaRelatorio }) {
  const motivos = useEstadoBaseQuery().data?.motivos ?? []
  const [edicoes, setEdicoes] = useState<Record<string, EdicaoFeedback>>({})
  const salvar = useSalvarFeedbackMutation()
  const valor = <C extends Campo>(p: PropostaFeedback, c: C) =>
    (edicoes[p.proposta] && c in edicoes[p.proposta]
      ? edicoes[p.proposta][c]
      : p[c]) as PropostaFeedback[C]
  const editar = (p: PropostaFeedback, c: Campo, v: string | null) =>
    setEdicoes((e) => ({ ...e, [p.proposta]: { ...e[p.proposta], [c]: v } }))
  const alteradas = Object.keys(edicoes).length
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => {
    const termo = norm(busca)
    if (!termo) return rel.feedback
    return rel.feedback.filter((p) =>
      [p.proposta, p.cliente, p.vendedor, p.status, p.pedido, p.nf, p.motivo, p.comentario].some(
        (v) => norm(v ?? '').includes(termo)
      )
    )
  }, [rel.feedback, busca])

  const onSalvar = () =>
    salvar.mutate(
      { edicoes },
      {
        onSuccess: () => {
          toast.success('Feedback salvo.')
          setEdicoes({})
        },
      }
    )

  const th =
    'sticky top-0 z-10 bg-background border-b px-2 py-2 text-left text-xs font-medium whitespace-nowrap'
  const td = 'border-b px-2 py-1 text-xs align-middle'
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-xs text-muted-foreground">
          Motivo do cancelamento e acompanhamento pós-venda. Também é possível corrigir datas e o
          pedido ligado. Mostra as propostas do período e status selecionados (Todos = propostas com
          qualquer movimentação no período).
        </p>
        <div className="flex items-center gap-2">
          <PageActionSearch
            value={busca}
            onChange={setBusca}
            placeholder="Buscar proposta, cliente ou vendedor"
            className="w-72"
          />
          <Button onClick={onSalvar} disabled={!alteradas || salvar.isPending} className="h-9">
            <Save className="size-4" />
            {salvar.isPending
              ? 'Salvando…'
              : alteradas
                ? `Salvar feedback (${alteradas})`
                : 'Salvar feedback'}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {[
                'Proposta',
                'Cliente',
                'Vendedor',
                'Valor',
                'Status',
                'Criação',
                'Aprovação',
                'Cancelamento',
                'Pedido ligado',
                'Nota',
                'Motivo',
                'Comentário / feedback',
              ].map((c) => (
                <th key={c} className={cn(th, c === 'Valor' && 'text-right')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.proposta} className={cn(edicoes[p.proposta] && 'bg-primary/5')}>
                <td className={td}>{p.proposta}</td>
                <td className={cn(td, 'max-w-56 truncate')} title={p.cliente}>
                  {p.cliente}
                </td>
                <td className={cn(td, 'max-w-40 truncate')} title={p.vendedor}>
                  {p.vendedor}
                </td>
                <td className={cn(td, 'text-right tabular-nums whitespace-nowrap')}>
                  {fmtMoeda(p.valor)}
                </td>
                <td className={cn(td, 'whitespace-nowrap')}>{p.status}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{fmtData(p.data)}</td>
                {(['dt_aprovacao', 'dt_cancelamento'] as const).map((c) => (
                  <td key={c} className={cn(td, 'min-w-36')}>
                    <DatePicker
                      value={diaParaDate(valor(p, c))}
                      onChange={(d) => editar(p, c, dateParaDia(d))}
                      format="DD/MM/YYYY"
                      buttonClassName="h-7 w-full text-xs"
                    />
                  </td>
                ))}
                <td className={cn(td, 'min-w-24')}>
                  <InputText
                    value={valor(p, 'pedido') ?? ''}
                    onChange={(e) => editar(p, 'pedido', e.target.value)}
                  />
                </td>
                <td className={td}>{p.nf}</td>
                <td className={cn(td, 'min-w-44')}>
                  <Select
                    className="[&_button]:h-7 [&_button]:text-xs"
                    items={[
                      [
                        { value: NENHUM, name: '—' },
                        ...motivos.map((m) => ({ value: m, name: m })),
                      ],
                    ]}
                    value={valor(p, 'motivo') || NENHUM}
                    onValueChange={(v) => editar(p, 'motivo', v === NENHUM ? '' : v)}
                  />
                </td>
                <td className={cn(td, 'min-w-72')}>
                  <InputText
                    value={valor(p, 'comentario') ?? ''}
                    onChange={(e) => editar(p, 'comentario', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && (
          <p className="p-6 text-center text-xs text-muted-foreground">
            {busca ? 'Nada encontrado para a busca.' : 'Nenhuma proposta neste período e status.'}
          </p>
        )}
      </div>
    </div>
  )
}
