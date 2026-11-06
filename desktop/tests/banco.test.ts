/** Banco de dados: tabela Clientes, curva ABC, contatos do Bling e desfazer importação. */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Base, chaveCliente, guardarEmEntrada } from '../server/relatorio/base'
import { indicadoresClientes } from '../server/relatorio/clientes'
import { ARQS, arquivos, baseCom } from './comum'

const csv = (linhas: string[][]) =>
  new TextEncoder().encode('﻿' + linhas.map((l) => l.map((c) => `"${c}"`).join(';')).join('\n'))

describe('tabela Clientes', () => {
  it('tem um cliente por CNPJ/CPF (ou nome) de propostas, pedidos e notas', async () => {
    const { b } = await baseCom()
    const chaves = new Set(b.t.clientes.map((c) => c.chave))
    expect(chaves.size).toBe(b.t.clientes.length)
    for (const p of b.propostas) expect(chaves.has(chaveCliente(p.cnpj, p.cliente))).toBe(true)
    for (const p of b.pedidosAgregados())
      expect(chaves.has(chaveCliente(p.cnpj, p.cliente))).toBe(true)
    for (const n of b.notas) expect(chaves.has(chaveCliente(n.cnpj, n.cliente))).toBe(true)
  })

  it('faturamento por cliente fecha com o total das notas e a curva ABC segue 80/95%', async () => {
    const { b } = await baseCom()
    const { clientes, resumo } = indicadoresClientes(b)
    const total = b.notas.reduce((s, n) => s + n.total_nota, 0)
    expect(clientes.reduce((s, c) => s + c.faturamento, 0)).toBeCloseTo(total, 2)
    expect(resumo.total).toBeCloseTo(total, 2)
    expect(resumo.A.faturamento + resumo.B.faturamento + resumo.C.faturamento).toBeCloseTo(total, 2)
    // A: os maiores, até cruzar 80% do faturamento
    const a = clientes.filter((c) => c.abc === 'A')
    expect(a.length).toBeGreaterThan(0)
    expect(Math.min(...a.map((c) => c.faturamento))).toBeGreaterThanOrEqual(
      Math.max(...clientes.filter((c) => c.abc === 'B').map((c) => c.faturamento))
    )
    expect(resumo.A.faturamento / total).toBeGreaterThanOrEqual(0.8)
    expect((resumo.A.faturamento - a.at(-1)!.faturamento) / total).toBeLessThan(0.8)
    // sem faturamento: fora da curva
    expect(clientes.filter((c) => c.faturamento === 0).every((c) => c.abc === '-')).toBe(true)
    // a base de outubro não cobre 180 dias: tendência sem histórico
    expect(clientes.find((c) => c.faturamento > 0)!.tendencia).toBe('sem histórico')
  })

  it('grupo econômico junta clientes na curva ABC', async () => {
    const { b } = await baseCom()
    const { clientes } = indicadoresClientes(b)
    const [x, y] = clientes.filter((c) => c.faturamento > 0).slice(-2) // dois pequenos
    b.editarClientes({ [x.chave]: { grupo: 'Grupo Teste' }, [y.chave]: { grupo: 'grupo teste' } })
    const depois = indicadoresClientes(b).clientes
    const gx = depois.find((c) => c.chave === x.chave)!,
      gy = depois.find((c) => c.chave === y.chave)!
    expect(gx.grupo_chave).toBe(gy.grupo_chave)
    expect(gx.abc).toBe(gy.abc)
    expect(gx.participacao).toBeCloseTo(
      (x.faturamento + y.faturamento) / depois.reduce((s, c) => s + c.faturamento, 0),
      9
    )
  })

  it('CSV de contatos do Bling completa o cadastro sem apagar os campos da equipe', async () => {
    const { b } = await baseCom()
    const alvo = b.t.clientes.find((c) => c.cnpj.length === 14)!
    b.editarClientes({
      [alvo.chave]: { segmento: 'Construtora', situacao: 'ativo', observacoes: 'cliente antigo' },
    })
    const doc = alvo.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    const r = await b.importar([
      {
        nome: 'contatos_2026-11-05.csv',
        conteudo: csv([
          [
            'ID',
            'Código',
            'Nome',
            'Fantasia',
            'Endereço',
            'Número',
            'Bairro',
            'CEP',
            'Cidade',
            'UF',
            'Fone',
            'E-mail',
            'CNPJ / CPF',
          ],
          [
            '1',
            'C001',
            alvo.nome,
            'Fantasia X',
            'Rua A',
            '10',
            'Centro',
            '06500-000',
            'Barueri',
            'sp',
            '(11) 4000-0000',
            'x@y.com',
            doc,
          ],
          [
            '2',
            'C002',
            'Cliente Novo Ltda',
            '',
            '',
            '',
            '',
            '',
            'Cotia',
            'SP',
            '',
            '',
            '11.222.333/0001-81',
          ],
        ]),
      },
    ])
    expect(r.erros).toEqual([])
    const c = b.t.clientes.find((x) => x.chave === alvo.chave)!
    expect(c).toMatchObject({
      fantasia: 'Fantasia X',
      endereco: 'Rua A, 10',
      cep: '06500000',
      uf: 'SP',
      email: 'x@y.com',
      origem: 'bling',
    })
    expect(c).toMatchObject({
      segmento: 'Construtora',
      situacao: 'ativo',
      observacoes: 'cliente antigo',
    })
    expect(b.t.clientes.find((x) => x.cnpj === '11222333000181')?.nome).toBe('Cliente Novo Ltda')
    expect(b.t.arquivos.at(-1)?.tipo).toBe('contatos')
  })

  it('recusa CSV que não é de contatos', async () => {
    const r = await new Base().importar([
      {
        nome: 'contatos.csv',
        conteudo: csv([
          ['A', 'B'],
          ['1', '2'],
        ]),
      },
    ])
    expect(r.erros[0]).toContain('Contatos do Bling')
  })
})

describe('importação em lote (exports reais)', () => {
  const TODOS = [
    'vendas_2026-10-17-14-39-51.csv',
    'vendas_2026-10-23-11-49-30.csv',
    'orcamentos_2026-10-17-14-33-27.csv',
    'orcamentos_2026-10-23-11-46-03.csv',
    'notas_2026-10-17-16-41-00.pdf',
  ]

  // dentro do mesmo tipo vale a ordem do nome (o último sobrescreve pedidos repetidos); os nomes
  // novos mantêm essa ordem, mas o lote chega embaralhado
  it('arquivos renomeados e misturados dão a mesma base', async () => {
    const { b: esperado } = await baseCom(TODOS)
    const renomeados = arquivos(TODOS)
      .map((a, i) => ({ ...a, nome: `arquivo ${i}${a.nome.slice(a.nome.lastIndexOf('.'))}` }))
      .reverse()
    const b = new Base()
    const r = await b.importar(renomeados)
    expect(r.erros).toEqual([])
    expect(r.importados).toHaveLength(TODOS.length)
    expect(b.t.arquivos.map((a) => a.tipo).sort()).toEqual(
      ['notas', 'orcamentos', 'orcamentos', 'vendas', 'vendas'].sort()
    )
    // iguais, tirando o nome do arquivo de origem gravado em cada linha
    const sem = <T extends object>(xs: T[]) =>
      JSON.stringify(xs.map((x) => ({ ...x, arquivo: undefined, arquivo_origem: undefined })))
    expect(b.propostas.length).toBe(esperado.propostas.length)
    expect(sem(b.pedidos)).toBe(sem(esperado.pedidos))
    expect(sem(b.notas)).toBe(sem(esperado.notas))
    expect(sem(b.itensPropostas)).toBe(sem(esperado.itensPropostas))
  })

  it('o mesmo arquivo duas vezes no lote: o segundo é ignorado', async () => {
    const [a] = arquivos(['vendas_2026-10-17-14-39-51.csv'])
    const r = await new Base().importar([a, { ...a, nome: 'copia.csv' }])
    expect(r.importados).toHaveLength(1)
    expect(r.ignorados).toHaveLength(1)
    expect(r.ignorados[0]).toContain('mesmo conteúdo de')
  })
})

describe('desfazer importação', () => {
  async function baseComEntrada(nomes: string[]) {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'entrada-'))
    const b = new Base()
    for (const a of arquivos(nomes)) {
      guardarEmEntrada(pasta, a.nome, a.conteudo)
      await b.importar([a])
    }
    return { b, pasta }
  }
  const resumo = (b: Base) =>
    JSON.stringify({
      p: b.propostas.map(
        ({ primeira_importacao, ultima_atualizacao, editados, ...r }) => (
          void primeira_importacao, void ultima_atualizacao, void editados, r
        )
      ),
      i: b.pedidos,
      n: b.notas,
      it: b.itensPropostas,
    })

  it('dá a mesma base que nunca ter importado o arquivo, mantendo o feedback', async () => {
    const { b, pasta } = await baseComEntrada(ARQS)
    b.editarPropostas({
      '25010': { motivo: 'Preço', comentario: 'caro' },
      '25013': { pedido: '99999' },
    })
    const notas = b.t.arquivos.find((a) => a.arquivo === ARQS[2])!
    const r = await b.desfazerImportacao(notas.hash, pasta)
    expect(r).toMatchObject({ removido: ARQS[2], notas: 0 })
    expect(b.t.arquivos.map((a) => a.arquivo)).toEqual(ARQS.slice(0, 2))

    const sem = (await baseComEntrada(ARQS.slice(0, 2))).b
    sem.editarPropostas({
      '25010': { motivo: 'Preço', comentario: 'caro' },
      '25013': { pedido: '99999' },
    })
    expect(resumo(b)).toBe(resumo(sem))
    const p = b.propostas.find((x) => x.proposta === '25013')!
    expect(p.pedido).toBe('99999') // correção manual mantida
    expect(b.propostas.find((x) => x.proposta === '25010')?.motivo).toBe('Preço')
  })

  it('não desfaz quando falta o arquivo em entrada/', async () => {
    const { b, pasta } = await baseComEntrada(ARQS)
    fs.rmSync(path.join(pasta, ARQS[0]))
    const orc = b.t.arquivos.find((a) => a.arquivo === ARQS[1])!
    await expect(b.desfazerImportacao(orc.hash, pasta)).rejects.toThrow(ARQS[0])
    expect(b.notas.length).toBe(164) // base intacta
  })
})
