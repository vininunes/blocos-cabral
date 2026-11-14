import { useEffect, useState } from 'react'

import type { LinhaProjecao, MetaDoMes, ResultadoProjecao } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtNum, rotuloMes } from '@server/relatorio/utils'
import { CalendarRange, Target, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/atomic/base-components/button'
import { InputText } from '@/atomic/base-components/input-text'
import { Loading } from '@/atomic/base-components/loading'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'

import { BancoProvisaoDialog } from '@/atomic/features/banco-clientes/components/banco-provisao-dialog'
import { CabecalhoOrdenavel } from '@/atomic/features/relatorio-tabela/components/cabecalho-ordenavel'

import { numeroOuNulo } from '@/atomic/features/banco-clientes/helpers/provisao-meses'

import {
  useProjecaoQuery,
  useSalvarMetasMutation,
  useSalvarValorTotalMutation,
} from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'
import { useOrdenacao } from '@/atomic/features/relatorio-tabela/hooks/use-ordenacao'

import { cn } from '@/lib/tailwind/utils'

type ChaveMeta = 'vender_mais' | 'meta_mensal' | 'parar_vender'

/** Metas do quadro, com as cores da planilha da equipe (vermelho, verde, amarelo). */
const METAS: { chave: ChaveMeta; nome: string; classe: string }[] = [
  { chave: 'vender_mais', nome: 'Vender mais', classe: 'bg-[#E8392B] text-white' },
  { chave: 'meta_mensal', nome: 'Meta mensal', classe: 'bg-[#A0CF5F] text-black' },
  { chave: 'parar_vender', nome: 'Parar de vender', classe: 'bg-[#FFFF4F] text-black' },
]

/** Número como o usuário digita: '3.500.000' ou '249.566,50'. */
const paraTexto = (v: number | null) => (v === null ? '' : fmtNum(v, Number.isInteger(v) ? 0 : 2))

/** Ordenação do quadro (sem ordem escolhida: pelo rank); os meses são 'mes0', 'mes1'. */
const ACESSORES: Record<string, (l: LinhaProjecao) => string | number | null> = {
  rank: (l) => l.rank,
  cliente: (l) => l.nome,
  valor_total: (l) => l.valor_total,
  mes0: (l) => l.meses[0] || null,
  mes1: (l) => l.meses[1] || null,
}

const SEM_LINHAS: LinhaProjecao[] = []

const invalido = (t: string) => {
  const v = numeroOuNulo(t)
  return v !== null && (!Number.isFinite(v) || v < 0)
}

/**
 * Meta de vendas e projeção (mês atual e seguinte): metas do mês, clientes com provisão por rank,
 * o valor total do pedido (contrato) de cada um e os totais. É o quadro que vai para o PowerPoint
 * e para a aba Projeção do Excel.
 */
export function RelatorioProjecao({ onLancar }: { onLancar: () => void }) {
  const { data, isPending } = useProjecaoQuery()
  const [provisao, setProvisao] = useState<LinhaProjecao | null>(null)
  // os totais (tfoot) ficam sempre embaixo
  const { ordenados, ordem, alternar } = useOrdenacao(data?.linhas ?? SEM_LINHAS, ACESSORES)

  if (isPending || !data) return <Loading text="" className="h-48" />

  const th = 'border-b px-3 py-2 text-xs font-semibold whitespace-nowrap'
  const td = 'border-b px-3 py-1.5 text-xs align-middle'
  const num = 'text-right tabular-nums whitespace-nowrap'

  return (
    <div className="flex flex-1 flex-col gap-4 pb-2">
      <Metas projecao={data} />

      {data.linhas.length ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className={cn(th, 'w-14')}>
                  <CabecalhoOrdenavel coluna="rank" ordem={ordem} onOrdenar={alternar} direita>
                    Rank
                  </CabecalhoOrdenavel>
                </th>
                <th className={th}>
                  <CabecalhoOrdenavel coluna="cliente" ordem={ordem} onOrdenar={alternar}>
                    Cliente
                  </CabecalhoOrdenavel>
                </th>
                <th className={cn(th, 'w-64')}>
                  <CabecalhoOrdenavel
                    coluna="valor_total"
                    ordem={ordem}
                    onOrdenar={alternar}
                    direita
                  >
                    Valor total pedido
                  </CabecalhoOrdenavel>
                </th>
                {data.rotulos.map((r, j) => (
                  <th key={r} className={cn(th, 'w-40 bg-[#E0844A] text-white')}>
                    <CabecalhoOrdenavel
                      coluna={`mes${j}`}
                      ordem={ordem}
                      onOrdenar={alternar}
                      centro
                      className="text-white dark:text-white"
                    >
                      {r}
                    </CabecalhoOrdenavel>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((l) => (
                <tr key={l.cliente} className="hover:bg-muted/30">
                  <td className={cn(td, num, 'text-muted-foreground')}>{l.rank}</td>
                  <td className={cn(td, 'font-medium')}>{l.nome}</td>
                  <td className={cn(td, 'py-1')}>
                    <ValorTotal linha={l} />
                  </td>
                  {l.meses.map((v, j) => (
                    <td key={data.meses[j]} className={cn(td, 'text-right')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs tabular-nums"
                        title="Editar a provisão do cliente"
                        onClick={() => setProvisao(l)}
                      >
                        {v ? fmtMoeda(v, 0) : <span className="text-muted-foreground">R$ -</span>}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold">
              <tr>
                <td className={td} />
                <td className={td}>Vendas projetadas</td>
                <td className={td} />
                {data.projetadas.map((v, j) => (
                  <td key={data.meses[j]} className={cn(td, num, 'px-5')}>
                    {fmtMoeda(v, 0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className={td} />
                <td className={td}>Vendas concretizadas</td>
                <td className={cn(td, num, 'px-5')}>{fmtMoeda(data.concretizadas, 0)}</td>
                {data.meses.map((m) => (
                  <td key={m} className={td} />
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-6">
          <DetailsEmptyState
            className="h-auto"
            icon={<Target />}
            title={`Nenhum cliente com provisão em ${data.rotulos.join(' ou ')}`}
            description="Os clientes do quadro são os que têm provisão no mês atual ou no próximo. Lance a provisão na aba Lançar provisão."
          />
          <Button variant="outline" onClick={onLancar}>
            <Target className="size-4" /> Lançar provisão
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Os valores de cada mês são a provisão do cliente (clique para editar). Rank pela maior
        projeção do mês atual. Vendas concretizadas = soma do valor total pedido. O quadro vai para
        o PowerPoint e para a aba Projeção do Excel.
      </p>

      <BancoProvisaoDialog
        cliente={provisao?.cliente ?? null}
        nome={provisao?.nome ?? ''}
        onClose={() => setProvisao(null)}
      />
    </div>
  )
}

/** Valor total do pedido: digitado (grava ao sair do campo) e a sugestão da base. */
function ValorTotal({ linha }: { linha: LinhaProjecao }) {
  const salvar = useSalvarValorTotalMutation()
  const [texto, setTexto] = useState(paraTexto(linha.valor_total))
  useEffect(() => setTexto(paraTexto(linha.valor_total)), [linha.valor_total])

  const gravar = (valor: number | null) => {
    if (valor === linha.valor_total) return
    salvar.mutate(
      { cliente: linha.cliente, valor },
      { onError: () => setTexto(paraTexto(linha.valor_total)) }
    )
  }
  const s = linha.sugestao
  return (
    <div className="flex flex-col items-end gap-0.5">
      <InputText
        className={cn(
          'h-7 w-44 text-right text-xs tabular-nums',
          invalido(texto) && 'border-destructive'
        )}
        inputMode="decimal"
        placeholder="R$"
        value={texto}
        disabled={salvar.isPending}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => !invalido(texto) && gravar(numeroOuNulo(texto))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {s && s.valor !== linha.valor_total && (
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          title="Usar a maior proposta ou pedido do cliente"
          onClick={() => {
            setTexto(paraTexto(s.valor))
            gravar(s.valor)
          }}
        >
          <WandSparkles className="size-3" /> {fmtMoeda(s.valor)} · {s.origem}
        </button>
      )}
    </div>
  )
}

/** Metas do mês atual e do seguinte (editáveis); mês sem lançamento repete o anterior. */
function Metas({ projecao }: { projecao: ResultadoProjecao }) {
  const salvar = useSalvarMetasMutation()
  const inicial = () =>
    Object.fromEntries(
      projecao.metas.map((m) => [
        m.mes,
        Object.fromEntries(METAS.map(({ chave }) => [chave, paraTexto(m[chave])])),
      ])
    ) as Record<string, Record<ChaveMeta, string>>
  const [valores, setValores] = useState(inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValores(inicial()), [projecao.metas])

  const alterados = projecao.metas.filter((m) =>
    METAS.some(({ chave }) => valores[m.mes]?.[chave] !== paraTexto(m[chave]))
  )
  const temInvalido = Object.values(valores).some((v) => Object.values(v).some(invalido))

  const onSalvar = async () => {
    try {
      for (const m of alterados) {
        const v = valores[m.mes]
        await salvar.mutateAsync({
          mes: m.mes,
          vender_mais: numeroOuNulo(v.vender_mais),
          meta_mensal: numeroOuNulo(v.meta_mensal),
          parar_vender: numeroOuNulo(v.parar_vender),
        })
      }
      toast.success('Metas salvas.')
    } catch {
      /* erro já mostrado pelo cliente da API */
    }
  }

  const herdada = (m: MetaDoMes) =>
    m.herdada_de
      ? `repete ${rotuloMes(m.herdada_de)}`
      : METAS.some(({ chave }) => m[chave] !== null)
        ? 'lançada no mês'
        : 'sem metas'

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="size-4" /> Meta de vendas
        </h3>
        <span className="text-xs text-muted-foreground">
          Mês sem metas lançadas repete as do último mês lançado.
        </span>
        <div className="ml-auto flex gap-2">
          {alterados.length > 0 && (
            <Button variant="ghost" className="h-8 text-xs" onClick={() => setValores(inicial())}>
              Desfazer
            </Button>
          )}
          <Button
            className="h-8"
            disabled={!alterados.length || temInvalido || salvar.isPending}
            onClick={onSalvar}
          >
            {salvar.isPending ? 'Salvando…' : 'Salvar metas'}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(9rem,14rem)_repeat(2,minmax(9rem,12rem))] items-center gap-x-3 gap-y-1.5">
        <div />
        {projecao.metas.map((m, j) => (
          <div key={m.mes} className="text-center text-xs font-semibold">
            {projecao.rotulos[j]}
            <div className="text-[11px] font-normal text-muted-foreground">{herdada(m)}</div>
          </div>
        ))}
        {METAS.map(({ chave, nome, classe }) => (
          <div key={chave} className="contents">
            <div className={cn('rounded px-3 py-1.5 text-center text-xs font-bold', classe)}>
              {nome}
            </div>
            {projecao.metas.map((m) => {
              const t = valores[m.mes]?.[chave] ?? ''
              return (
                <InputText
                  key={m.mes}
                  className={cn(
                    'h-8 text-right text-xs tabular-nums',
                    invalido(t) && 'border-destructive'
                  )}
                  inputMode="decimal"
                  placeholder="R$"
                  value={t}
                  onChange={(e) =>
                    setValores((vs) => ({
                      ...vs,
                      [m.mes]: { ...vs[m.mes], [chave]: e.target.value },
                    }))
                  }
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
