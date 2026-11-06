import { useEffect, useRef } from 'react'

import { useAtom } from 'jotai'
import { BarChart3, Database, FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/atomic/base-components/button'
import { Loading } from '@/atomic/base-components/loading'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { RelatorioDetalhamento } from '@/atomic/features/relatorio-detalhamento/components/relatorio-detalhamento'
import { RelatorioExportacaoMenu } from '@/atomic/features/relatorio-exportacao/components/relatorio-exportacao-menu'
import { RelatorioFeedback } from '@/atomic/features/relatorio-feedback/components/relatorio-feedback'
import { RelatorioCoberturaAviso } from '@/atomic/features/relatorio-filtros/components/relatorio-cobertura-aviso'
import {
  RelatorioFiltrosAcoes,
  RelatorioFiltrosDatas,
  RelatorioTipoPeriodo,
} from '@/atomic/features/relatorio-filtros/components/relatorio-filtros-barra'
import { RelatorioPeriodoFaixa } from '@/atomic/features/relatorio-filtros/components/relatorio-periodo-faixa'
import { RelatorioIndicadores } from '@/atomic/features/relatorio-indicadores/components/relatorio-indicadores'
import { RelatorioPedidos } from '@/atomic/features/relatorio-pedidos/components/relatorio-pedidos'
import { RelatorioProvisao } from '@/atomic/features/relatorio-provisao/components/relatorio-provisao'
import { RelatorioRanking } from '@/atomic/features/relatorio-rankings/components/relatorio-ranking'
import { RelatorioVisaoGeral } from '@/atomic/features/relatorio-visao-geral/components/relatorio-visao-geral'

import {
  useEstadoBaseQuery,
  useRelatorioQuery,
} from '@/atomic/features/relatorio-consulta/hooks/queries/use-relatorio-queries'
import { useAvisoMigracao } from '@/atomic/features/relatorio-dados/hooks/use-aviso-migracao'

import { relatorioFiltrosAtom } from '@/atomic/features/relatorio-filtros/store/relatorio-filtros-state'

import { Banco } from '@/atomic/modules/banco'

import { DESKTOP_PLATFORM } from '@/config/desktop'

import { RelatorioHeader } from './components/relatorio-header'
import { RELATORIO_TABS, type RelatorioTab } from './constants/relatorio-tabs'
import { relatorioTabAtom, telaAtom, type Tela } from './store/relatorio-state'

/** Leva o período para o último dia coberto por todas as fontes ao abrir e após cada importação. */
function useAncoraInicial() {
  const { data: estado } = useEstadoBaseQuery()
  const [, setF] = useAtom(relatorioFiltrosAtom)
  const vista = useRef<string | null>(null)
  useEffect(() => {
    if (!estado || estado.vazia || estado.ancoraPadrao === vista.current) return
    vista.current = estado.ancoraPadrao
    setF((f) => ({ ...f, ancora: estado.ancoraPadrao }))
  }, [estado, setF])
  return estado
}

function Conteudo() {
  const { t } = useTranslation()
  const [tab, setTab] = useAtom(relatorioTabAtom)
  const { data: rel, isFetching, isPending } = useRelatorioQuery()

  if (isPending || !rel) return <Loading text="Calculando o relatório…" className="h-64" />
  return (
    <div className="flex h-full flex-col">
      {/* abas e filtros fixos no topo; só o conteúdo da aba rola */}
      <div className="shrink-0 space-y-2 border-b border-border px-4 pt-3 pb-3">
        {/* abas à esquerda e os filtros (page actions em float card) à direita */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PageActionTabs
            tabs={RELATORIO_TABS.map(({ value, icon: Icon }) => ({
              value,
              label: t(`relatorio.abas.${value}`),
              icon: <Icon className="size-3.5" />,
            }))}
            value={tab}
            onValueChange={(value) => setTab(value as RelatorioTab)}
          />
          <RelatorioFiltrosAcoes periodoB={rel.b} />
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          <RelatorioTipoPeriodo />
          <RelatorioFiltrosDatas />
          <RelatorioPeriodoFaixa rel={rel} carregando={isFetching} />
        </div>
        <RelatorioCoberturaAviso rel={rel} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
        {tab === 'indicadores' && <RelatorioIndicadores rel={rel} />}
        {tab === 'visao-geral' && <RelatorioVisaoGeral rel={rel} />}
        {tab === 'pedidos' && <RelatorioPedidos rel={rel} />}
        {tab === 'vendedores' && <RelatorioRanking rel={rel} ranking="vendedores" />}
        {tab === 'clientes' && <RelatorioRanking rel={rel} ranking="clientes" />}
        {tab === 'produtos' && <RelatorioRanking rel={rel} ranking="produtos" />}
        {tab === 'cidades' && <RelatorioRanking rel={rel} ranking="cidades" />}
        {tab === 'provisao' && <RelatorioProvisao rel={rel} />}
        {tab === 'detalhamento' && <RelatorioDetalhamento rel={rel} />}
        {tab === 'feedback' && <RelatorioFeedback rel={rel} />}
      </div>
    </div>
  )
}

/** Relatório de Operações: header com a navegação (Relatório | Banco de dados) e a tela aberta. */
export function Relatorio() {
  const { t } = useTranslation()
  const estado = useAncoraInicial()
  const [tela, setTela] = useAtom(telaAtom)
  useAvisoMigracao()
  const exportar = estado && !estado.vazia && <RelatorioExportacaoMenu />
  const abasTela = (
    <PageActionTabs
      tabs={[
        {
          value: 'relatorio',
          label: t('relatorio.telas.relatorio'),
          icon: <BarChart3 className="size-3.5" />,
        },
        {
          value: 'banco',
          label: t('relatorio.telas.banco'),
          icon: <Database className="size-3.5" />,
        },
      ]}
      value={tela}
      onValueChange={(v) => setTela(v as Tela)}
    />
  )

  return (
    <div className="flex h-full flex-col">
      {/* macOS (botões da janela à esquerda): Exportar e abas à direita. Windows/navegador
          (botões da janela à direita): abas à esquerda, Exportar à direita. */}
      <RelatorioHeader
        left={DESKTOP_PLATFORM === 'darwin' ? undefined : abasTela}
        right={
          DESKTOP_PLATFORM === 'darwin' ? (
            <>
              {exportar}
              {abasTela}
            </>
          ) : (
            exportar
          )
        }
      />
      <div className={`min-h-0 flex-1 ${tela === 'banco' ? 'overflow-hidden' : 'overflow-auto'}`}>
        {tela === 'banco' ? (
          <Banco />
        ) : !estado ? (
          <Loading text="" className="h-64" />
        ) : estado.vazia ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <DetailsEmptyState
              className="h-auto"
              icon={<FileSpreadsheet />}
              title={t('relatorio.vazio.titulo')}
              description={t('relatorio.vazio.descricao')}
            />
            <Button onClick={() => setTela('banco')}>
              <Database className="size-4" /> {t('relatorio.vazio.irBanco')}
            </Button>
          </div>
        ) : (
          <Conteudo />
        )}
      </div>
    </div>
  )
}
