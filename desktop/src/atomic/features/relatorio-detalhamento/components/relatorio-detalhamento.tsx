import { useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtNum } from '@server/relatorio/utils'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

/**
 * Listas do período: notas, aprovadas, cancelamentos, aguardando nota... (ou a lista do status).
 * Sub-abas no padrão page action; a tabela ocupa toda a altura disponível.
 */
export function RelatorioDetalhamento({ rel }: { rel: RespostaRelatorio }) {
  const itens = rel.detalhamento
  const [aba, setAba] = useState(itens[0].titulo)
  const atual = itens.find((d) => d.titulo === aba) ?? itens[0]
  const [busca, setBusca] = useState('')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {itens.length > 1 && (
          <PageActionTabs
            tabs={itens.map((d) => ({
              value: d.titulo,
              label: `${d.titulo} (${fmtNum(d.tabela.linhas.length)})`,
            }))}
            value={atual.titulo}
            onValueChange={setAba}
          />
        )}
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder="Buscar pedido, nota, cliente ou vendedor"
          className="w-72"
        />
      </div>
      {atual.nota && <p className="shrink-0 text-xs text-muted-foreground">{atual.nota}</p>}
      <RelatorioTabela
        key={atual.titulo}
        tabela={filtrarTabela(atual.tabela, busca)}
        preencher
        vazio={busca ? 'Nada encontrado para a busca.' : undefined}
      />
    </div>
  )
}
