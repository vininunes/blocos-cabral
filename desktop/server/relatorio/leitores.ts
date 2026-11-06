/**
 * Leitura dos arquivos exportados do Bling (port de app/leitores.py).
 *
 * - vendas_*.csv      -> itens de pedidos Atendidos (entregues)
 * - orcamentos_*.csv  -> propostas comerciais (processo de venda) e seus itens
 * - *.pdf             -> relatório "Notas Fiscais por Operação" (uma linha por nota)
 */
import { lerCsv } from './csv'
import { agora, dia, type Data } from './datas'
import type {
  ContatoLido,
  ItemPedido,
  ItemProposta,
  Nota,
  PropostaLida,
  TipoArquivo,
} from './tipos'
import {
  dataBr,
  dataDoNomeArquivo,
  limpo,
  norm,
  normalizarUnidade,
  numBr,
  soDigitos,
} from './utils'

export class ArquivoInvalido extends Error {}

export function tipoArquivo(nome: string): TipoArquivo | '' {
  const n = norm(nome.split(/[\\/]/).pop())
  if (n.endsWith('.pdf')) return 'notas'
  if (n.startsWith('vendas')) return 'vendas'
  if (n.startsWith('orcamento')) return 'orcamentos'
  if (n.startsWith('contato') || n.startsWith('cliente')) return 'contatos'
  return ''
}

type Tabela = { colunas: string[]; linhas: string[][] }

function decodificar(conteudo: Uint8Array) {
  // utf-8-sig com errors="replace": o TextDecoder já tira o BOM e troca bytes inválidos
  return new TextDecoder('utf-8').decode(conteudo)
}

function tabelaCsv(conteudo: Uint8Array): Tabela {
  const texto = decodificar(conteudo)
  const primeira = texto.split('\n', 1)[0]
  const conta = (c: string) => primeira.split(c).length - 1
  return lerCsv(texto, conta(';') >= conta(',') ? ';' : ',')
}

/** Coluna pelo nome normalizado; `obrigatoria` lança erro com as colunas do arquivo. */
function coluna(t: Tabela, nome: string, obrigatoria = true): (linha: string[]) => string {
  const alvo = norm(nome)
  const j = t.colunas.findIndex((c) => norm(c) === alvo)
  if (j >= 0) return (l) => l[j]
  if (obrigatoria) {
    const lista = t.colunas
      .slice(0, 12)
      .map((c) => `'${c}'`)
      .join(', ')
    throw new ArquivoInvalido(`Coluna '${nome}' não encontrada. Colunas do arquivo: [${lista}]...`)
  }
  return () => ''
}

const vendedor = (s: string) => limpo(s) || '(sem vendedor)'

export function lerVendas(conteudo: Uint8Array, nome: string): ItemPedido[] {
  const t = tabelaCsv(conteudo)
  const opc = new Set(['valor frete pedido', 'valor desconto pedido', 'forma pagamento'])
  const nomes = [
    'numero pedido',
    'nome comprador',
    'data',
    'cpf/cnpj comprador',
    'cidade comprador',
    'uf comprador',
    'produto',
    'sku',
    'un',
    'quantidade',
    'valor unitario',
    'valor total',
    'total pedido',
    'valor frete pedido',
    'valor desconto pedido',
    'vendedor',
    'forma pagamento',
  ]
  const c = Object.fromEntries(nomes.map((k) => [k, coluna(t, k, !opc.has(k))]))
  return t.linhas
    .map((l) => ({
      pedido: c['numero pedido'](l).trim(),
      data: dia(dataBr(c['data'](l))),
      cliente: limpo(c['nome comprador'](l)),
      cnpj: soDigitos(c['cpf/cnpj comprador'](l)),
      cidade: limpo(c['cidade comprador'](l)),
      uf: limpo(c['uf comprador'](l)).toUpperCase(),
      produto: limpo(c['produto'](l)),
      sku: limpo(c['sku'](l)),
      un: normalizarUnidade(c['un'](l)),
      qtd: numBr(c['quantidade'](l)),
      vlr_unit: numBr(c['valor unitario'](l)),
      vlr_item: numBr(c['valor total'](l)),
      total_pedido: numBr(c['total pedido'](l)),
      frete: numBr(c['valor frete pedido'](l)),
      desconto: numBr(c['valor desconto pedido'](l)),
      vendedor: vendedor(c['vendedor'](l)),
      pagamento: limpo(c['forma pagamento'](l)),
      arquivo: nome,
    }))
    .filter((r) => r.pedido !== '')
}

/** Propostas (1 linha por proposta, valor = soma dos itens + frete - desconto) e itens. */
export function lerOrcamentos(
  conteudo: Uint8Array,
  nome: string
): { propostas: PropostaLida[]; itens: ItemProposta[] } {
  const t = tabelaCsv(conteudo)
  const opc = [
    'municipio',
    'estado',
    'ultima ocorrencia',
    'frete',
    'desconto proposta',
    'descricao',
    'codigo do produto',
    'unidade',
    'quantidade',
    'preco unitario',
  ]
  const obr = [
    'numero da proposta',
    'data',
    'nome do contato',
    'cpf/cnpj',
    'situacao',
    'preco total',
    'vendedor',
  ]
  const c = Object.fromEntries([
    ...obr.map((k) => [k, coluna(t, k, true)] as const),
    ...opc.map((k) => [k, coluna(t, k, false)] as const),
  ])
  const itens: ItemProposta[] = t.linhas
    .map((l) => ({
      proposta: c['numero da proposta'](l).trim(),
      produto: limpo(c['descricao'](l)),
      codigo: limpo(c['codigo do produto'](l)),
      un: normalizarUnidade(c['unidade'](l)),
      qtd: numBr(c['quantidade'](l)),
      vlr_unit: numBr(c['preco unitario'](l)),
      vlr_total: numBr(c['preco total'](l)),
    }))
    .filter((r) => r.proposta !== '')

  // groupby('proposta', sort=False).first(): 1ª linha de cada proposta, mas cada coluna
  // de data pega o primeiro valor não vazio
  const props = new Map<string, Omit<PropostaLida, 'valor' | 'snapshot'> & { extra: number }>()
  for (const l of t.linhas) {
    const proposta = c['numero da proposta'](l).trim()
    if (!proposta) continue
    const data = dia(dataBr(c['data'](l)))
    const ult = dataBr(c['ultima ocorrencia'](l))
    const atual = props.get(proposta)
    if (atual) {
      atual.data ??= data
      atual.ult_ocorrencia ??= ult
      continue
    }
    props.set(proposta, {
      proposta,
      data,
      cliente: limpo(c['nome do contato'](l)),
      cnpj: soDigitos(c['cpf/cnpj'](l)),
      cidade: limpo(c['municipio'](l)),
      uf: limpo(c['estado'](l)).toUpperCase(),
      vendedor: vendedor(c['vendedor'](l)),
      situacao_bling: limpo(c['situacao'](l)),
      ult_ocorrencia: ult,
      extra: numBr(c['frete'](l)) - numBr(c['desconto proposta'](l)),
    })
  }
  const soma = new Map<string, number>()
  for (const it of itens) soma.set(it.proposta, (soma.get(it.proposta) ?? 0) + it.vlr_total)
  const snapshot: Data = dataDoNomeArquivo(nome) ?? agora()
  const propostas = [...props.values()].map(({ extra, ...p }) => ({
    ...p,
    valor: (soma.get(p.proposta) ?? 0) + extra,
    snapshot,
  }))
  return { propostas, itens }
}

/**
 * CSV de Contatos do Bling (Cadastros → Contatos → Exportar). As colunas são achadas pelos
 * nomes mais comuns do export (sem acento/maiúsculas); só nome ou CNPJ/CPF são obrigatórios.
 */
const COLUNAS_CONTATOS: Record<keyof ContatoLido | 'numero' | 'celular', string[]> = {
  nome: ['nome', 'razao social', 'nome do contato', 'nome/razao social'],
  fantasia: ['fantasia', 'nome fantasia'],
  cnpj: ['cnpj / cpf', 'cpf/cnpj', 'cnpj/cpf', 'cpf / cnpj', 'cnpj', 'cpf', 'documento'],
  tipo_pessoa: ['tipo pessoa', 'tipo de pessoa', 'tipo'],
  cidade: ['cidade', 'municipio'],
  uf: ['uf', 'estado'],
  endereco: ['endereco', 'logradouro'],
  numero: ['numero'],
  bairro: ['bairro'],
  cep: ['cep'],
  telefone: ['telefone', 'fone'],
  celular: ['celular'],
  email: ['e-mail', 'email'],
  codigo_bling: ['codigo', 'codigo do contato', 'id'],
}

export function lerContatos(conteudo: Uint8Array): ContatoLido[] {
  const t = tabelaCsv(conteudo)
  const achar = (aliases: string[]) => {
    for (const a of aliases) {
      const j = t.colunas.findIndex((c) => norm(c) === a)
      if (j >= 0) return (l: string[]) => l[j] ?? ''
    }
    return () => ''
  }
  const c = Object.fromEntries(
    Object.entries(COLUNAS_CONTATOS).map(([k, a]) => [k, achar(a)])
  ) as Record<keyof typeof COLUNAS_CONTATOS, (l: string[]) => string>
  const temNome = COLUNAS_CONTATOS.nome.some((a) => t.colunas.some((x) => norm(x) === a))
  const temDoc = COLUNAS_CONTATOS.cnpj.some((a) => t.colunas.some((x) => norm(x) === a))
  if (!temNome && !temDoc) {
    const lista = t.colunas
      .slice(0, 12)
      .map((x) => `'${x}'`)
      .join(', ')
    throw new ArquivoInvalido(
      `Não parece o CSV de Contatos do Bling (sem colunas de nome ou CNPJ/CPF). Colunas: [${lista}]...`
    )
  }
  return t.linhas
    .map((l) => {
      const endereco = [limpo(c.endereco(l)), limpo(c.numero(l))].filter(Boolean).join(', ')
      return {
        nome: limpo(c.nome(l)),
        fantasia: limpo(c.fantasia(l)),
        cnpj: soDigitos(c.cnpj(l)),
        tipo_pessoa: limpo(c.tipo_pessoa(l)),
        cidade: limpo(c.cidade(l)),
        uf: limpo(c.uf(l)).toUpperCase(),
        endereco,
        bairro: limpo(c.bairro(l)),
        cep: soDigitos(c.cep(l)),
        telefone: limpo(c.telefone(l)) || limpo(c.celular(l)),
        email: limpo(c.email(l)),
        codigo_bling: limpo(c.codigo_bling(l)),
      }
    })
    .filter((x) => x.nome || x.cnpj)
}

const VAL = String.raw`[\d\.]+,\d\d`
const NF = new RegExp(
  String.raw`(?<!\d)(\d{6}) (.+?) ([A-Z]{2}) (\d\d/\d\d/\d{4}) ((?:${VAL} ?){12}${VAL})`,
  'g'
)
const OP = /Operação: (.*?) Número/g

/**
 * Texto de todas as páginas do PDF (pdf.js na mesma thread). O worker é importado aqui e
 * exposto em `globalThis.pdfjsWorker`: assim o pdf.js não tenta carregar o arquivo do
 * worker pelo caminho — que não existe depois que o esbuild junta tudo num main.mjs.
 */
async function textoPdf(conteudo: Uint8Array): Promise<string> {
  const g = globalThis as Record<string, unknown>
  // Só a extração de texto é usada: DOMMatrix/Path2D/ImageData servem para desenhar a
  // página. Fora do navegador (processo main do Electron) bastam classes vazias, que o
  // pdf.js instancia ao carregar o módulo; sem elas ele exige o @napi-rs/canvas (nativo).
  for (const nome of ['DOMMatrix', 'Path2D', 'ImageData']) g[nome] ??= class {}
  // @ts-expect-error o worker não tem tipos; só é preciso o objeto do módulo
  g.pdfjsWorker ??= await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({
    data: new Uint8Array(conteudo),
    useSystemFonts: false,
    verbosity: 0,
  }).promise
  try {
    const paginas: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent()
      paginas.push(
        tc.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join('')
      )
    }
    return paginas.join('\n')
  } finally {
    await doc.destroy()
  }
}

/** Relatório 'Notas Fiscais por Operação' do Bling (PDF). */
export async function lerNotasPdf(conteudo: Uint8Array, nome: string): Promise<Nota[]> {
  let texto: string
  try {
    texto = await textoPdf(conteudo)
  } catch {
    throw new ArquivoInvalido('Não foi possível ler o PDF.')
  }
  if (!texto.includes('Notas Fiscais por Opera')) {
    throw new ArquivoInvalido("O PDF não é o relatório 'Notas Fiscais por Operação' do Bling.")
  }
  const flat = texto.replace(/\s+/g, ' ')
  const ops = [...flat.matchAll(OP)].map((m) => [m.index, m[1].trim()] as const)
  const notas: Nota[] = []
  for (const m of flat.matchAll(NF)) {
    const v = m[5].split(' ').map(numBr)
    const op = ops.filter(([p]) => p < m.index)
    notas.push({
      nf: m[1],
      cliente: limpo(m[2]),
      uf: m[3],
      data: dia(dataBr(m[4])),
      operacao: op.length ? op[op.length - 1][1] : '',
      vlr_produtos: v[0],
      frete: v[1],
      desconto: v[2],
      seguro: v[3],
      outras: v[4],
      total_faturado: v[11],
      total_nota: v[12],
      pedido: '',
      vendedor: '',
      cidade: '',
      cnpj: '',
      arquivo: nome,
    })
  }
  if (!notas.length) throw new ArquivoInvalido('Nenhuma nota encontrada no PDF.')
  return notas
}
