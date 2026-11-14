import { useMemo, useState } from 'react'

import type { ClienteIndicadores } from '@server/relatorio/api-tipos'
import { fmtData, fmtMoeda, fmtNum, fmtPct, norm } from '@server/relatorio/utils'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Loading } from '@/atomic/base-components/loading'
import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'

import { SeloAbc } from '@/atomic/features/banco-dados/components/selo-abc'
import { BancoExportar } from '@/atomic/features/banco-tabelas/components/banco-exportar'
import { CabecalhoOrdenavel } from '@/atomic/features/relatorio-tabela/components/cabecalho-ordenavel'
import { TabelaVirtual } from '@/atomic/features/relatorio-tabela/components/tabela-virtual'

import { COR_ABC } from '@/atomic/features/banco-dados/helpers/cor-abc'

import { useClientesQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'
import {
  useOrdenacao,
  type ValorOrdenavel,
} from '@/atomic/features/relatorio-tabela/hooks/use-ordenacao'

import { cn } from '@/lib/tailwind/utils'

const ORDEM_ABC: Record<string, number> = { A: 1, B: 2, C: 3 }

/** Colunas da tabela: título, valor usado na ordenação e alinhamento à direita. */
const COLUNAS_TABELA: [string, (c: ClienteIndicadores) => ValorOrdenavel, boolean][] = [
  ['Cliente', (c) => c.nome, false],
  ['Cidade', (c) => [c.cidade, c.uf].filter(Boolean).join('/'), false],
  ['ABC', (c) => ORDEM_ABC[c.abc] ?? null, false],
  ['Tendência', (c) => (c.tendencia === '-' ? null : c.tendencia), false],
  ['Faturamento', (c) => c.faturamento, true],
  ['Notas', (c) => c.notas, true],
  ['Ticket médio', (c) => (c.notas ? c.ticket_medio : null), true],
  ['Última compra', (c) => c.ultima_compra, false],
  ['Dias sem comprar', (c) => c.dias_sem_comprar, true],
  ['Conversão', (c) => c.conversao, true],
  ['Potencial', (c) => c.potencial, true],
  ['Provisão (mês atual)', (c) => c.provisao_mes || null, true],
  ['Grupo econômico', (c) => c.grupo, false],
  ['Segmento', (c) => c.segmento, false],
  ['Situação', (c) => c.situacao, false],
  ['Observações', (c) => c.observacoes, false],
]
const ACESSORES = Object.fromEntries(COLUNAS_TABELA.map(([t, f]) => [t, f]))
/** Situação do cliente para exibição (a aba é só leitura). */
const SITUACAO: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo' }
/** Colunas do .xlsx da aba Clientes (as chaves definem o formato: R$, %, datas). */
const COLUNAS_EXPORTACAO = [
  { chave: 'nome', titulo: 'Cliente' },
  { chave: 'cnpj', titulo: 'CNPJ/CPF' },
  { chave: 'fantasia', titulo: 'Fantasia' },
  { chave: 'cidade', titulo: 'Cidade' },
  { chave: 'uf', titulo: 'UF' },
  { chave: 'abc', titulo: 'ABC' },
  { chave: 'participacao', titulo: 'Participação' },
  { chave: 'tendencia', titulo: 'Tendência' },
  { chave: 'faturamento', titulo: 'Faturamento' },
  { chave: 'notas', titulo: 'Notas' },
  { chave: 'ticket_medio', titulo: 'Ticket médio' },
  { chave: 'ultima_compra', titulo: 'Última compra' },
  { chave: 'dias_sem_comprar', titulo: 'Dias sem comprar' },
  { chave: 'conversao', titulo: 'Conversão' },
  { chave: 'potencial', titulo: 'Potencial' },
  { chave: 'provisao_mes', titulo: 'Provisão (mês atual)' },
  { chave: 'grupo', titulo: 'Grupo econômico' },
  { chave: 'segmento', titulo: 'Segmento' },
  { chave: 'situacao', titulo: 'Situação' },
  { chave: 'observacoes', titulo: 'Observações' },
]
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

/**
 * Clientes (só leitura): cadastro (dados + contatos do Bling), grupo econômico, segmento,
 * situação e observações, e o estimador Curva ABC / potencial por grupo econômico. Exporta a
 * lista da tela em .xlsx.
 */
export function BancoClientes() {
  const { data, isPending } = useClientesQuery()
  const [busca, setBusca] = useState('')
  const [abc, setAbc] = useState<'Todos' | 'A' | 'B' | 'C' | '-'>('Todos')

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
    return ls // ordem do servidor: maior faturamento primeiro
  }, [data, busca, abc])
  const { ordenados, ordem, alternar } = useOrdenacao(linhas, ACESSORES)

  if (isPending || !data) return <Loading text="" className="h-48" />
  const { resumo } = data

  const th =
    'sticky top-0 z-10 bg-background border-b px-2 py-2 text-left text-xs font-medium whitespace-nowrap'
  const td = 'border-b px-2 py-1 text-xs align-middle'
  const num = 'text-right tabular-nums whitespace-nowrap'

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
        <BancoExportar
          pedido={() => ({
            nome: 'Clientes',
            colunas: COLUNAS_EXPORTACAO,
            // as linhas da tela (busca, filtro ABC e ordem)
            linhas: ordenados.map((c) => ({
              ...Object.fromEntries(COLUNAS_EXPORTACAO.map(({ chave }) => [chave, null])),
              nome: c.nome,
              cnpj: c.cnpj ? documento(c.cnpj) : '',
              fantasia: c.fantasia,
              cidade: c.cidade,
              uf: c.uf,
              abc: c.abc,
              participacao: c.participacao,
              tendencia: c.tendencia,
              faturamento: c.faturamento,
              notas: c.notas,
              ticket_medio: c.notas ? c.ticket_medio : null,
              ultima_compra: c.ultima_compra,
              dias_sem_comprar: c.dias_sem_comprar,
              conversao: c.conversao,
              potencial: c.potencial,
              provisao_mes: c.provisao_mes || null,
              grupo: c.grupo,
              segmento: c.segmento,
              situacao: SITUACAO[c.situacao] ?? '',
              observacoes: c.observacoes,
            })),
          })}
        />
      </div>

      {linhas.length ? (
        <TabelaVirtual
          dados={ordenados}
          chave={(c) => c.chave}
          larguras={LARGURAS}
          cabecalho={() => (
            <tr>
              {COLUNAS_TABELA.map(([t, , direita]) => (
                <th key={t} className={cn(th, direita && 'text-right')}>
                  <CabecalhoOrdenavel
                    coluna={t}
                    ordem={ordem}
                    onOrdenar={alternar}
                    direita={direita}
                  >
                    {t}
                  </CabecalhoOrdenavel>
                </th>
              ))}
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
              <td className={cn(td, num)}>{c.provisao_mes ? fmtMoeda(c.provisao_mes) : ''}</td>
              <td className={cn(td, 'truncate')} title={c.grupo}>
                {c.grupo}
              </td>
              <td className={cn(td, 'truncate')} title={c.segmento}>
                {c.segmento}
              </td>
              <td className={td}>{SITUACAO[c.situacao] ?? ''}</td>
              <td className={cn(td, 'truncate')} title={c.observacoes}>
                {c.observacoes}
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
        vários CNPJs/nomes na curva ABC.
      </p>
    </div>
  )
}
