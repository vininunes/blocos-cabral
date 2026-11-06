import { useMemo, useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtNum } from '@server/relatorio/utils'
import { Search } from 'lucide-react'

import { InputText } from '@/atomic/base-components/input-text'
import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

const TITULOS = { 'Data do pedido': 'Data pedido', 'Data entrega': 'Entrega (nota)' }
const BUSCA = ['Pedido', 'Cliente', 'Nota', 'Vendedor', 'Proposta']

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{rotulo}</div>
      <div className="text-base font-bold tabular-nums">{valor}</div>
    </div>
  )
}

/** Aba Pedidos: todos os pedidos conforme período e status, com filtro de entrega e busca. */
export function RelatorioPedidos({ rel }: { rel: RespostaRelatorio }) {
  const [situacao, setSituacao] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [busca, setBusca] = useState('')
  const { tabela, explicacao } = rel.pedidos
  const j = (c: string) => tabela.colunas.indexOf(c)
  const filtrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const linhas = tabela.linhas.filter(
      (l) =>
        (situacao === 'Todos' || l[j('Entregue')] === situacao) &&
        (!termo ||
          BUSCA.some((c) =>
            String(l[j(c)] ?? '')
              .toLowerCase()
              .includes(termo)
          ))
    )
    return { ...tabela, linhas }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, situacao, busca])
  const soma = (ls: typeof filtrada.linhas) =>
    ls.reduce((s, l) => s + Number(l[j('Valor')] ?? 0), 0)
  const ent = filtrada.linhas.filter((l) => l[j('Entregue')] === 'Sim')
  const nao = filtrada.linhas.filter((l) => l[j('Entregue')] === 'Não')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Entregue</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={situacao}
            onValueChange={(v) => v && setSituacao(v as typeof situacao)}
          >
            {(['Todos', 'Sim', 'Não'] as const).map((o) => (
              <ToggleGroupItem key={o} value={o} className="px-3 text-xs">
                {o}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <InputText
          className="min-w-64 flex-1"
          icon={<Search className="size-3.5" />}
          placeholder="Buscar cliente, pedido, nota ou vendedor"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <Metrica
          rotulo="Pedidos"
          valor={`${fmtNum(filtrada.linhas.length)} · ${fmtMoeda(soma(filtrada.linhas))}`}
        />
        <Metrica
          rotulo="Entregues (com nota)"
          valor={`${fmtNum(ent.length)} · ${fmtMoeda(soma(ent))}`}
        />
        <Metrica
          rotulo="Aguardando nota"
          valor={`${fmtNum(nao.length)} · ${fmtMoeda(soma(nao))}`}
        />
      </div>
      <RelatorioTabela
        tabela={filtrada}
        titulos={TITULOS}
        vazio="Nenhum pedido neste filtro."
        preencher
      />
      <p className="shrink-0 text-xs text-muted-foreground">
        {explicacao} Entregue = o pedido tem nota fiscal; a data de entrega é a data de emissão da
        nota.
      </p>
    </div>
  )
}
