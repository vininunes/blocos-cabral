import { useMemo, useState } from 'react'

import type {
  Celula,
  RespostaRelatorio,
  ResultadoPrecos,
  Tabela,
} from '@server/relatorio/api-tipos'
import { fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct } from '@server/relatorio/utils'
import { Building2, Grid3x3, LineChart, Package, PieChart, Tags } from 'lucide-react'

import { Loading } from '@/atomic/base-components/loading'
import { Select } from '@/atomic/base-components/select'

import { DetailsEmptyState } from '@/atomic/components/empty-state/details-empty-state'
import { PageActionSearch } from '@/atomic/components/page-actions/page-action-search'
import { PageActionTabs } from '@/atomic/components/page-actions/page-action-tabs'

import { GraficoBarras } from '@/atomic/features/relatorio-graficos/components/grafico-barras'
import { GraficoMoldura } from '@/atomic/features/relatorio-graficos/components/grafico-moldura'
import { RelatorioImportacaoDialog } from '@/atomic/features/relatorio-importacao/components/relatorio-importacao-dialog'
import { RelatorioTabela } from '@/atomic/features/relatorio-tabela/components/relatorio-tabela'

import { filtrarTabela } from '@/atomic/features/relatorio-tabela/helpers/filtrar-tabela'

import { cn } from '@/lib/tailwind/utils'

import { chaveProduto, rotuloProduto, rotuloRetrato, rotuloRetratoCurto } from '../helpers/precos'
import { usePrecosQuery } from '../hooks/queries/use-precos-queries'
import { GraficoDispersaoPrecos } from './grafico-dispersao-precos'
import { GraficoIndicePrecos, type PontoIndice } from './grafico-evolucao-precos'
import { GraficoIndiceClientes } from './grafico-indice-clientes'

type Vista = 'produtos' | 'clientes' | 'cruzado' | 'mix' | 'evolucao'

/** Produtos e clientes nos gráficos (os demais ficam nas tabelas). */
const MAX_GRAFICO = 20

const PLACEHOLDER_BUSCA: Record<Vista, string> = {
  produtos: 'Buscar produto, código ou família',
  clientes: 'Buscar cliente, CNPJ ou grupo',
  cruzado: 'Buscar cliente ou produto',
  mix: 'Buscar família',
  evolucao: 'Buscar produto ou código',
}

function Cartao({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: 'pos' | 'neg'
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {rotulo}
      </div>
      <div
        className={cn(
          'text-xl font-bold tabular-nums text-primary dark:text-foreground',
          tom === 'pos' && 'text-cabral-verde dark:text-cabral-verde',
          tom === 'neg' && 'text-cabral-vermelho dark:text-cabral-vermelho'
        )}
      >
        {valor}
      </div>
      {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  )
}

/**
 * Preços praticados (relatório "Vendas por cliente / produto" do Bling). Cada arquivo importado
 * é um retrato do período informado na importação; abre no retrato que mais cobre o período do
 * relatório, e o seletor troca de retrato.
 */
export function RelatorioPrecos({ rel }: { rel: RespostaRelatorio }) {
  const [retrato, setRetrato] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('produtos')
  const [busca, setBusca] = useState('')
  const { data, isPending } = usePrecosQuery({ retrato, de: rel.a.inicio, ate: rel.a.fim })

  if (isPending || !data) return <Loading text="" className="h-48" />
  if (!data.retrato) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <DetailsEmptyState
          className="h-auto"
          icon={<Tags />}
          title="Nenhum relatório de preços importado"
          description='Importe o relatório "Vendas por cliente / produto" do Bling (CSV), informando o período usado no filtro: o arquivo não traz datas.'
        />
        <RelatorioImportacaoDialog
          tipos={['precos']}
          pasta={false}
          variante="outline"
          rotulo="Importar preços"
        />
      </div>
    )
  }

  const r = data.retrato
  const cobre = r.de <= rel.a.inicio && r.ate >= rel.a.fim
  const aviso =
    data.escolha === 'usuario'
      ? null
      : data.escolha === 'recente'
        ? `Nenhum retrato de preços cobre ${rel.a.rotulo}: mostrando o mais recente.`
        : cobre
          ? null
          : `O retrato cobre só parte de ${rel.a.rotulo}.`

  return (
    <div className="flex flex-1 flex-col gap-3 pb-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <PageActionTabs
          tabs={[
            { value: 'produtos', label: 'Produtos', icon: <Package className="size-3.5" /> },
            { value: 'clientes', label: 'Clientes', icon: <Building2 className="size-3.5" /> },
            {
              value: 'cruzado',
              label: 'Cliente × produto',
              icon: <Grid3x3 className="size-3.5" />,
            },
            { value: 'mix', label: 'Mix', icon: <PieChart className="size-3.5" /> },
            { value: 'evolucao', label: 'Evolução', icon: <LineChart className="size-3.5" /> },
          ]}
          value={vista}
          onValueChange={(v) => setVista(v as Vista)}
        />
        <PageActionSearch
          value={busca}
          onChange={setBusca}
          placeholder={PLACEHOLDER_BUSCA[vista]}
          className="w-72"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Retrato de preços</span>
          <Select
            className="w-64 [&_button]:h-8 [&_button]:text-xs"
            items={[
              [...data.retratos].reverse().map((x) => ({
                value: x.id,
                name: `${rotuloRetrato(x)} · ${fmtNum(x.produtos)} produtos`,
              })),
            ]}
            value={r.id}
            onValueChange={setRetrato}
          />
          <RelatorioImportacaoDialog
            tipos={['precos']}
            pasta={false}
            variante="outline"
            rotulo="Importar"
          />
        </div>
      </div>
      {aviso && <p className="shrink-0 text-xs text-amber-700">{aviso}</p>}

      <Cartoes data={data} />

      {vista === 'produtos' && <Produtos data={data} busca={busca} />}
      {vista === 'clientes' && <Clientes data={data} busca={busca} />}
      {vista === 'cruzado' && <Cruzado data={data} busca={busca} />}
      {vista === 'mix' && <Mix data={data} busca={busca} />}
      {vista === 'evolucao' && <Evolucao data={data} busca={busca} />}
    </div>
  )
}

function Cartoes({ data }: { data: ResultadoPrecos }) {
  const { totais, retrato, anterior, variacaoGeral } = data
  const abaixo = data.clientes.filter((c) => c.indice !== null && c.indice < -0.0005)
  const descontos = abaixo.reduce((s, c) => s + c.diferenca, 0)
  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-5">
      <Cartao
        rotulo="Valor vendido"
        valor={fmtMoeda(totais.valor)}
        detalhe={`produtos · ${rotuloRetrato(retrato!)}`}
      />
      <Cartao
        rotulo="Clientes"
        valor={fmtNum(totais.clientes)}
        detalhe={`${fmtNum(totais.produtos)} produtos vendidos`}
      />
      <Cartao
        rotulo="Abaixo da média"
        valor={fmtMoeda(Math.abs(descontos))}
        detalhe={`${fmtNum(abaixo.length)} clientes pagaram menos que o preço médio`}
        tom={descontos < 0 ? 'neg' : undefined}
      />
      <Cartao
        rotulo="Frete e outras despesas"
        valor={fmtMoeda(totais.frete + totais.outras)}
        detalhe="cobrados à parte dos produtos"
      />
      <Cartao
        rotulo="Variação de preços"
        valor={variacaoGeral === null ? '-' : fmtPct(variacaoGeral, 1, true)}
        detalhe={
          anterior ? `vs. ${rotuloRetrato(anterior)}` : 'importe outro período para comparar'
        }
        tom={
          variacaoGeral === null || variacaoGeral === 0
            ? undefined
            : variacaoGeral > 0
              ? 'pos'
              : 'neg'
        }
      />
    </div>
  )
}

const tabela = (colunas: string[], linhas: Celula[][]): Tabela => ({ colunas, linhas })

// ---------------------------------------------------------------- produtos

function Produtos({ data, busca }: { data: ResultadoPrecos; busca: string }) {
  const comAnterior = data.anterior !== null
  const t = useMemo(
    () =>
      filtrarTabela(
        tabela(
          [
            'Código',
            'Produto',
            'Família',
            'Un',
            'Quantidade',
            'Valor',
            'Participação',
            'Preço médio',
            'Preço mínimo',
            'Preço máximo',
            'Amplitude',
            'Clientes',
            ...(comAnterior ? ['Preço anterior', 'Variação'] : []),
          ],
          data.produtos.map((p) => [
            p.codigo,
            p.produto,
            p.familia,
            p.un,
            p.qtd,
            p.valor,
            p.participacao,
            p.preco,
            p.minimo,
            p.maximo,
            p.amplitude,
            p.clientes,
            ...(comAnterior ? [p.precoAnterior, p.variacao] : []),
          ])
        ),
        busca
      ),
    [data, busca, comAnterior]
  )
  // gráfico: os mais vendidos (da busca) que têm mais de um cliente para comparar
  const grafico = useMemo(() => {
    const visiveis = new Set(t.linhas.map((l) => `${l[0]}|${l[1]}`))
    return data.produtos
      .filter((p) => p.clientes > 1 && visiveis.has(`${p.codigo}|${p.produto}`))
      .slice(0, MAX_GRAFICO)
  }, [data, t])
  const comparaveis = data.produtos.filter((p) => p.clientes > 1).length

  return (
    <div className="flex flex-1 flex-col gap-3">
      <GraficoMoldura
        altura={Math.max(220, grafico.length * 26 + 60)}
        titulo={`Dispersão de preços entre clientes · ${fmtNum(grafico.length)} mais vendidos de ${fmtNum(comparaveis)} produtos com mais de um cliente`}
        rodape="Cada ponto é um cliente: distância (%) do preço médio do produto; o tamanho é a quantidade. Preço em R$ no ponteiro."
      >
        {grafico.length ? (
          <GraficoDispersaoPrecos produtos={grafico} pontos={data.pontos} />
        ) : (
          <SemDados texto="Nenhum produto com mais de um cliente na busca." />
        )}
      </GraficoMoldura>
      <RelatorioTabela
        tabela={t}
        preencher
        className="min-h-[420px]"
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem produtos no retrato.'}
      />
    </div>
  )
}

// ---------------------------------------------------------------- clientes

function Clientes({ data, busca }: { data: ResultadoPrecos; busca: string }) {
  const t = useMemo(
    () =>
      filtrarTabela(
        tabela(
          [
            'Cliente',
            'CNPJ/CPF',
            'Cidade',
            'UF',
            'Grupo',
            'Valor',
            'Produtos',
            'Valor comparável',
            'Diferença',
            'Vs. média',
          ],
          data.clientes.map((c) => [
            c.cliente,
            c.cnpj,
            c.cidade,
            c.uf,
            c.grupo,
            c.valor,
            c.produtos,
            c.valorComparavel,
            c.indice === null ? null : c.diferenca,
            c.indice,
          ])
        ),
        busca
      ),
    [data, busca]
  )
  const grafico = useMemo(() => {
    const visiveis = new Set(t.linhas.map((l) => `${l[0]}|${l[1]}`))
    return data.clientes
      .filter(
        (c): c is typeof c & { indice: number } =>
          c.indice !== null && visiveis.has(`${c.cliente}|${c.cnpj}`)
      )
      .sort((a, b) => b.valorComparavel - a.valorComparavel)
      .slice(0, MAX_GRAFICO)
  }, [data, t])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <GraficoMoldura
        altura={Math.max(220, grafico.length * 24 + 50)}
        titulo={`Preço pago vs. média · ${fmtNum(grafico.length)} clientes com maior valor comparável`}
        rodape="Só entram os produtos que outros clientes também compraram: num produto de um cliente só, ele é a própria média."
      >
        {grafico.length ? (
          <GraficoIndiceClientes clientes={grafico} />
        ) : (
          <SemDados texto="Nenhum cliente com produtos comparáveis na busca." />
        )}
      </GraficoMoldura>
      <RelatorioTabela
        tabela={t}
        preencher
        className="min-h-[420px]"
        titulos={{ 'Vs. média': 'Vs. média (%)', Diferença: 'Diferença (R$)' }}
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem clientes no retrato.'}
      />
    </div>
  )
}

// ---------------------------------------------------------------- cliente x produto

function Cruzado({ data, busca }: { data: ResultadoPrecos; busca: string }) {
  const t = useMemo(() => {
    const prod = new Map(data.produtos.map((p) => [chaveProduto(p), p]))
    return filtrarTabela(
      tabela(
        [
          'Cliente',
          'Produto',
          'Código',
          'Un',
          'Quantidade',
          'Valor',
          'Preço do cliente',
          'Preço médio',
          'Vs. média',
        ],
        [...data.pontos]
          .sort((a, b) => b.valor - a.valor)
          .map((p) => {
            const m = prod.get(p.codigo)
            return [
              p.cliente,
              p.produto,
              m?.codigo ?? '',
              m?.un ?? '',
              p.qtd,
              p.valor,
              p.preco,
              m?.preco ?? null,
              (m?.clientes ?? 0) > 1 ? p.desvio : null,
            ]
          })
      ),
      busca
    )
  }, [data, busca])
  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="shrink-0 text-xs text-muted-foreground">
        Preço de cada cliente em cada produto. Busque um produto para comparar os clientes, ou um
        cliente para ver o que ele paga em cada produto. A coluna Vs. média fica vazia quando só um
        cliente comprou o produto.
      </p>
      <RelatorioTabela
        tabela={t}
        preencher
        className="min-h-[480px]"
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem vendas no retrato.'}
      />
    </div>
  )
}

// ---------------------------------------------------------------- mix

function Mix({ data, busca }: { data: ResultadoPrecos; busca: string }) {
  const familias = useMemo(
    () =>
      filtrarTabela(
        tabela(
          ['Família', 'Valor', 'Participação', 'Produtos', 'Clientes'],
          data.familias.map((f) => [f.familia, f.valor, f.participacao, f.produtos, f.clientes])
        ),
        busca
      ),
    [data, busca]
  )
  const nomes = new Set(familias.linhas.map((l) => String(l[0])))
  const barrasFamilia = data.familias
    .filter((f) => nomes.has(f.familia))
    .map((f) => ({ rotulo: f.familia, valor: f.valor }))
  const barrasProdutos = data.produtos
    .filter((p) => nomes.has(p.familia))
    .slice(0, 15)
    .map((p) => ({ rotulo: rotuloProduto(p), valor: p.valor }))

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <GraficoMoldura altura={280} titulo="Valor vendido por família">
          <GraficoBarras
            barras={barrasFamilia}
            formatar={(v) =>
              `${fmtMoeda(v)} · ${fmtPct(data.totais.valor ? v / data.totais.valor : 0)}`
            }
            formatarCurto={fmtMoedaCurta}
          />
        </GraficoMoldura>
        <GraficoMoldura altura={280} titulo="15 produtos mais vendidos">
          <GraficoBarras
            barras={barrasProdutos}
            formatar={fmtMoeda}
            formatarCurto={fmtMoedaCurta}
          />
        </GraficoMoldura>
      </div>
      <RelatorioTabela
        tabela={familias}
        alturaMax={320}
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem vendas no retrato.'}
      />
      <p className="shrink-0 text-xs text-muted-foreground">
        Família pelo nome do produto: blocos estruturais (inclui meio bloco e compensador), blocos
        de vedação, canaletas, pisos intertravados (inclui drenante e piso grama), guias e outros.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- evolução

function Evolucao({ data, busca }: { data: ResultadoPrecos; busca: string }) {
  const { retratos } = data
  const pontos = useMemo(() => {
    const out: PontoIndice[] = []
    let indice = 100
    retratos.forEach((r, i) => {
      if (i === 0) {
        out.push({ rotulo: rotuloRetratoCurto(r), indice, variacao: null, produtos: 0 })
        return
      }
      let agora = 0,
        antes = 0,
        n = 0
      for (const e of data.evolucao) {
        const p = e.precos[i],
          pa = e.precos[i - 1]
        if (p === null || pa === null) continue
        agora += e.qtds[i] * p
        antes += e.qtds[i] * pa
        n++
      }
      const variacao = antes ? agora / antes - 1 : 0
      indice *= 1 + variacao
      out.push({
        rotulo: rotuloRetratoCurto(r),
        indice,
        variacao: antes ? variacao : null,
        produtos: n,
      })
    })
    return out
  }, [data, retratos])

  const t = useMemo(() => {
    const ultimo = retratos.length - 1
    return filtrarTabela(
      tabela(
        [
          'Código',
          'Produto',
          'Un',
          ...retratos.map((r) => `Preço ${rotuloRetratoCurto(r)}`),
          ...(retratos.length > 1 ? ['Variação'] : []),
        ],
        data.evolucao.map((e) => {
          // variação entre os dois últimos retratos em que o produto aparece
          const com = e.precos.map((p, i) => [p, i] as const).filter(([p]) => p !== null)
          const [a, b] = [com.at(-2)?.[0] ?? null, com.at(-1)?.[0] ?? null]
          return [
            e.codigo,
            e.produto,
            e.un,
            ...e.precos,
            ...(ultimo > 0 ? [a && b ? b / a - 1 : null] : []),
          ]
        })
      ),
      busca
    )
  }, [data, retratos, busca])

  if (retratos.length < 2) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
        <DetailsEmptyState
          className="h-auto"
          icon={<LineChart />}
          title="Só há um retrato de preços"
          description="Importe o relatório de vendas por cliente / produto de outro período para acompanhar a evolução dos preços."
        />
        <RelatorioImportacaoDialog
          tipos={['precos']}
          pasta={false}
          variante="outline"
          rotulo="Importar outro período"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <GraficoMoldura
        altura={240}
        titulo="Índice de preços (1º retrato = 100)"
        rodape="A cada retrato, a variação dos produtos vendidos também no anterior, pesada pela quantidade vendida no retrato."
      >
        <GraficoIndicePrecos pontos={pontos} />
      </GraficoMoldura>
      <RelatorioTabela
        tabela={t}
        preencher
        className="min-h-[420px]"
        vazio={busca ? 'Nada encontrado para a busca.' : 'Sem produtos.'}
      />
    </div>
  )
}

function SemDados({ texto }: { texto: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {texto}
    </div>
  )
}
