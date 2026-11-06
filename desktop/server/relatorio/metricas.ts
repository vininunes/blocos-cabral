/**
 * Indicadores, rankings e listas do relatório para um período e um filtro de status.
 * Tabelas saem no formato { colunas, linhas }; os nomes de coluna são os títulos mostrados
 * na tela, no Excel e no PPT.
 */
import type { Base } from './base'
import * as C from './config'
import { addDias, ano, dia, diaSemana, difDias, formatar, intervalo, mes, type Dia } from './datas'
import { ANTERIOR, Periodo, SEM_COMPARACAO, type ModoComparacao } from './periodo'
import type { ItemPedido, Proposta } from './tipos'
import { DIAS, MESES } from './utils'

export const TODOS = 'Todos'
export const FILTROS = [TODOS, C.PROCESSO, C.APROVADO, C.ENTREGUE, C.FATURADO, C.CANCELADO] as const
export type Filtro = (typeof FILTROS)[number]
const APROVADOS: string[] = [C.APROVADO, C.ENTREGUE, C.FATURADO]

/** organização dos cartões (relatório completo): destaques + blocos na ordem do fluxo da venda */
export const GRUPOS_TODOS: [string, string[]][] = [
  ['Destaques', ['Faturamento (notas)', 'Entregue (pedidos)', 'Vendas aprovadas']],
  [
    'Propostas',
    ['Propostas emitidas', 'Taxa de aprovação', 'Propostas canceladas', 'Carteira em processo'],
  ],
  ['Pedidos', ['Pedidos entregues', 'Aguardando nota']],
  ['Faturamento', ['Notas emitidas', 'Ticket médio por nota', 'Clientes faturados']],
]
export const DIMENSOES = {
  Clientes: ['cliente', 'Cliente'],
  Vendedores: ['vendedor', 'Vendedor'],
  Produtos: ['produto', 'Produto'],
  Cidades: ['cidade', 'Cidade'],
} as const
export type Dimensao = keyof typeof DIMENSOES

export type Celula = string | number | null
export type Tabela = { colunas: string[]; linhas: Celula[][] }
export type FormatoKpi = 'moeda' | 'int' | 'pct' | 'dias'

/** Registro de um status no período (notas, pedidos ou propostas no mesmo formato). */
export type Registro = {
  chave: string
  data: Dia
  criacao: Dia | null
  valor: number
  cliente: string
  cnpj: string
  cidade: string
  vendedor: string
  info: string
  motivo: string
  comentario: string
  ref: string
}

export class KPI {
  constructor(
    readonly nome: string,
    readonly atual: number,
    readonly anterior: number | null,
    readonly formato: FormatoKpi = 'int',
    /** true quando subir é ruim (ex.: cancelamentos) */
    readonly inverso = false
  ) {}

  /** Diferença absoluta A - B (em fração para percentuais; exibida em p.p.). null sem base. */
  get delta(): number | null {
    return this.anterior === null ? null : this.atual - this.anterior
  }

  /** Variação relativa A / B - 1 (ou em p.p. para percentuais). null sem base. */
  get variacao(): number | null {
    if (this.formato === 'pct') return this.delta
    if (!this.anterior) return null
    return this.atual / this.anterior - 1
  }

  /** true se A está melhor que B (considerando o `inverso`); null se igual/sem base. */
  get melhorou(): boolean | null {
    const d = this.delta
    if (!d) return null
    return d > 0 !== this.inverso
  }

  toJSON() {
    const { nome, atual, anterior, formato, inverso, delta, variacao, melhorou } = this
    return { nome, atual, anterior, formato, inverso, delta, variacao, melhorou }
  }
}

// ---------------------------------------------------------------- auxiliares

const entre = (d: Dia | null, ini: Dia, fim: Dia) => d !== null && d >= ini && d <= fim
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** A - B e A / B - 1 (null quando B <= 0). */
export function diferenca(atual: number, anterior: number): [number, number | null] {
  return [atual - anterior, anterior > 0 ? atual / anterior - 1 : null]
}

function cidadeDe(r: { cidade: string; uf: string }) {
  const c = r.uf === '' ? r.cidade : `${r.cidade}/${r.uf}`
  return c === '' ? '(não informada)' : c
}

/** groupby(...).agg: chaves em ordem (como o pandas), um acumulador por chave. */
function agrupar<T, A>(
  linhas: T[],
  chave: (x: T) => string,
  novo: () => A,
  somar: (a: A, x: T) => void
) {
  const m = new Map<string, A>()
  for (const x of linhas) {
    const k = chave(x)
    let a = m.get(k)
    if (!a) m.set(k, (a = novo()))
    somar(a, x)
  }
  return new Map([...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

function somaPor<T>(linhas: T[], chave: (x: T) => string, valor: (x: T) => number) {
  const g = agrupar(
    linhas,
    chave,
    () => ({ v: 0 }),
    (a, x) => (a.v += valor(x))
  )
  return new Map([...g].map(([k, a]) => [k, a.v]))
}

/** Ordem decrescente estável por uma coluna numérica. */
const desc = <T>(linhas: T[], v: (x: T) => number) => [...linhas].sort((a, b) => v(b) - v(a))

type Props = Proposta & { data: Dia | null; dt_aprovacao: Dia | null; dt_cancelamento: Dia | null }

export class Relatorio {
  readonly ant: Periodo
  readonly compara: boolean
  private _kpis: KPI[] | null = null
  private readonly peds: ItemPedido[]
  private readonly props: Props[]

  /**
   * periodo = A (analisado); comparar = B (padrão: período anterior). Com 'Sem comparação'
   * o anterior ainda é calculado por dentro, mas não aparece nas saídas.
   */
  constructor(
    readonly base: Base,
    readonly p: Periodo,
    readonly filtro: Filtro = TODOS,
    comparar: Periodo | null = null,
    readonly modo: ModoComparacao = ANTERIOR
  ) {
    this.ant = comparar ?? p.anterior()
    this.compara = modo !== SEM_COMPARACAO
    this.peds = base.pedidosAgregados()
    this.props = base.propostas.map((r) => ({
      ...r,
      data: dia(r.data),
      dt_aprovacao: dia(r.dt_aprovacao),
      dt_cancelamento: dia(r.dt_cancelamento),
    }))
  }

  // ------------------------------------------------------------ conjuntos por status

  /** Primeira nota de cada pedido (drop_duplicates('pedido')). */
  private notaPorPedido() {
    const m = new Map<string, (typeof this.base.notas)[number]>()
    for (const n of this.base.notas) if (n.pedido !== '' && !m.has(n.pedido)) m.set(n.pedido, n)
    return m
  }

  private decidida(r: Props, d: Dia) {
    return (
      (APROVADOS.includes(r.status) && r.dt_aprovacao !== null && r.dt_aprovacao <= d) ||
      (r.status === C.CANCELADO && r.dt_cancelamento !== null && r.dt_cancelamento <= d)
    )
  }

  /** Registros do status no período. */
  conjunto(status: string, per: Periodo = this.p): Registro[] {
    const { inicio: ini, fim } = per
    if (status === C.FATURADO) {
      return this.base.notas
        .filter((n) => entre(dia(n.data), ini, fim))
        .map((n) => ({
          chave: n.nf,
          data: dia(n.data)!,
          criacao: dia(n.data),
          valor: n.total_nota,
          cliente: n.cliente,
          cnpj: n.cnpj,
          cidade: n.cidade,
          vendedor: n.vendedor,
          info: n.pedido ? `ped. ${n.pedido}` : 'sem pedido',
          motivo: '',
          comentario: '',
          ref: n.pedido,
        }))
    }
    if (status === C.ENTREGUE) {
      // data de entrega = emissão da nota ligada ao pedido; pedido sem nota não tem data de entrega
      const nota = this.notaPorPedido()
      return this.peds
        .filter((p) => nota.has(p.pedido) && entre(dia(nota.get(p.pedido)!.data), ini, fim))
        .map((p) => {
          const n = nota.get(p.pedido)!
          return {
            chave: p.pedido,
            data: dia(n.data)!,
            criacao: dia(p.data),
            valor: p.total_pedido,
            cliente: p.cliente,
            cnpj: p.cnpj,
            cidade: cidadeDe(p),
            vendedor: p.vendedor,
            info: `NF ${n.nf}`,
            motivo: '',
            comentario: '',
            ref: p.pedido,
          }
        })
    }
    const registro = (r: Props, data: Dia, info: string): Registro => ({
      chave: r.proposta,
      data,
      criacao: r.data,
      valor: r.valor,
      cliente: r.cliente,
      cnpj: r.cnpj,
      cidade: cidadeDe(r),
      vendedor: r.vendedor,
      info,
      motivo: r.motivo,
      comentario: r.comentario,
      ref: r.proposta,
    })
    if (status === C.APROVADO) {
      return this.props
        .filter((r) => APROVADOS.includes(r.status) && entre(r.dt_aprovacao, ini, fim))
        .map((r) =>
          registro(r, r.dt_aprovacao!, r.status + (r.pedido ? ` (ped. ${r.pedido})` : ''))
        )
    }
    if (status === C.CANCELADO) {
      return this.props
        .filter((r) => r.status === C.CANCELADO && entre(r.dt_cancelamento, ini, fim))
        .map((r) => registro(r, r.dt_cancelamento!, r.status))
    }
    // processo: carteira aberta no último dia do período
    return this.props
      .filter((r) => r.data !== null && r.data <= fim && !this.decidida(r, fim))
      .map((r) => registro(r, r.data!, `${difDias(fim, r.data!)} dias`))
  }

  /** Pedidos feitos no período (data do pedido) que ainda não têm nota fiscal. */
  aguardandoNota(per: Periodo = this.p): Tabela {
    const colunas = ['Pedido', 'Cliente', 'Vendedor', 'Valor', 'Data do pedido']
    const ligados = new Set(this.base.notas.map((n) => n.pedido).filter(Boolean))
    const p = desc(
      this.peds.filter((x) => !ligados.has(x.pedido) && entre(dia(x.data), per.inicio, per.fim)),
      (x) => x.total_pedido
    )
    return {
      colunas,
      linhas: p.map((x) => [x.pedido, x.cliente, x.vendedor, x.total_pedido, dia(x.data)]),
    }
  }

  /** Todos os pedidos da base, indicando se já foram entregues (têm nota) e a proposta de origem. */
  todosPedidos(): Tabela {
    const colunas = [
      'Pedido',
      'Entregue',
      'Data do pedido',
      'Data entrega',
      'Nota',
      'Cliente',
      'Valor',
      'Vendedor',
      'Cidade',
      'Proposta',
    ]
    const nota = this.notaPorPedido()
    const proposta = new Map<string, string>()
    for (const r of this.base.propostas)
      if (r.pedido !== '' && !proposta.has(r.pedido)) proposta.set(r.pedido, r.proposta)
    const linhas = this.peds.map((p): Celula[] => {
      const n = nota.get(p.pedido)
      return [
        p.pedido,
        n ? 'Sim' : 'Não',
        dia(p.data),
        n ? dia(n.data) : null,
        n?.nf ?? '',
        p.cliente,
        p.total_pedido,
        p.vendedor,
        cidadeDe(p),
        proposta.get(p.pedido) ?? '',
      ]
    })
    // sort_values(['Data do pedido', 'Pedido'], ascending=False)
    linhas.sort((a, b) => {
      for (const j of [2, 0]) {
        const x = a[j] as string | null,
          y = b[j] as string | null
        if (x === y) continue
        if (x === null) return 1
        if (y === null) return -1
        return x < y ? 1 : -1
      }
      return 0
    })
    return { colunas, linhas }
  }

  /** Pedidos da aba Pedidos conforme período e status, com a explicação do que é mostrado. */
  pedidosFiltrados(): { tabela: Tabela; explicacao: string } {
    const todos = this.todosPedidos()
    const so = (ids: Set<string>) => ({
      ...todos,
      linhas: todos.linhas.filter((l) => ids.has(l[0] as string)),
    })
    const f = this.filtro
    if (f === TODOS) {
      return {
        tabela: {
          ...todos,
          linhas: todos.linhas.filter((l) => entre(l[2] as Dia | null, this.p.inicio, this.p.fim)),
        },
        explicacao: 'Pedidos feitos no período (pela data do pedido).',
      }
    }
    if (f === C.ENTREGUE || f === C.FATURADO) {
      const refs = new Set(
        this.conjunto(f)
          .map((r) => r.ref)
          .filter(Boolean)
      )
      return {
        tabela: so(refs),
        explicacao:
          f === C.ENTREGUE
            ? 'Pedidos entregues no período (pela data da nota fiscal).'
            : 'Pedidos das notas emitidas no período.',
      }
    }
    if (f === C.APROVADO) {
      const chaves = new Set(this.conjunto(C.APROVADO).map((r) => r.chave))
      const peds = new Set(
        this.base.propostas
          .filter((r) => chaves.has(r.proposta))
          .map((r) => r.pedido)
          .filter(Boolean)
      )
      return {
        tabela: so(peds),
        explicacao: 'Pedidos gerados pelas propostas aprovadas no período.',
      }
    }
    return {
      tabela: { ...todos, linhas: [] },
      explicacao: `Propostas com status '${f}' ainda não geraram pedido.`,
    }
  }

  /** Propostas da aba Feedback conforme período e status. */
  propostasFiltradas(): Proposta[] {
    const pr = this.base.propostas
    const { inicio: ini, fim } = this.p
    if (this.filtro === TODOS) {
      return pr.filter((r) =>
        [r.data, r.dt_aprovacao, r.dt_cancelamento, r.dt_entrega, r.dt_faturamento].some((d) =>
          entre(dia(d), ini, fim)
        )
      )
    }
    if (this.filtro === C.ENTREGUE || this.filtro === C.FATURADO) {
      const refs = new Set(
        this.conjunto(this.filtro)
          .map((r) => r.ref)
          .filter(Boolean)
      )
      return pr.filter((r) => refs.has(r.pedido))
    }
    const chaves = new Set(this.conjunto(this.filtro).map((r) => r.chave))
    return pr.filter((r) => chaves.has(r.proposta))
  }

  /** Itens (produto, un, qtd, valor) dos registros do conjunto. */
  itens(status: string, conj: Registro[]) {
    const refs = new Set(conj.map((r) => r.ref))
    if (status === C.ENTREGUE || status === C.FATURADO) {
      refs.delete('')
      return this.base.pedidos
        .filter((it) => refs.has(it.pedido))
        .map((it) => ({ produto: it.produto, un: it.un, qtd: it.qtd, valor: it.vlr_item }))
    }
    return this.base.itensPropostas
      .filter((it) => refs.has(it.proposta))
      .map((it) => ({ produto: it.produto, un: it.un, qtd: it.qtd, valor: it.vlr_total }))
  }

  // ------------------------------------------------------------ KPIs

  kpis(): KPI[] {
    this._kpis ??= this.filtro === TODOS ? this.kpisTodos() : this.kpisFoco(this.filtro)
    return this._kpis
  }

  /** [título, KPIs]: primeiro os destaques, depois os blocos por etapa do fluxo. */
  grupos(): [string, KPI[]][] {
    const k = this.kpis()
    if (this.filtro === TODOS) {
      const porNome = new Map(k.map((x) => [x.nome, x]))
      return GRUPOS_TODOS.map(([t, nomes]) => [t, nomes.map((n) => porNome.get(n)!)])
    }
    return [
      ['Destaques', [k[1], k[0], k[2]]],
      ['Indicadores', k.slice(3)],
    ]
  }

  // ------------------------------------------------------------ comparação A x B

  get nomeA() {
    return this.p.curto
  }

  get nomeB() {
    return this.ant.curto !== this.p.curto ? this.ant.curto : this.ant.curto + ' (B)'
  }

  /** Quanto do período B a base cobre: 'total', 'parcial' ou 'nenhuma'. */
  get coberturaB(): 'total' | 'parcial' | 'nenhuma' {
    const [ini, fim] = this.base.cobertura()
    const b = this.ant
    if (!this.compara) return 'total'
    if (ini === null || b.fim < ini || b.inicio > fim!) return 'nenhuma'
    return b.inicio < ini || b.fim > fim! ? 'parcial' : 'total'
  }

  /** Sem comparação: tira as colunas do período B (anterior, diferença, variação). */
  private semB(t: Tabela): Tabela {
    if (this.compara) return t
    const manter = t.colunas.map(
      (c) => !(c.includes('anterior') || c === 'Diferença' || c === 'Variação')
    )
    return {
      colunas: t.colunas.filter((_, j) => manter[j]),
      linhas: t.linhas.map((l) => l.filter((_, j) => manter[j])),
    }
  }

  /** 'Valor anterior' -> 'Valor (Set/26)' para exibição. */
  renomear(t: Tabela): Tabela {
    return { ...t, colunas: t.colunas.map((c) => c.replace('anterior', `(${this.nomeB})`)) }
  }

  private carteira(d: Dia) {
    return soma(
      this.props
        .filter((r) => r.data !== null && r.data <= d && !this.decidida(r, d))
        .map((r) => r.valor)
    )
  }

  /**
   * Valor acumulado dia a dia de A e de B, alinhados pelo dia do período (Em processo:
   * carteira no dia). Dias depois do último dia com dados ficam vazios.
   * Colunas: Dia, Rótulo, <A>, <B>.
   */
  acumulado(status?: string): Tabela {
    const st = status ?? this.focoOuFaturado()
    const ultimo = this.base.cobertura()[1]
    const serie = (per: Periodo): (number | null)[] => {
      const dias = intervalo(per.inicio, per.fim)
      let v: number[]
      if (st === C.PROCESSO) v = dias.map((d) => this.carteira(d))
      else {
        const porDia = somaPor(
          this.conjunto(st, per),
          (r) => r.data,
          (r) => r.valor
        )
        let acc = 0
        v = dias.map((d) => (acc += porDia.get(d) ?? 0))
      }
      return dias.map((d, i) => (ultimo !== null && d > ultimo ? null : v[i]))
    }
    const a = serie(this.p)
    let b = serie(this.ant)
    if (this.coberturaB === 'nenhuma') b = b.map(() => null) // sem dados de B: linha vazia em vez de zerada
    const n = Math.max(a.length, b.length)
    const semana = this.p.tipo === 'Semana' && this.ant.tipo === 'Semana'
    const linhas: Celula[][] = Array.from({ length: n }, (_, i) => [
      i + 1,
      semana ? DIAS[i % 7].slice(0, 3) : String(i + 1),
      a[i] ?? null,
      b[i] ?? null,
    ])
    if (this.compara) return { colunas: ['Dia', 'Rótulo', this.nomeA, this.nomeB], linhas }
    return {
      colunas: ['Dia', 'Rótulo', this.nomeA],
      linhas: linhas.filter((l) => l[2] !== null).map((l) => l.slice(0, 3)),
    }
  }

  private por(col: 'cliente' | 'vendedor' | 'produto' | 'cidade', per: Periodo) {
    const st = this.focoOuFaturado()
    const c = this.conjunto(st, per)
    if (col === 'produto')
      return somaPor(
        this.itens(st, c),
        (x) => x.produto,
        (x) => x.valor
      )
    return somaPor(
      c,
      (x) => x[col],
      (x) => x.valor
    )
  }

  /** Acrescenta Valor anterior, Diferença e Variação a um ranking (linhas escolhidas pelo período A). */
  private comAnterior(t: Tabela, col: 'cliente' | 'produto' | 'cidade'): Tabela {
    if (!this.compara) return t
    const b = this.por(col, this.ant)
    const jValor = t.colunas.indexOf('Valor')
    return {
      colunas: [...t.colunas, 'Valor anterior', 'Diferença', 'Variação'],
      linhas: t.linhas.map((l) => {
        const ant = b.get(l[0] as string) ?? 0
        return [...l, ant, ...diferenca(l[jValor] as number, ant)]
      }),
    }
  }

  /** Maiores altas e maiores quedas de valor entre A e B (inclui quem só aparece em um dos dois). */
  variacoes(dim: Dimensao = 'Clientes', n = 5): Tabela {
    const [col, nome] = DIMENSOES[dim]
    const a = this.por(col, this.p),
      b = this.por(col, this.ant)
    const chaves = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) =>
      x < y ? -1 : x > y ? 1 : 0
    )
    const t = chaves.map((k) => {
      const va = a.get(k) ?? 0,
        vb = b.get(k) ?? 0
      const [d, v] = diferenca(va, vb)
      return { k, va, vb, d, v }
    })
    const altas = desc(
      t.filter((x) => x.d > 0.005),
      (x) => x.d
    ).slice(0, n)
    const quedas = desc(
      t.filter((x) => x.d < -0.005),
      (x) => -x.d
    ).slice(0, n)
    return {
      colunas: ['Movimento', nome, 'Valor', 'Valor anterior', 'Diferença', 'Variação'],
      linhas: [
        ...altas.map((x) => ['Alta', x.k, x.va, x.vb, x.d, x.v]),
        ...quedas.map((x) => ['Queda', x.k, x.va, x.vb, x.d, x.v]),
      ],
    }
  }

  private kpisTodos(): KPI[] {
    const calc = (per: Periodo): (number | null)[] => {
      const fat = this.conjunto(C.FATURADO, per),
        ent = this.conjunto(C.ENTREGUE, per)
      const apr = this.conjunto(C.APROVADO, per),
        can = this.conjunto(C.CANCELADO, per)
      const car = this.conjunto(C.PROCESSO, per)
      const emit = this.props.filter((r) => entre(r.data, per.inicio, per.fim))
      const decid = apr.length + can.length
      const vFat = soma(fat.map((x) => x.valor))
      return [
        vFat,
        fat.length,
        fat.length ? vFat / fat.length : 0,
        new Set(fat.map((x) => x.cliente)).size,
        soma(ent.map((x) => x.valor)),
        ent.length,
        soma(apr.map((x) => x.valor)),
        emit.length,
        decid ? apr.length / decid : null,
        can.length,
        soma(car.map((x) => x.valor)),
        soma(this.aguardandoNota(per).linhas.map((l) => l[3] as number)),
      ]
    }
    const a = calc(this.p),
      b = calc(this.ant)
    const nomes = [
      'Faturamento (notas)',
      'Notas emitidas',
      'Ticket médio por nota',
      'Clientes faturados',
      'Entregue (pedidos)',
      'Pedidos entregues',
      'Vendas aprovadas',
      'Propostas emitidas',
      'Taxa de aprovação',
      'Propostas canceladas',
      'Carteira em processo',
      'Aguardando nota',
    ]
    const fmts: FormatoKpi[] = [
      'moeda',
      'int',
      'moeda',
      'int',
      'moeda',
      'int',
      'moeda',
      'int',
      'pct',
      'int',
      'moeda',
      'moeda',
    ]
    return nomes.map((n, i) => new KPI(n, a[i] ?? 0, b[i], fmts[i], i === 9 || i === 11))
  }

  private kpisFoco(st: string): KPI[] {
    const media = (xs: number[]) => (xs.length ? soma(xs) / xs.length : 0)
    const calc = (per: Periodo): number[] => {
      const c = this.conjunto(st, per)
      const q = c.length,
        v = soma(c.map((x) => x.valor))
      const base = [q, v, q ? v / q : 0, new Set(c.map((x) => x.cliente)).size]
      const cidades = new Set(c.map((x) => x.cidade)).size
      const dias = c.filter((x) => x.criacao !== null).map((x) => difDias(x.data, x.criacao!))
      let extra: number[]
      if (st === C.FATURADO) extra = [cidades, c.filter((x) => x.info === 'sem pedido').length]
      else if (st === C.ENTREGUE)
        extra = [cidades, soma(this.aguardandoNota(per).linhas.map((l) => l[3] as number))]
      else if (st === C.APROVADO)
        extra = [
          c.filter((x) => x.info.startsWith(C.ENTREGUE) || x.info.startsWith(C.FATURADO)).length,
          media(dias),
        ]
      else if (st === C.CANCELADO) extra = [c.filter((x) => x.motivo === '').length, media(dias)]
      else {
        const idade = c.filter((x) => x.criacao !== null).map((x) => difDias(per.fim, x.criacao!))
        extra = [idade.filter((d) => d > 30).length, media(idade)]
      }
      return [...base, ...extra].map((x) => (Number.isNaN(x) ? 0 : x))
    }
    const a = calc(this.p),
      b = calc(this.ant)
    const nomes = {
      [C.FATURADO]: [
        'Notas emitidas',
        'Faturamento',
        'Ticket médio',
        'Clientes',
        'Cidades',
        'Notas sem pedido',
      ],
      [C.ENTREGUE]: [
        'Pedidos entregues',
        'Valor entregue',
        'Ticket médio',
        'Clientes',
        'Cidades',
        'Aguardando nota',
      ],
      [C.APROVADO]: [
        'Propostas aprovadas',
        'Valor aprovado',
        'Ticket médio',
        'Clientes',
        'Já entregues/faturadas',
        'Dias médios até aprovar',
      ],
      [C.CANCELADO]: [
        'Propostas canceladas',
        'Valor perdido',
        'Ticket médio',
        'Clientes',
        'Sem motivo informado',
        'Dias médios até cancelar',
      ],
      [C.PROCESSO]: [
        'Propostas em aberto',
        'Valor em aberto',
        'Ticket médio',
        'Clientes',
        'Paradas há mais de 30 dias',
        'Idade média (dias)',
      ],
    }[st]!
    const fmts: FormatoKpi[] = ['int', 'moeda', 'moeda', 'int', 'int', 'dias']
    if (st === C.ENTREGUE) fmts[5] = 'moeda'
    const inverso = st === C.CANCELADO
    return nomes.map(
      (n, i) =>
        new KPI(
          n,
          a[i],
          b[i],
          fmts[i],
          inverso ||
            (st === C.PROCESSO && i >= 4) ||
            (st === C.ENTREGUE && i === 5) ||
            (st === C.FATURADO && i === 5)
        )
    )
  }

  // ------------------------------------------------------------ evolução

  private baldes(per: Periodo) {
    const fim = per.fim
    const ini = per.tipo === 'Dia' ? addDias(fim, -6) : per.inicio
    const g = new Periodo('Personalizado', ini, fim).granularidade()
    const mapa = intervalo(ini, fim).map((d) => {
      if (g === 'dia')
        return {
          dia: d,
          balde: d,
          rotulo: `${DIAS[diaSemana(d)].slice(0, 3)} ${formatar(d, '%d/%m')}`,
        }
      if (g === 'semana') {
        const seg = addDias(d, -diaSemana(d))
        return { dia: d, balde: seg, rotulo: `Sem ${formatar(seg, '%d/%m')}` }
      }
      const m1 = `${d.slice(0, 7)}-01`
      return {
        dia: d,
        balde: m1,
        rotulo: `${MESES[mes(d) - 1].slice(0, 3)}/${String(ano(d)).slice(2)}`,
      }
    })
    return { g, mapa, ini, fim }
  }

  /** Todos: Faturado x Entregue por balde. Foco: valor e qtd do status (Processo: carteira por idade). */
  evolucao(): Tabela {
    if (this.filtro === C.PROCESSO) {
      const faixas = [
        '0 a 7 dias',
        '8 a 15 dias',
        '16 a 30 dias',
        '31 a 60 dias',
        '61 a 90 dias',
        'Mais de 90 dias',
      ]
      const limites = [7, 15, 30, 60, 90, 10 ** 6]
      const t = faixas.map(() => ({ v: 0, q: 0 }))
      for (const c of this.conjunto(C.PROCESSO)) {
        if (c.criacao === null) continue
        const idade = difDias(this.p.fim, c.criacao)
        const j = limites.findIndex((l) => idade <= l)
        if (j >= 0 && idade > -1) {
          t[j].v += c.valor
          t[j].q++
        }
      }
      return {
        colunas: ['Idade', 'Valor', 'Qtd'],
        linhas: faixas.map((f, j) => [f, t[j].v, t[j].q]),
      }
    }
    const { g, mapa, ini, fim } = this.baldes(this.p)
    const per = new Periodo('Personalizado', ini, fim)
    const baldeDoDia = new Map(mapa.map((x) => [x.dia, x.balde]))
    const baldes = [...new Map(mapa.map((x) => [x.balde, x.rotulo])).entries()].sort(([a], [b]) =>
      a < b ? -1 : 1
    )
    const series = this.filtro === TODOS ? [C.FATURADO, C.ENTREGUE] : [this.filtro]
    const colunas = [
      g.charAt(0).toUpperCase() + g.slice(1),
      ...series,
      ...(this.filtro !== TODOS ? ['Qtd'] : []),
    ]
    const valores = series.map((st) => {
      const c = this.conjunto(st, per).filter((r) => baldeDoDia.has(r.data))
      return {
        v: somaPor(
          c,
          (r) => baldeDoDia.get(r.data)!,
          (r) => r.valor
        ),
        q: somaPor(
          c,
          (r) => baldeDoDia.get(r.data)!,
          () => 1
        ),
      }
    })
    return {
      colunas,
      linhas: baldes.map(([b, rot]) => [
        rot,
        ...valores.map((s) => s.v.get(b) ?? 0),
        ...(this.filtro !== TODOS ? [valores[0].q.get(b) ?? 0] : []),
      ]),
    }
  }

  // ------------------------------------------------------------ rankings

  private focoOuFaturado() {
    return this.filtro === TODOS ? C.FATURADO : this.filtro
  }

  vendedores(): Tabela {
    if (this.filtro !== TODOS) {
      const a = agrupar(
        this.conjunto(this.filtro),
        (x) => x.vendedor,
        () => ({ q: 0, v: 0 }),
        (s, x) => {
          s.q++
          s.v += x.valor
        }
      )
      const b = somaPor(
        this.conjunto(this.filtro, this.ant),
        (x) => x.vendedor,
        (x) => x.valor
      )
      const linhas = desc([...a.entries()], ([, s]) => s.v).map(([k, s]) => {
        const ant = b.get(k) ?? 0
        return [k, s.q, s.v, ant, ...diferenca(s.v, ant)]
      })
      return this.semB({
        colunas: ['Vendedor', 'Qtd', 'Valor', 'Valor anterior', 'Diferença', 'Variação'],
        linhas,
      })
    }
    const conta = <T>(xs: T[], k: (x: T) => string) => somaPor(xs, k, () => 1)
    const fat = this.conjunto(C.FATURADO)
    const emit = this.props.filter((r) => entre(r.data, this.p.inicio, this.p.fim))
    const series = [
      somaPor(
        fat,
        (x) => x.vendedor,
        (x) => x.valor
      ),
      conta(fat, (x) => x.vendedor),
      somaPor(
        this.conjunto(C.ENTREGUE),
        (x) => x.vendedor,
        (x) => x.valor
      ),
      somaPor(
        this.conjunto(C.APROVADO),
        (x) => x.vendedor,
        (x) => x.valor
      ),
      conta(emit, (x) => x.vendedor),
      conta(this.conjunto(C.CANCELADO), (x) => x.vendedor),
      somaPor(
        this.conjunto(C.FATURADO, this.ant),
        (x) => x.vendedor,
        (x) => x.valor
      ),
    ]
    const chaves = [...new Set(series.flatMap((s) => [...s.keys()]))].sort((x, y) =>
      x < y ? -1 : x > y ? 1 : 0
    )
    const linhas = desc(
      chaves
        .map((k) => series.map((s) => s.get(k) ?? 0))
        .map((v, i) => ({ k: chaves[i], v }))
        .filter(({ v }) => v.slice(0, 6).some((x) => x !== 0)),
      ({ v }) => v[0]
    ).map(({ k, v }) => [k, ...v, ...diferenca(v[0], v[6])])
    return this.semB({
      colunas: [
        'Vendedor',
        'Faturado',
        'Notas',
        'Entregue',
        'Aprovado',
        'Propostas',
        'Canceladas',
        'Faturado anterior',
        'Diferença',
        'Variação',
      ],
      linhas,
    })
  }

  clientes(n = 10): Tabela {
    const g = agrupar(
      this.conjunto(this.focoOuFaturado()),
      (x) => x.cliente,
      () => ({ c: null as string | null, q: 0, v: 0 }),
      (s, x) => {
        s.c ??= x.cidade
        s.q++
        s.v += x.valor
      }
    )
    const linhas = desc([...g.entries()], ([, s]) => s.v)
      .slice(0, n)
      .map(([k, s]) => [k, s.c, s.q, s.v])
    return this.comAnterior({ colunas: ['Cliente', 'Cidade', 'Qtd', 'Valor'], linhas }, 'cliente')
  }

  cidades(n = 10): Tabela {
    const g = agrupar(
      this.conjunto(this.focoOuFaturado()),
      (x) => x.cidade,
      () => ({ q: 0, v: 0 }),
      (s, x) => {
        s.q++
        s.v += x.valor
      }
    )
    const linhas = desc([...g.entries()], ([, s]) => s.v)
      .slice(0, n)
      .map(([k, s]) => [k, s.q, s.v])
    return this.comAnterior({ colunas: ['Cidade', 'Qtd', 'Valor'], linhas }, 'cidade')
  }

  produtos(n = 10): Tabela {
    const st = this.focoOuFaturado()
    const g = agrupar(
      this.itens(st, this.conjunto(st)),
      (x) => x.produto,
      () => ({ un: null as string | null, q: 0, v: 0 }),
      (s, x) => {
        s.un ??= x.un
        s.q += x.qtd
        s.v += x.valor
      }
    )
    const linhas = desc([...g.entries()], ([, s]) => s.v)
      .slice(0, n)
      .map(([k, s]) => [k, s.un, s.q, s.v])
    return this.comAnterior(
      { colunas: ['Produto', 'Un', 'Quantidade', 'Valor'], linhas },
      'produto'
    )
  }

  /** Propostas emitidas no período e a situação atual delas. */
  funil(): Tabela {
    const e = this.props.filter((r) => entre(r.data, this.p.inicio, this.p.fim))
    const aprov = e.filter((r) => APROVADOS.includes(r.status))
    const etapas: [string, Props[]][] = [
      ['Propostas emitidas', e],
      ['Em processo', e.filter((r) => r.status === C.PROCESSO)],
      ['Aprovadas', aprov],
      ['Com pedido, aguardando nota', aprov.filter((r) => r.pedido !== '' && r.nf === '')],
      ['Entregues (com nota)', e.filter((r) => r.status === C.FATURADO)],
      ['Canceladas', e.filter((r) => r.status === C.CANCELADO)],
    ]
    return {
      colunas: ['Etapa', 'Qtd', 'Valor', '% das emitidas'],
      linhas: etapas.map(([n, d]) => [
        n,
        d.length,
        soma(d.map((r) => r.valor)),
        e.length ? d.length / e.length : 0,
      ]),
    }
  }

  motivos(): Tabela {
    const g = agrupar(
      this.conjunto(C.CANCELADO),
      (x) => x.motivo || 'Não informado',
      () => ({ q: 0, v: 0 }),
      (s, x) => {
        s.q++
        s.v += x.valor
      }
    )
    return {
      colunas: ['Motivo', 'Qtd', 'Valor'],
      linhas: desc([...g.entries()], ([, s]) => s.q).map(([k, s]) => [k, s.q, s.v]),
    }
  }

  lista(status?: string, n?: number): Tabela {
    const st = status ?? this.focoOuFaturado()
    let c = desc(this.conjunto(st), (x) => x.valor)
    if (n) c = c.slice(0, n)
    const rot = {
      [C.FATURADO]: ['Nota', 'Emissão', 'Pedido'],
      [C.ENTREGUE]: ['Pedido', 'Entrega', 'Nota'],
      [C.APROVADO]: ['Proposta', 'Aprovada em', 'Status'],
      [C.CANCELADO]: ['Proposta', 'Cancelada em', 'Status'],
      [C.PROCESSO]: ['Proposta', 'Criação', 'Idade'],
    }[st]!
    return {
      colunas: [rot[0], 'Cliente', 'Vendedor', 'Valor', rot[1], rot[2], 'Motivo', 'Comentário'],
      linhas: c.map((x) => [
        x.chave,
        x.cliente,
        x.vendedor,
        x.valor,
        x.data,
        x.info,
        x.motivo,
        x.comentario,
      ]),
    }
  }

  // ------------------------------------------------------------ Excel

  /** Abas do Excel do relatório (port de tabelas_excel). Indicadores trazem o formato por linha. */
  tabelasExcel(): Record<string, Tabela & { formatos?: FormatoKpi[] }> {
    const k = this.kpis()
    const formatos = k.map((x) => x.formato)
    const ind = this.compara
      ? {
          colunas: ['Indicador', this.nomeA, this.nomeB, 'Diferença', 'Variação'],
          linhas: k.map((x) => [x.nome, x.atual, x.anterior, x.delta, x.variacao]),
          formatos,
        }
      : { colunas: ['Indicador', 'Valor'], linhas: k.map((x) => [x.nome, x.atual]), formatos }
    const mov: Tabela = {
      colunas: [
        'Dimensão',
        'Movimento',
        'Nome',
        'Valor',
        'Valor anterior',
        'Diferença',
        'Variação',
      ],
      linhas: (Object.keys(DIMENSOES) as Dimensao[]).flatMap((d) =>
        this.variacoes(d, 10).linhas.map((l) => [d, l[0], l[1], l[2], l[3], l[4], l[5]])
      ),
    }
    const ac = this.acumulado()
    const t: Record<string, Tabela & { formatos?: FormatoKpi[] }> = {
      Indicadores: ind,
      Acumulado: {
        colunas: ac.colunas.filter((c) => c !== 'Rótulo'),
        linhas: ac.linhas.map((l) => l.filter((_, j) => ac.colunas[j] !== 'Rótulo')),
      },
      'Altas e quedas': this.renomear(mov),
      Evolução: this.evolucao(),
      Vendedores: this.renomear(this.vendedores()),
      Clientes: this.renomear(this.clientes(50)),
      Produtos: this.renomear(this.produtos(50)),
      Cidades: this.renomear(this.cidades(50)),
    }
    if (!this.compara) {
      delete t.Acumulado
      delete t['Altas e quedas']
    }
    if (this.filtro === TODOS) {
      t.Funil = this.funil()
      t.Aprovadas = this.lista(C.APROVADO)
      t.Canceladas = this.lista(C.CANCELADO)
      t['Aguardando nota'] = this.aguardandoNota()
      t.Notas = this.lista(C.FATURADO)
    } else {
      t.Detalhamento = this.lista()
      if (this.filtro === C.CANCELADO) t.Motivos = this.motivos()
      if (this.filtro === C.ENTREGUE) t['Aguardando nota'] = this.aguardandoNota()
    }
    return t
  }
}
