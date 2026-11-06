/**
 * Base histórica (dados/base.json): propostas, pedidos, itens, notas e arquivos importados.
 * Port de app/base.py — mesmas regras, guardado em JSON em vez de base.xlsx.
 *
 * Regras do fluxo:
 *   Processo de venda -> Aprovado -> Entregue (pedido Atendido) -> Faturado (nota emitida)
 *                     \-> Cancelado
 * - Data de entrega = data de emissão da nota do pedido. Sem nota, o pedido não tem data de entrega.
 * - A situação do Bling define Processo / Aprovado / Cancelado (config.MAPA_SITUACAO).
 * - A data de cada mudança vem da 'Última ocorrência' do Bling ou, se vazia, da data do export.
 * - Proposta aprovada é ligada a um pedido do mesmo CNPJ (valor igual tem prioridade).
 * - Nota fiscal é ligada a um pedido do mesmo cliente com o mesmo valor (a nota não traz CNPJ).
 * - Colunas preenchidas pela equipe (motivo, comentário, pedido/datas corrigidos) nunca são sobrescritas.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import * as C from './config'
import { addDias, agora, dia, difDias, difDiasAbs, type Data, type Dia } from './datas'
import { lerContatos, lerNotasPdf, lerOrcamentos, lerVendas, tipoArquivo } from './leitores'
import type {
  ArquivoImportado,
  Cliente,
  ContatoLido,
  ItemPedido,
  ItemProposta,
  Nota,
  Proposta,
  PropostaLida,
  Provisao,
  ResumoImportacao,
  TipoArquivo,
} from './tipos'
import { chaveNome, fmtData, norm } from './utils'

export const VERSAO_BASE = 1

export type Tabelas = {
  propostas: Proposta[]
  pedidos: ItemPedido[]
  notas: Nota[]
  itensPropostas: ItemProposta[]
  arquivos: ArquivoImportado[]
  clientes: Cliente[]
  provisoes: Provisao[]
}

export type ArquivoEntrada = { nome: string; conteudo: Uint8Array; tipo?: TipoArquivo | '' }

/** Campos da equipe na tabela Clientes (a importação nunca sobrescreve). */
export const EDITAVEIS_CLIENTE = ['grupo', 'segmento', 'situacao', 'observacoes'] as const
export type EdicaoCliente = Partial<Pick<Cliente, (typeof EDITAVEIS_CLIENTE)[number]>>

/** Chave do cliente: CNPJ/CPF ou, sem documento, o nome normalizado. */
export const chaveCliente = (cnpj: string, nome: string) =>
  cnpj ? cnpj : `nome:${chaveNome(nome)}`

/** Campos que a equipe edita na aba Feedback. */
export const EDITAVEIS = [
  'dt_aprovacao',
  'dt_cancelamento',
  'pedido',
  'motivo',
  'comentario',
] as const
export type EdicaoProposta = Partial<Pick<Proposta, (typeof EDITAVEIS)[number]>>

const vazia = (): Tabelas => ({
  propostas: [],
  pedidos: [],
  notas: [],
  itensPropostas: [],
  arquivos: [],
  clientes: [],
  provisoes: [],
})

/** Ordena (estável) por várias chaves; null vai para o fim, como no pandas. */
export function ordenar<T>(linhas: T[], ...chaves: ((x: T) => string | number | null)[]): T[] {
  return [...linhas].sort((a, b) => {
    for (const k of chaves) {
      const va = k(a),
        vb = k(b)
      if (va === vb) continue
      if (va === null) return 1
      if (vb === null) return -1
      return va < vb ? -1 : 1
    }
    return 0
  })
}

export const statusBling = (situacao: string): C.Status =>
  C.MAPA_SITUACAO[norm(situacao)] ?? C.PROCESSO

/** Lista de pedidos de um campo 'pedido' ('123', '123, 124' ou '123; 124'). */
const pedidosDe = (v: string) =>
  v
    .replaceAll(';', ',')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

export class Base {
  t: Tabelas

  /** `caminho` = dados/base.json; sem caminho, a base fica só em memória (testes). */
  constructor(readonly caminho?: string) {
    this.t = vazia()
    if (caminho && fs.existsSync(caminho)) this.carregar()
  }

  // ------------------------------------------------------------ persistência

  private carregar() {
    const dados = JSON.parse(fs.readFileSync(this.caminho!, 'utf-8')) as Partial<Tabelas>
    this.t = { ...vazia(), ...dados }
  }

  /** Grava em arquivo temporário e troca no fim: nunca deixa a base pela metade. */
  salvar() {
    if (!this.caminho) return
    fs.mkdirSync(path.dirname(this.caminho), { recursive: true })
    const tmp = `${this.caminho}.tmp`
    fs.writeFileSync(tmp, JSON.stringify({ versao: VERSAO_BASE, ...this.t }))
    fs.renameSync(tmp, this.caminho)
  }

  get propostas() {
    return this.t.propostas
  }
  get pedidos() {
    return this.t.pedidos
  }
  get notas() {
    return this.t.notas
  }
  get itensPropostas() {
    return this.t.itensPropostas
  }

  /** Uma linha por pedido (os itens repetem os dados do pedido), na ordem da base. */
  pedidosAgregados(): ItemPedido[] {
    const porPedido = new Map<string, ItemPedido>()
    for (const it of this.pedidos) {
      const p = porPedido.get(it.pedido)
      if (!p) porPedido.set(it.pedido, { ...it })
      else p.data ??= it.data
    }
    return [...porPedido.values()]
  }

  /** [início, fim] em que todas as fontes têm dados: do maior início ao menor fim. */
  cobertura(): [Dia, Dia] | [null, null] {
    const fontes = [this.notas, this.pedidos, this.propostas]
      .map((t) => t.map((r) => dia(r.data)).filter((d): d is Dia => d !== null))
      .filter((d) => d.length)
    if (!fontes.length) return [null, null]
    const ini = fontes
      .map((d) => d.reduce((a, b) => (b < a ? b : a)))
      .reduce((a, b) => (b > a ? b : a))
    const fim = fontes
      .map((d) => d.reduce((a, b) => (b > a ? b : a)))
      .reduce((a, b) => (b < a ? b : a))
    return [ini, fim]
  }

  ultimaImportacao(): Data | null {
    return this.t.arquivos.reduce<Data | null>(
      (a, r) => (a === null || r.importado_em > a ? r.importado_em : a),
      null
    )
  }

  // ------------------------------------------------------------ importação

  private hashes() {
    return new Map(this.t.arquivos.filter((a) => a.hash).map((a) => [a.hash, a.arquivo]))
  }

  /** Nome com que este mesmo conteúdo já foi importado (ou null). */
  importadoComo(conteudo: Uint8Array): string | null {
    return this.hashes().get(hashConteudo(conteudo)) ?? null
  }

  /**
   * Importa vendas, depois orçamentos, depois notas (sem tipo, ele é deduzido do nome) e liga tudo.
   * Conteúdo já importado é ignorado, a menos que `forcar`.
   */
  async importar(arquivos: ArquivoEntrada[], forcar = false): Promise<ResumoImportacao> {
    const resumo: ResumoImportacao = {
      importados: [],
      ignorados: [],
      erros: [],
      mudancas: 0,
      novas_propostas: 0,
    }
    const vistos = this.hashes()
    const ordem: Record<string, number> = { vendas: 0, orcamentos: 1, notas: 2, contatos: 3 }
    const fila = ordenar(
      arquivos.map((a) => ({ ...a, tipo: a.tipo || tipoArquivo(a.nome) })),
      (a) => ordem[a.tipo] ?? 9,
      (a) => a.nome
    )
    for (const { nome, conteudo, tipo } of fila) {
      if (!tipo) {
        resumo.erros.push(
          `${nome}: tipo não reconhecido (use vendas_*.csv, orcamentos_*.csv, contatos_*.csv ou o PDF de notas)`
        )
        continue
      }
      const h = hashConteudo(conteudo)
      if (vistos.has(h) && !forcar) {
        const igual = vistos.get(h)!
        resumo.ignorados.push(
          norm(igual) === norm(nome) ? nome : `${nome} (mesmo conteúdo de ${igual})`
        )
        continue
      }
      let n: number
      try {
        if (tipo === 'vendas') n = this.importarVendas(lerVendas(conteudo, nome))
        else if (tipo === 'orcamentos') {
          const { propostas, itens } = lerOrcamentos(conteudo, nome)
          n = this.importarOrcamentos(propostas, itens, resumo)
        } else if (tipo === 'contatos') n = this.importarContatos(lerContatos(conteudo))
        else n = this.importarNotas(await lerNotasPdf(conteudo, nome))
      } catch (e) {
        // mostra o erro do arquivo e segue com os outros
        resumo.erros.push(`${nome}: ${e instanceof Error ? e.message : String(e)}`)
        continue
      }
      this.t.arquivos = [
        ...this.t.arquivos.filter((a) => a.hash !== h),
        { arquivo: nome, tipo, importado_em: agora(), linhas: n, hash: h },
      ]
      vistos.set(h, nome)
      resumo.importados.push(`${nome} (${n} linhas)`)
    }
    resumo.ligacoes = this.ligar()
    this.sincronizarClientes()
    return resumo
  }

  /** Importa os arquivos reconhecidos de uma pasta (ex.: entrada/). */
  async importarPasta(pasta: string, forcar = false) {
    const nomes = fs
      .readdirSync(pasta)
      .filter(
        (n) => !n.startsWith('.') && tipoArquivo(n) && fs.statSync(path.join(pasta, n)).isFile()
      )
      .sort()
    return this.importar(
      nomes.map((nome) => ({ nome, conteudo: fs.readFileSync(path.join(pasta, nome)) })),
      forcar
    )
  }

  private importarVendas(novos: ItemPedido[]) {
    const ids = new Set(novos.map((r) => r.pedido))
    this.t.pedidos = ordenar(
      [...this.pedidos.filter((r) => !ids.has(r.pedido)), ...novos],
      (r) => r.data,
      (r) => r.pedido
    )
    return ids.size
  }

  private importarNotas(novas: Nota[]) {
    // mantém a ligação/edição já feita para notas reimportadas
    const manter = new Map(this.notas.map((n) => [n.nf, n]))
    const lidas = novas.map((n) => {
      const m = manter.get(n.nf)
      return {
        ...n,
        pedido: m?.pedido ?? '',
        vendedor: m?.vendedor ?? '',
        cidade: m?.cidade ?? '',
        cnpj: m?.cnpj ?? '',
      }
    })
    const ids = new Set(lidas.map((n) => n.nf))
    this.t.notas = ordenar(
      [...this.notas.filter((n) => !ids.has(n.nf)), ...lidas],
      (n) => n.data,
      (n) => n.nf
    )
    return lidas.length
  }

  private importarOrcamentos(
    props: PropostaLida[],
    itens: ItemProposta[],
    resumo: ResumoImportacao
  ) {
    const base = new Map(this.propostas.map((p) => [p.proposta, p]))
    const linhas: Proposta[] = []
    for (const p of props) {
      const snap = p.snapshot
      const statusNovo = statusBling(p.situacao_bling)
      const existente = base.get(p.proposta)
      let r: Proposta
      if (existente) {
        r = {
          ...existente,
          data: p.data,
          cliente: p.cliente,
          cnpj: p.cnpj,
          vendedor: p.vendedor,
          valor: p.valor,
        }
        if (p.cidade) r.cidade = p.cidade
        if (p.uf) r.uf = p.uf
        if (p.ult_ocorrencia) r.ult_ocorrencia = p.ult_ocorrencia
        r.ultima_atualizacao = snap
        if (norm(r.situacao_bling) !== norm(p.situacao_bling)) {
          const quando = p.ult_ocorrencia ?? snap
          historico(r, quando, `${r.situacao_bling} -> ${p.situacao_bling}`)
          r.situacao_bling = p.situacao_bling
          aplicarStatus(r, statusNovo, quando)
          resumo.mudancas++
        }
      } else {
        r = {
          proposta: p.proposta,
          data: p.data,
          cliente: p.cliente,
          cnpj: p.cnpj,
          cidade: p.cidade,
          uf: p.uf,
          vendedor: p.vendedor,
          valor: p.valor,
          situacao_bling: p.situacao_bling,
          status: '',
          dt_aprovacao: null,
          dt_cancelamento: null,
          pedido: '',
          dt_entrega: null,
          nf: '',
          dt_faturamento: null,
          motivo: '',
          comentario: '',
          ult_ocorrencia: p.ult_ocorrencia,
          primeira_importacao: snap,
          ultima_atualizacao: snap,
          historico: `${fmtData(p.data)}: criada (${p.situacao_bling})`,
        }
        // na 1ª importação a data da mudança só é conhecida se o Bling informar
        aplicarStatus(r, statusNovo, p.ult_ocorrencia)
        resumo.novas_propostas++
      }
      linhas.push(r)
    }
    const ids = new Set(linhas.map((r) => r.proposta))
    this.t.propostas = ordenar(
      [...this.propostas.filter((r) => !ids.has(r.proposta)), ...linhas],
      (r) => r.data,
      (r) => r.proposta
    )
    const comItens = new Set(itens.map((i) => i.proposta))
    this.t.itensPropostas = [
      ...this.itensPropostas.filter((i) => !comItens.has(i.proposta)),
      ...itens,
    ]
    return props.length
  }

  // ------------------------------------------------------------ feedback

  /** Grava o que a equipe editou (motivo, comentário, datas, pedido) e refaz as ligações. */
  editarPropostas(edicoes: Record<string, EdicaoProposta>) {
    for (const p of this.propostas) {
      const e = edicoes[p.proposta]
      if (!e) continue
      for (const c of EDITAVEIS) {
        if (!(c in e)) continue
        const v = e[c]
        if (c === 'dt_aprovacao' || c === 'dt_cancelamento') p[c] = (v as Data | null) || null
        else p[c] = String(v ?? '')
        p.editados = [...new Set([...(p.editados ?? []), c])]
      }
    }
    const ligacoes = this.ligar()
    this.sincronizarClientes()
    return ligacoes
  }

  // ------------------------------------------------------------ clientes

  /**
   * Garante um cliente para cada CNPJ/CPF (ou nome, sem documento) que aparece nas propostas,
   * pedidos e notas. Cadastro vazio é completado pelos dados; o que veio do Bling (contatos) e
   * os campos da equipe não são tocados. Clientes que deixaram de aparecer são mantidos.
   */
  sincronizarClientes() {
    const porChave = new Map(this.t.clientes.map((c) => [c.chave, c]))
    const ver = (cnpj: string, nome: string, cidade: string, uf: string) => {
      if (!cnpj && !nome) return
      const chave = chaveCliente(cnpj, nome)
      let c = porChave.get(chave)
      if (!c) {
        c = {
          chave,
          cnpj,
          nome,
          fantasia: '',
          tipo_pessoa: cnpj.length === 11 ? 'F' : cnpj.length === 14 ? 'J' : '',
          cidade: '',
          uf: '',
          endereco: '',
          bairro: '',
          cep: '',
          telefone: '',
          email: '',
          codigo_bling: '',
          origem: 'dados',
          grupo: '',
          segmento: '',
          situacao: '',
          observacoes: '',
          atualizado_em: agora(),
        }
        porChave.set(chave, c)
        this.t.clientes.push(c)
      }
      if (!c.nome) c.nome = nome
      if (!c.cidade && cidade && !cidade.startsWith('(')) c.cidade = cidade
      if (!c.uf && uf) c.uf = uf
    }
    for (const p of this.propostas) ver(p.cnpj, p.cliente, p.cidade, p.uf)
    for (const p of this.pedidosAgregados()) ver(p.cnpj, p.cliente, p.cidade, p.uf)
    for (const n of this.notas) if (!n.pedido) ver(n.cnpj, n.cliente, '', n.uf)
    this.t.clientes = ordenar(
      this.t.clientes,
      (c) => norm(c.nome),
      (c) => c.chave
    )
  }

  private importarContatos(contatos: ContatoLido[]) {
    this.sincronizarClientes()
    const porChave = new Map(this.t.clientes.map((c) => [c.chave, c]))
    for (const ct of contatos) {
      const chave = chaveCliente(ct.cnpj, ct.nome)
      const c = porChave.get(chave)
      if (c) {
        for (const [k, v] of Object.entries(ct) as [keyof ContatoLido, string][]) if (v) c[k] = v
        c.origem = 'bling'
        c.atualizado_em = agora()
      } else {
        const novo: Cliente = {
          ...ct,
          chave,
          origem: 'bling',
          grupo: '',
          segmento: '',
          situacao: '',
          observacoes: '',
          atualizado_em: agora(),
        }
        porChave.set(chave, novo)
        this.t.clientes.push(novo)
      }
    }
    return contatos.length
  }

  /** Grava grupo econômico, segmento, situação e observações editados na tabela Clientes. */
  editarClientes(edicoes: Record<string, EdicaoCliente>) {
    for (const c of this.t.clientes) {
      const e = edicoes[c.chave]
      if (!e) continue
      for (const k of EDITAVEIS_CLIENTE) {
        if (!(k in e)) continue
        const v = String(e[k] ?? '').trim()
        if (k === 'situacao') c.situacao = v === 'ativo' || v === 'inativo' ? v : ''
        else c[k] = v
      }
      c.atualizado_em = agora()
    }
  }

  // ------------------------------------------------------------ provisões

  /** Provisões de um cliente, da mais antiga para a mais recente. */
  provisoesDe(cliente: string) {
    return ordenar(
      this.t.provisoes.filter((p) => p.cliente === cliente),
      (p) => p.inicio
    )
  }

  /**
   * Troca os lançamentos de provisão de um cliente pelos enviados (a tela edita a lista toda).
   * Datas repetidas: fica o último enviado.
   */
  salvarProvisoes(
    cliente: string,
    lancamentos: Pick<Provisao, 'inicio' | 'valor_dia' | 'observacao'>[]
  ) {
    const porData = new Map<string, Provisao>()
    for (const l of lancamentos) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(l.inicio))
        throw new Error(`Data inválida na provisão: ${l.inicio}`)
      const valor = Number(l.valor_dia)
      if (!Number.isFinite(valor) || valor < 0)
        throw new Error('O valor por dia útil deve ser zero ou positivo.')
      porData.set(l.inicio, {
        id: `${cliente}|${l.inicio}`,
        cliente,
        inicio: l.inicio,
        valor_dia: valor,
        observacao: String(l.observacao ?? '').trim(),
        atualizado_em: agora(),
      })
    }
    this.t.provisoes = [
      ...this.t.provisoes.filter((p) => p.cliente !== cliente),
      ...porData.values(),
    ]
    return this.provisoesDe(cliente)
  }

  // ------------------------------------------------------------ desfazer importação

  /**
   * Tira um arquivo importado da base: refaz a base com os demais arquivos (na ordem em que
   * foram importados, a partir das cópias em entrada/) e devolve o feedback e as correções
   * manuais das propostas. A tabela Clientes é mantida (só ressincronizada).
   */
  async desfazerImportacao(hash: string, pastaEntrada: string) {
    const alvo = this.t.arquivos.find((a) => a.hash === hash)
    if (!alvo) throw new Error('Arquivo não encontrado na base.')
    const restantes = ordenar(
      this.t.arquivos.filter((a) => a.hash !== hash),
      (a) => a.importado_em
    )
    const conteudos = restantes.map((a) => {
      const f = path.join(pastaEntrada, a.arquivo)
      return { a, conteudo: fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null }
    })
    const faltando = conteudos
      .filter((x) => !x.conteudo || hashConteudo(x.conteudo) !== x.a.hash)
      .map((x) => x.a.arquivo)
    if (faltando.length)
      throw new Error(
        `Para desfazer, a base é refeita a partir de entrada/, e faltam (ou mudaram) estes arquivos: ${faltando.join(', ')}.`
      )

    const nova = new Base()
    for (const { a, conteudo } of conteudos) {
      await nova.importar([{ nome: a.arquivo, conteudo: conteudo!, tipo: a.tipo }], true)
      const reg = nova.t.arquivos.find((x) => x.hash === a.hash)
      if (reg) reg.importado_em = a.importado_em
    }
    // feedback (motivo/comentário) e correções feitas à mão voltam para as propostas
    const antes = new Map(this.propostas.map((p) => [p.proposta, p]))
    for (const p of nova.propostas) {
      const v = antes.get(p.proposta)
      if (!v) continue
      p.motivo = v.motivo
      p.comentario = v.comentario
      for (const c of v.editados ?? []) (p as Record<string, unknown>)[c] = v[c as keyof Proposta]
      if (v.editados?.length) p.editados = [...v.editados]
    }
    nova.ligar()
    this.t = { ...nova.t, clientes: this.t.clientes, provisoes: this.t.provisoes }
    this.sincronizarClientes()
    return {
      removido: alvo.arquivo,
      propostas: this.propostas.length,
      pedidos: new Set(this.pedidos.map((p) => p.pedido)).size,
      notas: this.notas.length,
    }
  }

  // ------------------------------------------------------------ ligações

  ligar() {
    const notas_pedidos = this.ligarNotasPedidos()
    const propostas_pedidos = this.ligarPropostasPedidos()
    return { notas_pedidos, propostas_pedidos }
  }

  private ligarNotasPedidos() {
    const notas = this.notas
    const peds = this.pedidosAgregados().map((p) => ({
      ...p,
      k: chaveNome(p.cliente),
      k2: doisNomes(p.cliente),
    }))
    if (!notas.length || !peds.length) return 0
    const usados = new Set(notas.map((n) => n.pedido).filter(Boolean))
    let n = 0
    for (const nf of notas) {
      if (nf.pedido) continue
      const k = chaveNome(nf.cliente),
        k2 = doisNomes(nf.cliente)
      const limite = nf.data ? addDias(nf.data, 3) : null
      let melhor: (typeof peds)[number] | null = null
      let menor = Infinity
      for (const p of peds) {
        if (!(p.k === k || p.k2 === k2) || usados.has(p.pedido)) continue
        if (!(Math.abs(p.total_pedido - nf.total_nota) < 0.05)) continue
        if (!p.data || !limite || !(p.data <= limite)) continue
        const dist = Math.abs(difDias(p.data, nf.data!))
        if (dist < menor) [melhor, menor] = [p, dist]
      }
      if (!melhor) continue
      nf.pedido = melhor.pedido
      usados.add(melhor.pedido)
      n++
    }
    // completa vendedor/cidade/CNPJ a partir do pedido
    const pi = new Map(peds.map((p) => [p.pedido, p]))
    for (const nf of notas) {
      const p = pi.get(nf.pedido)
      if (p) {
        nf.vendedor = p.vendedor
        nf.cnpj = p.cnpj
        nf.cidade = p.uf ? `${p.cidade}/${p.uf}` : p.cidade
      } else {
        if (!nf.vendedor) nf.vendedor = '(nota sem pedido)'
        if (!nf.cidade) nf.cidade = '(nota sem pedido)'
      }
    }
    return n
  }

  private ligarPropostasPedidos() {
    const props = this.propostas
    const peds = this.pedidosAgregados()
    const nfDoPedido = new Map<string, Nota>()
    for (const nf of this.notas) if (nf.pedido) nfDoPedido.set(nf.pedido, nf) // a última vence
    const usados = new Set(props.flatMap((p) => pedidosDe(p.pedido)))
    let n = 0
    for (const r of props) {
      const original = { historico: r.historico, data: r.data, ult_ocorrencia: r.ult_ocorrencia }
      const baseStatus = statusBling(r.situacao_bling)
      if (baseStatus === C.APROVADO && !r.pedido && peds.length) {
        const ref = r.dt_aprovacao ?? r.data
        const fimJanela = r.data ? addDias(r.data, 90) : null
        let melhor: ItemPedido | null = null
        let menor = Infinity
        for (const p of peds) {
          if (p.cnpj !== r.cnpj || r.cnpj === '' || usados.has(p.pedido)) continue
          if (!p.data || !r.data || !fimJanela || p.data < r.data || p.data > fimJanela) continue
          if (!ref) continue
          const score =
            difDiasAbs(p.data, ref) + (Math.abs(p.total_pedido - r.valor) >= 1 ? 1000 : 0)
          if (score < menor) [melhor, menor] = [p, score]
        }
        if (melhor) {
          r.pedido = melhor.pedido
          usados.add(melhor.pedido)
          const obs =
            Math.abs(melhor.total_pedido - r.valor) < 1 ? '' : ', valor diferente - conferir'
          const hist = { historico: original.historico }
          historico(hist, melhor.data, `entregue (pedido ${melhor.pedido}${obs})`)
          r.historico = hist.historico
          n++
        }
      }
      // status derivado
      const pedido = pedidosDe(r.pedido)[0] ?? ''
      let status: string = baseStatus
      let dataPedido: Data | null = null
      if (baseStatus === C.APROVADO && pedido) {
        // pedido gerado mas sem nota continua Aprovado: só a nota fiscal caracteriza a entrega
        const pp = peds.find((p) => p.pedido === pedido)
        if (pp) dataPedido = pp.data
        r.dt_entrega = null // só a nota fiscal define a data de entrega
        const nf = nfDoPedido.get(pedido)
        if (nf) {
          status = C.FATURADO // entregue e faturado (a data da nota é a data de entrega)
          r.nf = nf.nf
          r.dt_entrega = nf.data
          r.dt_faturamento ??= nf.data
        }
      }
      r.status = status
      // datas que faltam (aprovação sem data no Bling: usa a data do pedido gerado)
      if ([C.APROVADO, C.ENTREGUE, C.FATURADO].includes(status as C.Status) && !r.dt_aprovacao)
        r.dt_aprovacao = dataPedido ?? original.data
      if (status === C.CANCELADO && !r.dt_cancelamento)
        r.dt_cancelamento = original.ult_ocorrencia ?? original.data
    }
    return n
  }
}

export function hashConteudo(conteudo: Uint8Array) {
  return createHash('sha256').update(conteudo).digest('hex').slice(0, 16)
}

/**
 * Salva uma cópia em entrada/. Se já existir outro arquivo com o mesmo nome e conteúdo
 * diferente, usa um nome novo (ex.: 'Notas (2).pdf'). Devolve o nome usado.
 */
export function guardarEmEntrada(pasta: string, nome: string, conteudo: Uint8Array): string {
  fs.mkdirSync(pasta, { recursive: true })
  const ext = path.extname(nome)
  const stem = nome.slice(0, nome.length - ext.length)
  let destino = path.join(pasta, nome)
  for (
    let n = 2;
    fs.existsSync(destino) && !Buffer.from(conteudo).equals(fs.readFileSync(destino));
    n++
  ) {
    destino = path.join(pasta, `${stem} (${n})${ext}`)
  }
  fs.writeFileSync(destino, conteudo)
  return path.basename(destino)
}

const doisNomes = (s: string) =>
  norm(s).replaceAll('.', '').split(' ').filter(Boolean).slice(0, 2).join(' ')

function historico(r: { historico: string }, quando: Data | null, texto: string) {
  const h = `${fmtData(quando)}: ${texto}`
  r.historico = r.historico ? `${r.historico} | ${h}` : h
}

function aplicarStatus(r: Proposta, status: string, quando: Data | null) {
  r.status = status
  if (status === C.APROVADO && !r.dt_aprovacao && quando) r.dt_aprovacao = quando
  if (status === C.CANCELADO && !r.dt_cancelamento && quando) r.dt_cancelamento = quando
}
