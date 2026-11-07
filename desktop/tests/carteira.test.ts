/** Carteira em processo: só propostas com até 90 dias; exportação por cliente. */
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { guardarEmEntrada } from '../server/relatorio/base'
import { addDias } from '../server/relatorio/datas'
import { Relatorio } from '../server/relatorio/metricas'
import { Periodo } from '../server/relatorio/periodo'
import { criarServico } from '../server/relatorio/servico'
import { arquivos, baseCom } from './comum'

describe('carteira em processo', () => {
  it('propostas com mais de 90 dias saem da carteira', async () => {
    const { b } = await baseCom()
    const per = Periodo.de('Mês', '2026-10-16')
    const antes = new Relatorio(b, per).kpis().find((k) => k.nome === 'Carteira em processo')!.atual
    // envelhece uma proposta em aberto para 91 dias antes do último dia com dados
    const ultimo = b.extensao()[1]!
    const p = b.propostas.find((x) => x.status === 'Em processo')!
    const original = p.data
    p.data = addDias(ultimo, -91)
    const r = new Relatorio(b, per)
    expect(r.kpis().find((k) => k.nome === 'Carteira em processo')!.atual).toBeCloseTo(
      antes - p.valor,
      2
    )
    p.data = addDias(ultimo, -90) // 90 dias: ainda conta
    expect(
      new Relatorio(b, per).kpis().find((k) => k.nome === 'Carteira em processo')!.atual
    ).toBeCloseTo(antes, 2)
    p.data = original
  })

  it('por cliente: soma = indicador; maiores primeiro', async () => {
    const { b } = await baseCom()
    const r = new Relatorio(b, Periodo.de('Mês', '2026-10-16'))
    const t = r.carteiraPorCliente()
    const j = t.colunas.indexOf('Valor em aberto')
    const total = t.linhas.reduce((s, l) => s + Number(l[j]), 0)
    expect(total).toBeCloseTo(r.kpis().find((k) => k.nome === 'Carteira em processo')!.atual, 2)
    const valores = t.linhas.map((l) => Number(l[j]))
    expect(valores).toEqual([...valores].sort((x, y) => y - x))
    const q = t.colunas.indexOf('Propostas')
    expect(t.linhas.reduce((s, l) => s + Number(l[q]), 0)).toBe(
      r.lista('Em processo').linhas.length
    )
  })

  it('exporta .xlsx com as abas Clientes e Propostas', async () => {
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
    const r = await s.exportarCarteira({
      tipo: 'Mês',
      ancora: '2026-10-16',
      modo: 'Período anterior',
      filtro: 'Todos',
    })
    expect(r.nome).toBe('Carteira_em_processo_2026-10-31.xlsx')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(r.caminho)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Clientes', 'Propostas'])
    expect(wb.getWorksheet('Clientes')!.getRow(1).getCell(1).value).toBe('Cliente')
  })
})
