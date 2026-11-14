/**
 * Acompanhamento de pedidos: quanto de cada pedido em aberto (contrato) já foi entregue.
 *
 * - Pedido em aberto = pedido sem nota própria, gerado de uma proposta aprovada.
 * - Entrega = pedido com nota fiscal (data da baixa = data da nota). Cada item da entrega abate a
 *   quantidade do pedido em aberto mais antigo do mesmo cliente (CNPJ) e produto (SKU), feito até
 *   a data do pedido de entrega. Cada entrega é usada uma vez; o que passar do pedido não dá baixa.
 * - % entregue = valor entregue (quantidade x preço do pedido em aberto) / valor do pedido.
 * - Posição no fim do período: pedidos em aberto feitos até `ate` e entregas com nota até `ate`.
 */
import { chaveCliente, type Base } from './base'
import * as C from './config'
import { dia, type Dia } from './datas'
import type { Tabela } from './metricas'

export type Situacao = 'Sem entrega' | 'Parcial' | 'Concluído'

export type ItemAcompanhado = {
  sku: string
  produto: string
  un: string
  qtd: number
  preco: number
  valor: number
  entregue_qtd: number
  entregue_valor: number
}

export type Baixa = {
  /** Pedido de entrega e a nota que o caracteriza. */
  pedido: string
  nf: string
  data: Dia
  sku: string
  produto: string
  un: string
  qtd: number
  /** qtd x preço do pedido em aberto */
  valor: number
}

export type PedidoAcompanhado = {
  pedido: string
  proposta: string
  cliente: string
  cnpj: string
  vendedor: string
  data: Dia | null
  valor: number
  entregue: number
  restante: number
  /** 0 a 1 */
  pct_entregue: number
  situacao: Situacao
  ultima_entrega: Dia | null
  itens: ItemAcompanhado[]
  entregas: Baixa[]
}

export type ResultadoAcompanhamento = {
  /** Posição neste dia (fim do período). */
  referencia: Dia
  /** Maior restante primeiro; concluídos no fim. */
  pedidos: PedidoAcompanhado[]
  totais: {
    pedidos: number
    em_aberto: number
    concluidos: number
    valor: number
    entregue: number
    restante: number
    pct_entregue: number | null
  }
}

/** Diferenças menores que meio centavo contam como entregue por inteiro. */
const TOLERANCIA = 0.005
const APROVADOS: string[] = [C.APROVADO, C.ENTREGUE, C.FATURADO]

const pedidosDe = (v: string) =>
  v
    .replaceAll(';', ',')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

export function calcularAcompanhamento(base: Base, ate: Dia): ResultadoAcompanhamento {
  // nota de cada pedido (a mais antiga): o pedido com nota é uma entrega
  const notaDe = new Map<string, { nf: string; data: Dia }>()
  for (const n of base.notas) {
    const d = dia(n.data)
    if (!n.pedido || !d) continue
    for (const p of pedidosDe(n.pedido)) {
      const atual = notaDe.get(p)
      if (!atual || d < atual.data) notaDe.set(p, { nf: n.nf, data: d })
    }
  }
  const temNota = new Set(base.notas.flatMap((n) => pedidosDe(n.pedido)))

  // pedidos em aberto: sem nota própria e ligados a uma proposta aprovada, feitos até `ate`
  const propostaDe = new Map<string, string>()
  for (const r of base.propostas)
    if (APROVADOS.includes(r.status))
      for (const p of pedidosDe(r.pedido)) if (!propostaDe.has(p)) propostaDe.set(p, r.proposta)

  const itensDe = new Map<string, typeof base.pedidos>()
  for (const it of base.pedidos) itensDe.set(it.pedido, [...(itensDe.get(it.pedido) ?? []), it])

  const abertos: PedidoAcompanhado[] = []
  for (const [pedido, its] of itensDe) {
    const d = dia(its[0].data)
    if (temNota.has(pedido) || !propostaDe.has(pedido) || !d || d > ate) continue
    // itens somados por SKU (o mesmo produto pode vir em mais de uma linha)
    const porSku = new Map<string, ItemAcompanhado>()
    for (const it of its) {
      const i = porSku.get(it.sku) ?? {
        sku: it.sku,
        produto: it.produto,
        un: it.un,
        qtd: 0,
        preco: 0,
        valor: 0,
        entregue_qtd: 0,
        entregue_valor: 0,
      }
      i.qtd += it.qtd
      i.valor += it.vlr_item
      porSku.set(it.sku, i)
    }
    const itens = [...porSku.values()].filter((i) => i.qtd > 0)
    for (const i of itens) i.preco = i.valor / i.qtd
    abertos.push({
      pedido,
      proposta: propostaDe.get(pedido)!,
      cliente: its[0].cliente,
      cnpj: its[0].cnpj,
      vendedor: its[0].vendedor,
      data: d,
      valor: itens.reduce((s, i) => s + i.valor, 0),
      entregue: 0,
      restante: 0,
      pct_entregue: 0,
      situacao: 'Sem entrega',
      ultima_entrega: null,
      itens,
      entregas: [],
    })
  }

  // fila por cliente + SKU: pedidos em aberto mais antigos primeiro
  abertos.sort((a, b) =>
    a.data! < b.data! ? -1 : a.data! > b.data! ? 1 : a.pedido < b.pedido ? -1 : 1
  )
  const fila = new Map<string, { p: PedidoAcompanhado; i: ItemAcompanhado }[]>()
  for (const p of abertos)
    for (const i of p.itens) {
      const k = `${chaveCliente(p.cnpj, p.cliente)}|${i.sku}`
      fila.set(k, [...(fila.get(k) ?? []), { p, i }])
    }

  // entregas (pedidos com nota até `ate`), em ordem de data da nota
  const entregas = [...itensDe]
    .filter(([pedido]) => {
      const nf = notaDe.get(pedido)
      return nf && nf.data <= ate
    })
    .map(([pedido, its]) => ({ pedido, its, nf: notaDe.get(pedido)!, data: dia(its[0].data) }))
    .sort((a, b) =>
      a.nf.data < b.nf.data ? -1 : a.nf.data > b.nf.data ? 1 : a.pedido < b.pedido ? -1 : 1
    )
  for (const e of entregas) {
    for (const it of e.its) {
      let resta = it.qtd
      for (const { p, i } of fila.get(`${chaveCliente(it.cnpj, it.cliente)}|${it.sku}`) ?? []) {
        if (resta <= 0) break
        if (!e.data || e.data < p.data!) continue // entrega anterior ao pedido em aberto
        const q = Math.min(resta, i.qtd - i.entregue_qtd)
        if (q <= 1e-9) continue
        i.entregue_qtd += q
        i.entregue_valor += q * i.preco
        resta -= q
        p.entregas.push({
          pedido: e.pedido,
          nf: e.nf.nf,
          data: e.nf.data,
          sku: i.sku,
          produto: i.produto,
          un: i.un,
          qtd: q,
          valor: q * i.preco,
        })
      }
    }
  }

  for (const p of abertos) {
    p.entregue = p.itens.reduce((s, i) => s + i.entregue_valor, 0)
    p.restante = Math.max(0, p.valor - p.entregue)
    if (p.restante < TOLERANCIA) p.restante = 0
    p.pct_entregue = p.valor ? Math.min(1, p.entregue / p.valor) : 0
    p.situacao = p.restante === 0 ? 'Concluído' : p.entregue > 0 ? 'Parcial' : 'Sem entrega'
    p.ultima_entrega = p.entregas.reduce<Dia | null>(
      (m, e) => (!m || e.data > m ? e.data : m),
      null
    )
  }
  const pedidos = abertos.sort(
    (a, b) =>
      Number(a.situacao === 'Concluído') - Number(b.situacao === 'Concluído') ||
      b.restante - a.restante ||
      b.valor - a.valor ||
      (a.pedido < b.pedido ? -1 : 1)
  )
  const valor = pedidos.reduce((s, p) => s + p.valor, 0)
  const entregue = pedidos.reduce((s, p) => s + p.entregue, 0)
  const concluidos = pedidos.filter((p) => p.situacao === 'Concluído').length
  return {
    referencia: ate,
    pedidos,
    totais: {
      pedidos: pedidos.length,
      em_aberto: pedidos.length - concluidos,
      concluidos,
      valor,
      entregue,
      restante: pedidos.reduce((s, p) => s + p.restante, 0),
      pct_entregue: valor ? entregue / valor : null,
    },
  }
}

/** Tabelas do Excel: um pedido por linha e uma linha por baixa (entrega). */
export function tabelasAcompanhamento(r: ResultadoAcompanhamento): Record<string, Tabela> {
  return {
    Acompanhamento: {
      colunas: [
        'Pedido',
        'Proposta',
        'Cliente',
        'Vendedor',
        'Data do pedido',
        'Valor',
        'Entregue',
        '% entregue',
        'Restante',
        '% restante',
        'Situação',
        'Última entrega',
      ],
      linhas: r.pedidos.map((p) => [
        p.pedido,
        p.proposta,
        p.cliente,
        p.vendedor,
        p.data,
        p.valor,
        p.entregue,
        p.pct_entregue,
        p.restante,
        p.valor ? 1 - p.pct_entregue : null,
        p.situacao,
        p.ultima_entrega,
      ]),
    },
    'Entregas dos pedidos': {
      colunas: [
        'Pedido',
        'Cliente',
        'Pedido de entrega',
        'Nota fiscal',
        'Data da nota',
        'Produto',
        'Un',
        'Quantidade',
        'Valor',
      ],
      linhas: r.pedidos.flatMap((p) =>
        p.entregas.map((e) => [
          p.pedido,
          p.cliente,
          e.pedido,
          e.nf,
          e.data,
          e.produto,
          e.un,
          e.qtd,
          e.valor,
        ])
      ),
    },
  }
}
