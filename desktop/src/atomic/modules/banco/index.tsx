import { useState } from 'react'

import type { TabelaBanco } from '@server/relatorio/api-tipos'
import { fmtNum } from '@server/relatorio/utils'
import {
  Building2,
  ClipboardList,
  Database,
  FileStack,
  FileText,
  ListTree,
  Receipt,
} from 'lucide-react'

import { Loading } from '@/atomic/base-components/loading'

import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { BancoClientes } from '@/atomic/features/banco-clientes/components/banco-clientes'
import { BancoCobertura } from '@/atomic/features/banco-cobertura/components/banco-cobertura'
import { BancoArquivos } from '@/atomic/features/banco-tabelas/components/banco-arquivos'
import { BancoTabelaAba } from '@/atomic/features/banco-tabelas/components/banco-tabela-aba'

import { useEstadoBancoQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

type Aba = TabelaBanco | 'clientes'
const ICONES: Record<Aba, typeof Database> = {
  propostas: FileText,
  itensPropostas: ListTree,
  pedidos: ClipboardList,
  notas: Receipt,
  clientes: Building2,
  arquivos: FileStack,
}
const ORDEM: Aba[] = ['propostas', 'itensPropostas', 'pedidos', 'notas', 'clientes', 'arquivos']

/** Banco de dados: período com dados, as tabelas da base e a importação de cada uma. */
export function Banco() {
  const { data: estado } = useEstadoBancoQuery()
  const [aba, setAba] = useState<Aba>('propostas')
  if (!estado) return <Loading text="" className="h-64" />
  const linhas = Object.fromEntries(estado.tabelas.map((t) => [t.tabela, t]))

  return (
    // ocupa a janela inteira: cobertura e abas fixas, a tabela estica e rola por dentro
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4 p-4">
      <BancoCobertura estado={estado} />
      <div className="flex shrink-0 overflow-x-auto">
        <PageActionTabs
          tabs={ORDEM.map((t) => {
            const Icone = ICONES[t]
            return {
              value: t,
              label: `${linhas[t]?.nome ?? t} (${fmtNum(linhas[t]?.linhas ?? 0)})`,
              icon: <Icone className="size-3.5" />,
            }
          })}
          value={aba}
          onValueChange={(v) => setAba(v as Aba)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {aba === 'clientes' ? (
          <BancoClientes />
        ) : aba === 'arquivos' ? (
          <BancoArquivos />
        ) : (
          <BancoTabelaAba key={aba} tabela={aba} />
        )}
      </div>
    </div>
  )
}
