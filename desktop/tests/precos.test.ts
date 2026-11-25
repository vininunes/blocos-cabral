/** Relatório de preços (vendas por cliente/produto do Bling): leitura, retratos e cálculos. Sem dados reais. */
import { describe, expect, it } from 'vitest'

import { Base } from '../server/relatorio/base'
import { detectarTipo, lerPrecos } from '../server/relatorio/leitores'
import { calcularPrecos, familiaProduto } from '../server/relatorio/precos'

const texto = (s: string) => new TextEncoder().encode(s)
const NBSP = ' '

/** Mesmo layout do export do Bling: bloco do cliente, produtos (1ª coluna NBSP) e Totais. */
function csv(linhas: [string, string, string, string, string, string][]) {
  const cab =
    '"Cliente";"Produto";"Código";"Localização";"Qtde";"Preço Médio";"Valor";"Frete";"Desconto";"Outras despesas";"Total Venda"'
  const corpo = linhas.map(
    ([cli, prod, cod, qtd, preco, valor]) =>
      `"${cli}";${prod ? `"${prod}"` : ''};${cod ? `"${cod}"` : ''};;"${qtd}";"${preco}";"${valor}";"0,00";"0,00";"0,00";"${valor}"`
  )
  return texto([cab, ...corpo, '"Totais";" ";" ";" ";"0";"0";"0";"0";"0";"0";"0"'].join('\n'))
}

const OUTUBRO = csv([
  ['ALFA CONSTRUTORA LTDA - 12345678000190 - São Paulo/SP', '', '', '1.100,00', '', '6.000,00'],
  [NBSP, 'BLOCO 14X19X39 ESTRUTURAL 12,0 MPA CLASSE A', '10050', '1.000,00', '5,00', '5.000,00'],
  [
    NBSP,
    'INTERTRAVADO RETANG. 20X10X06 CINZA NATURAL 35MPA',
    '11440',
    '100,00',
    '10,00',
    '1.000,00',
  ],
  ['BETA - OBRAS - 98765432100 - Osasco/SP', '', '', '1.000,00', '', '7.000,00'],
  [NBSP, 'BLOCO 14X19X39 ESTRUTURAL 12,0 MPA CLASSE A', '10050', '1.000,00', '7,00', '7.000,00'],
])
const NOVEMBRO = csv([
  ['ALFA CONSTRUTORA LTDA - 12345678000190 - São Paulo/SP', '', '', '1.000,00', '', '6.600,00'],
  [NBSP, 'BLOCO 14X19X39 ESTRUTURAL 12,0 MPA CLASSE A', '10050', '1.000,00', '6,60', '6.600,00'],
])

describe('relatório de preços', () => {
  it('é reconhecido pelas colunas e lido por cliente', () => {
    expect(detectarTipo('qualquer.csv', OUTUBRO)).toBe('precos')
    const l = lerPrecos(OUTUBRO)
    expect(l).toHaveLength(3)
    expect(l[0]).toMatchObject({
      cliente: 'ALFA CONSTRUTORA LTDA',
      cnpj: '12345678000190',
      cidade: 'São Paulo',
      uf: 'SP',
      codigo: '10050',
      qtd: 1000,
      valor: 5000,
      preco: 5,
    })
    // ' - ' no nome do cliente é mantido
    expect(l[2]).toMatchObject({ cliente: 'BETA - OBRAS', cnpj: '98765432100', uf: 'SP' })
  })

  it('família pelo nome do produto', () => {
    expect(familiaProduto('BLOCO 14X19X39 VEDAÇÃO 3,0 MPA CLASSE C')).toBe('Blocos de vedação')
    expect(familiaProduto('MEIO BLOCO 14X19X19 ESTRUTURAL 16,0 MPA')).toBe('Blocos estruturais')
    expect(familiaProduto('INTERT. DRENANTE RETANG. 20X10X06')).toBe('Pisos intertravados')
    expect(familiaProduto('MINI GUIA 09X19X39')).toBe('Guias')
    expect(familiaProduto('CANALETA 14X19X39')).toBe('Canaletas')
    expect(familiaProduto('PLATAFORMA 1,50 X 1,50')).toBe('Outros')
  })

  it('exige o período e calcula dispersão, índice por cliente e evolução', async () => {
    const b = new Base()
    const sem = await b.importar([{ nome: 'relatorio_out.csv', conteudo: OUTUBRO }])
    expect(sem.erros[0]).toMatch(/período/)
    expect(b.t.precos).toHaveLength(0)

    await b.importar([
      {
        nome: 'relatorio_out.csv',
        conteudo: OUTUBRO,
        periodo: { de: '2026-10-01', ate: '2026-10-31' },
      },
      {
        nome: 'relatorio_nov.csv',
        conteudo: NOVEMBRO,
        periodo: { de: '2026-11-01', ate: '2026-11-24' },
      },
    ])
    expect(b.t.arquivos.map((a) => a.periodo?.de).sort()).toEqual(['2026-10-01', '2026-11-01'])

    // período do relatório em outubro: retrato de outubro
    const out = calcularPrecos(b, { de: '2026-10-10', ate: '2026-10-20' })
    expect(out.escolha).toBe('periodo')
    expect(out.retrato?.de).toBe('2026-10-01')
    const bloco = out.produtos.find((p) => p.codigo === '10050')!
    expect(bloco.preco).toBeCloseTo(6) // (5.000 + 7.000) / 2.000
    expect([bloco.minimo, bloco.maximo, bloco.clientes]).toEqual([5, 7, 2])
    expect(bloco.amplitude).toBeCloseTo(2 / 6)
    expect(bloco.familia).toBe('Blocos estruturais')
    // Alfa pagou 5 no bloco (média 6); o intertravado só ela comprou e fica fora do índice
    const alfa = out.clientes.find((c) => c.cnpj === '12345678000190')!
    expect(alfa.valorComparavel).toBe(5000)
    expect(alfa.diferenca).toBeCloseTo(-1000)
    expect(alfa.indice).toBeCloseTo(5 / 6 - 1)
    expect(out.totais.valor).toBe(13000)
    expect(out.familias.map((f) => f.familia)).toEqual([
      'Blocos estruturais',
      'Pisos intertravados',
    ])

    // sem período: o mais recente; variação contra outubro nos produtos em comum
    const nov = calcularPrecos(b)
    expect(nov.escolha).toBe('recente')
    expect(nov.anterior?.de).toBe('2026-10-01')
    expect(nov.produtos[0].variacao).toBeCloseTo(0.1) // 6,60 / 6,00 - 1
    expect(nov.variacaoGeral).toBeCloseTo(0.1)
    const ev = nov.evolucao.find((e) => e.codigo === '10050')!
    expect(ev.precos.map((p) => p && +p.toFixed(2))).toEqual([6, 6.6])
    expect(nov.evolucao.find((e) => e.codigo === '11440')!.precos[1]).toBeNull()

    // escolhido pelo usuário
    expect(calcularPrecos(b, { retrato: out.retrato!.id }).escolha).toBe('usuario')
  })

  it('outro arquivo com o mesmo período troca o retrato', async () => {
    const b = new Base()
    const periodo = { de: '2026-10-01', ate: '2026-10-31' }
    await b.importar([{ nome: 'a.csv', conteudo: OUTUBRO, tipo: 'precos', periodo }])
    await b.importar([{ nome: 'b.csv', conteudo: NOVEMBRO, tipo: 'precos', periodo }])
    expect(b.t.arquivos.map((a) => a.arquivo)).toEqual(['b.csv'])
    expect(b.t.precos).toHaveLength(1)
  })
})
