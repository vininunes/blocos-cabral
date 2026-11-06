/**
 * Migração da base do app antigo (Python/Streamlit): dados/base.xlsx -> dados/base.json.
 * Lê as abas com os mesmos cabeçalhos que o app antigo gravava (planilha.COLUNAS_BASE),
 * converte os tipos como o `ajustar_tipos` do Python e traz os exports de entrada/.
 */
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

import { hashConteudo, type Base, type Tabelas } from './base'
import { deMs, type Data } from './datas'
import { COLUNAS_BASE } from './planilha'

const TEXTO = new Set(['proposta', 'pedido', 'nf', 'cnpj', 'sku', 'codigo', 'hash'])
const DATAS = new Set([
  'data',
  'dt_aprovacao',
  'dt_cancelamento',
  'dt_entrega',
  'dt_faturamento',
  'ult_ocorrencia',
  'primeira_importacao',
  'ultima_atualizacao',
  'importado_em',
])
const NUMEROS = new Set([
  'valor',
  'qtd',
  'vlr_unit',
  'vlr_item',
  'total_pedido',
  'frete',
  'desconto',
  'vlr_produtos',
  'seguro',
  'outras',
  'total_faturado',
  'total_nota',
  'vlr_total',
  'linhas',
])
const ABAS: Record<string, keyof Tabelas> = {
  Propostas: 'propostas',
  Pedidos: 'pedidos',
  Notas: 'notas',
  ItensPropostas: 'itensPropostas',
  Arquivos: 'arquivos',
}

/** Valor "cru" da célula (texto rico e fórmula viram o texto/resultado). */
function cru(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('result' in v) return v.result
    if ('text' in v) return v.text
  }
  return v
}

/** dd/mm/aaaa (texto) também vale: a base pode ter sido editada à mão no Excel. */
function data(v: unknown): Data | null {
  if (v instanceof Date) return deMs(Math.round(v.getTime() / 1000) * 1000) // o .xlsx não tem fuso: lido como UTC
  if (typeof v === 'string') {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v.trim())
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    if (/^\d{4}-\d{2}-\d{2}/.test(v))
      return v
        .slice(0, 19)
        .replace(' ', 'T')
        .replace(/T00:00:00$/, '')
  }
  return null
}

function converter(chave: string, v: unknown): unknown {
  if (DATAS.has(chave)) return data(v)
  if (NUMEROS.has(chave)) {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  if (v === null || v === undefined) return ''
  const s = String(v)
  return TEXTO.has(chave) && typeof v === 'number' ? s.replace(/\.0$/, '') : s
}

/** Lê a base.xlsx do app antigo como tabelas da base nova. */
export async function lerBaseXlsx(caminho: string): Promise<Tabelas> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(caminho)
  const t: Tabelas = {
    propostas: [],
    pedidos: [],
    notas: [],
    itensPropostas: [],
    arquivos: [],
    clientes: [],
    provisoes: [],
  }
  for (const [aba, cols] of Object.entries(COLUNAS_BASE)) {
    const ws = wb.getWorksheet(aba)
    if (!ws) continue
    const porTitulo = new Map(Object.entries(cols).map(([k, titulo]) => [titulo, k]))
    const chaves: (string | undefined)[] = []
    ws.getRow(1).eachCell((c, j) => (chaves[j] = porTitulo.get(String(cru(c.value) ?? ''))))
    const linhas: Record<string, unknown>[] = []
    ws.eachRow((row, i) => {
      if (i === 1) return
      const r: Record<string, unknown> = {}
      for (const k of Object.keys(cols)) r[k] = converter(k, null)
      let vazia = true
      row.eachCell((c, j) => {
        const k = chaves[j]
        if (!k) return
        const v = cru(c.value)
        if (v !== null && v !== undefined && v !== '') vazia = false
        r[k] = converter(k, v)
      })
      if (!vazia) linhas.push(r)
    })
    ;(t[ABAS[aba]] as unknown[]) = linhas
  }
  return t
}

export type ResultadoMigracao = {
  de: string
  propostas: number
  pedidos: number
  notas: number
  comFeedback: number
  arquivosCopiados: number
}

/**
 * Substitui a base pelo conteúdo da base.xlsx antiga, refaz as ligações e copia os
 * exports da entrada/ antiga (os que ainda não existem na nova). Não grava: quem chama salva.
 */
export async function migrarBaseAntiga(
  base: Base,
  caminhoXlsx: string,
  entradaNova: string
): Promise<ResultadoMigracao> {
  base.t = await lerBaseXlsx(caminhoXlsx)
  // registros antigos sem identificador do conteúdo: completa pela cópia em entrada/
  const entradaAntiga = path.join(path.dirname(path.dirname(caminhoXlsx)), 'entrada')
  for (const a of base.t.arquivos) {
    const f = path.join(entradaAntiga, a.arquivo)
    if (!a.hash && fs.existsSync(f)) a.hash = hashConteudo(fs.readFileSync(f))
  }
  base.ligar()
  base.sincronizarClientes()
  let arquivosCopiados = 0
  if (fs.existsSync(entradaAntiga) && path.resolve(entradaAntiga) !== path.resolve(entradaNova)) {
    fs.mkdirSync(entradaNova, { recursive: true })
    for (const nome of fs.readdirSync(entradaAntiga)) {
      const de = path.join(entradaAntiga, nome),
        para = path.join(entradaNova, nome)
      if (nome.startsWith('.') || !fs.statSync(de).isFile() || fs.existsSync(para)) continue
      fs.copyFileSync(de, para)
      arquivosCopiados++
    }
  }
  return {
    de: caminhoXlsx,
    propostas: base.propostas.length,
    pedidos: new Set(base.pedidos.map((p) => p.pedido)).size,
    notas: base.notas.length,
    comFeedback: base.propostas.filter((p) => p.motivo || p.comentario).length,
    arquivosCopiados,
  }
}
