/**
 * PowerPoint do relatório com a identidade da Blocos Cabral.
 * Gráficos nativos do PowerPoint (editáveis); valores em R$ aparecem em milhares nos gráficos.
 * Coordenadas em pontos (slide 960 x 540, 16:9), convertidas para polegadas no pptxgenjs.
 */
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import PptxGenJS from 'pptxgenjs'
import path from 'node:path'

import * as C from './config'
import { LOGO_PNG_BASE64, LOGO_PROPORCAO } from './logo'
import { TODOS, type Celula, type KPI, type Relatorio, type Tabela } from './metricas'
import { fmtData, fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct, fmtQtd, fmtSinal, norm } from './utils'

const SW = 960
const SH = 540
const M = 40
const CINZA_TXT = '787878'
const pol = (pt: number) => pt / 72
const DATA = /^\d{4}-\d{2}-\d{2}$/
const MESTRE = 'CABRAL'

type Slide = PptxGenJS.Slide
/** Dados de cada gráfico, na ordem em que entram no deck (chart1.xml, chart2.xml...). */
type DadosGrafico = { categorias: string[]; series: { nome: string; valores: (number | null)[] }[] }
type Alin = 'left' | 'right' | 'center'
/** t texto · r já formatado (à direita) · m moeda · dm diferença em R$ · i quantidade · p % · v variação · d data */
type Fmt = 't' | 'r' | 'm' | 'dm' | 'i' | 'p' | 'v' | 'd'

// ---------------------------------------------------------------- formatação

function fmtKpi(v: number | null, formato: string) {
  if (v === null) return '-'
  if (formato === 'moeda') return fmtMoeda(v)
  if (formato === 'pct') return fmtPct(v)
  if (formato === 'dias') return fmtNum(v, 1)
  return fmtNum(v)
}

/** Diferença absoluta com sinal (+R$ 50.615,45; +3; +2,5 p.p.). */
function fmtDelta(d: number | null, formato: string, curto = false) {
  if (d === null || Number.isNaN(d)) return ''
  if (formato === 'pct') return fmtSinal(d * 100, (x) => fmtNum(x, 1)) + ' p.p.'
  if (formato === 'moeda') return fmtSinal(d, curto ? fmtMoedaCurta : (x) => fmtMoeda(x))
  return fmtSinal(d, (x) => fmtNum(x, formato === 'dias' ? 1 : 0))
}

function fmtVar(k: KPI) {
  const v = k.variacao
  if (v === null) return ''
  return k.formato === 'pct' ? `${v > 0 ? '+' : ''}${fmtNum(v * 100, 1)} p.p.` : fmtPct(v, 1, true)
}

function formatar(v: Celula, f: Fmt): string {
  if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) return ''
  if (typeof v === 'string' && f !== 't') return f === 'd' && DATA.test(v) ? fmtData(v) : v // já formatado
  if (typeof v === 'number') {
    if (f === 'dm') return fmtSinal(v, (x) => fmtMoeda(x))
    if (f === 'm') return fmtMoeda(v)
    if (f === 'i') return fmtQtd(v)
    if (f === 'p') return fmtPct(v)
    if (f === 'v') return fmtPct(v, 1, true)
  }
  const s = String(v)
  return s.length <= 60 ? s : s.slice(0, 57) + '...'
}

// ---------------------------------------------------------------- tabelas {colunas, linhas}

const col = (t: Tabela, nome: string) => t.linhas.map((l) => l[t.colunas.indexOf(nome)])
const num = (t: Tabela, nome: string) => col(t, nome).map((v) => Number(v ?? 0))

function selecionar(t: Tabela, colunas: string[]): Tabela {
  const js = colunas.map((c) => t.colunas.indexOf(c))
  return { colunas, linhas: t.linhas.map((l) => js.map((j) => (j >= 0 ? l[j] : null))) }
}

const sem = (t: Tabela, fora: readonly string[]) =>
  selecionar(
    t,
    t.colunas.filter((c) => !fora.includes(c))
  )

// ---------------------------------------------------------------- deck

class Deck {
  readonly pptx = new PptxGenJS()
  readonly graficos: DadosGrafico[] = []
  private readonly rotulo: string

  constructor(readonly rel: Relatorio) {
    this.pptx.layout = 'LAYOUT_WIDE' // 13,333 x 7,5 pol = 960 x 540 pt
    this.pptx.author = 'Blocos Cabral'
    this.pptx.title = 'Relatório de Vendas'
    this.rotulo = rel.p.rotulo + (rel.filtro === TODOS ? '' : `  ·  ${rel.filtro}`)
    // barra do topo, rodapé, logo e número no slide mestre: o logo entra uma vez só no arquivo
    const txt = (
      text: string,
      l: number,
      t: number,
      w: number,
      h: number,
      alin: Alin = 'left'
    ) => ({
      text: {
        text,
        options: {
          x: pol(l),
          y: pol(t),
          w: pol(w),
          h: pol(h),
          fontFace: 'Arial',
          fontSize: 9,
          color: '828282',
          align: alin,
          valign: 'top' as const,
          margin: 0,
        },
      },
    })
    this.pptx.defineSlideMaster({
      title: MESTRE,
      background: { color: 'FFFFFF' },
      objects: [
        {
          rect: {
            x: 0,
            y: 0,
            w: pol(SW),
            h: pol(8),
            fill: { color: C.AZUL },
            line: { color: C.AZUL, width: 0 },
          },
        },
        {
          line: {
            x: pol(M),
            y: pol(SH - 36),
            w: pol(SW - 2 * M),
            h: 0,
            line: { color: C.CINZA, width: 0.75 },
          },
        },
        txt(`Blocos Cabral · Relatório de Vendas · ${this.rotulo}`, M, SH - 30, 600, 16),
        {
          image: {
            data: `image/png;base64,${LOGO_PNG_BASE64}`,
            x: pol(SW - M - 160),
            y: pol(SH - 31),
            h: pol(20),
            w: pol(20 * LOGO_PROPORCAO),
          },
        },
      ],
      slideNumber: {
        x: pol(SW - M - 30),
        y: pol(SH - 30),
        w: pol(30),
        h: pol(16),
        fontFace: 'Arial',
        fontSize: 9,
        color: '828282',
        align: 'right',
        margin: 0,
      },
    })
  }

  // ------------------------------------------------------------ primitivas

  texto(
    s: Slide,
    txt: string,
    l: number,
    t: number,
    w: number,
    h: number,
    tam = 12,
    negrito = false,
    cor = C.GRAFITE,
    alin: Alin = 'left',
    quebra = true
  ) {
    s.addText(String(txt), {
      x: pol(l),
      y: pol(t),
      w: pol(w),
      h: pol(h),
      fontFace: 'Arial',
      fontSize: tam,
      bold: negrito,
      color: cor,
      align: alin,
      valign: 'top',
      margin: 0,
      wrap: quebra,
      fit: 'none',
    })
  }

  retangulo(s: Slide, l: number, t: number, w: number, h: number, cor: string) {
    s.addShape(this.pptx.ShapeType.rect, {
      x: pol(l),
      y: pol(t),
      w: pol(w),
      h: pol(h),
      fill: { color: cor },
      line: { color: cor, width: 0 },
    })
  }

  logo(s: Slide, l: number, t: number, altura: number) {
    s.addImage({
      data: `image/png;base64,${LOGO_PNG_BASE64}`,
      x: pol(l),
      y: pol(t),
      h: pol(altura),
      w: pol(altura * LOGO_PROPORCAO),
    })
  }

  slide(titulo: string, subtitulo = '') {
    const s = this.pptx.addSlide({ masterName: MESTRE })
    const tam = titulo.length <= 40 ? 24 : titulo.length <= 48 ? 20 : 17 // título sempre em uma linha
    this.texto(s, titulo, M, 24 + (24 - tam) / 2, 620, 36, tam, true, C.AZUL, 'left', false)
    this.texto(s, this.rotulo, SW - M - 320, 32, 320, 20, 12, false, CINZA_TXT, 'right')
    if (subtitulo) this.texto(s, subtitulo, M, 66, SW - 2 * M, 20, 13)
    return s
  }

  /** coresCelulas: {'linha|coluna': cor} para colorir o texto de células (linha 0 = 1º registro). */
  tabela(
    s: Slide,
    t: Tabela,
    fmts: Record<string, Fmt>,
    larguras: number[],
    {
      l = M,
      top = 84,
      maxLinhas = 12,
      tam,
      coresCelulas,
    }: {
      l?: number
      top?: number
      maxLinhas?: number
      tam?: number
      coresCelulas?: Record<string, string>
    } = {}
  ) {
    const df = this.rel.renomear({ colunas: t.colunas, linhas: t.linhas.slice(0, maxLinhas) })
    const fmtsR = Object.fromEntries(
      Object.entries(fmts).map(([c, f]) => [
        this.rel.renomear({ colunas: [c], linhas: [] }).colunas[0],
        f,
      ])
    )
    if (!df.linhas.length) {
      this.texto(
        s,
        'Sem registros no período.',
        M,
        220,
        SW - 2 * M,
        30,
        16,
        false,
        CINZA_TXT,
        'center'
      )
      return
    }
    const nl = df.linhas.length + 1
    const fonte = tam ?? (nl > 11 ? 10 : 11)
    const linhas: PptxGenJS.TableRow[] = []
    for (let i = 0; i < nl; i++) {
      linhas.push(
        df.colunas.map((c, j) => {
          const f = fmtsR[c] ?? 't'
          const txt = i === 0 ? c : formatar(df.linhas[i - 1][j], f)
          let cor = i === 0 ? 'FFFFFF' : C.GRAFITE
          if (i > 0 && (f === 'v' || f === 'dm') && txt && txt !== '0,0%' && txt !== 'R$ 0,00')
            cor = txt.startsWith('-') ? C.VERMELHO : C.VERDE
          const original = t.colunas[j]
          if (i > 0 && coresCelulas?.[`${i - 1}|${original}`])
            cor = coresCelulas[`${i - 1}|${original}`]
          return {
            text: txt,
            options: {
              fill: { color: i === 0 ? C.AZUL : i % 2 === 0 ? C.CINZA_CLARO : 'FFFFFF' },
              color: cor,
              bold: i === 0,
              fontFace: 'Arial',
              fontSize: fonte,
              valign: 'middle' as const,
              align: (f === 't' ? 'left' : 'right') as Alin,
              margin: [2, 5, 2, 5] as [number, number, number, number],
            },
          }
        })
      )
    }
    s.addTable(linhas, {
      x: pol(l),
      y: pol(top),
      w: pol(larguras.reduce((a, b) => a + b, 0)),
      colW: larguras.map(pol),
      rowH: pol(20),
      border: { type: 'none' },
      autoPage: false,
    })
  }

  grafico(
    s: Slide,
    categorias: string[],
    series: Record<string, number[]>,
    l: number,
    t: number,
    w: number,
    h: number,
    {
      tipo = 'col',
      cores,
      mil = true,
      legenda = false,
      coresPontos,
    }: {
      tipo?: 'col' | 'bar'
      cores?: string[]
      mil?: boolean
      legenda?: boolean
      coresPontos?: string[]
    } = {}
  ) {
    const dados = Object.entries(series).map(([name, vals]) => ({
      name,
      labels: categorias.map(String),
      values: vals.map((v) => (mil ? Math.round((v / 1000) * 10) / 10 : v)),
    }))
    this.graficos.push({
      categorias: categorias.map(String),
      series: dados.map((d) => ({ nome: d.name, valores: d.values })),
    })
    const todos = dados.flatMap((d) => d.values)
    const maior = Math.max(0, ...Object.values(series).flat())
    const pequeno = categorias.length > 12
    s.addChart(this.pptx.ChartType.bar, dados, {
      x: pol(l),
      y: pol(t),
      w: pol(w),
      h: pol(h),
      barDir: tipo,
      barGrouping: 'clustered',
      barGapWidthPct: 60,
      barOverlapPct: dados.length > 1 ? -10 : 0,
      chartColors:
        coresPontos && dados.length === 1
          ? coresPontos.slice(0, categorias.length)
          : (cores ?? [C.AZUL, C.CINZA, C.VERDE]),
      showLegend: legenda,
      legendPos: 't',
      legendFontFace: 'Arial',
      legendFontSize: 10,
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelFontFace: 'Arial',
      dataLabelFontSize: pequeno ? 9 : 10,
      dataLabelFormatCode: mil ? '#,##0;-#,##0;;' : '#,##0;-#,##0;0',
      valGridLine: { color: 'E6E6E6', size: 0.75 },
      valAxisLabelFontSize: 9,
      valAxisLabelFontFace: 'Arial',
      valAxisLabelFormatCode: '#,##0',
      valAxisLineShow: false,
      ...(!mil && maior < 10 ? { valAxisMajorUnit: 1 } : {}),
      catAxisLabelFontSize: pequeno ? 9 : 10,
      catAxisLabelFontFace: 'Arial',
      catAxisLineColor: C.CINZA,
      // 'maxMin' (barras de cima para baixo) existe no pptxgenjs, mas o tipo só declara 'minMax'
      ...(tipo === 'bar' ? { catAxisOrientation: 'maxMin' as unknown as 'minMax' } : {}),
      ...(todos.some((v) => v < 0) ? { catAxisLabelPos: 'low' as const } : {}),
    })
    if (mil) this.texto(s, 'valores em R$ mil', l, t - 14, 200, 12, 9, false, CINZA_TXT)
  }

  /**
   * Gráfico de linhas (valores em R$ mil); dias sem dados ficam vazios. A contínua e B
   * tracejada — o pptxgenjs só tem um tracejado por gráfico, então a 2ª série é ajustada
   * em `ajustarPacote`.
   */
  linha(
    s: Slide,
    categorias: string[],
    series: [string, (number | null)[], string][],
    l: number,
    t: number,
    w: number,
    h: number
  ) {
    const marcador = categorias.length <= 31
    const dados = series.map(([name, vals]) => ({
      name,
      labels: categorias.map(String),
      values: vals.map((v) => (v === null ? null : Math.round((v / 1000) * 10) / 10)),
    }))
    this.graficos.push({
      categorias: categorias.map(String),
      series: dados.map((d) => ({ nome: d.name, valores: d.values })),
    })
    s.addChart(
      this.pptx.ChartType.line,
      dados as { name: string; labels: string[]; values: number[] }[],
      {
        x: pol(l),
        y: pol(t),
        w: pol(w),
        h: pol(h),
        chartColors: series.map(([, , cor]) => cor),
        lineSize: 2.5,
        lineDataSymbol: marcador ? 'circle' : 'none',
        lineDataSymbolSize: 5,
        showLegend: true,
        legendPos: 't',
        legendFontFace: 'Arial',
        legendFontSize: 10,
        displayBlanksAs: 'gap',
        valGridLine: { color: 'E6E6E6', size: 0.75 },
        valAxisLabelFontSize: 9,
        valAxisLabelFontFace: 'Arial',
        valAxisLabelFormatCode: '#,##0',
        valAxisLineShow: false,
        catAxisLabelFontSize: 9,
        catAxisLabelFontFace: 'Arial',
        catAxisLineColor: C.CINZA,
      }
    )
    this.texto(s, 'valores em R$ mil', l, t - 14, 200, 12, 9, false, CINZA_TXT)
  }

  /** Texto e cor da variação de um KPI: verde/vermelho conforme subir ser bom ou ruim. */
  delta(k: KPI): [string, string] {
    const r = this.rel
    const d = k.delta
    if (!r.compara) return ['', '828282']
    if (r.coberturaB === 'nenhuma') return ['sem dados para comparar', '828282']
    if (d === null || (k.formato !== 'pct' && !k.anterior && !k.atual))
      return ['sem movimento', '828282']
    const seta = d > 0 ? '▲' : d < 0 ? '▼' : '■'
    let txt: string
    if (k.formato === 'pct') txt = `${seta} ${d > 0 ? '+' : ''}${fmtNum(d * 100, 1)} p.p.`
    else {
      const abs = fmtDelta(d, k.formato, true)
      txt =
        k.variacao !== null ? `${seta} ${fmtPct(k.variacao, 1, true)}  (${abs})` : `${seta} ${abs}`
    }
    return [txt, k.melhorou === true ? C.VERDE : k.melhorou === false ? C.VERMELHO : '828282']
  }

  cartaoDestaque(s: Slide, l: number, t: number, w: number, h: number, k: KPI) {
    const r = this.rel
    this.retangulo(s, l, t, w, h, C.CINZA_CLARO)
    this.retangulo(s, l, t, 5, h, C.AZUL)
    const val = fmtKpi(k.atual, k.formato)
    this.texto(s, k.nome, l + 16, t + 10, w - 26, 16, 11, false, '5A5A5A')
    this.texto(s, val, l + 16, t + 28, w - 24, 30, val.length > 14 ? 20 : 24, true, C.AZUL)
    if (!r.compara) return
    const [txt, cor] = this.delta(k)
    this.texto(s, txt, l + 16, t + 62, w - 24, 16, 11, true, cor)
    const linhas: [string, number | null, string][] = [[r.nomeA, k.atual, C.AZUL]]
    if (r.coberturaB !== 'nenhuma') linhas.push([r.nomeB, k.anterior, C.CINZA])
    const maior = Math.max(Math.abs(k.atual ?? 0), Math.abs(k.anterior ?? 0)) || 1
    const trilhoL = l + 16 + 96,
      trilhoW = w - 16 - 96 - 70
    linhas.forEach(([rot, v, cb], j) => {
      const y = t + 84 + j * 15
      this.texto(s, rot, l + 16, y, 94, 12, 8, false, '5A5A5A', 'left', false)
      this.retangulo(s, trilhoL, y + 2, trilhoW, 8, 'FFFFFF')
      if (v) this.retangulo(s, trilhoL, y + 2, Math.max((trilhoW * Math.abs(v)) / maior, 1), 8, cb)
      const numero = k.formato === 'moeda' && v !== null ? fmtMoedaCurta(v) : fmtKpi(v, k.formato)
      this.texto(s, numero, l + w - 68, y, 58, 12, 8, false, '5A5A5A', 'right')
    })
  }

  cartaoLinha(s: Slide, l: number, t: number, w: number, h: number, k: KPI) {
    this.retangulo(s, l, t, w, h, C.CINZA_CLARO)
    this.retangulo(s, l, t, 4, h, C.CINZA)
    this.texto(s, k.nome, l + 12, t + 6, w * 0.55, 14, 10, false, '5A5A5A')
    this.texto(
      s,
      fmtKpi(k.atual, k.formato),
      l + w * 0.4,
      t + 4,
      w * 0.6 - 10,
      18,
      13,
      true,
      C.AZUL,
      'right'
    )
    if (!this.rel.compara) return
    const [txt, cor] = this.delta(k)
    this.texto(s, txt, l + 12, t + 24, w - 22, 12, 9, true, cor)
    if (this.rel.coberturaB !== 'nenhuma')
      this.texto(
        s,
        `${this.rel.nomeB}: ${fmtKpi(k.anterior, k.formato)}`,
        l + 12,
        t + 37,
        w - 22,
        12,
        8,
        false,
        CINZA_TXT
      )
  }

  /** Destaques no topo e os demais indicadores por etapa do fluxo (A x B). */
  resumo(titulo: string) {
    const r = this.rel
    const s = this.slide(
      titulo,
      r.compara ? `${r.p.rotulo}  x  ${r.ant.rotulo}  (${r.modo.toLowerCase()})` : r.p.rotulo
    )
    const grupos = r.grupos()
    const gap = 16
    const dest = grupos[0][1]
    let w = (SW - 2 * M - (dest.length - 1) * gap) / dest.length
    dest.forEach((k, i) =>
      this.cartaoDestaque(s, M + i * (w + gap), 90, w, r.compara ? 120 : 72, k)
    )
    const blocos = grupos.slice(1)
    if (!r.compara) {
      // sem variações: cartões compactos com só o valor
      if (blocos.length === 1) {
        const ks = blocos[0][1]
        w = (SW - 2 * M - (ks.length - 1) * gap) / ks.length
        ks.forEach((k, i) => this.cartaoLinha(s, M + i * (w + gap), 182, w, 30, k))
        return s
      }
      w = (SW - 2 * M - (blocos.length - 1) * gap) / blocos.length
      blocos.forEach(([tb, ks], j) => {
        const l = M + j * (w + gap)
        this.texto(s, tb.toUpperCase(), l, 182, w, 14, 9, true, C.AZUL)
        this.retangulo(s, l, 198, w, 2, C.AZUL)
        ks.forEach((k, i) => this.cartaoLinha(s, l, 206 + i * 38, w, 30, k))
      })
      return s
    }
    if (blocos.length === 1) {
      const ks = blocos[0][1]
      w = (SW - 2 * M - (ks.length - 1) * gap) / ks.length
      ks.forEach((k, i) => this.cartaoLinha(s, M + i * (w + gap), 226, w, 52, k))
    } else {
      w = (SW - 2 * M - (blocos.length - 1) * gap) / blocos.length
      blocos.forEach(([tb, ks], j) => {
        const l = M + j * (w + gap)
        this.texto(s, tb.toUpperCase(), l, 222, w, 14, 9, true, C.AZUL)
        this.retangulo(s, l, 238, w, 2, C.AZUL)
        ks.forEach((k, i) => this.cartaoLinha(s, l, 246 + i * 58, w, 52, k))
      })
    }
    if (r.coberturaB !== 'total') {
      const aviso =
        r.coberturaB === 'nenhuma'
          ? 'A base não tem dados do período de comparação.'
          : 'A base cobre só parte do período de comparação: variações podem estar distorcidas.'
      this.texto(s, aviso, M, SH - 56, SW - 2 * M, 14, 9, true, C.VERMELHO)
    }
    return s
  }

  /** Slides de comparação: curva acumulada, tabela de indicadores e maiores altas e quedas. */
  comparativo() {
    const r = this.rel
    const st = r.filtro === TODOS ? C.FATURADO : r.filtro
    const ac = r.acumulado(st)
    const a = r.nomeA,
      b = r.nomeB
    const va = col(ac, a) as (number | null)[],
      vb = col(ac, b) as (number | null)[],
      rot = col(ac, 'Rótulo') as string[]
    const ult = va.findLastIndex((v) => v !== null)
    let sub = ''
    if (ult >= 0) {
      const dia = rot[ult]
      sub = `${a} x ${b}  ·  ${/^\d+$/.test(dia) ? 'no dia ' + dia : 'na ' + dia.toLowerCase()}: ${fmtMoeda(va[ult])} em ${a}`
      if (vb[ult] !== null)
        sub +=
          `  x  ${fmtMoeda(vb[ult])} em ${b}` +
          (vb[ult] ? `  (${fmtPct(va[ult]! / vb[ult]! - 1, 1, true)})` : '')
    }
    const nome = st === C.FATURADO ? 'Faturamento' : st === C.PROCESSO ? 'Carteira em aberto' : st
    let s = this.slide(
      `${nome} ${st === C.PROCESSO ? 'dia a dia' : 'acumulado'}`,
      sub || `${a} x ${b}`
    )
    this.linha(
      s,
      rot,
      [
        [a, va, C.AZUL],
        [b, vb, C.CINZA],
      ],
      M,
      110,
      SW - 2 * M,
      370
    )

    const k = r.kpis()
    const semB = r.coberturaB === 'nenhuma'
    const ind: Tabela = {
      colunas: ['Indicador', a, b, 'Diferença', 'Variação'],
      linhas: k.map((x) => [
        x.nome,
        fmtKpi(x.atual, x.formato),
        semB ? '-' : fmtKpi(x.anterior, x.formato),
        semB ? '' : fmtDelta(x.delta, x.formato),
        semB ? '' : fmtVar(x),
      ]),
    }
    const cores: Record<string, string> = {}
    k.forEach((x, i) => {
      if (x.delta && !semB)
        cores[`${i}|Diferença`] = cores[`${i}|Variação`] = x.melhorou ? C.VERDE : C.VERMELHO
    })
    s = this.slide('Indicadores lado a lado', `${r.p.rotulo}  x  ${r.ant.rotulo}`)
    this.tabela(
      s,
      ind,
      { [a]: 'r', [b]: 'r', Diferença: 'r', Variação: 'r' },
      [300, 160, 160, 160, 100],
      { maxLinhas: 14, coresCelulas: cores }
    )
    this.texto(
      s,
      'Verde = melhora, vermelho = piora (para cancelamentos e pedidos aguardando nota, subir é ruim). Taxas comparadas em pontos percentuais (p.p.).',
      M,
      SH - 58,
      SW - 2 * M,
      14,
      9,
      false,
      CINZA_TXT
    )

    s = this.slide(
      'Maiores altas e quedas',
      `Diferença de valor entre ${a} e ${b}` +
        (r.filtro === TODOS ? '' : ` (${r.filtro.toLowerCase()})`)
    )
    if (semB) {
      this.texto(
        s,
        `Sem dados de ${r.ant.rotulo} para comparar.`,
        M,
        220,
        SW - 2 * M,
        30,
        16,
        false,
        CINZA_TXT,
        'center'
      )
      return
    }
    const w = (SW - 2 * M - 30) / 2
    ;(['Clientes', 'Produtos'] as const).forEach((dim, j) => {
      const mv = r.variacoes(dim, 5)
      const l = M + j * (w + 30)
      this.texto(s, dim, l, 96, w, 18, 13, true, C.AZUL)
      if (!mv.linhas.length) {
        this.texto(s, 'Sem variações.', l, 200, w, 20, 12, false, CINZA_TXT)
        return
      }
      const nomes = mv.linhas
        .map((x) => String(x[1]))
        .map((x) => (x.length <= 30 ? x : x.slice(0, 28) + '…'))
      const dif = num(mv, 'Diferença')
      // cancelamentos: subir é ruim (vermelho), como na tela do app
      const bom = (v: number) => v > 0 !== (r.filtro === C.CANCELADO)
      this.grafico(s, nomes, { Diferença: dif }, l, 134, w, 340, {
        tipo: 'bar',
        coresPontos: dif.map((v) => (bom(v) ? C.VERDE : C.VERMELHO)),
      })
    })
  }

  // ------------------------------------------------------------ slides

  capa() {
    const r = this.rel
    const s = this.pptx.addSlide()
    this.retangulo(s, 0, 0, SW, 8, C.AZUL)
    this.logo(s, M, 60, 60)
    this.texto(s, 'Relatório de Vendas', M, 200, SW - 2 * M, 50, 40, true, C.AZUL)
    this.texto(
      s,
      r.p.rotulo + (r.filtro === TODOS ? '' : `  ·  Status: ${r.filtro}`),
      M,
      258,
      SW - 2 * M,
      30,
      22
    )
    if (r.compara)
      this.texto(
        s,
        `Comparando com: ${r.ant.rotulo}  (${r.modo.toLowerCase()})`,
        M,
        294,
        SW - 2 * M,
        20,
        13,
        false,
        CINZA_TXT
      )
    this.retangulo(s, 0, SH - 78, SW, 8, C.VERDE)
    this.retangulo(s, 0, SH - 70, SW, 70, C.AZUL)
    const ult = r.base.ultimaImportacao()
    const hoje = new Date()
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    this.texto(
      s,
      'Processo de venda → Aprovado → Entregue → Faturado   ·   Gerado em ' +
        fmtData(hojeIso) +
        (ult ? ` · dados do Bling importados em ${fmtData(ult)}` : ''),
      M,
      SH - 45,
      SW - 2 * M,
      20,
      12,
      false,
      'FFFFFF'
    )
  }

  deckCompleto() {
    const r = this.rel
    this.capa()
    let s = this.resumo('Resumo do período')
    if (r.coberturaB === 'total')
      this.texto(
        s,
        'Faturamento = notas fiscais emitidas (igual ao Bling). Entregue = pedidos com nota, pela data da nota. Carteira = propostas em negociação no fim do período.',
        M,
        SH - 56,
        SW - 2 * M,
        14,
        9,
        false,
        CINZA_TXT
      )
    if (r.compara) this.comparativo()

    const ev = r.evolucao()
    const cat = ev.colunas[0]
    const fat = num(ev, C.FATURADO),
      ent = num(ev, C.ENTREGUE),
      cats = col(ev, cat).map(String)
    const iMax = fat.length ? fat.indexOf(Math.max(...fat)) : -1
    const soma = (xs: number[]) => xs.reduce((x, y) => x + y, 0)
    const sub =
      `Faturado: ${fmtMoeda(soma(fat))}  ·  Entregue: ${fmtMoeda(soma(ent))}` +
      (iMax >= 0 ? `  ·  maior faturamento: ${cats[iMax]} (${fmtMoeda(fat[iMax])})` : '')
    s = this.slide(`Faturamento x Entregue por ${cat.toLowerCase()}`, sub)
    this.grafico(
      s,
      cats,
      { 'Faturado (notas)': fat, 'Entregue (pedidos)': ent },
      M,
      110,
      SW - 2 * M,
      370,
      { cores: [C.AZUL, C.CINZA], legenda: true }
    )

    const fu = r.funil()
    s = this.slide(
      'Funil de propostas',
      'Propostas emitidas no período e a situação em que estão hoje.'
    )
    this.grafico(s, col(fu, 'Etapa').map(String), { Qtd: num(fu, 'Qtd') }, M, 110, 440, 300, {
      tipo: 'bar',
      mil: false,
      coresPontos: [C.AZUL, C.CINZA, C.AZUL, C.CINZA, C.VERDE, C.VERMELHO],
    })
    this.tabela(s, fu, { Qtd: 'i', Valor: 'm', '% das emitidas': 'p' }, [170, 45, 125, 80], {
      l: 500,
      top: 120,
    })

    const cols = [
      'Vendedor',
      'Faturado',
      'Notas',
      'Entregue',
      'Aprovado',
      'Propostas',
      'Canceladas',
    ]
    const ve = selecionar(r.vendedores(), cols.concat(r.compara ? ['Variação'] : []))
    s = this.slide('Vendedores')
    this.tabela(
      s,
      ve,
      {
        Faturado: 'm',
        Entregue: 'm',
        Aprovado: 'm',
        Notas: 'i',
        Propostas: 'i',
        Canceladas: 'i',
        Variação: 'v',
      },
      r.compara ? [230, 110, 55, 110, 110, 75, 80, 80] : [260, 120, 60, 120, 120, 90, 110]
    )
    this.texto(
      s,
      'Faturado = notas do período · Entregue = pedidos atendidos · Aprovado = propostas aprovadas · ' +
        (r.compara ? `Variação = faturado vs ${r.nomeB}` : ''),
      M,
      SH - 58,
      SW - 2 * M,
      14,
      9,
      false,
      CINZA_TXT
    )

    s = this.slide('Top 10 clientes (faturamento)')
    this.ranking(s, r.clientes(), 'Cliente', ['Cidade'], [300, 130])
    s = this.slide('Top 10 produtos (faturamento)')
    this.ranking(s, r.produtos(), 'Produto', ['Un'], [360, 40])
    this.texto(
      s,
      'Itens dos pedidos que já têm nota fiscal no período.',
      M,
      SH - 58,
      SW - 2 * M,
      14,
      9,
      false,
      CINZA_TXT
    )

    const ci = r.cidades()
    s = this.slide('Faturamento por cidade')
    this.grafico(
      s,
      col(ci, 'Cidade').map(String),
      { Faturado: num(ci, 'Valor') },
      M,
      100,
      SW - 2 * M,
      380,
      { tipo: 'bar', cores: [C.VERDE] }
    )

    s = this.slide('Vendas aprovadas no período')
    this.lista(s, r.lista(C.APROVADO), [70, 270, 170, 110, 85, 175], ['Motivo', 'Comentário'])

    this.cancelamentos()

    const ag = r.aguardandoNota()
    s = this.slide(
      'Pedidos aguardando nota fiscal',
      `${ag.linhas.length} pedidos feitos no período ainda sem nota: ${fmtMoeda(soma(num(ag, 'Valor')))}. Entram em Entregue/Faturado quando a nota for emitida.`
    )
    this.lista(s, ag, [70, 330, 210, 120, 110], [], 96)
  }

  deckFoco() {
    const r = this.rel
    const st = r.filtro
    this.capa()
    this.resumo(`Resumo: ${st}`)
    if (r.compara) this.comparativo()
    const ev = r.evolucao()
    const cat = ev.colunas[0]
    const cats = col(ev, cat).map(String)
    let s: Slide
    if (st === C.PROCESSO) {
      s = this.slide(
        'Carteira em aberto por idade',
        'Propostas em negociação no fim do período, pelo tempo desde a emissão.'
      )
      this.grafico(s, cats, { Valor: num(ev, 'Valor') }, M, 110, SW - 2 * M, 340, {
        tipo: 'bar',
        cores: [C.AZUL],
      })
    } else {
      const vals = num(ev, st)
      s = this.slide(
        `${st} por ${cat.toLowerCase()}`,
        `Total: ${fmtMoeda(vals.reduce((a, b) => a + b, 0))}  ·  ${fmtNum(num(ev, 'Qtd').reduce((a, b) => a + b, 0))} registros`
      )
      this.grafico(s, cats, { [st]: vals }, M, 110, SW - 2 * M, 370, {
        cores: [st === C.CANCELADO ? C.VERMELHO : C.AZUL],
      })
    }
    s = this.slide('Vendedores')
    this.tabela(
      s,
      r.vendedores(),
      { Qtd: 'i', Valor: 'm', 'Valor anterior': 'm', Diferença: 'dm', Variação: 'v' },
      r.compara ? [280, 60, 150, 150, 140, 100] : [480, 120, 280]
    )
    s = this.slide('Top 10 clientes')
    this.ranking(s, r.clientes(), 'Cliente', ['Cidade'], [300, 130])
    s = this.slide('Top 10 produtos')
    this.ranking(s, r.produtos(), 'Produto', ['Un'], [360, 40])
    const ci = r.cidades()
    s = this.slide('Por cidade')
    this.grafico(
      s,
      col(ci, 'Cidade').map(String),
      { Valor: num(ci, 'Valor') },
      M,
      100,
      SW - 2 * M,
      380,
      { tipo: 'bar', cores: [C.VERDE] }
    )
    if (st === C.CANCELADO) this.cancelamentos()
    else {
      s = this.slide('Detalhamento (maiores valores)')
      if (st === C.PROCESSO) this.lista(s, r.lista(), [65, 240, 150, 100, 80, 80, 165], ['Motivo'])
      else this.lista(s, r.lista(), [70, 280, 170, 110, 85, 175], ['Motivo', 'Comentário'])
    }
  }

  cancelamentos() {
    const r = this.rel
    const can = r.lista(C.CANCELADO)
    const s = this.slide('Cancelamentos e motivos')
    if (!can.linhas.length) {
      this.texto(
        s,
        'Nenhuma proposta cancelada no período.',
        M,
        220,
        SW - 2 * M,
        30,
        18,
        false,
        C.VERDE,
        'center'
      )
      return
    }
    const mo = r.motivos()
    this.grafico(s, col(mo, 'Motivo').map(String), { Qtd: num(mo, 'Qtd') }, M, 84, 420, 170, {
      tipo: 'bar',
      cores: [C.VERMELHO],
      mil: false,
    })
    this.texto(
      s,
      'Motivo e comentário são preenchidos pela equipe na aba Feedback do app.',
      490,
      96,
      SW - 490 - M,
      50,
      12
    )
    this.lista(s, can, [60, 190, 115, 90, 85, 75, 110, 155], [], 270, 8)
  }

  /** Top 10 com o valor de A, de B, a diferença e a variação. */
  ranking(s: Slide, t: Tabela, chave: 'Cliente' | 'Produto', extras: string[], larguras: number[]) {
    if (!this.rel.compara) {
      const cols = [
        chave,
        ...extras,
        ...t.colunas.filter((c) => c !== chave && !extras.includes(c)),
      ]
      const larg = chave === 'Cliente' ? [420, 200, 70, 150] : [480, 60, 120, 150]
      this.tabela(s, selecionar(t, cols), { Qtd: 'i', Quantidade: 'i', Valor: 'm' }, larg)
      return
    }
    const cols = [chave, ...extras, 'Valor', 'Valor anterior', 'Diferença', 'Variação']
    const resto = (SW - 2 * M - larguras.reduce((a, b) => a + b, 0)) / 4
    this.tabela(
      s,
      selecionar(t, cols),
      { Valor: 'm', 'Valor anterior': 'm', Diferença: 'dm', Variação: 'v' },
      [...larguras, resto * 1.1, resto * 1.1, resto * 1.05, resto * 0.75],
      { tam: 10 }
    )
  }

  lista(s: Slide, t: Tabela, larguras: number[], ocultar: string[] = [], top = 84, maxLinhas = 12) {
    const df = sem(t, ocultar)
    const larg = larguras.filter(Boolean).slice(0, df.colunas.length)
    while (larg.length < df.colunas.length) larg.push(90)
    const fmts: Record<string, Fmt> = { Valor: 'm' }
    df.colunas.forEach((c, j) => {
      if (df.linhas.some((l) => typeof l[j] === 'string' && DATA.test(l[j] as string)))
        fmts[c] = 'd'
    })
    this.tabela(s, df, fmts, larg, { top, maxLinhas })
  }
}

export async function gerarPpt(rel: Relatorio): Promise<Uint8Array> {
  const d = new Deck(rel)
  if (rel.filtro === TODOS) d.deckCompleto()
  else d.deckFoco()
  const out = await d.pptx.write({ outputType: 'nodebuffer' })
  return ajustarPacote(out as Buffer, d.graficos)
}

/** Planilha embutida de um gráfico (A: categorias, B...: séries), como o PowerPoint cria. */
async function planilhaDoGrafico(g: DadosGrafico): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  ws.addRow(['', ...g.series.map((x) => x.nome)])
  g.categorias.forEach((c, i) => ws.addRow([c, ...g.series.map((x) => x.valores[i] ?? null)]))
  return new Uint8Array(await wb.xlsx.writeBuffer())
}

/**
 * Ajustes no .pptx gerado pelo pptxgenjs:
 * - relações com caminho absoluto ('/ppt/charts/chart1.xml') viram relativas
 *   ('../charts/chart1.xml'), como no python-pptx: o Keynote não abre os gráficos com o
 *   caminho absoluto (o PowerPoint abre os dois);
 * - nos gráficos de linha (acumulado A x B), a 2ª série fica tracejada;
 * - a planilha embutida de cada gráfico é refeita com o exceljs: o Keynote descarta o
 *   gráfico inteiro quando não consegue ler a planilha gerada pelo pptxgenjs.
 */
async function ajustarPacote(pptx: Uint8Array, graficos: DadosGrafico[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(pptx)
  for (let i = 0; i < graficos.length; i++) {
    const rels = await zip.file(`ppt/charts/_rels/chart${i + 1}.xml.rels`)?.async('string')
    const alvo = rels && /Target="(?:\.\.\/|\/ppt\/)embeddings\/([^"]+)"/.exec(rels)?.[1]
    if (alvo) zip.file(`ppt/embeddings/${alvo}`, await planilhaDoGrafico(graficos[i]))
  }
  for (const nome of Object.keys(zip.files)) {
    const f = zip.file(nome)
    if (!f) continue
    if (nome.endsWith('.rels') && nome.startsWith('ppt/')) {
      const dir = path.posix.dirname(path.posix.dirname(nome)) // ppt/slides/_rels/x.rels -> ppt/slides
      const xml = await f.async('string')
      const novo = xml.replace(
        /Target="\/(ppt\/[^"]+)"/g,
        (_, alvo: string) => `Target="${path.posix.relative(dir, alvo)}"`
      )
      if (novo !== xml) zip.file(nome, novo)
    } else if (/^ppt\/charts\/chart\d+\.xml$/.test(nome)) {
      const xml = await f.async('string')
      if (!xml.includes('<c:lineChart>')) continue
      const series = xml.split('<c:ser>')
      if (series.length > 2) {
        series[2] = series[2].replace('<a:prstDash val="solid"/>', '<a:prstDash val="dash"/>')
        zip.file(nome, series.join('<c:ser>'))
      }
    }
  }
  return new Uint8Array(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

/** 'Relatorio_semana_2026-10-12_a_2026-10-16.pptx' (com o status quando focado). */
export function nomeArquivo(rel: Relatorio, ext = 'pptx') {
  const foco = rel.filtro === TODOS ? '' : norm(rel.filtro).replaceAll(' ', '-') + '_'
  return `Relatorio_${foco}${norm(rel.p.tipo)}_${rel.p.inicio}_a_${rel.p.fim}.${ext}`
}
