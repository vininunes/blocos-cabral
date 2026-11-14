/** Acompanhamento de pedidos: baixa automática das entregas nos pedidos em aberto. */
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'

import { calcularAcompanhamento, tabelasAcompanhamento } from '../server/relatorio/acompanhamento'
import { Base } from '../server/relatorio/base'
import { Relatorio } from '../server/relatorio/metricas'
import { Periodo } from '../server/relatorio/periodo'
import { excelRelatorio } from '../server/relatorio/planilha'
import { gerarPpt } from '../server/relatorio/ppt'
import type { ItemPedido, Nota, Proposta } from '../server/relatorio/tipos'
import { baseCom } from './comum'

const CNPJ = '11111111000111'

function item(pedido: string, data: string, sku: string, qtd: number, preco: number, cnpj = CNPJ) {
  return {
    pedido,
    data,
    cliente: 'CLIENTE TESTE',
    cnpj,
    cidade: 'São Paulo',
    uf: 'SP',
    produto: `PRODUTO ${sku}`,
    sku,
    un: 'm²',
    qtd,
    vlr_unit: preco,
    vlr_item: qtd * preco,
    total_pedido: 0,
    frete: 0,
    desconto: 0,
    vendedor: 'VENDEDOR',
    pagamento: '',
    arquivo: '',
  } as ItemPedido
}
const nota = (nf: string, pedido: string, data: string) =>
  ({ nf, pedido, data, cliente: 'CLIENTE TESTE', cnpj: CNPJ, total_nota: 0 }) as Nota
const proposta = (num: string, pedido: string, status = 'Aprovado') =>
  ({ proposta: num, pedido, status, cnpj: CNPJ, cliente: 'CLIENTE TESTE' }) as Proposta

function baseTeste() {
  const b = new Base()
  b.t.pedidos = [
    // pedidos em aberto (sem nota, de proposta aprovada)
    item('100', '2026-09-01', 'A', 100, 10),
    item('100', '2026-09-01', 'B', 50, 20),
    item('200', '2026-09-10', 'A', 40, 12),
    // pedido sem nota e sem proposta aprovada: não é acompanhado
    item('300', '2026-09-01', 'A', 999, 1),
    // entregas
    item('901', '2026-08-20', 'A', 5, 10), // antes do pedido 100: não dá baixa
    item('902', '2026-09-02', 'A', 60, 10),
    item('903', '2026-09-12', 'A', 70, 10), // completa o 100 (40) e vai para o 200 (30)
    item('904', '2026-09-15', 'B', 10, 20),
    item('905', '2026-09-20', 'A', 50, 10), // 10 completam o 200; 40 sobram (excedente)
    item('906', '2026-09-03', 'A', 7, 10, '22222222000122'), // outro cliente
  ]
  b.t.notas = [
    nota('1', '901', '2026-08-20'),
    nota('2', '902', '2026-09-03'),
    nota('3', '903', '2026-09-12'),
    nota('4', '904', '2026-10-01'),
    nota('5', '905', '2026-09-21'),
    nota('6', '906', '2026-09-03'),
  ]
  b.t.propostas = [proposta('P1', '100'), proposta('P2', '200'), proposta('P3', '300', 'Cancelado')]
  return b
}

describe('acompanhamento de pedidos', () => {
  it('baixa no pedido em aberto mais antigo do mesmo cliente e produto', () => {
    const r = calcularAcompanhamento(baseTeste(), '2026-12-31')
    expect(r.pedidos.map((p) => p.pedido).sort()).toEqual(['100', '200'])
    const p100 = r.pedidos.find((p) => p.pedido === '100')!
    const p200 = r.pedidos.find((p) => p.pedido === '200')!
    // 100: A 100/100 (902: 60 + 903: 40), B 10/50
    expect(p100.itens.map((i) => [i.sku, i.entregue_qtd])).toEqual([
      ['A', 100],
      ['B', 10],
    ])
    expect(p100.valor).toBe(2000)
    expect(p100.entregue).toBe(1200)
    expect(p100.restante).toBe(800)
    expect(p100.pct_entregue).toBeCloseTo(0.6)
    expect(p100.situacao).toBe('Parcial')
    expect(p100.ultima_entrega).toBe('2026-10-01')
    expect(p100.proposta).toBe('P1')
    // 200: 30 do 903 + 10 do 905, ao preço do pedido (12)
    expect(p200.itens[0].entregue_qtd).toBe(40)
    expect(p200.entregue).toBe(480)
    expect(p200.situacao).toBe('Concluído')
    expect(p200.entregas.map((e) => [e.pedido, e.nf, e.qtd])).toEqual([
      ['903', '3', 30],
      ['905', '5', 10],
    ])
    // concluídos no fim; totais
    expect(r.pedidos.at(-1)!.pedido).toBe('200')
    expect(r.totais).toMatchObject({ pedidos: 2, em_aberto: 1, concluidos: 1, restante: 800 })
  })

  it('posição no fim do período: só pedidos e notas até a data', () => {
    const b = baseTeste()
    const r = calcularAcompanhamento(b, '2026-09-05')
    expect(r.pedidos.map((p) => p.pedido)).toEqual(['100']) // o 200 é de 10/09
    expect(r.pedidos[0].itens[0].entregue_qtd).toBe(60) // só a nota de 03/09
    expect(r.pedidos[0].situacao).toBe('Parcial')
    expect(calcularAcompanhamento(b, '2026-08-31').pedidos).toEqual([])
    // sem entrega
    const sem = calcularAcompanhamento(b, '2026-09-01').pedidos[0]
    expect([sem.situacao, sem.entregue, sem.pct_entregue]).toEqual(['Sem entrega', 0, 0])
  })

  it('tabelas do Excel', () => {
    const t = tabelasAcompanhamento(calcularAcompanhamento(baseTeste(), '2026-12-31'))
    expect(t.Acompanhamento.linhas).toHaveLength(2)
    expect(t['Entregas dos pedidos'].linhas).toHaveLength(5) // 902, 903 (x2), 904, 905
  })

  it('base real: exportações com o acompanhamento', async () => {
    const b = (await baseCom()).b
    const r = new Relatorio(b, Periodo.de('Mês', '2026-10-01'), 'Todos')
    const ac = calcularAcompanhamento(b, r.p.fim)
    const soma = ac.pedidos.reduce((s, p) => s + p.entregue + p.restante, 0)
    expect(soma).toBeCloseTo(ac.totais.valor, 2)
    for (const p of ac.pedidos) {
      expect(p.pct_entregue).toBeGreaterThanOrEqual(0)
      expect(p.pct_entregue).toBeLessThanOrEqual(1)
    }
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      (await excelRelatorio({
        ...r.tabelasExcel(),
        ...tabelasAcompanhamento(ac),
      })) as unknown as ArrayBuffer
    )
    expect(wb.getWorksheet('Acompanhamento')!.rowCount).toBe(ac.pedidos.length + 1)
    const zip = await JSZip.loadAsync(await gerarPpt(r))
    const textos = await Promise.all(
      Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .map((n) => zip.file(n)!.async('string'))
    )
    const temAberto = ac.pedidos.some((p) => p.situacao !== 'Concluído')
    expect(textos.some((t) => t.includes('Acompanhamento de pedidos'))).toBe(temAberto)
  })
})
