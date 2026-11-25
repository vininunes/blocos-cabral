import type { TabelaBanco } from '@server/relatorio/api-tipos'

import { Loading } from '@/atomic/base-components/loading'

import { useTabelaBancoQuery } from '@/atomic/features/banco-dados/hooks/queries/use-banco-queries'

import { BancoTabela } from './banco-tabela'

/** De onde vem cada tabela (a importação fica na aba Arquivos importados) e o nome do .xlsx. */
const TABELAS: Record<Exclude<TabelaBanco, 'arquivos'>, { nome: string; ajuda: string }> = {
  propostas: {
    nome: 'Propostas',
    ajuda: 'Propostas e seus itens vêm do CSV de orçamentos do Bling.',
  },
  itensPropostas: {
    nome: 'Itens das propostas',
    ajuda: 'Os itens vêm junto com as propostas, do CSV de orçamentos.',
  },
  pedidos: {
    nome: 'Pedidos',
    ajuda: 'Pedidos atendidos (CSV de vendas do Bling), um registro por item.',
  },
  notas: {
    nome: 'Notas fiscais',
    ajuda: 'Relatório "Notas Fiscais por Operação" do Bling (PDF).',
  },
  precos: {
    nome: 'Preços',
    ajuda:
      'Relatório "Vendas por cliente / produto" do Bling (CSV): preço médio de cada produto por cliente, no período informado na importação. Cada arquivo é um retrato do seu período.',
  },
}

/** Uma tabela do banco, com busca e exportação; importar fica em Arquivos importados. */
export function BancoTabelaAba({ tabela }: { tabela: Exclude<TabelaBanco, 'arquivos'> }) {
  const { data, isPending } = useTabelaBancoQuery(tabela)
  const info = TABELAS[tabela]
  if (isPending || !data) return <Loading text="" className="h-48" />
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="shrink-0 text-xs text-muted-foreground">
        {info.ajuda} Para importar, use a aba Arquivos importados.
      </p>
      <BancoTabela conteudo={data} exportarComo={info.nome} />
    </div>
  )
}
