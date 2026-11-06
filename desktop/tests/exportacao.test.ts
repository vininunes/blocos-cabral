/** Port de test_ppt_e_excel, test_comparacao_sem_dados e test_sem_comparacao (parte de arquivos). */
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Base } from '../server/relatorio/base'
import { FILTROS, Relatorio } from '../server/relatorio/metricas'
import { comparacao, MESMA_DATA, Periodo, SEM_COMPARACAO } from '../server/relatorio/periodo'
import { excelRelatorio, exportarBase } from '../server/relatorio/planilha'
import { gerarPpt, nomeArquivo } from '../server/relatorio/ppt'
import { baseCom } from './comum'

const SEMANA = Periodo.de('Semana', '2026-10-16')
const MES = Periodo.de('Mês', '2026-10-01')

let base: Base
beforeAll(async () => {
  base = (await baseCom()).b
})

async function conferirPpt(r: Relatorio) {
  const ppt = await gerarPpt(r)
  expect(ppt.length).toBeGreaterThan(30_000)
  const zip = await JSZip.loadAsync(ppt)
  // relações relativas (o Keynote não abre gráficos com caminho absoluto)
  for (const nome of Object.keys(zip.files).filter((n) => n.endsWith('.rels'))) {
    expect(await zip.file(nome)!.async('string')).not.toMatch(/Target="\/ppt\//)
  }
  // cada gráfico com a planilha embutida refeita pelo exceljs (legível)
  for (const nome of Object.keys(zip.files).filter((n) => /^ppt\/embeddings\/.*\.xlsx$/.test(n))) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load((await zip.file(nome)!.async('nodebuffer')) as unknown as ArrayBuffer)
    expect(wb.getWorksheet('Sheet1')!.rowCount).toBeGreaterThan(1)
  }
  return zip
}

async function conferirExcel(r: Relatorio) {
  const xlsx = await excelRelatorio(r.tabelasExcel())
  expect(xlsx.length).toBeGreaterThan(5_000)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(xlsx as unknown as ArrayBuffer)
  return wb
}

describe('PowerPoint e Excel', () => {
  it.each(FILTROS)('semana · %s', async (f) => {
    const r = new Relatorio(base, SEMANA, f)
    const zip = await conferirPpt(r)
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    expect(slides.length).toBe(f === 'Todos' ? 14 : f === 'Cancelado' ? 11 : 11)
    await conferirExcel(r)
  })

  it('a 2ª série do acumulado é tracejada', async () => {
    const [a, b] = comparacao(SEMANA, MESMA_DATA, base.cobertura()[1]!)
    const zip = await JSZip.loadAsync(
      await gerarPpt(new Relatorio(base, a, 'Todos', b, MESMA_DATA))
    )
    const linha = (
      await Promise.all(
        Object.keys(zip.files)
          .filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n))
          .map((n) => zip.file(n)!.async('string'))
      )
    ).find((x) => x.includes('<c:lineChart>'))!
    const series = linha.split('<c:ser>')
    expect(series[1]).toContain('<a:prstDash val="solid"/>')
    expect(series[2]).toContain('<a:prstDash val="dash"/>')
  })

  it('comparação sem dados de B', async () => {
    const [a, b] = comparacao(MES, MESMA_DATA, base.cobertura()[1]!)
    for (const f of FILTROS) {
      const r = new Relatorio(base, a, f, b, MESMA_DATA)
      expect(r.coberturaB).toBe('nenhuma')
      await conferirPpt(r)
      await conferirExcel(r)
    }
  })

  it('sem comparação', async () => {
    const [a, b] = comparacao(MES, SEM_COMPARACAO, '2026-10-16')
    for (const f of FILTROS) {
      const r = new Relatorio(base, a, f, b, SEM_COMPARACAO)
      await conferirPpt(r)
      const wb = await conferirExcel(r)
      const ind = wb.getWorksheet('Indicadores')!
      expect([ind.getCell(1, 1).value, ind.getCell(1, 2).value, ind.getCell(1, 3).value]).toEqual([
        'Indicador',
        'Valor',
        null,
      ])
      expect(wb.getWorksheet('Altas e quedas')).toBeUndefined()
      expect(wb.getWorksheet('Acumulado')).toBeUndefined()
    }
  })

  it('nome do arquivo', () => {
    expect(nomeArquivo(new Relatorio(base, SEMANA))).toBe(
      'Relatorio_semana_2026-10-12_a_2026-10-18.pptx'
    )
    expect(nomeArquivo(new Relatorio(base, MES, 'Em processo'), 'xlsx')).toBe(
      'Relatorio_em-processo_mes_2026-10-01_a_2026-10-31.xlsx'
    )
  })
})

describe('base exportada em .xlsx', () => {
  it('tem as cinco abas com todos os registros e o motivo como lista', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load((await exportarBase(base)) as unknown as ArrayBuffer)
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Propostas',
      'Pedidos',
      'Notas',
      'ItensPropostas',
      'Arquivos',
    ])
    expect(wb.getWorksheet('Propostas')!.actualRowCount).toBe(base.propostas.length + 1) // a lista do motivo vai 500 linhas além
    expect(wb.getWorksheet('Pedidos')!.rowCount).toBe(base.pedidos.length + 1)
    expect(wb.getWorksheet('Notas')!.rowCount).toBe(base.notas.length + 1)
    const p = wb.getWorksheet('Propostas')!
    expect(p.getCell(1, 1).value).toBe('Proposta')
    expect(p.getCell(2, 17).dataValidation?.type).toBe('list')
    expect(p.getCell(2, 2).value).toBeInstanceOf(Date)
  })
})
