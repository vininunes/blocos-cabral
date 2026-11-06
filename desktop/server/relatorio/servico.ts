/**
 * Serviço do relatório: mantém a base carregada e monta as respostas da API.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {
  ArquivoGerado,
  ConsultaRelatorio,
  ConteudoTabela,
  EstadoBanco,
  EstadoBase,
  FonteDados,
  KpiJson,
  Navegacao,
  PedidoClientes,
  PedidoFeedback,
  PedidoImportacao,
  PedidoProvisaoLote,
  PedidoProvisoes,
  PropostaFeedback,
  RespostaRelatorio,
  TabelaBanco,
} from './api-tipos'
import { Base, guardarEmEntrada } from './base'
import { indicadoresClientes } from './clientes'
import * as C from './config'
import { agora, dia, type Dia } from './datas'
import { DIMENSOES, Relatorio, TODOS, type Dimensao, type Tabela } from './metricas'
import { migrarBaseAntiga, type ResultadoMigracao } from './migracao'
import { comparacao, Periodo } from './periodo'
import { COLUNAS_BASE, excelRelatorio, exportarBase } from './planilha'
import { gerarPpt, nomeArquivo } from './ppt'
import { calcularProvisao } from './provisao'
import type { TipoArquivo } from './tipos'
import { fmtMoeda } from './utils'

export type Pastas = { entrada: string; dados: string; saida: string }

function faixa(datas: (string | null)[]): [Dia | null, Dia | null] {
  const d = datas.map(dia).filter((x): x is Dia => x !== null)
  if (!d.length) return [null, null]
  return [d.reduce((a, b) => (b < a ? b : a)), d.reduce((a, b) => (b > a ? b : a))]
}

/** Data local de hoje (toISOString seria UTC e viraria o dia à noite no Brasil). */
const hoje = () => agora().slice(0, 10)

export function criarServico(
  pastas: Pastas,
  { basesAntigas = [] }: { basesAntigas?: string[] } = {}
) {
  const caminhoBase = path.join(pastas.dados, 'base.json')
  const novaInstalacao = !fs.existsSync(caminhoBase)
  const base = new Base(caminhoBase)
  let migracao: ResultadoMigracao | null = null

  /** Troca a base pela base.xlsx do app antigo e grava. */
  async function migrar(caminhoXlsx: string) {
    migracao = await migrarBaseAntiga(base, caminhoXlsx, pastas.entrada)
    base.salvar()
    return migracao
  }

  // primeiro uso: traz a base do app antigo (Python), se houver uma nos lugares conhecidos
  const pronto: Promise<void> = (async () => {
    const antiga = novaInstalacao ? basesAntigas.find((c) => fs.existsSync(c)) : undefined
    if (!antiga) return
    try {
      await migrar(antiga)
      console.log(`[relatorio] base antiga migrada de ${antiga}`)
    } catch (e) {
      console.error('[relatorio] falha ao migrar a base antiga', e)
    }
  })()

  function dataMaisRecente(): Dia {
    const datas = [...base.notas, ...base.pedidos]
      .map((r) => r.data)
      .filter((d): d is Dia => d !== null)
    return datas.length ? datas.reduce((a, b) => (b > a ? b : a)) : hoje()
  }

  function estado(): EstadoBase {
    const fontes: FonteDados[] = [
      ['Notas fiscais', base.notas, base.notas.length],
      ['Pedidos entregues', base.pedidos, new Set(base.pedidos.map((p) => p.pedido)).size],
      ['Propostas', base.propostas, base.propostas.length],
    ].map(([nome, linhas, quantidade]) => {
      const [inicio, fim] = faixa((linhas as { data: string | null }[]).map((r) => r.data))
      return { nome: nome as string, quantidade: quantidade as number, inicio, fim }
    })
    const fins = fontes.map((f) => f.fim).filter((d): d is Dia => d !== null)
    return {
      vazia: !base.notas.length && !base.pedidos.length && !base.propostas.length,
      cobertura: base.cobertura(),
      fimMaximo: fins.length ? fins.reduce((a, b) => (b > a ? b : a)) : null,
      fontes,
      ultimaImportacao: base.ultimaImportacao(),
      dataMaisRecente: dataMaisRecente(),
      ancoraPadrao: base.cobertura()[1] ?? dataMaisRecente(),
      motivos: C.MOTIVOS,
      migracao,
    }
  }

  function periodoDe(q: ConsultaRelatorio) {
    return q.tipo === 'Personalizado'
      ? Periodo.de('Personalizado', q.ancora, q.de ?? q.ancora, q.ate ?? q.ancora)
      : Periodo.de(q.tipo, q.ancora)
  }

  function navegar(q: ConsultaRelatorio, n: number): Navegacao {
    const p = periodoDe(q).deslocar(n)
    return q.tipo === 'Personalizado'
      ? { ancora: q.ancora, de: p.inicio, ate: p.fim }
      : { ancora: p.inicio, de: null, ate: null }
  }

  function relatorioDe(q: ConsultaRelatorio) {
    const ultimoDia = base.cobertura()[1] ?? dataMaisRecente()
    const [a, b] = comparacao(periodoDe(q), q.modo, ultimoDia, q.cmpDe, q.cmpAte)
    return { a, b, rel: new Relatorio(base, a, q.filtro, b, q.modo) }
  }

  /** Grava em saida/ e devolve o nome e o caminho do arquivo. */
  function gravarSaida(nome: string, dados: Uint8Array): ArquivoGerado {
    fs.mkdirSync(pastas.saida, { recursive: true })
    const caminho = path.join(pastas.saida, nome)
    fs.writeFileSync(caminho, dados)
    return { nome, caminho }
  }

  async function exportar(tipo: 'ppt' | 'excel', q: ConsultaRelatorio) {
    const { rel } = relatorioDe(q)
    return tipo === 'ppt'
      ? gravarSaida(nomeArquivo(rel, 'pptx'), await gerarPpt(rel))
      : gravarSaida(nomeArquivo(rel, 'xlsx'), await excelRelatorio(rel.tabelasExcel()))
  }

  async function exportarBaseXlsx() {
    return gravarSaida(`Base_Blocos_Cabral_${hoje()}.xlsx`, await exportarBase(base))
  }

  /** Caminho de um arquivo de saida/ pelo nome (sem sair da pasta). */
  function arquivoDeSaida(nome: string) {
    const caminho = path.resolve(pastas.saida, nome)
    if (path.dirname(caminho) !== path.resolve(pastas.saida) || !fs.existsSync(caminho)) return null
    return caminho
  }

  function relatorio(q: ConsultaRelatorio): RespostaRelatorio {
    const { a, b, rel } = relatorioDe(q)
    const kpi = (k: ReturnType<Relatorio['kpis']>[number]) => k.toJSON() as KpiJson
    const series = q.filtro === TODOS ? [C.FATURADO, C.ENTREGUE, C.APROVADO] : [q.filtro]
    const ren = (t: Tabela) => rel.renomear(t)
    const semColunas = (t: Tabela, fora: string[]) => {
      const manter = t.colunas.map((c) => !fora.includes(c))
      return {
        colunas: t.colunas.filter((_, j) => manter[j]),
        linhas: t.linhas.map((l) => l.filter((_, j) => manter[j])),
      }
    }
    const soma = (t: Tabela, col: string) =>
      t.linhas.reduce((s, l) => s + Number(l[t.colunas.indexOf(col)] ?? 0), 0)

    let detalhamento: RespostaRelatorio['detalhamento']
    const ag = rel.aguardandoNota()
    const notaAguardando = `${ag.linhas.length} pedidos feitos no período ainda sem nota fiscal: ${fmtMoeda(soma(ag, 'Valor'))}. Eles entram em Entregue quando a nota for emitida.`
    if (q.filtro === TODOS) {
      const notas = rel.lista(C.FATURADO)
      detalhamento = [
        { titulo: 'Notas emitidas', tabela: semColunas(notas, ['Motivo', 'Comentário']) },
        { titulo: 'Vendas aprovadas', tabela: semColunas(rel.lista(C.APROVADO), ['Motivo']) },
        { titulo: 'Cancelamentos', tabela: rel.lista(C.CANCELADO) },
        { titulo: 'Aguardando nota', tabela: ag, nota: notaAguardando },
        {
          titulo: 'Notas sem pedido',
          tabela: semColunas(
            {
              ...notas,
              linhas: notas.linhas.filter(
                (l) => l[notas.colunas.indexOf('Pedido')] === 'sem pedido'
              ),
            },
            ['Motivo', 'Comentário']
          ),
        },
      ]
    } else {
      detalhamento = [{ titulo: q.filtro, tabela: rel.lista() }]
      if (q.filtro === C.ENTREGUE)
        detalhamento.push({ titulo: 'Aguardando nota', tabela: ag, nota: notaAguardando })
    }

    const feedback: PropostaFeedback[] = rel.propostasFiltradas().map((p) => ({
      proposta: p.proposta,
      cliente: p.cliente,
      vendedor: p.vendedor,
      valor: p.valor,
      status: p.status,
      data: dia(p.data),
      dt_aprovacao: dia(p.dt_aprovacao),
      dt_cancelamento: dia(p.dt_cancelamento),
      pedido: p.pedido,
      nf: p.nf,
      motivo: p.motivo,
      comentario: p.comentario,
    }))

    const provisao = calcularProvisao(base, a, base.cobertura()[1])

    return {
      a: a.toJSON(),
      b: b?.toJSON() ?? null,
      modo: q.modo,
      filtro: q.filtro,
      nomeA: rel.nomeA,
      nomeB: rel.nomeB,
      compara: rel.compara,
      coberturaB: rel.coberturaB,
      cobertura: base.cobertura(),
      navegacao: { anterior: navegar(q, -1), proximo: navegar(q, 1) },
      grupos: rel.grupos().map(([titulo, ks]) => ({ titulo, kpis: ks.map(kpi) })),
      acumulado: rel.compara ? Object.fromEntries(series.map((s) => [s, rel.acumulado(s)])) : {},
      variacoes: Object.fromEntries(
        (Object.keys(DIMENSOES) as Dimensao[]).map((d) => [d, rel.variacoes(d, 5)])
      ) as Record<Dimensao, Tabela>,
      evolucao: rel.evolucao(),
      funil: q.filtro === TODOS ? rel.funil() : null,
      motivos: q.filtro === C.CANCELADO ? rel.motivos() : null,
      vendedores: ren(rel.vendedores()),
      clientes: ren(rel.clientes(50)),
      produtos: ren(rel.produtos(50)),
      cidades: ren(rel.cidades(50)),
      pedidos: rel.pedidosFiltrados(),
      detalhamento,
      feedback,
      provisao,
    }
  }

  async function importar(pedido: PedidoImportacao) {
    // cópia em entrada/ (sem sobrescrever outro arquivo de mesmo nome) e importação
    const arquivos = pedido.arquivos.map((a) => {
      const conteudo = new Uint8Array(Buffer.from(a.conteudo, 'base64'))
      return {
        nome: guardarEmEntrada(pastas.entrada, a.nome, conteudo),
        conteudo,
        tipo: a.tipo as TipoArquivo,
      }
    })
    const resumo = await base.importar(arquivos)
    base.salvar()
    return resumo
  }

  async function importarPasta() {
    const resumo = await base.importarPasta(pastas.entrada)
    base.salvar()
    return resumo
  }

  function importadoComo(conteudoBase64: string) {
    return base.importadoComo(new Uint8Array(Buffer.from(conteudoBase64, 'base64')))
  }

  function salvarFeedback(pedido: PedidoFeedback) {
    const ligacoes = base.editarPropostas(pedido.edicoes)
    base.salvar()
    return ligacoes
  }

  // ------------------------------------------------------------ banco de dados

  const TABELAS: Record<TabelaBanco, [string, string]> = {
    propostas: ['Propostas', 'Propostas'],
    itensPropostas: ['ItensPropostas', 'Itens das propostas'],
    pedidos: ['Pedidos', 'Pedidos (itens)'],
    notas: ['Notas', 'Notas fiscais'],
    arquivos: ['Arquivos', 'Arquivos importados'],
  }

  function estadoBanco(): EstadoBanco {
    const porDia = (datas: (string | null)[]) => {
      const m = new Map<string, number>()
      for (const d of datas.map(dia)) if (d) m.set(d, (m.get(d) ?? 0) + 1)
      return [...m.entries()].sort(([x], [y]) => (x < y ? -1 : 1))
    }
    const fontes = (
      [
        ['propostas', 'Propostas', base.propostas.map((p) => p.data)],
        ['pedidos', 'Pedidos', base.pedidosAgregados().map((p) => p.data)],
        ['notas', 'Notas fiscais', base.notas.map((n) => n.data)],
      ] as const
    ).map(([tabela, nome, datas]) => {
      const dias = porDia([...datas])
      return {
        tabela,
        nome,
        quantidade: datas.length,
        inicio: dias[0]?.[0] ?? null,
        fim: dias.at(-1)?.[0] ?? null,
        dias,
      }
    })
    base.sincronizarClientes()
    return {
      cobertura: base.cobertura(),
      fontes,
      tabelas: [
        ...(Object.keys(TABELAS) as TabelaBanco[]).map((t) => ({
          tabela: t,
          nome: TABELAS[t][1],
          linhas: (base.t[t] as unknown[]).length,
        })),
        { tabela: 'clientes' as const, nome: 'Clientes', linhas: base.t.clientes.length },
      ],
    }
  }

  function tabelaBanco(nome: TabelaBanco): ConteudoTabela {
    if (!(nome in TABELAS)) throw new Error(`Tabela desconhecida: ${nome}`)
    const cols = COLUNAS_BASE[TABELAS[nome][0]]
    return {
      colunas: Object.entries(cols).map(([chave, titulo]) => ({ chave, titulo })),
      linhas: (base.t[nome] as unknown as Record<string, string | number | null>[]).map((r) =>
        Object.fromEntries(Object.keys(cols).map((k) => [k, r[k] ?? null]))
      ),
    }
  }

  function salvarClientes(pedido: PedidoClientes) {
    base.editarClientes(pedido.edicoes)
    base.salvar()
  }

  function provisoes(cliente: string) {
    return base.provisoesDe(cliente)
  }

  function lancarProvisaoEmLote(pedido: PedidoProvisaoLote) {
    const n = base.lancarProvisaoEmLote(pedido.clientes ?? [], pedido.lancamento)
    base.salvar()
    return { clientes: n }
  }

  function salvarProvisoes(cliente: string, pedido: PedidoProvisoes) {
    const r = base.salvarProvisoes(cliente, pedido.lancamentos ?? [])
    base.salvar()
    return r
  }

  async function desfazerImportacao(hash: string) {
    const r = await base.desfazerImportacao(hash, pastas.entrada)
    base.salvar()
    return r
  }

  return {
    estadoBanco,
    tabelaBanco,
    provisoes,
    salvarProvisoes,
    lancarProvisaoEmLote,
    clientes: () => indicadoresClientes(base),
    salvarClientes,
    desfazerImportacao,
    base,
    pastas,
    estado,
    relatorio,
    importar,
    importarPasta,
    importadoComo,
    salvarFeedback,
    exportar,
    exportarBase: exportarBaseXlsx,
    arquivoDeSaida,
    migrar,
    pronto,
  }
}

export type Servico = ReturnType<typeof criarServico>
