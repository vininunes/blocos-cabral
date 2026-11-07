/** Pedidos, rankings, Provisão e Detalhamento: base inteira, sem comparação; indicadores no período. */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { guardarEmEntrada } from '../server/relatorio/base'
import { criarServico } from '../server/relatorio/servico'
import { arquivos } from './comum'

describe('abas da base inteira', () => {
  it('ignoram o período escolhido; indicadores seguem o período', async () => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'app-'))
    const pastas = {
      entrada: path.join(raiz, 'entrada'),
      dados: path.join(raiz, 'dados'),
      saida: path.join(raiz, 'saida'),
    }
    const s = criarServico(pastas)
    await s.pronto
    for (const a of arquivos()) guardarEmEntrada(pastas.entrada, a.nome, a.conteudo)
    await s.importarPasta()

    const consulta = (tipo: 'Dia' | 'Ano', ancora: string) =>
      s.relatorio({ tipo, ancora, modo: 'Período anterior', filtro: 'Todos' })
    const dia = consulta('Dia', '2026-10-14')
    const ano = consulta('Ano', '2026-10-14')

    expect(dia.todo).toEqual(ano.todo)
    expect(dia.todo.inicio <= dia.a.inicio && dia.todo.fim >= dia.a.fim).toBe(true)
    for (const k of [
      'pedidos',
      'vendedores',
      'clientes',
      'produtos',
      'cidades',
      'detalhamento',
      'provisao',
    ] as const)
      expect(dia[k], k).toEqual(ano[k])
    // sem colunas do período de comparação
    expect(dia.clientes.colunas).toEqual(['Cliente', 'Cidade', 'Qtd', 'Valor'])
    // indicadores mudam com o período
    expect(dia.grupos).not.toEqual(ano.grupos)
  })
})
