/** Todas as abas seguem o período escolhido; "Todo o período" cobre a base inteira, sem comparação. */
import { beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { ConsultaRelatorio } from '../server/relatorio/api-tipos'
import { guardarEmEntrada } from '../server/relatorio/base'
import { comparacao, Periodo, TODO_PERIODO } from '../server/relatorio/periodo'
import { criarServico } from '../server/relatorio/servico'
import { arquivos } from './comum'

let s: ReturnType<typeof criarServico>
beforeAll(async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'app-'))
  const pastas = {
    entrada: path.join(raiz, 'entrada'),
    dados: path.join(raiz, 'dados'),
    saida: path.join(raiz, 'saida'),
  }
  s = criarServico(pastas)
  await s.pronto
  for (const a of arquivos()) guardarEmEntrada(pastas.entrada, a.nome, a.conteudo)
  await s.importarPasta()
})

const consulta = (
  tipo: ConsultaRelatorio['tipo'],
  modo: ConsultaRelatorio['modo'] = 'Sem comparação'
) => s.relatorio({ tipo, ancora: '2026-10-14', modo, filtro: 'Todos' })

describe('período nas abas', () => {
  it('pedidos, rankings, provisão e detalhamento mudam com o período', () => {
    const dia = consulta('Dia')
    const ano = consulta('Ano')
    for (const k of ['pedidos', 'clientes', 'produtos', 'detalhamento'] as const)
      expect(dia[k], k).not.toEqual(ano[k])
    expect(dia.provisao.diasUteis).toBeLessThan(ano.provisao.diasUteis)
  })

  it('com comparação, os rankings trazem o período anterior', () => {
    const r = consulta('Mês', 'Período anterior')
    expect(r.b).not.toBeNull()
    expect(r.clientes.colunas.length).toBeGreaterThan(4)
    expect(consulta('Mês').clientes.colunas).toEqual(['Cliente', 'Cidade', 'Qtd', 'Valor'])
  })

  it('Todo o período: do primeiro ao último dia da base, sem comparação nem navegação', () => {
    const [ini, fim] = s.base.extensao()
    const r = consulta(TODO_PERIODO, 'Período anterior')
    expect([r.a.inicio, r.a.fim]).toEqual([ini, fim])
    expect(r.a.tipo).toBe(TODO_PERIODO)
    expect(r.a.rotulo).toMatch(/^Todo o período: /)
    expect(r.b).toBeNull()
    expect(r.compara).toBe(false)
    expect(r.navegacao.anterior.ancora).toBe('2026-10-14')
    expect(r.navegacao.proximo.ancora).toBe('2026-10-14')
    // contém o ano inteiro
    expect(r.pedidos.tabela.linhas.length).toBeGreaterThanOrEqual(
      consulta('Ano').pedidos.tabela.linhas.length
    )
    const p = Periodo.de(TODO_PERIODO, '2026-10-14', '2026-01-02', '2026-10-17')
    expect(comparacao(p, 'Até a mesma data', '2026-10-17')).toEqual([p, null])
  })

  it('exportação segue o período (nome do arquivo e conteúdo)', async () => {
    const g = await s.exportar('excel', {
      tipo: TODO_PERIODO,
      ancora: '2026-10-14',
      modo: 'Sem comparação',
      filtro: 'Todos',
    })
    const [ini, fim] = s.base.extensao()
    expect(g.nome).toBe(`Relatorio_todo-o-periodo_${ini}_a_${fim}.xlsx`)
  })
})
