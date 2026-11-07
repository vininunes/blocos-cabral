import { useMemo, useState } from 'react'

import type { ClienteIndicadores } from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtNum, norm } from '@server/relatorio/utils'
import { Target, Users } from 'lucide-react'

import { Button } from '@/atomic/base-components/button'
import { CheckboxBase } from '@/atomic/base-components/checkbox-base'
import { Loading } from '@/atomic/base-components/loading'
import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'

import { BancoProvisaoDialog } from '@/atomic/features/banco-clientes/components/banco-provisao-dialog'
import { SeloAbc } from '@/atomic/features/banco-dados/components/selo-abc'
import { TabelaVirtual } from '@/atomic/features/relatorio-tabela/components/tabela-virtual'

import { useClientesQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { cn } from '@/lib/tailwind/utils'

import { RelatorioProvisaoLoteDialog } from './relatorio-provisao-lote-dialog'

type FiltroAbc = 'Todos' | 'A' | 'B' | 'C' | '-'
/** Larguras fixas (px) das colunas: não mudam com o scroll da lista virtualizada. */
const LARGURAS = [44, 340, 180, 70, 150, 80, 130, 120, 160, 170]

type FiltroProvisao = 'Todos' | 'Com' | 'Sem'

const documento = (d: string) =>
  d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : d.length === 11
      ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      : d

/**
 * Clientes para lançar provisão: classe ABC e dados básicos, provisão vigente e lançamento por
 * cliente ou para vários de uma vez (seleção).
 */
export function RelatorioProvisaoClientes() {
  const { data, isPending } = useClientesQuery()
  const [busca, setBusca] = useState('')
  const [abc, setAbc] = useState<FiltroAbc>('Todos')
  const [comProvisao, setComProvisao] = useState<FiltroProvisao>('Todos')
  const [selecao, setSelecao] = useState<Set<string>>(new Set())
  const [individual, setIndividual] = useState<ClienteIndicadores | null>(null)
  const [lote, setLote] = useState(false)

  const linhas = useMemo(() => {
    const termo = norm(busca)
    return (data?.clientes ?? []).filter(
      (c) =>
        (abc === 'Todos' || c.abc === abc) &&
        (comProvisao === 'Todos' || (comProvisao === 'Com') === c.provisao_mes > 0) &&
        (!termo ||
          [c.nome, c.fantasia, c.cnpj, c.cidade, c.grupo].some((v) => norm(v).includes(termo)))
    )
  }, [data, busca, abc, comProvisao])

  if (isPending || !data) return <Loading text="" className="h-48" />

  const porChave = new Map(data.clientes.map((c) => [c.chave, c]))
  const selecionados = [...selecao]
    .map((k) => porChave.get(k))
    .filter((c): c is ClienteIndicadores => !!c)
  const visiveisMarcados = linhas.filter((c) => selecao.has(c.chave)).length
  const todosVisiveis = linhas.length > 0 && visiveisMarcados === linhas.length
  const alternar = (chave: string, marcar: boolean) =>
    setSelecao((s) => {
      const n = new Set(s)
      if (marcar) n.add(chave)
      else n.delete(chave)
      return n
    })
  const alternarVisiveis = (marcar: boolean) =>
    setSelecao((s) => {
      const n = new Set(s)
      for (const c of linhas) {
        if (marcar) n.add(c.chave)
        else n.delete(c.chave)
      }
      return n
    })

  const th =
    'sticky top-0 z-10 bg-background border-b px-2 py-2 text-left text-xs font-medium whitespace-nowrap'
  const td = 'border-b px-2 py-1.5 text-xs align-middle'
  const num = 'text-right tabular-nums whitespace-nowrap'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder="Buscar cliente, CNPJ, cidade ou grupo"
          className="w-72"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={abc}
          onValueChange={(v) => v && setAbc(v as FiltroAbc)}
        >
          {(['Todos', 'A', 'B', 'C', '-'] as const).map((o) => (
            <ToggleGroupItem key={o} value={o} className="flex-none px-3 text-xs whitespace-nowrap">
              {o === '-' ? 'Sem compra' : o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={comProvisao}
          onValueChange={(v) => v && setComProvisao(v as FiltroProvisao)}
        >
          {(
            [
              ['Todos', 'Todos'],
              ['Com', 'Com provisão'],
              ['Sem', 'Sem provisão'],
            ] as const
          ).map(([v, r]) => (
            <ToggleGroupItem key={v} value={v} className="flex-none px-3 text-xs whitespace-nowrap">
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto" />
        <Button className="h-8" disabled={!selecionados.length} onClick={() => setLote(true)}>
          <Users className="size-4" />
          {selecionados.length
            ? `Lançar para ${fmtNum(selecionados.length)} selecionado${selecionados.length === 1 ? '' : 's'}`
            : 'Selecione clientes'}
        </Button>
        {selecionados.length > 0 && (
          <Button variant="ghost" className="h-8 text-xs" onClick={() => setSelecao(new Set())}>
            Limpar seleção
          </Button>
        )}
      </div>

      {linhas.length ? (
        <TabelaVirtual
          dados={linhas}
          chave={(c) => c.chave}
          larguras={LARGURAS}
          linhaClasse={(c) => (selecao.has(c.chave) ? 'bg-primary/5' : undefined)}
          cabecalho={() => (
            <tr>
              <th className={cn(th, 'w-8')}>
                <CheckboxBase
                  aria-label="Selecionar todos da lista"
                  checked={todosVisiveis ? true : visiveisMarcados ? 'indeterminate' : false}
                  onCheckedChange={(v) => alternarVisiveis(v === true)}
                />
              </th>
              <th className={th}>Cliente</th>
              <th className={th}>Cidade</th>
              <th className={th}>ABC</th>
              <th className={cn(th, 'text-right')}>Faturamento</th>
              <th className={cn(th, 'text-right')}>Notas</th>
              <th className={cn(th, 'text-right')}>Ticket médio</th>
              <th className={th}>Última compra</th>
              <th className={th}>Segmento</th>
              <th className={cn(th, 'text-right')}>Provisão (mês atual)</th>
            </tr>
          )}
          linha={(c) => {
            const marcado = selecao.has(c.chave)
            return (
              <>
                <td className={td}>
                  <CheckboxBase
                    aria-label={`Selecionar ${c.nome}`}
                    checked={marcado}
                    onCheckedChange={(v) => alternar(c.chave, v === true)}
                  />
                </td>
                <td className={cn(td, 'min-w-64')}>
                  <div className="max-w-80 truncate font-medium" title={c.nome}>
                    {c.nome}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.cnpj ? documento(c.cnpj) : 'sem CNPJ/CPF'}
                    {c.grupo && ` · grupo ${c.grupo}`}
                  </div>
                </td>
                <td className={cn(td, 'whitespace-nowrap')}>
                  {[c.cidade, c.uf].filter(Boolean).join('/')}
                </td>
                <td className={td}>
                  <SeloAbc classe={c.abc} />
                </td>
                <td className={cn(td, num)}>{fmtMoeda(c.faturamento)}</td>
                <td className={cn(td, num)}>{fmtNum(c.notas)}</td>
                <td className={cn(td, num)}>{c.notas ? fmtMoeda(c.ticket_medio) : ''}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{fmtData(c.ultima_compra)}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{c.segmento}</td>
                <td className={cn(td, 'text-right')}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs tabular-nums"
                    onClick={() => setIndividual(c)}
                  >
                    <Target className="size-3.5" />
                    {c.provisao_mes ? fmtMoeda(c.provisao_mes) : 'Lançar'}
                  </Button>
                </td>
              </>
            )
          }}
        />
      ) : (
        <div className="flex-1 rounded-md border bg-card">
          <p className="p-6 text-center text-xs text-muted-foreground">
            Nenhum cliente neste filtro.
          </p>
        </div>
      )}
      <p className="shrink-0 text-xs text-muted-foreground">
        {fmtNum(linhas.length)} de {fmtNum(data.clientes.length)} clientes ·{' '}
        {fmtNum(selecionados.length)} selecionados. A classe ABC e o faturamento são de toda a base;
        a provisão é a do mês atual.
      </p>

      <BancoProvisaoDialog
        cliente={individual?.chave ?? null}
        nome={individual?.nome ?? ''}
        onClose={() => setIndividual(null)}
      />
      <RelatorioProvisaoLoteDialog
        aberto={lote}
        clientes={selecionados.map((c) => ({ chave: c.chave, nome: c.nome }))}
        onClose={() => setLote(false)}
        onLancado={() => {
          setLote(false)
          setSelecao(new Set())
        }}
      />
    </div>
  )
}
