/**
 * Preços praticados, a partir do relatório "Vendas por cliente / produto" do Bling.
 *
 * - Cada arquivo importado é um retrato dos preços no período informado na importação.
 * - Produto = código do Bling (o mesmo nome aparece com códigos e unidades diferentes, ex.:
 *   intertravado por peça e por m²). Preço do produto = valor / quantidade (média ponderada).
 * - Índice do cliente = o que ele pagou / o que pagaria ao preço médio de cada produto - 1
 *   (negativo = comprou abaixo da média, com desconto; positivo = acima). Só entram os produtos
 *   comprados por mais de um cliente: num produto de um cliente só, ele é a própria média.
 * - Evolução: preço médio de cada produto em cada retrato; a variação geral compara o retrato
 *   com o anterior nos produtos dos dois, pesando pela quantidade do retrato (índice de Paasche).
 */
import type { Base } from './base'
import { chaveCliente } from './base'
import type { Dia } from './datas'
import type { PrecoCliente } from './tipos'
import { norm, normalizarUnidade } from './utils'

export type RetratoPrecos = {
  /** Hash do arquivo de origem. */
  id: string
  arquivo: string
  de: Dia
  ate: Dia
  clientes: number
  produtos: number
  valor: number
}

export type ProdutoPreco = {
  codigo: string
  produto: string
  familia: string
  un: string
  qtd: number
  valor: number
  /** Preço médio ponderado (valor / quantidade). */
  preco: number
  minimo: number
  maximo: number
  /** (máximo - mínimo) / preço médio. */
  amplitude: number
  clientes: number
  participacao: number
  /** Preço médio no retrato anterior e a variação (null = produto não estava lá). */
  precoAnterior: number | null
  variacao: number | null
}

export type PontoPreco = {
  codigo: string
  produto: string
  chave: string
  cliente: string
  qtd: number
  valor: number
  preco: number
  /** preço do cliente / preço médio do produto - 1 */
  desvio: number
}

export type ClientePreco = {
  chave: string
  cliente: string
  cnpj: string
  cidade: string
  uf: string
  grupo: string
  valor: number
  produtos: number
  /** Valor nos produtos comprados também por outros clientes (base do índice). */
  valorComparavel: number
  /** valor comparável - o mesmo a preço médio (negativo = desconto em R$). */
  diferenca: number
  /** valor comparável / o mesmo a preço médio - 1 (null = nenhum produto comparável) */
  indice: number | null
}

export type FamiliaPreco = {
  familia: string
  valor: number
  produtos: number
  clientes: number
  participacao: number
}

export type EvolucaoProduto = {
  codigo: string
  produto: string
  un: string
  /** Preço médio em cada retrato (mesma ordem de `retratos`, null = não vendido). */
  precos: (number | null)[]
  qtds: number[]
}

export type ResultadoPrecos = {
  /** Todos os retratos, do mais antigo ao mais recente (fim do período). */
  retratos: RetratoPrecos[]
  /** Retrato exibido (null = nenhum relatório de preços importado). */
  retrato: RetratoPrecos | null
  /** O retrato anterior ao exibido (para a variação). */
  anterior: RetratoPrecos | null
  /** Como o retrato foi escolhido: pelo usuário, pelo período do relatório ou o mais recente. */
  escolha: 'usuario' | 'periodo' | 'recente' | null
  totais: { valor: number; frete: number; outras: number; clientes: number; produtos: number }
  /** Variação geral de preços contra o retrato anterior (null = sem anterior ou sem produtos em comum). */
  variacaoGeral: number | null
  produtos: ProdutoPreco[]
  pontos: PontoPreco[]
  clientes: ClientePreco[]
  familias: FamiliaPreco[]
  evolucao: EvolucaoProduto[]
}

export type ConsultaPrecos = { retrato?: string | null; de?: Dia | null; ate?: Dia | null }

/** Família do produto pelo nome (para o mix). */
export function familiaProduto(nome: string): string {
  const n = norm(nome)
  if (/^(intert|piso)/.test(n)) return 'Pisos intertravados'
  if (/^(mini )?guia/.test(n)) return 'Guias'
  if (/^(meia )?canaleta/.test(n)) return 'Canaletas'
  if (/^(meio )?bloco|^compensador/.test(n))
    return n.includes('vedacao') ? 'Blocos de vedação' : 'Blocos estruturais'
  return 'Outros'
}

/** Chave do produto: o código do Bling ou, sem código, o nome. */
const chaveProduto = (p: PrecoCliente) => p.codigo || `nome:${norm(p.produto)}`

function dias(de: Dia, ate: Dia) {
  return (Date.parse(ate) - Date.parse(de)) / 86_400_000 + 1
}

/** Dias em comum entre dois períodos (0 = nenhum). */
function sobreposicao(a: { de: Dia; ate: Dia }, b: { de: Dia; ate: Dia }) {
  const ini = a.de > b.de ? a.de : b.de
  const fim = a.ate < b.ate ? a.ate : b.ate
  return ini > fim ? 0 : dias(ini, fim)
}

type Agregado = { qtd: number; valor: number }
const somar = (m: Map<string, Agregado>, k: string, qtd: number, valor: number) => {
  const a = m.get(k) ?? { qtd: 0, valor: 0 }
  a.qtd += qtd
  a.valor += valor
  m.set(k, a)
}
const precoDe = (a: Agregado | undefined) => (a && a.qtd ? a.valor / a.qtd : null)

export function calcularPrecos(base: Base, q: ConsultaPrecos = {}): ResultadoPrecos {
  const linhas = base.t.precos
  const nomeArquivo = new Map(base.t.arquivos.map((a) => [a.hash, a.arquivo]))

  // retratos (um por arquivo), do mais antigo ao mais recente
  const porRetrato = new Map<string, PrecoCliente[]>()
  for (const l of linhas) porRetrato.set(l.arquivo, [...(porRetrato.get(l.arquivo) ?? []), l])
  const retratos: RetratoPrecos[] = [...porRetrato.entries()]
    .map(([id, ls]) => ({
      id,
      arquivo: nomeArquivo.get(id) ?? id,
      de: ls[0].de,
      ate: ls[0].ate,
      clientes: new Set(ls.map((l) => chaveCliente(l.cnpj, l.cliente))).size,
      produtos: new Set(ls.map(chaveProduto)).size,
      valor: ls.reduce((s, l) => s + l.valor, 0),
    }))
    .sort((a, b) => (a.ate === b.ate ? (a.de < b.de ? -1 : 1) : a.ate < b.ate ? -1 : 1))

  const vazio: ResultadoPrecos = {
    retratos,
    retrato: null,
    anterior: null,
    escolha: null,
    totais: { valor: 0, frete: 0, outras: 0, clientes: 0, produtos: 0 },
    variacaoGeral: null,
    produtos: [],
    pontos: [],
    clientes: [],
    familias: [],
    evolucao: [],
  }
  if (!retratos.length) return vazio

  // retrato exibido: o escolhido; senão o que mais cobre o período do relatório; senão o último
  let retrato = retratos.find((r) => r.id === q.retrato) ?? null
  let escolha: ResultadoPrecos['escolha'] = retrato ? 'usuario' : null
  if (!retrato && q.de && q.ate) {
    const periodo = { de: q.de, ate: q.ate }
    let melhor = 0
    for (const r of retratos) {
      const s = sobreposicao(r, periodo)
      // empate: o mais recente (a lista vai do mais antigo ao mais recente)
      if (s > 0 && s >= melhor) [retrato, melhor] = [r, s]
    }
    if (retrato) escolha = 'periodo'
  }
  if (!retrato) [retrato, escolha] = [retratos.at(-1)!, 'recente']
  const idx = retratos.indexOf(retrato)
  const anterior = idx > 0 ? retratos[idx - 1] : null

  // unidade de cada código pelos pedidos e propostas (o relatório de preços não traz)
  const unidades = new Map<string, string>()
  for (const i of base.itensPropostas) if (i.codigo && i.un) unidades.set(i.codigo, i.un)
  for (const p of base.pedidos) if (p.sku && p.un) unidades.set(p.sku, p.un)
  const un = (codigo: string) =>
    unidades.has(codigo) ? normalizarUnidade(unidades.get(codigo)) : ''

  const grupos = new Map(base.t.clientes.map((c) => [c.chave, c.grupo]))
  const doRetrato = porRetrato.get(retrato.id)!
  const total = doRetrato.reduce((s, l) => s + l.valor, 0)

  // preço médio de cada produto em cada retrato
  const agregados = retratos.map((r) => {
    const m = new Map<string, Agregado>()
    for (const l of porRetrato.get(r.id)!) somar(m, chaveProduto(l), l.qtd, l.valor)
    return m
  })
  const atual = agregados[idx]
  const antes = anterior ? agregados[idx - 1] : null

  // pontos: cliente x produto (o mesmo cliente pode aparecer em mais de uma linha do produto)
  const pontosMap = new Map<string, PontoPreco>()
  for (const l of doRetrato) {
    const kp = chaveProduto(l)
    const chave = chaveCliente(l.cnpj, l.cliente)
    const k = `${kp}|${chave}`
    const p = pontosMap.get(k)
    if (p) {
      p.qtd += l.qtd
      p.valor += l.valor
    } else
      pontosMap.set(k, {
        codigo: kp,
        produto: l.produto,
        chave,
        cliente: l.cliente,
        qtd: l.qtd,
        valor: l.valor,
        preco: 0,
        desvio: 0,
      })
  }
  const pontos = [...pontosMap.values()].filter((p) => p.qtd > 0)
  for (const p of pontos) {
    p.preco = p.valor / p.qtd
    const medio = precoDe(atual.get(p.codigo))!
    p.desvio = medio ? p.preco / medio - 1 : 0
  }

  // produtos
  const nomes = new Map<string, string>()
  for (const l of linhas) nomes.set(chaveProduto(l), l.produto)
  const porProduto = new Map<string, PontoPreco[]>()
  for (const p of pontos) porProduto.set(p.codigo, [...(porProduto.get(p.codigo) ?? []), p])
  const produtos: ProdutoPreco[] = [...porProduto.entries()]
    .map(([codigo, ps]) => {
      const a = atual.get(codigo)!
      const preco = a.valor / a.qtd
      const precos = ps.map((p) => p.preco)
      const minimo = Math.min(...precos)
      const maximo = Math.max(...precos)
      const precoAnterior = antes ? precoDe(antes.get(codigo)) : null
      const produto = nomes.get(codigo)!
      return {
        codigo: codigo.startsWith('nome:') ? '' : codigo,
        produto,
        familia: familiaProduto(produto),
        un: un(codigo),
        qtd: a.qtd,
        valor: a.valor,
        preco,
        minimo,
        maximo,
        amplitude: preco ? (maximo - minimo) / preco : 0,
        clientes: ps.length,
        participacao: total ? a.valor / total : 0,
        precoAnterior,
        variacao: precoAnterior ? preco / precoAnterior - 1 : null,
      }
    })
    .sort((x, y) => y.valor - x.valor)

  // clientes: o que pagaram contra o que pagariam ao preço médio
  const porCliente = new Map<string, ClientePreco & { aoMedio: number; codigos: Set<string> }>()
  const doc = new Map<string, PrecoCliente>()
  for (const l of doRetrato) doc.set(chaveCliente(l.cnpj, l.cliente), l)
  for (const p of pontos) {
    const medio = precoDe(atual.get(p.codigo))!
    let c = porCliente.get(p.chave)
    if (!c) {
      const l = doc.get(p.chave)!
      c = {
        chave: p.chave,
        cliente: p.cliente,
        cnpj: l.cnpj,
        cidade: l.cidade,
        uf: l.uf,
        grupo: grupos.get(p.chave) ?? '',
        valor: 0,
        produtos: 0,
        valorComparavel: 0,
        diferenca: 0,
        indice: null,
        aoMedio: 0,
        codigos: new Set(),
      }
      porCliente.set(p.chave, c)
    }
    c.valor += p.valor
    c.codigos.add(p.codigo)
    if ((porProduto.get(p.codigo)?.length ?? 0) > 1) {
      c.valorComparavel += p.valor
      c.aoMedio += p.qtd * medio
    }
  }
  const clientes: ClientePreco[] = [...porCliente.values()]
    .map(({ aoMedio, codigos, ...c }) => ({
      ...c,
      produtos: codigos.size,
      diferenca: c.valorComparavel - aoMedio,
      indice: aoMedio ? c.valorComparavel / aoMedio - 1 : null,
    }))
    .sort((x, y) => y.valor - x.valor)

  // famílias (mix)
  const porFamilia = new Map<string, { valor: number; produtos: number; clientes: Set<string> }>()
  for (const p of produtos) {
    const f = porFamilia.get(p.familia) ?? { valor: 0, produtos: 0, clientes: new Set<string>() }
    f.valor += p.valor
    f.produtos++
    porFamilia.set(p.familia, f)
  }
  for (const p of pontos) porFamilia.get(familiaProduto(p.produto))?.clientes.add(p.chave)
  const familias: FamiliaPreco[] = [...porFamilia.entries()]
    .map(([familia, f]) => ({
      familia,
      valor: f.valor,
      produtos: f.produtos,
      clientes: f.clientes.size,
      participacao: total ? f.valor / total : 0,
    }))
    .sort((x, y) => y.valor - x.valor)

  // variação geral contra o retrato anterior (produtos dos dois, pesos do retrato atual)
  let variacaoGeral: number | null = null
  if (antes) {
    let agora = 0,
      aoAnterior = 0
    for (const [k, a] of atual) {
      const pa = precoDe(antes.get(k))
      if (pa === null) continue
      agora += a.valor
      aoAnterior += a.qtd * pa
    }
    if (aoAnterior) variacaoGeral = agora / aoAnterior - 1
  }

  // evolução: todos os produtos, preço em cada retrato (mais vendidos no retrato exibido primeiro)
  const ordemValor = new Map(produtos.map((p, i) => [p.codigo || `nome:${norm(p.produto)}`, i]))
  const evolucao: EvolucaoProduto[] = [...nomes.keys()]
    .sort(
      (x, y) =>
        (ordemValor.get(x) ?? Infinity) - (ordemValor.get(y) ?? Infinity) ||
        (nomes.get(x)! < nomes.get(y)! ? -1 : 1)
    )
    .map((k) => ({
      codigo: k.startsWith('nome:') ? '' : k,
      produto: nomes.get(k)!,
      un: un(k),
      precos: agregados.map((m) => precoDe(m.get(k))),
      qtds: agregados.map((m) => m.get(k)?.qtd ?? 0),
    }))

  return {
    retratos,
    retrato,
    anterior,
    escolha,
    totais: {
      valor: total,
      frete: doRetrato.reduce((s, l) => s + l.frete, 0),
      outras: doRetrato.reduce((s, l) => s + l.outras, 0),
      clientes: clientes.length,
      produtos: produtos.length,
    },
    variacaoGeral,
    produtos,
    pontos,
    clientes,
    familias,
    evolucao,
  }
}
