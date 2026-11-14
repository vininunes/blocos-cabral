/**
 * Quadro de projeção de vendas ("Meta de vendas"): clientes com provisão no mês atual ou no
 * próximo, o valor total do pedido (contrato) de cada um e as metas do mês.
 *
 * - Valores mensais = provisão do cliente no mês (mesma fonte da aba Provisão).
 * - Rank = maior projeção do mês atual (depois a do próximo mês).
 * - Valor total do pedido = digitado pela equipe; a sugestão é a maior proposta ou pedido do
 *   cliente na base.
 * - Vendas projetadas = soma de cada mês; vendas concretizadas = soma dos valores totais.
 * - Metas: as do mês ou, sem lançamento, as do último mês lançado antes dele.
 */
import { chaveCliente, type Base } from './base'
import { addMeses } from './datas'
import { provisaoDoMes } from './provisao'
import type { MetaVendas, Provisao } from './tipos'
import { rotuloMes } from './utils'

export type MetaDoMes = {
  mes: string
  vender_mais: number | null
  meta_mensal: number | null
  parar_vender: number | null
  /** Mês de onde as metas vieram quando o mês não tem lançamento próprio (null = do próprio mês). */
  herdada_de: string | null
}

export type LinhaProjecao = {
  rank: number
  cliente: string // chave
  nome: string
  /** Valor digitado; null = não informado. */
  valor_total: number | null
  /** Maior proposta ou pedido do cliente na base (sugestão para o valor total). */
  sugestao: { valor: number; origem: string } | null
  /** Projeção (provisão) de cada mês de `meses`. */
  meses: number[]
}

export type ResultadoProjecao = {
  /** 'AAAA-MM': mês atual e o seguinte. */
  meses: string[]
  /** 'nov/26' */
  rotulos: string[]
  metas: MetaDoMes[]
  linhas: LinhaProjecao[]
  projetadas: number[]
  concretizadas: number
}

export { rotuloMes }

/** Metas do mês (ou do último mês lançado antes dele). */
export function metaDoMes(metas: MetaVendas[], mes: string): MetaDoMes {
  const m = metas.filter((x) => x.mes <= mes).sort((a, b) => (a.mes < b.mes ? 1 : -1))[0]
  return {
    mes,
    vender_mais: m?.vender_mais ?? null,
    meta_mensal: m?.meta_mensal ?? null,
    parar_vender: m?.parar_vender ?? null,
    herdada_de: m && m.mes !== mes ? m.mes : null,
  }
}

/** Maior proposta ou pedido de cada cliente (chave). */
function sugestoes(base: Base) {
  const melhor = new Map<string, { valor: number; origem: string }>()
  const ver = (chave: string, valor: number, origem: string) => {
    const atual = melhor.get(chave)
    if (valor > 0 && (!atual || valor > atual.valor)) melhor.set(chave, { valor, origem })
  }
  for (const p of base.propostas)
    ver(chaveCliente(p.cnpj, p.cliente), p.valor, `proposta ${p.proposta}`)
  for (const p of base.pedidosAgregados())
    ver(chaveCliente(p.cnpj, p.cliente), p.total_pedido, `pedido ${p.pedido}`)
  return melhor
}

/** Quadro do mês de `hoje` ('AAAA-MM-DD') e do seguinte. */
export function calcularProjecao(base: Base, hoje: string): ResultadoProjecao {
  base.sincronizarClientes()
  const mesAtual = hoje.slice(0, 7)
  const meses = [mesAtual, addMeses(`${mesAtual}-01`, 1).slice(0, 7)]
  const porCliente = new Map<string, Provisao[]>()
  for (const p of base.t.provisoes)
    porCliente.set(p.cliente, [...(porCliente.get(p.cliente) ?? []), p])
  const nomes = new Map(base.t.clientes.map((c) => [c.chave, c.nome]))
  const valores = new Map(base.t.valoresPedido.map((v) => [v.cliente, v.valor]))
  const sug = sugestoes(base)

  const linhas = [...porCliente]
    .map(([cliente, ls]) => ({
      cliente,
      nome: nomes.get(cliente) ?? (cliente.startsWith('nome:') ? cliente.slice(5) : cliente),
      valor_total: valores.get(cliente) ?? null,
      sugestao: sug.get(cliente) ?? null,
      meses: meses.map((m) => provisaoDoMes(ls, `${m}-01`)),
    }))
    .filter((l) => l.meses.some((v) => v > 0))
    .sort(
      (a, b) =>
        b.meses[0] - a.meses[0] || b.meses[1] - a.meses[1] || a.nome.localeCompare(b.nome, 'pt-BR')
    )
    .map((l, i): LinhaProjecao => ({ rank: i + 1, ...l }))

  return {
    meses,
    rotulos: meses.map(rotuloMes),
    metas: meses.map((m) => metaDoMes(base.t.metas, m)),
    linhas,
    projetadas: meses.map((_, j) => linhas.reduce((s, l) => s + l.meses[j], 0)),
    concretizadas: linhas.reduce((s, l) => s + (l.valor_total ?? 0), 0),
  }
}
