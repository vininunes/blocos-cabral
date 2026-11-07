/**
 * Contrato da API local (server/relatorio-api.ts) — só tipos, importados também pela
 * interface (`@server/relatorio/api-tipos`).
 */
import type { Dimensao, Filtro, FormatoKpi, Tabela } from './metricas'
import type { ResultadoMigracao } from './migracao'
import type { ModoComparacao, TipoPeriodo } from './periodo'
import type { ResumoImportacao, TipoArquivo } from './tipos'

export type { Celula, Dimensao, Filtro, FormatoKpi, Tabela } from './metricas'
export type { ModoComparacao, TipoPeriodo } from './periodo'
export type { ResumoImportacao, TipoArquivo } from './tipos'
export type { ResultadoMigracao } from './migracao'

/** Dia 'AAAA-MM-DD'. */
export type DiaIso = string

export type FonteDados = {
  nome: string
  quantidade: number
  inicio: DiaIso | null
  fim: DiaIso | null
}

/** GET /api/base */
export type EstadoBase = {
  vazia: boolean
  /** Período em que todas as fontes têm dados (o relatório "até agora" termina no fim). */
  cobertura: [DiaIso | null, DiaIso | null]
  /** Maior data entre as fontes (quando uma fonte vai além das outras). */
  fimMaximo: DiaIso | null
  fontes: FonteDados[]
  ultimaImportacao: string | null
  /** Data mais recente de notas/pedidos. */
  dataMaisRecente: DiaIso
  /**
   * Âncora do período ao abrir e após importar: o último dia que todas as fontes cobrem
   * (o painel Python usava a data mais recente, e a semana abria vazia quando os pedidos
   * iam além das notas).
   */
  ancoraPadrao: DiaIso
  motivos: string[]
  /** Base trazida do app antigo (base.xlsx) nesta execução, se houve. */
  migracao: ResultadoMigracao | null
}

/** POST /api/relatorio */
export type ConsultaRelatorio = {
  tipo: TipoPeriodo
  ancora: DiaIso
  de?: DiaIso | null
  ate?: DiaIso | null
  modo: ModoComparacao
  cmpDe?: DiaIso | null
  cmpAte?: DiaIso | null
  filtro: Filtro
}

export type PeriodoJson = {
  tipo: TipoPeriodo
  inicio: DiaIso
  fim: DiaIso
  parcial: boolean
  rotulo: string
  curto: string
}

export type KpiJson = {
  nome: string
  atual: number
  anterior: number | null
  formato: FormatoKpi
  inverso: boolean
  delta: number | null
  variacao: number | null
  melhorou: boolean | null
}

/** Para onde as setas ‹ › levam (mesmo tipo de período). */
export type Navegacao = { ancora: DiaIso; de: DiaIso | null; ate: DiaIso | null }

export type PropostaFeedback = {
  proposta: string
  cliente: string
  vendedor: string
  valor: number
  status: string
  data: DiaIso | null
  dt_aprovacao: DiaIso | null
  dt_cancelamento: DiaIso | null
  pedido: string
  nf: string
  motivo: string
  comentario: string
}

export type RespostaRelatorio = {
  a: PeriodoJson
  b: PeriodoJson | null
  /** Base inteira: período de Pedidos, rankings, Provisão e Detalhamento (sem comparação). */
  todo: PeriodoJson
  modo: ModoComparacao
  filtro: Filtro
  nomeA: string
  nomeB: string
  compara: boolean
  coberturaB: 'total' | 'parcial' | 'nenhuma'
  cobertura: [DiaIso | null, DiaIso | null]
  navegacao: { anterior: Navegacao; proximo: Navegacao }
  grupos: { titulo: string; kpis: KpiJson[] }[]
  /** Registros do período A por trás dos indicadores (abas abaixo dos cartões). */
  basesIndicadores: import('./metricas').BaseIndicador[]
  /** Curva acumulada por série (Todos: Faturado, Entregue e Aprovado; foco: o status). */
  acumulado: Record<string, Tabela>
  variacoes: Record<Dimensao, Tabela>
  evolucao: Tabela
  funil: Tabela | null
  motivos: Tabela | null
  vendedores: Tabela
  clientes: Tabela
  produtos: Tabela
  cidades: Tabela
  pedidos: { tabela: Tabela; explicacao: string }
  detalhamento: { titulo: string; tabela: Tabela; nota?: string }[]
  feedback: PropostaFeedback[]
  /** Provisão x realizado (faturamento) dos clientes na base inteira. */
  provisao: import('./provisao').ResultadoProvisao
}

/** POST /api/importacao */
export type ArquivoParaImportar = {
  nome: string
  tipo?: TipoArquivo
  conteudo: string /* base64 */
}
export type PedidoImportacao = { arquivos: ArquivoParaImportar[] }

/** POST /api/importacao/verificar: tipo pelo conteúdo (null = não reconhecido) e importação anterior. */
export type RespostaVerificacao = { tipo: TipoArquivo | null; importadoComo: string | null }

/** PUT /api/feedback */
export type EdicaoFeedback = Partial<
  Pick<PropostaFeedback, 'dt_aprovacao' | 'dt_cancelamento' | 'pedido' | 'motivo' | 'comentario'>
>
export type PedidoFeedback = { edicoes: Record<string, EdicaoFeedback> }

export type RespostaImportacao = ResumoImportacao

/** POST /api/exportar/{ppt|excel|base}: arquivo gravado em saida/ */
export type ArquivoGerado = { nome: string; caminho: string }

// ---------------------------------------------------------------- banco de dados

export type TabelaBanco = 'propostas' | 'itensPropostas' | 'pedidos' | 'notas' | 'arquivos'

/** GET /api/banco: cobertura de cada fonte, dia a dia (dias com registros e quantos). */
export type EstadoBanco = {
  cobertura: [DiaIso | null, DiaIso | null]
  fontes: {
    tabela: 'propostas' | 'pedidos' | 'notas'
    nome: string
    quantidade: number
    inicio: DiaIso | null
    fim: DiaIso | null
    dias: [DiaIso, number][]
  }[]
  tabelas: { tabela: TabelaBanco | 'clientes'; nome: string; linhas: number }[]
}

export type ColunaBanco = { chave: string; titulo: string }
/** GET /api/banco/tabela/:nome */
export type ConteudoTabela = {
  colunas: ColunaBanco[]
  linhas: Record<string, string | number | null>[]
}

export type { ClienteIndicadores, ClasseAbc, ResumoAbc, Tendencia } from './clientes'
/** GET /api/banco/clientes */
export type RespostaClientes = {
  clientes: import('./clientes').ClienteIndicadores[]
  resumo: import('./clientes').ResumoAbc
}
/** PUT /api/banco/clientes */
export type EdicaoClienteApi = Partial<{
  grupo: string
  segmento: string
  situacao: '' | 'ativo' | 'inativo'
  observacoes: string
}>
export type PedidoClientes = { edicoes: Record<string, EdicaoClienteApi> }
/** DELETE /api/banco/arquivos/:hash */
export type RespostaDesfazer = {
  removido: string
  propostas: number
  pedidos: number
  notas: number
}

/** Provisão do cliente (total R$ por mês). GET/PUT /api/banco/provisoes/:cliente */
export type { Provisao } from './tipos'
export type { ResultadoProvisao } from './provisao'
/** Mês 'AAAA-MM' e o total previsto; valor null = sem provisão no mês. */
export type LancamentoProvisao = { mes: string; valor: number | null }
/** PUT: troca os 12 meses do `ano` do cliente pelos enviados. */
export type PedidoProvisoes = { ano: number; meses: LancamentoProvisao[] }
/** POST /api/banco/provisoes-lote: grava os meses preenchidos para vários clientes. */
export type PedidoProvisaoLote = { clientes: string[]; meses: LancamentoProvisao[] }
