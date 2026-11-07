/**
 * Provisão x realizado no período: a provisão de cada cliente é o total do mês dividido
 * igualmente pelos dias úteis do mês; o período leva os dias úteis que caem nele. O realizado é
 * o faturamento (notas) do cliente.
 */
import { chaveCliente, type Base } from './base'
import { ano, dia, intervalo, mes, type Dia } from './datas'
import { diasUteisDoMes, diaUtil } from './dias-uteis'
import type { Tabela } from './metricas'
import type { Periodo } from './periodo'
import type { Provisao } from './tipos'

export type ResultadoProvisao = {
  /** Totais dos clientes com provisão no período. */
  provisionado: number
  realizado: number
  atingido: number | null
  /** Faturamento de clientes sem provisão no período (fora da comparação). */
  realizadoSemProvisao: number
  clientesComProvisao: number
  diasUteis: number
  /** Acumulado dia a dia (clientes com provisão): Dia, Rótulo, Realizado, Provisão. */
  acumulado: Tabela
  /** Por cliente: provisionado, realizado, diferença e % atingido. */
  tabela: Tabela
}

/** Provisão do mês de `d` (total do mês); 0 = sem provisão. */
export function provisaoDoMes(lancamentos: Provisao[], d: Dia) {
  const m = `${ano(d)}-${String(mes(d)).padStart(2, '0')}`
  return lancamentos.find((l) => l.mes === m)?.valor ?? 0
}

/** Parte da provisão num dia útil: total do mês / dias úteis do mês. */
export function provisaoNoDia(lancamentos: Provisao[], d: Dia) {
  const total = provisaoDoMes(lancamentos, d)
  return total ? total / diasUteisDoMes(d.slice(0, 7)) : 0
}

export function calcularProvisao(
  base: Base,
  per: Periodo,
  ultimoDiaComDados: Dia | null
): ResultadoProvisao {
  base.sincronizarClientes() // nomes dos clientes (bases antigas podem não ter a tabela)
  const dias = intervalo(per.inicio, per.fim)
  const uteis = dias.filter(diaUtil)
  const porCliente = new Map<string, Provisao[]>()
  for (const p of base.t.provisoes) {
    porCliente.set(p.cliente, [...(porCliente.get(p.cliente) ?? []), p])
  }

  // provisão dia a dia por cliente
  const prov = new Map<string, Map<Dia, number>>()
  for (const [cliente, ls] of porCliente) {
    const m = new Map<Dia, number>()
    for (const d of uteis) {
      const t = provisaoNoDia(ls, d)
      if (t) m.set(d, t)
    }
    if (m.size) prov.set(cliente, m)
  }

  // realizado (notas) dia a dia por cliente
  const real = new Map<string, Map<Dia, number>>()
  for (const n of base.notas) {
    const d = dia(n.data)
    if (!d || d < per.inicio || d > per.fim) continue
    const k = chaveCliente(n.cnpj, n.cliente)
    const m = real.get(k) ?? new Map<Dia, number>()
    m.set(d, (m.get(d) ?? 0) + n.total_nota)
    real.set(k, m)
  }

  const soma = (m?: Map<Dia, number>) => [...(m?.values() ?? [])].reduce((a, b) => a + b, 0)
  const clientes = new Map(base.t.clientes.map((c) => [c.chave, c]))
  const nomeDe = (k: string) => clientes.get(k)?.nome ?? (k.startsWith('nome:') ? k.slice(5) : k)
  const chaves = [...new Set([...prov.keys(), ...real.keys()])]
  const linhas = chaves.map((k) => {
    const provisionado = soma(prov.get(k))
    const realizado = soma(real.get(k))
    return {
      k,
      provisionado,
      realizado,
      linha: [
        nomeDe(k),
        clientes.get(k)?.grupo ?? '',
        prov.get(k)?.size ?? 0,
        provisionado,
        realizado,
        realizado - provisionado,
        provisionado ? realizado / provisionado : null,
      ],
    }
  })
  linhas.sort(
    (x, y) => y.provisionado - x.provisionado || y.realizado - x.realizado || (x.k < y.k ? -1 : 1)
  )

  const com = linhas.filter((l) => l.provisionado > 0)
  const comChaves = new Set(com.map((l) => l.k))
  const provisionado = com.reduce((s, l) => s + l.provisionado, 0)
  const realizado = com.reduce((s, l) => s + l.realizado, 0)
  const realizadoSemProvisao = linhas
    .filter((l) => !comChaves.has(l.k))
    .reduce((s, l) => s + l.realizado, 0)

  // acumulado (clientes com provisão): realizado vazio depois do último dia com dados
  let accP = 0,
    accR = 0
  const acumulado: Tabela = {
    colunas: ['Dia', 'Rótulo', 'Realizado', 'Provisão'],
    linhas: dias.map((d, i) => {
      for (const k of comChaves) {
        accP += prov.get(k)?.get(d) ?? 0
        accR += real.get(k)?.get(d) ?? 0
      }
      const semDados = ultimoDiaComDados !== null && d > ultimoDiaComDados
      return [i + 1, `${d.slice(8, 10)}/${d.slice(5, 7)}`, semDados ? null : accR, accP]
    }),
  }

  return {
    provisionado,
    realizado,
    atingido: provisionado ? realizado / provisionado : null,
    realizadoSemProvisao,
    clientesComProvisao: com.length,
    diasUteis: uteis.length,
    acumulado,
    tabela: {
      colunas: [
        'Cliente',
        'Grupo',
        'Dias úteis',
        'Provisionado',
        'Realizado',
        'Diferença',
        '% atingido',
      ],
      linhas: linhas.map((l) => l.linha),
    },
  }
}
