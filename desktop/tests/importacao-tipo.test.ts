/** Identificação do tipo do arquivo pelo conteúdo (importação em lote). Não precisa de dados reais. */
import { describe, expect, it } from 'vitest'

import { Base } from '../server/relatorio/base'
import { detectarTipo } from '../server/relatorio/leitores'

const texto = (s: string) => new TextEncoder().encode(s)

const VENDAS =
  '﻿Número pedido;Nome Comprador;Data;CPF/CNPJ Comprador;Cidade Comprador;UF Comprador;Produto\n1;Fulano;01/10/2026;;Curitiba;PR;Bloco\n'
const ORCAMENTOS =
  '﻿"ID";"Número da proposta";"Loja";"Data";"Nome do contato";"Cpf/Cnpj";"Situação"\n"1";"10";"";"01/10/2026";"Fulano";"";"Aprovado"\n'
const CONTATOS =
  'Código,Nome,Fantasia,CNPJ / CPF,Cidade,UF\n1,Fulano Ltda,Fulano,12.345.678/0001-90,Curitiba,PR\n'

describe('detectarTipo', () => {
  it('reconhece vendas, orçamentos e contatos pelas colunas, mesmo com nome qualquer', () => {
    expect(detectarTipo('export (1).csv', texto(VENDAS))).toBe('vendas')
    expect(detectarTipo('planilha.csv', texto(ORCAMENTOS))).toBe('orcamentos')
    expect(detectarTipo('clientes-novos.csv', texto(CONTATOS))).toBe('contatos')
  })

  it('o conteúdo vale mais que o nome', () => {
    expect(detectarTipo('vendas_2026.csv', texto(ORCAMENTOS))).toBe('orcamentos')
    expect(detectarTipo('orcamentos_2026.csv', texto(VENDAS))).toBe('vendas')
  })

  it('PDF (pelos bytes iniciais) é notas', () => {
    expect(detectarTipo('relatorio.bin', texto('%PDF-1.7\n...'))).toBe('notas')
  })

  it('CSV desconhecido: usa o nome; sem nome conhecido, não reconhece', () => {
    const outro = texto('Coluna A;Coluna B\n1;2\n')
    expect(detectarTipo('dados.csv', outro)).toBe('')
    expect(detectarTipo('vendas_2026.csv', outro)).toBe('vendas')
    expect(detectarTipo('vazio.csv', texto(''))).toBe('')
  })
})

describe('importação em lote', () => {
  it('arquivo não reconhecido vira erro e não impede os outros', async () => {
    const r = await new Base().importar([
      { nome: 'dados.csv', conteudo: texto('Coluna A;Coluna B\n1;2\n') },
      { nome: 'contatos-qualquer-nome.csv', conteudo: texto(CONTATOS) },
    ])
    expect(r.erros).toHaveLength(1)
    expect(r.erros[0]).toMatch(/^dados\.csv: tipo não reconhecido/)
    expect(r.importados).toEqual(['contatos-qualquer-nome.csv (1 linhas)'])
  })
})
