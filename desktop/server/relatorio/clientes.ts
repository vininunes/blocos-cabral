/**
 * Indicadores por cliente e o estimador Curva ABC / potencial.
 *
 * - Compras = notas fiscais do cliente (faturamento, como no relatório). Nota ligada a pedido
 *   herda o CNPJ do pedido; nota sem pedido fica pelo nome.
 * - Curva ABC por grupo econômico (o grupo junta vários CNPJs/nomes; sem grupo, o próprio
 *   cliente): A = clientes que somam os primeiros 80% do faturamento, B = até 95%, C = o resto.
 * - Tendência: faturamento dos últimos 90 dias (até o fim dos dados) contra os 90 anteriores;
 *   sem histórico quando a base não cobre os 180 dias.
 * - Potencial = carteira em aberto (propostas em processo) + pedidos aguardando nota.
 */
import { chaveCliente, type Base } from './base'
import * as C from './config'
import { addDias, agora, dia, difDias, type Dia } from './datas'
import { taxaNoDia } from './provisao'
import type { Cliente } from './tipos'

export const LIMITE_A = 0.8
export const LIMITE_B = 0.95
export const JANELA_TENDENCIA = 90
export const VARIACAO_ESTAVEL = 0.1

export type ClasseAbc = 'A' | 'B' | 'C' | '-'
export type Tendencia = 'crescendo' | 'estável' | 'caindo' | 'sem histórico' | '-'

export type ClienteIndicadores = Cliente & {
  /** Grupo usado nos estimadores: o grupo econômico ou, sem grupo, o próprio cliente. */
  grupo_chave: string
  grupo_nome: string
  faturamento: number
  notas: number
  pedidos: number
  primeira_compra: Dia | null
  ultima_compra: Dia | null
  dias_sem_comprar: number | null
  intervalo_medio: number | null
  ticket_medio: number
  propostas: number
  propostas_aprovadas: number
  propostas_canceladas: number
  conversao: number | null
  carteira_aberta: number
  aguardando_nota: number
  /** Estimador (por grupo): classe ABC, participação no faturamento, tendência e potencial. */
  abc: ClasseAbc
  participacao: number
  participacao_acumulada: number
  tendencia: Tendencia
  faturamento_90d: number
  faturamento_90d_anterior: number
  potencial: number
  /** Provisão vigente hoje (R$ por dia útil); 0 = sem provisão. */
  provisao_dia: number
}

export type ResumoAbc = Record<'A' | 'B' | 'C', { grupos: number; faturamento: number }> & {
  referencia: Dia | null
  total: number
}

const APROVADOS: string[] = [C.APROVADO, C.ENTREGUE, C.FATURADO]

export function indicadoresClientes(base: Base): {
  clientes: ClienteIndicadores[]
  resumo: ResumoAbc
} {
  base.sincronizarClientes()
  const [inicio, fim] = base.cobertura()
  const ref = fim
  const novo = () => ({
    faturamento: 0,
    notas: 0,
    pedidos: 0,
    datas: new Set<Dia>(),
    propostas: 0,
    aprovadas: 0,
    canceladas: 0,
    carteira: 0,
    aguardando: 0,
    f90: 0,
    f90ant: 0,
  })
  const acc = new Map<string, ReturnType<typeof novo>>()
  const de = (chave: string) => {
    let a = acc.get(chave)
    if (!a) acc.set(chave, (a = novo()))
    return a
  }
  const janela = ref
    ? {
        ini: addDias(ref, -(JANELA_TENDENCIA - 1)),
        iniAnt: addDias(ref, -(2 * JANELA_TENDENCIA - 1)),
      }
    : null

  for (const n of base.notas) {
    const a = de(chaveCliente(n.cnpj, n.cliente))
    a.faturamento += n.total_nota
    a.notas++
    const d = dia(n.data)
    if (d) {
      a.datas.add(d)
      if (janela && d <= ref!) {
        if (d >= janela.ini) a.f90 += n.total_nota
        else if (d >= janela.iniAnt) a.f90ant += n.total_nota
      }
    }
  }
  const comNota = new Set(base.notas.map((n) => n.pedido).filter(Boolean))
  for (const p of base.pedidosAgregados()) {
    const a = de(chaveCliente(p.cnpj, p.cliente))
    a.pedidos++
    if (!comNota.has(p.pedido)) a.aguardando += p.total_pedido
  }
  for (const p of base.propostas) {
    const a = de(chaveCliente(p.cnpj, p.cliente))
    a.propostas++
    if (APROVADOS.includes(p.status)) a.aprovadas++
    else if (p.status === C.CANCELADO) a.canceladas++
    else a.carteira += p.valor
  }

  const linhas = base.t.clientes.map((c): ClienteIndicadores => {
    const a = acc.get(c.chave) ?? novo()
    const datas = [...a.datas].sort()
    const intervalos = datas.slice(1).map((d, i) => difDias(d, datas[i]))
    const decididas = a.aprovadas + a.canceladas
    return {
      ...c,
      grupo_chave: c.grupo ? `grupo:${c.grupo.toLowerCase()}` : c.chave,
      grupo_nome: c.grupo || c.nome,
      faturamento: a.faturamento,
      notas: a.notas,
      pedidos: a.pedidos,
      primeira_compra: datas[0] ?? null,
      ultima_compra: datas.at(-1) ?? null,
      dias_sem_comprar: ref && datas.length ? difDias(ref, datas.at(-1)!) : null,
      intervalo_medio: intervalos.length
        ? intervalos.reduce((x, y) => x + y, 0) / intervalos.length
        : null,
      ticket_medio: a.notas ? a.faturamento / a.notas : 0,
      propostas: a.propostas,
      propostas_aprovadas: a.aprovadas,
      propostas_canceladas: a.canceladas,
      conversao: decididas ? a.aprovadas / decididas : null,
      carteira_aberta: a.carteira,
      aguardando_nota: a.aguardando,
      abc: '-',
      participacao: 0,
      participacao_acumulada: 0,
      tendencia: '-',
      faturamento_90d: a.f90,
      faturamento_90d_anterior: a.f90ant,
      potencial: 0,
      provisao_dia: taxaNoDia(base.provisoesDe(c.chave), agora().slice(0, 10)),
    }
  })

  // estimador por grupo econômico
  type G = { faturamento: number; f90: number; f90ant: number; potencial: number }
  const grupos = new Map<string, G>()
  for (const l of linhas) {
    const g = grupos.get(l.grupo_chave) ?? { faturamento: 0, f90: 0, f90ant: 0, potencial: 0 }
    g.faturamento += l.faturamento
    g.f90 += l.faturamento_90d
    g.f90ant += l.faturamento_90d_anterior
    g.potencial += l.carteira_aberta + l.aguardando_nota
    grupos.set(l.grupo_chave, g)
  }
  const total = [...grupos.values()].reduce((s, g) => s + g.faturamento, 0)
  const ordem = [...grupos.entries()]
    .filter(([, g]) => g.faturamento > 0)
    .sort((x, y) => y[1].faturamento - x[1].faturamento || (x[0] < y[0] ? -1 : 1))
  const classe = new Map<string, { abc: ClasseAbc; part: number; acum: number }>()
  let acum = 0
  for (const [k, g] of ordem) {
    const antes = acum
    acum += g.faturamento / total
    // a classe vem da participação acumulada ANTES do grupo: quem cruza os 80% ainda é A
    classe.set(k, {
      abc: antes < LIMITE_A ? 'A' : antes < LIMITE_B ? 'B' : 'C',
      part: g.faturamento / total,
      acum,
    })
  }
  const temHistorico = !!(inicio && janela && inicio <= janela.iniAnt)
  const tendencia = (g: G): Tendencia => {
    if (!g.f90 && !g.f90ant) return '-'
    if (!temHistorico) return 'sem histórico'
    if (!g.f90ant) return 'crescendo'
    const v = g.f90 / g.f90ant - 1
    return v > VARIACAO_ESTAVEL ? 'crescendo' : v < -VARIACAO_ESTAVEL ? 'caindo' : 'estável'
  }
  for (const l of linhas) {
    const g = grupos.get(l.grupo_chave)!
    const cl = classe.get(l.grupo_chave)
    l.abc = cl?.abc ?? '-'
    l.participacao = cl?.part ?? 0
    l.participacao_acumulada = cl?.acum ?? 0
    l.tendencia = tendencia(g)
    l.potencial = g.potencial
  }

  const resumo: ResumoAbc = {
    A: { grupos: 0, faturamento: 0 },
    B: { grupos: 0, faturamento: 0 },
    C: { grupos: 0, faturamento: 0 },
    referencia: ref,
    total,
  }
  for (const [k, g] of ordem) {
    const r = resumo[classe.get(k)!.abc as 'A' | 'B' | 'C']
    r.grupos++
    r.faturamento += g.faturamento
  }
  linhas.sort((x, y) => y.faturamento - x.faturamento || (x.nome < y.nome ? -1 : 1))
  return { clientes: linhas, resumo }
}
