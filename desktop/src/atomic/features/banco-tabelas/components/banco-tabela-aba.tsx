import type { TabelaBanco, TipoArquivo } from '@server/relatorio/api-tipos'

import { Loading } from '@/atomic/base-components/loading'

import { RelatorioImportacaoDialog } from '@/atomic/features/relatorio-importacao/components/relatorio-importacao-dialog'

import { useTabelaBancoQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { BancoTabela } from './banco-tabela'

/** Arquivo do Bling que alimenta cada tabela (botão Importar dela). */
const IMPORTACAO: Partial<
  Record<TabelaBanco, { tipos: TipoArquivo[]; rotulo: string; ajuda: string }>
> = {
  propostas: {
    tipos: ['orcamentos'],
    rotulo: 'Importar orçamentos (CSV)',
    ajuda: 'Propostas e seus itens vêm do CSV de orçamentos.',
  },
  itensPropostas: {
    tipos: ['orcamentos'],
    rotulo: 'Importar orçamentos (CSV)',
    ajuda: 'Os itens vêm junto com as propostas, do CSV de orçamentos.',
  },
  pedidos: {
    tipos: ['vendas'],
    rotulo: 'Importar vendas (CSV)',
    ajuda: 'Pedidos atendidos, um registro por item.',
  },
  notas: {
    tipos: ['notas'],
    rotulo: 'Importar notas (PDF)',
    ajuda: 'Relatório "Notas Fiscais por Operação" do Bling.',
  },
}

/** Uma tabela do banco com a importação do arquivo correspondente. */
export function BancoTabelaAba({ tabela }: { tabela: TabelaBanco }) {
  const { data, isPending } = useTabelaBancoQuery(tabela)
  const imp = IMPORTACAO[tabela]
  if (isPending || !data) return <Loading text="" className="h-48" />
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {imp && <p className="shrink-0 text-xs text-muted-foreground">{imp.ajuda}</p>}
      <BancoTabela
        conteudo={data}
        ferramentas={
          imp && <RelatorioImportacaoDialog tipos={imp.tipos} rotulo={imp.rotulo} pasta={false} />
        }
      />
    </div>
  )
}
