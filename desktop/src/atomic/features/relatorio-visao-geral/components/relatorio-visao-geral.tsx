import { useMemo, useState } from 'react'

import type { Dimensao, RespostaRelatorio, Tabela } from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct } from '@server/relatorio/utils'

import { ToggleGroup, ToggleGroupItem } from '@/atomic/base-components/toggle-group'

import {
  GraficoAcumulado,
  type PontoAcumulado,
} from '@/atomic/features/relatorio-graficos/components/grafico-acumulado'
import {
  GraficoAltasQuedas,
  type Movimento,
} from '@/atomic/features/relatorio-graficos/components/grafico-altas-quedas'
import { GraficoBarras } from '@/atomic/features/relatorio-graficos/components/grafico-barras'
import { GraficoBarrasAgrupadas } from '@/atomic/features/relatorio-graficos/components/grafico-barras-agrupadas'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { COR } from '@/atomic/features/relatorio-graficos/constants/grafico'

const DIMENSOES: Dimensao[] = ['Clientes', 'Vendedores', 'Produtos', 'Cidades']
const col = (t: Tabela, nome: string) => t.linhas.map((l) => l[t.colunas.indexOf(nome)])
const fmtInt = (v: number) => fmtNum(v)
const eixoMil = (v: number) => `R$ ${fmtNum(v / 1000)} mil`

function Segmentos<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T
  opcoes: T[]
  onChange: (v: T) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={valor}
      onValueChange={(v) => v && onChange(v as T)}
    >
      {opcoes.map((o) => (
        <ToggleGroupItem key={o} value={o} className="flex-none px-4 text-xs whitespace-nowrap">
          {o}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Frase do acumulado: 'Acumulado até o dia 16: R$ x em Out/26 contra R$ y em Set/26 (+5%).' */
function frase(t: Tabela, rel: RespostaRelatorio, carteira: boolean) {
  const a = col(t, rel.nomeA),
    b = col(t, rel.nomeB),
    rot = col(t, 'Rótulo')
  const ult = a.findLastIndex((v) => v !== null)
  if (ult < 0) return null
  const va = a[ult] as number,
    vb = b[ult] as number | null
  const dia = String(rot[ult])
  const numero = /^\d+$/.test(dia)
  const quando = carteira
    ? numero
      ? `no dia ${dia}`
      : `na ${dia.toLowerCase()}`
    : numero
      ? `até o dia ${dia}`
      : `até ${dia.toLowerCase()}`
  let s = `${carteira ? 'Carteira' : 'Acumulado'} ${quando}: ${fmtMoeda(va)} em ${rel.nomeA}`
  if (rel.coberturaB !== 'nenhuma' && vb !== null) {
    s += ` contra ${fmtMoeda(vb)} em ${rel.nomeB}`
    if (vb) s += ` (${fmtPct(va / vb - 1, 1, true)})`
  }
  return s + '.'
}

function Acumulado({ rel }: { rel: RespostaRelatorio }) {
  const series = Object.keys(rel.acumulado)
  const [serie, setSerie] = useState(series[0])
  const atual = rel.acumulado[serie] ? serie : series[0]
  const t = rel.acumulado[atual]
  const { pontos, dias } = useMemo(() => {
    const dias = col(t, 'Rótulo').map(String)
    const pontos: PontoAcumulado[] = []
    t.linhas.forEach((l, i) => {
      for (const nome of [rel.nomeA, rel.nomeB]) {
        const v = l[t.colunas.indexOf(nome)]
        if (typeof v === 'number')
          pontos.push({ dia: i + 1, rotulo: dias[i], periodo: nome, valor: v })
      }
    })
    return { pontos, dias }
  }, [t, rel.nomeA, rel.nomeB])
  const carteira = atual === 'Em processo'
  return (
    <GraficoMoldura
      altura={300}
      titulo={`${carteira ? 'Carteira em aberto dia a dia' : 'Acumulado dia a dia'}: ${rel.nomeA} x ${rel.nomeB}`}
      acoes={series.length > 1 && <Segmentos valor={atual} opcoes={series} onChange={setSerie} />}
      rodape={frase(t, rel, carteira)}
    >
      <GraficoAcumulado
        pontos={pontos}
        dias={dias}
        nomeA={rel.nomeA}
        nomeB={rel.nomeB}
        formatar={fmtMoeda}
        formatarEixo={eixoMil}
      />
    </GraficoMoldura>
  )
}

function AltasQuedas({ rel }: { rel: RespostaRelatorio }) {
  const [dim, setDim] = useState<Dimensao>('Clientes')
  const t = rel.variacoes[dim]
  const movimentos: Movimento[] = t.linhas.map((l) => ({
    movimento: l[0] as Movimento['movimento'],
    nome: String(l[1]),
    valorA: l[2] as number,
    valorB: l[3] as number,
    diferenca: l[4] as number,
    variacao: l[5] as number | null,
  }))
  const semB = rel.coberturaB === 'nenhuma'
  return (
    <GraficoMoldura
      altura={300}
      titulo="Maiores altas e quedas"
      acoes={<Segmentos valor={dim} opcoes={DIMENSOES} onChange={setDim} />}
      rodape={`Diferença de valor (${rel.filtro === 'Todos' ? 'faturamento' : rel.filtro.toLowerCase()}) entre ${rel.nomeA} e ${rel.nomeB}.`}
    >
      {semB || !movimentos.length ? (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          {semB
            ? `Sem dados de ${rel.nomeB} para comparar.`
            : 'Sem variações entre os dois períodos.'}
        </div>
      ) : (
        <GraficoAltasQuedas
          movimentos={movimentos}
          nomeA={rel.nomeA}
          nomeB={rel.nomeB}
          formatar={fmtMoeda}
          formatarCurto={fmtMoedaCurta}
          formatarPct={(v) => fmtPct(v, 1, true)}
          inverso={rel.filtro === 'Cancelado'}
        />
      )}
    </GraficoMoldura>
  )
}

/** Aba Visão geral: curva A x B, altas e quedas, evolução, funil e motivos. */
export function RelatorioVisaoGeral({ rel }: { rel: RespostaRelatorio }) {
  const ev = rel.evolucao
  const eixo = ev.colunas[0]
  const categorias = ev.linhas.map((l) => String(l[0]))
  return (
    <div className="space-y-6">
      {rel.compara && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
          <Acumulado rel={rel} />
          <AltasQuedas rel={rel} />
        </div>
      )}
      {rel.filtro === 'Todos' ? (
        <>
          <GraficoMoldura
            altura={340}
            titulo={`Faturado (notas) x Entregue (pedidos) por ${eixo.toLowerCase()}`}
          >
            <GraficoBarrasAgrupadas
              categorias={categorias}
              series={[
                { nome: 'Faturado', cor: COR.azul, valores: col(ev, 'Faturado') as number[] },
                { nome: 'Entregue', cor: COR.cinza, valores: col(ev, 'Entregue') as number[] },
              ]}
              formatar={fmtMoeda}
              formatarCurto={fmtMoedaCurta}
            />
          </GraficoMoldura>
          {rel.funil && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
              <GraficoMoldura
                altura={240}
                titulo="Funil das propostas emitidas no período (situação atual)"
              >
                <GraficoBarras
                  barras={rel.funil.linhas.map((l) => ({
                    rotulo: String(l[0]),
                    valor: l[1] as number,
                  }))}
                  formatar={fmtInt}
                />
              </GraficoMoldura>
              <div className="lg:pt-9">
                <RelatorioTabela tabela={rel.funil} />
              </div>
            </div>
          )}
        </>
      ) : rel.filtro === 'Em processo' ? (
        <GraficoMoldura altura={300} titulo="Carteira em aberto por idade (dias desde a emissão)">
          <GraficoBarras
            barras={ev.linhas.map((l) => ({ rotulo: String(l[0]), valor: l[1] as number }))}
            formatar={fmtMoeda}
            formatarCurto={fmtMoedaCurta}
          />
        </GraficoMoldura>
      ) : (
        <GraficoMoldura altura={320} titulo={`${rel.filtro} por ${eixo.toLowerCase()}`}>
          <GraficoBarras
            horizontal={false}
            barras={ev.linhas.map((l) => ({ rotulo: String(l[0]), valor: l[1] as number }))}
            formatar={fmtMoeda}
            formatarCurto={fmtMoedaCurta}
            cor={rel.filtro === 'Cancelado' ? COR.vermelho : COR.azul}
          />
        </GraficoMoldura>
      )}
      {rel.motivos && (
        <GraficoMoldura altura={200} titulo="Motivos de cancelamento">
          <GraficoBarras
            barras={rel.motivos.linhas.map((l) => ({
              rotulo: String(l[0]),
              valor: l[1] as number,
            }))}
            formatar={fmtInt}
            cor={COR.vermelho}
          />
        </GraficoMoldura>
      )}
    </div>
  )
}
