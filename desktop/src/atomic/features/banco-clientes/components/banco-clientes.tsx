import { useMemo, useState } from 'react'

import type { ClienteIndicadores, EdicaoClienteApi } from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtNum, fmtPct, norm } from '@server/relatorio/utils'
import { ArrowDown, Minus, Save, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import { InputText } from '@/atomic/base-components/input-text'
import { Loading } from '@/atomic/base-components/loading'
import { Select } from '@/atomic/base-components/select'
import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'

import { SeloAbc } from '@/atomic/features/banco-dados/components/selo-abc'
import { RelatorioImportacaoDialog } from '@/atomic/features/relatorio-importacao/components/relatorio-importacao-dialog'
import { TabelaVirtual } from '@/atomic/features/relatorio-tabela/components/tabela-virtual'

import { COR_ABC } from '@/atomic/features/banco-dados/helpers/cor-abc'

import {
  useClientesQuery,
  useSalvarClientesMutation,
} from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { cn } from '@/lib/tailwind/utils'

import { BancoProvisaoDialog } from './banco-provisao-dialog'

type Campo = keyof EdicaoClienteApi
type Ordem = 'faturamento' | 'potencial' | 'dias_sem_comprar' | 'nome'
const SEM = '__sem'
/** Larguras fixas (px) das colunas: não mudam com o scroll da lista virtualizada. */
const LARGURAS = [300, 170, 90, 120, 140, 70, 120, 110, 130, 95, 140, 160, 190, 170, 120, 280]

const documento = (d: string) =>
  d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : d.length === 11
      ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      : d

function IconeTendencia({ t }: { t: ClienteIndicadores['tendencia'] }) {
  if (t === 'crescendo') return <TrendingUp className="size-3.5 text-cabral-verde" />
  if (t === 'caindo') return <TrendingDown className="size-3.5 text-cabral-vermelho" />
  if (t === 'estável') return <Minus className="size-3.5" />
  return null
}

function OrdemBtn({
  k,
  ordenar,
  children,
}: {
  k: Ordem
  ordenar: { atual: Ordem; mudar: (o: Ordem) => void }
  children: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1',
        ordenar.atual === k && 'text-primary dark:text-foreground'
      )}
      onClick={() => ordenar.mudar(k)}
    >
      {children}
      {ordenar.atual === k && <ArrowDown className="size-3" />}
    </button>
  )
}

/**
 * Clientes: cadastro (dados + contatos do Bling), campos da equipe (grupo econômico, segmento,
 * situação, observações) e o estimador Curva ABC / potencial por grupo econômico.
 */
export function BancoClientes() {
  const { data, isPending } = useClientesQuery()
  const salvar = useSalvarClientesMutation()
  const [edicoes, setEdicoes] = useState<Record<string, EdicaoClienteApi>>({})
  const [busca, setBusca] = useState('')
  const [abc, setAbc] = useState<'Todos' | 'A' | 'B' | 'C' | '-'>('Todos')
  const [ordem, setOrdem] = useState<Ordem>('faturamento')
  const [provisao, setProvisao] = useState<ClienteIndicadores | null>(null)

  const valor = <K extends Campo>(c: ClienteIndicadores, k: K) =>
    (edicoes[c.chave] && k in edicoes[c.chave]
      ? edicoes[c.chave][k]
      : c[k]) as ClienteIndicadores[K]
  const editar = (c: ClienteIndicadores, k: Campo, v: string) =>
    setEdicoes((e) => ({ ...e, [c.chave]: { ...e[c.chave], [k]: v } }))

  const linhas = useMemo(() => {
    const termo = norm(busca)
    const ls = (data?.clientes ?? []).filter(
      (c) =>
        (abc === 'Todos' || c.abc === abc) &&
        (!termo ||
          [c.nome, c.fantasia, c.cnpj, c.cidade, c.grupo, c.segmento].some((v) =>
            norm(v).includes(termo)
          ))
    )
    const chave: Record<Ordem, (c: ClienteIndicadores) => number | string> = {
      faturamento: (c) => -c.faturamento,
      potencial: (c) => -c.potencial,
      dias_sem_comprar: (c) => -(c.dias_sem_comprar ?? -1),
      nome: (c) => norm(c.nome),
    }
    return [...ls].sort((x, y) =>
      chave[ordem](x) < chave[ordem](y) ? -1 : chave[ordem](x) > chave[ordem](y) ? 1 : 0
    )
  }, [data, busca, abc, ordem])

  const grupos = useMemo(
    () => [...new Set((data?.clientes ?? []).map((c) => c.grupo).filter(Boolean))].sort(),
    [data]
  )
  const segmentos = useMemo(
    () => [...new Set((data?.clientes ?? []).map((c) => c.segmento).filter(Boolean))].sort(),
    [data]
  )
  if (isPending || !data) return <Loading text="" className="h-48" />
  const { resumo } = data
  const alteradas = Object.keys(edicoes).length

  const th =
    'sticky top-0 z-10 bg-background border-b px-2 py-2 text-left text-xs font-medium whitespace-nowrap'
  const td = 'border-b px-2 py-1 text-xs align-middle'
  const num = 'text-right tabular-nums whitespace-nowrap'
  const ordenar = { atual: ordem, mudar: setOrdem }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-4">
        {(['A', 'B', 'C'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setAbc(abc === k ? 'Todos' : k)}
            className={cn(
              'rounded-lg border bg-card p-3 text-left transition hover:border-primary',
              abc === k && 'border-primary ring-1 ring-primary'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded text-xs font-bold',
                  COR_ABC[k]
                )}
              >
                {k}
              </span>
              <span className="text-xs text-muted-foreground">
                {k === 'A' ? 'até 80% do faturamento' : k === 'B' ? 'de 80% a 95%' : 'últimos 5%'}
              </span>
            </div>
            <div className="mt-1 text-base font-bold">
              {fmtNum(resumo[k].grupos)}{' '}
              {resumo[k].grupos === 1 ? 'cliente/grupo' : 'clientes/grupos'}
            </div>
            <div className="text-xs text-muted-foreground">
              {fmtMoeda(resumo[k].faturamento)} ·{' '}
              {resumo.total ? fmtPct(resumo[k].faturamento / resumo.total) : '0,0%'}
            </div>
          </button>
        ))}
        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Como é calculado</div>
          Faturamento (notas) de toda a base
          {resumo.referencia ? ` até ${fmtData(resumo.referencia)}` : ''}, por grupo econômico (sem
          grupo, o próprio cliente). Tendência: últimos 90 dias x 90 anteriores. Potencial:
          propostas em aberto (até 90 dias) + pedidos aguardando nota.
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder="Buscar cliente, CNPJ, cidade, grupo ou segmento"
          className="w-72"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={abc}
          onValueChange={(v) => v && setAbc(v as typeof abc)}
        >
          {(['Todos', 'A', 'B', 'C', '-'] as const).map((o) => (
            <ToggleGroupItem key={o} value={o} className="flex-none px-3 text-xs whitespace-nowrap">
              {o === '-' ? 'Sem compra' : o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto" />
        <RelatorioImportacaoDialog
          variante="outline"
          tipos={['contatos']}
          rotulo="Importar contatos (CSV)"
          pasta={false}
        />
        <Button
          className="h-8"
          disabled={!alteradas || salvar.isPending}
          onClick={() =>
            salvar.mutate(
              { edicoes },
              { onSuccess: () => (toast.success('Clientes salvos.'), setEdicoes({})) }
            )
          }
        >
          <Save className="size-4" />
          {salvar.isPending ? 'Salvando…' : alteradas ? `Salvar (${alteradas})` : 'Salvar'}
        </Button>
      </div>

      <datalist id="grupos-economicos">
        {grupos.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id="segmentos">
        {segmentos.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {linhas.length ? (
        <TabelaVirtual
          dados={linhas}
          chave={(c) => c.chave}
          larguras={LARGURAS}
          linhaClasse={(c) => (edicoes[c.chave] ? 'bg-primary/5' : undefined)}
          cabecalho={() => (
            <tr>
              <th className={th}>
                <OrdemBtn ordenar={ordenar} k="nome">
                  Cliente
                </OrdemBtn>
              </th>
              <th className={th}>Cidade</th>
              <th className={th}>ABC</th>
              <th className={th}>Tendência</th>
              <th className={cn(th, 'text-right')}>
                <OrdemBtn ordenar={ordenar} k="faturamento">
                  Faturamento
                </OrdemBtn>
              </th>
              <th className={cn(th, 'text-right')}>Notas</th>
              <th className={cn(th, 'text-right')}>Ticket médio</th>
              <th className={th}>Última compra</th>
              <th className={cn(th, 'text-right')}>
                <OrdemBtn ordenar={ordenar} k="dias_sem_comprar">
                  Dias sem comprar
                </OrdemBtn>
              </th>
              <th className={cn(th, 'text-right')}>Conversão</th>
              <th className={cn(th, 'text-right')}>
                <OrdemBtn ordenar={ordenar} k="potencial">
                  Potencial
                </OrdemBtn>
              </th>
              <th className={cn(th, 'text-right')}>Provisão (mês atual)</th>
              <th className={th}>Grupo econômico</th>
              <th className={th}>Segmento</th>
              <th className={th}>Situação</th>
              <th className={th}>Observações</th>
            </tr>
          )}
          linha={(c) => (
            <>
              <td className={cn(td, 'min-w-64')}>
                <div className="max-w-72 truncate font-medium" title={c.nome}>
                  {c.nome}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c.cnpj ? documento(c.cnpj) : 'sem CNPJ/CPF'}
                  {c.origem === 'bling' && ' · Bling'}
                  {c.fantasia && ` · ${c.fantasia}`}
                </div>
              </td>
              <td className={cn(td, 'whitespace-nowrap')}>
                {[c.cidade, c.uf].filter(Boolean).join('/')}
              </td>
              <td className={td}>
                <SeloAbc classe={c.abc} />
                {c.participacao > 0 && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    {fmtPct(c.participacao)}
                  </span>
                )}
              </td>
              <td className={cn(td, 'whitespace-nowrap')}>
                <span className="inline-flex items-center gap-1">
                  <IconeTendencia t={c.tendencia} />
                  {c.tendencia}
                </span>
              </td>
              <td className={cn(td, num)}>{fmtMoeda(c.faturamento)}</td>
              <td className={cn(td, num)}>{fmtNum(c.notas)}</td>
              <td className={cn(td, num)}>{c.notas ? fmtMoeda(c.ticket_medio) : ''}</td>
              <td className={cn(td, 'whitespace-nowrap')}>{fmtData(c.ultima_compra)}</td>
              <td className={cn(td, num)}>{c.dias_sem_comprar ?? ''}</td>
              <td className={cn(td, num)}>{c.conversao === null ? '' : fmtPct(c.conversao)}</td>
              <td className={cn(td, num)}>{c.potencial ? fmtMoeda(c.potencial) : ''}</td>
              <td className={cn(td, 'text-right')}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs tabular-nums"
                  onClick={() => setProvisao(c)}
                >
                  <Target className="size-3.5" />
                  {c.provisao_mes ? fmtMoeda(c.provisao_mes) : 'Lançar'}
                </Button>
              </td>
              <td className={cn(td, 'min-w-40')}>
                <InputText
                  list="grupos-economicos"
                  value={valor(c, 'grupo') ?? ''}
                  onChange={(e) => editar(c, 'grupo', e.target.value)}
                />
              </td>
              <td className={cn(td, 'min-w-36')}>
                <InputText
                  list="segmentos"
                  value={valor(c, 'segmento') ?? ''}
                  onChange={(e) => editar(c, 'segmento', e.target.value)}
                />
              </td>
              <td className={cn(td, 'min-w-28')}>
                <Select
                  className="[&_button]:h-7 [&_button]:text-xs"
                  items={[
                    [
                      { value: SEM, name: '—' },
                      { value: 'ativo', name: 'Ativo' },
                      { value: 'inativo', name: 'Inativo' },
                    ],
                  ]}
                  value={valor(c, 'situacao') || SEM}
                  onValueChange={(v) => editar(c, 'situacao', v === SEM ? '' : v)}
                />
              </td>
              <td className={cn(td, 'min-w-64')}>
                <InputText
                  value={valor(c, 'observacoes') ?? ''}
                  onChange={(e) => editar(c, 'observacoes', e.target.value)}
                />
              </td>
            </>
          )}
        />
      ) : (
        <div className="flex-1 rounded-md border bg-card">
          <p className="p-6 text-center text-xs text-muted-foreground">
            Nenhum cliente neste filtro.
          </p>
        </div>
      )}
      <p className="shrink-0 text-xs text-muted-foreground">
        {fmtNum(linhas.length)} de {fmtNum(data.clientes.length)} clientes. Grupo econômico junta
        vários CNPJs/nomes na curva ABC (use o mesmo nome do grupo nos clientes da mesma empresa).
      </p>
      <BancoProvisaoDialog
        cliente={provisao?.chave ?? null}
        nome={provisao?.nome ?? ''}
        onClose={() => setProvisao(null)}
      />
    </div>
  )
}
