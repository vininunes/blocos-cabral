/** Registros da base. Datas em texto (ver datas.ts). */
import type { Data, DataHora, Dia } from './datas'

export type Proposta = {
  proposta: string
  data: Dia | null
  cliente: string
  cnpj: string
  cidade: string
  uf: string
  vendedor: string
  valor: number
  situacao_bling: string
  status: string
  dt_aprovacao: Data | null
  dt_cancelamento: Data | null
  pedido: string
  dt_entrega: Data | null
  nf: string
  dt_faturamento: Data | null
  motivo: string
  comentario: string
  ult_ocorrencia: Data | null
  primeira_importacao: Data | null
  ultima_atualizacao: Data | null
  historico: string
  /** Campos corrigidos à mão na aba Feedback (preservados ao refazer a base). */
  editados?: string[]
}

/** Uma linha por item de pedido (os dados do pedido se repetem em cada item). */
export type ItemPedido = {
  pedido: string
  data: Dia | null
  cliente: string
  cnpj: string
  cidade: string
  uf: string
  produto: string
  sku: string
  un: string
  qtd: number
  vlr_unit: number
  vlr_item: number
  total_pedido: number
  frete: number
  desconto: number
  vendedor: string
  pagamento: string
  arquivo: string
}

export type Nota = {
  nf: string
  data: Dia | null
  cliente: string
  uf: string
  operacao: string
  vlr_produtos: number
  frete: number
  desconto: number
  seguro: number
  outras: number
  total_faturado: number
  total_nota: number
  pedido: string
  vendedor: string
  cidade: string
  cnpj: string
  arquivo: string
}

export type ItemProposta = {
  proposta: string
  produto: string
  codigo: string
  un: string
  qtd: number
  vlr_unit: number
  vlr_total: number
}

export type ArquivoImportado = {
  arquivo: string
  tipo: TipoArquivo
  importado_em: DataHora
  linhas: number
  hash: string
}

export type TipoArquivo = 'vendas' | 'orcamentos' | 'notas' | 'contatos'

/** Proposta lida do CSV de orçamentos (antes de entrar na base). */
export type PropostaLida = Pick<
  Proposta,
  | 'proposta'
  | 'data'
  | 'cliente'
  | 'cnpj'
  | 'cidade'
  | 'uf'
  | 'vendedor'
  | 'valor'
  | 'situacao_bling'
  | 'ult_ocorrencia'
> & { snapshot: Data }

export type ResumoImportacao = {
  importados: string[]
  ignorados: string[]
  erros: string[]
  mudancas: number
  novas_propostas: number
  ligacoes?: { notas_pedidos: number; propostas_pedidos: number }
}

/**
 * Cliente (tabela Clientes). Chave = CNPJ/CPF ou, sem documento, 'nome:' + nome normalizado.
 * Cadastro vem dos dados (propostas/pedidos/notas) e do CSV de Contatos do Bling; grupo,
 * segmento, situação e observações são da equipe (nunca sobrescritos pela importação).
 */
export type Cliente = {
  chave: string
  cnpj: string
  nome: string
  fantasia: string
  tipo_pessoa: string
  cidade: string
  uf: string
  endereco: string
  bairro: string
  cep: string
  telefone: string
  email: string
  codigo_bling: string
  /** 'dados' (só apareceu nas vendas) ou 'bling' (veio do CSV de contatos) */
  origem: 'dados' | 'bling'
  grupo: string
  segmento: string
  situacao: '' | 'ativo' | 'inativo'
  observacoes: string
  atualizado_em: DataHora | null
}

/**
 * Provisão do cliente: o total (R$) que se espera faturar para ele num mês. No relatório, o
 * total é dividido igualmente pelos dias úteis do mês (períodos parciais levam a parte deles).
 */
export type Provisao = {
  id: string
  cliente: string // chave do cliente (CNPJ/CPF ou nome:...)
  mes: string // 'AAAA-MM'
  valor: number
  atualizado_em: DataHora
}

/** Contato lido do CSV de Contatos do Bling. */
export type ContatoLido = Pick<
  Cliente,
  | 'cnpj'
  | 'nome'
  | 'fantasia'
  | 'tipo_pessoa'
  | 'cidade'
  | 'uf'
  | 'endereco'
  | 'bairro'
  | 'cep'
  | 'telefone'
  | 'email'
  | 'codigo_bling'
>
