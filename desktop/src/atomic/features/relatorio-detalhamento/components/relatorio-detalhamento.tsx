import { useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtNum } from '@server/relatorio/utils'

import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

/**
 * Listas do período: notas, aprovadas, cancelamentos, aguardando nota... (ou a lista do status).
 * Sub-abas no padrão page action; a tabela ocupa toda a altura disponível.
 */
export function RelatorioDetalhamento({ rel }: { rel: RespostaRelatorio }) {
  const itens = rel.detalhamento
  const [aba, setAba] = useState(itens[0].titulo)
  const atual = itens.find((d) => d.titulo === aba) ?? itens[0]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {itens.length > 1 && (
        <div className="flex shrink-0">
          <PageActionTabs
            tabs={itens.map((d) => ({
              value: d.titulo,
              label: `${d.titulo} (${fmtNum(d.tabela.linhas.length)})`,
            }))}
            value={atual.titulo}
            onValueChange={setAba}
          />
        </div>
      )}
      {atual.nota && <p className="shrink-0 text-xs text-muted-foreground">{atual.nota}</p>}
      <RelatorioTabela key={atual.titulo} tabela={atual.tabela} preencher />
    </div>
  )
}
