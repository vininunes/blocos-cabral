# Símbolos S-52 — boias e flutuantes

Vetores oficiais da IHO PresLib 4.0 (S-52 Annex A, Addendum to Part I), extraídos do
[S-101 Portrayal Catalogue](https://github.com/iho-ohi/S-101_Portrayal-Catalogue)
(`PortrayalCatalog/Symbols`, commit `152940b4`). O PDF do Addendum só traz os símbolos
como imagem raster, por isso a fonte vetorial é o catálogo S-101, que mantém os mesmos
nomes `SY(XXXXXXNN)` e marca cada arquivo com `source="S52Preslib4.0"`.

Ajustes em relação ao original, para os arquivos abrirem sozinhos no Figma e no browser:

- Cores da paleta **DAY** (`daySvgStyle.css`) embutidas como `fill`/`stroke`. As classes
  de token (`sCHBLK`, `fCHYLW`…) foram removidas.
- Removidos `symbolBox`, `svgBox`, `pivotPoint`, `<metadata>` e a `<?xml-stylesheet?>`.
- `viewBox` mantido em **mm** com o **pivot (ponto de ancoragem) em (0,0)**.
  `width`/`height` em px na escala 10 px/mm.

Só as variantes de mapa abaixo ficam no repo (são as únicas usadas pelo código). Os
símbolos originais (BOYSUP01, BOYPIL01/10/11 e demais boias/flutuantes) podem ser
reextraídos do catálogo S-101 acima aplicando os mesmos ajustes.

## Variantes de mapa (`map/`)

Arquivos derivados para plotagem no deck.gl a partir dos símbolos oficiais.
Mesma geometria em mm com pivot em (0,0), mais um halo branco (OUTLW) por baixo do
traço para o símbolo continuar legível sobre basemap escuro/satélite.

| Arquivo | Símbolo S-52 de origem | Uso |
|---|---|---|
| `map/BOYSUP01-map.svg` | `SY(BOYSUP01)` | Estações de env-condition (`features/buoy/constants/buoy-kind-config.ts`) |
| `map/BOYPIL01-map.svg` | `SY(BOYPIL01)` | Monitorables boia (padrão) |
| `map/BOYPIL10-map.svg` | `SY(BOYPIL10)` | Monitorables boia — lateral vermelha |
| `map/BOYPIL11-map.svg` | `SY(BOYPIL11)` | Monitorables boia — lateral verde |

Se editar uma variante no Figma, mantenha `viewBox` e `width`/`height`: o anchor de cada
ícone (pivot em px, anotado no comentário do SVG) está em `BUOY_ICONS`
(`features/buoy/constants/buoy-kind-config.ts`) e depende deles.
