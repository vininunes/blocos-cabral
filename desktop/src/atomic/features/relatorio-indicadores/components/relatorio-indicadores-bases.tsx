import { useState } from 'react'

import type { RespostaRelatorio } from '@server/relatorio/api-tipos'
import { fmtNum } from '@server/relatorio/utils'

import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

/**
 * Registros do período por trás dos indicadores, em abas abaixo dos cartões: cada aba mostra a
 * lista usada no cálculo e quais indicadores ela alimenta.
 */
export function RelatorioIndicadoresBases({ rel }: { rel: RespostaRelatorio }) {
  const bases = rel.basesIndicadores
  const [aba, setAba] = useState(bases[0]?.titulo ?? '')
  const [busca, setBusca] = useState('')
  const atual = bases.find((b) => b.titulo === aba) ?? bases[0]
  if (!atual) return null

  return (
    <div className="space-y-2">
      <div className="border-b-2 border-primary pb-1 text-xs font-bold tracking-wider text-primary uppercase dark:border-foreground dark:text-foreground">
        Valores usados nos indicadores · {rel.a.rotulo}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PageActionTabs
          tabs={bases.map((b) => ({
            value: b.titulo,
            label: `${b.titulo} (${fmtNum(b.tabela.linhas.length)})`,
          }))}
          value={atual.titulo}
          onValueChange={setAba}
        />
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder="Buscar cliente, vendedor, pedido ou nota"
          className="w-72"
        />
      </div>
      <p className="truncate text-xs text-muted-foreground">
        Usado em: {atual.indicadores.join(' · ')}
      </p>
      {/* altura fixa: trocar de aba (listas de tamanhos diferentes) não mexe no scroll da página */}
      <div className="flex h-[480px] flex-col">
        <RelatorioTabela
          key={atual.titulo}
          tabela={filtrarTabela(atual.tabela, busca)}
          preencher
          vazio={busca ? 'Nada encontrado para a busca.' : 'Nenhum registro no período.'}
        />
      </div>
    </div>
  )
}
