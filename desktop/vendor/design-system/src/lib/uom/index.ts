export type UnitDef = {
  label: string
  symbol: string
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

export const speedUnits = {
  kn: {
    label: 'knots',
    symbol: 'kn',
    // 1 kn = 0.514444 m/s
    toBase: (v: number) => v * 0.514444,
    fromBase: (v: number) => v / 0.514444,
  },
  kmh: {
    label: 'kilometers/hour',
    symbol: 'km/h',
    // 1 km/h = 0.277777... m/s => v / 3.6
    toBase: (v: number) => v / 3.6,
    fromBase: (v: number) => v * 3.6,
  },
  mph: {
    label: 'miles/hour',
    symbol: 'mph',
    // 1 mph = 0.44704 m/s
    toBase: (v: number) => v * 0.44704,
    fromBase: (v: number) => v / 0.44704,
  },
  ms: {
    label: 'meters/second',
    symbol: 'm/s',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
} as const satisfies Record<string, UnitDef>
export type SpeedUnitId = keyof typeof speedUnits

export function convertSpeed(value: number, from: SpeedUnitId, to: SpeedUnitId): number {
  const base = speedUnits[from].toBase(value)
  return speedUnits[to].fromBase(base)
}

export function symbolForSpeed(id: SpeedUnitId): string {
  return speedUnits[id].symbol
}

export const distanceUnits = {
  nm: {
    label: 'nautical mile',
    symbol: 'nm',
    // 1 NM = 1852 m
    toBase: (v: number) => v * 1852,
    fromBase: (v: number) => v / 1852,
  },
  km: {
    label: 'kilometer',
    symbol: 'km',
    toBase: (v: number) => v * 1000,
    fromBase: (v: number) => v / 1000,
  },
  mi: {
    label: 'mile',
    symbol: 'mi',
    // 1 mile = 1609.344 m
    toBase: (v: number) => v * 1609.344,
    fromBase: (v: number) => v / 1609.344,
  },
  m: {
    label: 'meter',
    symbol: 'm',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  ft: {
    label: 'feet',
    symbol: 'ft',
    // 1 ft = 0.3048 m
    toBase: (v: number) => v * 0.3048,
    fromBase: (v: number) => v / 0.3048,
  },
  yd: {
    label: 'yard',
    symbol: 'yd',
    // 1 yd = 0.9144 m
    toBase: (v: number) => v * 0.9144,
    fromBase: (v: number) => v / 0.9144,
  },
  cb: {
    label: 'cable',
    symbol: 'cb',
    // 1 cable = 0.1 nm = 185.2 m
    toBase: (v: number) => v * 185.2,
    fromBase: (v: number) => v / 185.2,
  },
} as const satisfies Record<string, UnitDef>
export type DistanceUnitId = keyof typeof distanceUnits

export function convertDistance(value: number, from: DistanceUnitId, to: DistanceUnitId): number {
  const base = distanceUnits[from].toBase(value)
  return distanceUnits[to].fromBase(base)
}

export function symbolForDistance(id: DistanceUnitId): string {
  return distanceUnits[id].symbol
}

export const depthUnits = {
  m: {
    label: 'meter',
    symbol: 'm',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  ft: {
    label: 'feet',
    symbol: 'ft',
    // 1 ft = 0.3048 m
    toBase: (v: number) => v * 0.3048,
    fromBase: (v: number) => v / 0.3048,
  },
  fth: {
    label: 'fathom',
    symbol: 'fth',
    // 1 fathom = 6 ft = 1.8288 m
    toBase: (v: number) => v * 1.8288,
    fromBase: (v: number) => v / 1.8288,
  },
} as const satisfies Record<string, UnitDef>
export type DepthUnitId = keyof typeof depthUnits

export function convertDepth(value: number, from: DepthUnitId, to: DepthUnitId): number {
  const base = depthUnits[from].toBase(value)
  return depthUnits[to].fromBase(base)
}

export function symbolForDepth(id: DepthUnitId): string {
  return depthUnits[id].symbol
}

export const angleUnits = {
  deg: {
    label: 'degree',
    symbol: '°',
    // 1 deg = PI / 180 rad
    toBase: (v: number) => (v * Math.PI) / 180,
    fromBase: (v: number) => (v * 180) / Math.PI,
  },
  rad: {
    label: 'radian',
    symbol: 'rad',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  mrad: {
    label: 'milliradian',
    symbol: 'mrad',
    // 1 mrad = 0.001 rad
    toBase: (v: number) => v * 0.001,
    fromBase: (v: number) => v / 0.001,
  },
} as const satisfies Record<string, UnitDef>
export type AngleUnitId = keyof typeof angleUnits

export function convertAngle(value: number, from: AngleUnitId, to: AngleUnitId): number {
  const base = angleUnits[from].toBase(value)
  return angleUnits[to].fromBase(base)
}

export function symbolForAngle(id: AngleUnitId): string {
  return angleUnits[id].symbol
}

export const areaUnits = {
  m2: {
    label: 'square meter',
    symbol: 'm²',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  km2: {
    label: 'square kilometer',
    symbol: 'km²',
    // 1 km² = 1,000,000 m²
    toBase: (v: number) => v * 1_000_000,
    fromBase: (v: number) => v / 1_000_000,
  },
  ha: {
    label: 'hectare',
    symbol: 'ha',
    // 1 ha = 10,000 m²
    toBase: (v: number) => v * 10_000,
    fromBase: (v: number) => v / 10_000,
  },
  nm2: {
    label: 'square nautical mile',
    symbol: 'nm²',
    // 1 nm² = 1852² m² = 3,429,904 m²
    toBase: (v: number) => v * 3_429_904,
    fromBase: (v: number) => v / 3_429_904,
  },
  acre: {
    label: 'acre',
    symbol: 'acre',
    // 1 acre = 4,046.8564224 m²
    toBase: (v: number) => v * 4046.8564224,
    fromBase: (v: number) => v / 4046.8564224,
  },
  ft2: {
    label: 'square feet',
    symbol: 'ft²',
    // 1 ft² = 0.09290304 m²
    toBase: (v: number) => v * 0.09290304,
    fromBase: (v: number) => v / 0.09290304,
  },
} as const satisfies Record<string, UnitDef>
export type AreaUnitId = keyof typeof areaUnits

export function convertArea(value: number, from: AreaUnitId, to: AreaUnitId): number {
  const base = areaUnits[from].toBase(value)
  return areaUnits[to].fromBase(base)
}

export function symbolForArea(id: AreaUnitId): string {
  return areaUnits[id].symbol
}

export const powerUnits = {
  W: {
    label: 'watt',
    symbol: 'W',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  kW: {
    label: 'kilowatt',
    symbol: 'kW',
    toBase: (v: number) => v * 1_000,
    fromBase: (v: number) => v / 1_000,
  },
  MW: {
    label: 'megawatt',
    symbol: 'MW',
    toBase: (v: number) => v * 1_000_000,
    fromBase: (v: number) => v / 1_000_000,
  },
} as const satisfies Record<string, UnitDef>
export type PowerUnitId = keyof typeof powerUnits

export function convertPower(value: number, from: PowerUnitId, to: PowerUnitId): number {
  const base = powerUnits[from].toBase(value)
  return powerUnits[to].fromBase(base)
}

export function symbolForPower(id: PowerUnitId): string {
  return powerUnits[id].symbol
}

export const forceUnits = {
  N: {
    label: 'newton',
    symbol: 'N',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  kN: {
    label: 'kilonewton',
    symbol: 'kN',
    toBase: (v: number) => v * 1_000,
    fromBase: (v: number) => v / 1_000,
  },
  tf: {
    label: 'tonne-force',
    symbol: 'tf',
    // 1 tf = 9,806.65 N
    toBase: (v: number) => v * 9_806.65,
    fromBase: (v: number) => v / 9_806.65,
  },
  MN: {
    label: 'meganewton',
    symbol: 'MN',
    toBase: (v: number) => v * 1_000_000,
    fromBase: (v: number) => v / 1_000_000,
  },
} as const satisfies Record<string, UnitDef>
export type ForceUnitId = keyof typeof forceUnits

export function convertForce(value: number, from: ForceUnitId, to: ForceUnitId): number {
  const base = forceUnits[from].toBase(value)
  return forceUnits[to].fromBase(base)
}

export function symbolForForce(id: ForceUnitId): string {
  return forceUnits[id].symbol
}

export const lengthUnits = {
  m: {
    label: 'meter',
    symbol: 'm',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  ft: {
    label: 'feet',
    symbol: 'ft',
    // 1 ft = 0.3048 m
    toBase: (v: number) => v * 0.3048,
    fromBase: (v: number) => v / 0.3048,
  },
} as const satisfies Record<string, UnitDef>
export type LengthUnitId = keyof typeof lengthUnits

export function convertLength(value: number, from: LengthUnitId, to: LengthUnitId): number {
  const base = lengthUnits[from].toBase(value)
  return lengthUnits[to].fromBase(base)
}

export function symbolForLength(id: LengthUnitId): string {
  return lengthUnits[id].symbol
}

export const temperatureUnits = {
  degC: {
    label: 'degree Celsius',
    symbol: '°C',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  degF: {
    label: 'degree Fahrenheit',
    symbol: '°F',
    // °F = °C × 9/5 + 32
    toBase: (v: number) => ((v - 32) * 5) / 9,
    fromBase: (v: number) => (v * 9) / 5 + 32,
  },
} as const satisfies Record<string, UnitDef>
export type TemperatureUnitId = keyof typeof temperatureUnits

export function convertTemperature(
  value: number,
  from: TemperatureUnitId,
  to: TemperatureUnitId
): number {
  const base = temperatureUnits[from].toBase(value)
  return temperatureUnits[to].fromBase(base)
}

export function symbolForTemperature(id: TemperatureUnitId): string {
  return temperatureUnits[id].symbol
}

// Base: hPa (= mbar).
export const pressureUnits = {
  hPa: {
    label: 'hectopascal',
    symbol: 'hPa',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  mbar: {
    label: 'millibar',
    symbol: 'mbar',
    toBase: (v: number) => v,
    fromBase: (v: number) => v,
  },
  inHg: {
    label: 'inch of mercury',
    symbol: 'inHg',
    // 1 inHg = 33.8639 hPa
    toBase: (v: number) => v * 33.8639,
    fromBase: (v: number) => v / 33.8639,
  },
  mmHg: {
    label: 'millimeter of mercury',
    symbol: 'mmHg',
    // 1 mmHg = 1.333224 hPa
    toBase: (v: number) => v * 1.333224,
    fromBase: (v: number) => v / 1.333224,
  },
  dbar: {
    label: 'decibar',
    symbol: 'dbar',
    // 1 dbar = 100 hPa
    toBase: (v: number) => v * 100,
    fromBase: (v: number) => v / 100,
  },
} as const satisfies Record<string, UnitDef>
export type PressureUnitId = keyof typeof pressureUnits

export function convertPressure(value: number, from: PressureUnitId, to: PressureUnitId): number {
  const base = pressureUnits[from].toBase(value)
  return pressureUnits[to].fromBase(base)
}

export function symbolForPressure(id: PressureUnitId): string {
  return pressureUnits[id].symbol
}

// Os catálogos acima ficam completos porque também servem de unidade de ORIGEM
// (ex.: W/N vindos de telemetria). O que o usuário pode escolher como unidade de
// exibição é restrito ao contexto náutico pelas allowlists abaixo.
export const NAUTICAL_UNIT_IDS = {
  speed: ['kn', 'ms'],
  distance: ['nm', 'cb', 'km', 'm'],
  depth: ['m', 'ft', 'fth'],
  angle: ['deg'],
  area: ['nm2', 'km2', 'm2'],
  power: ['kW', 'MW'],
  force: ['kN', 'tf'],
  length: ['m', 'ft'],
  temperature: ['degC', 'degF'],
  pressure: ['hPa', 'inHg'],
} as const satisfies {
  speed: readonly SpeedUnitId[]
  distance: readonly DistanceUnitId[]
  depth: readonly DepthUnitId[]
  angle: readonly AngleUnitId[]
  area: readonly AreaUnitId[]
  power: readonly PowerUnitId[]
  force: readonly ForceUnitId[]
  length: readonly LengthUnitId[]
  temperature: readonly TemperatureUnitId[]
  pressure: readonly PressureUnitId[]
}
export type UnitDimension = keyof typeof NAUTICAL_UNIT_IDS

export type UnitOption<Id extends string> = { id: Id; label: string; symbol: string }

function optionsOf<Id extends string>(
  catalog: Record<Id, UnitDef>,
  ids: readonly Id[]
): UnitOption<Id>[] {
  return ids.map((id) => ({ id, label: catalog[id].label, symbol: catalog[id].symbol }))
}

export function isUserSelectableUnit(dimension: UnitDimension, id: unknown): boolean {
  return (NAUTICAL_UNIT_IDS[dimension] as readonly unknown[]).includes(id)
}

export const speedOptions = optionsOf<SpeedUnitId>(speedUnits, NAUTICAL_UNIT_IDS.speed)
export const distanceOptions = optionsOf<DistanceUnitId>(distanceUnits, NAUTICAL_UNIT_IDS.distance)
export const depthOptions = optionsOf<DepthUnitId>(depthUnits, NAUTICAL_UNIT_IDS.depth)
export const angleOptions = optionsOf<AngleUnitId>(angleUnits, NAUTICAL_UNIT_IDS.angle)
export const areaOptions = optionsOf<AreaUnitId>(areaUnits, NAUTICAL_UNIT_IDS.area)
export const powerOptions = optionsOf<PowerUnitId>(powerUnits, NAUTICAL_UNIT_IDS.power)
export const forceOptions = optionsOf<ForceUnitId>(forceUnits, NAUTICAL_UNIT_IDS.force)
export const lengthOptions = optionsOf<LengthUnitId>(lengthUnits, NAUTICAL_UNIT_IDS.length)
export const temperatureOptions = optionsOf<TemperatureUnitId>(
  temperatureUnits,
  NAUTICAL_UNIT_IDS.temperature
)
export const pressureOptions = optionsOf<PressureUnitId>(pressureUnits, NAUTICAL_UNIT_IDS.pressure)

export function formatWithUnit(
  value: number,
  symbol: string,
  options?: { digits?: number }
): string {
  const digits = options?.digits
  const n = typeof digits === 'number' ? Number(value.toFixed(digits)) : value
  return `${n} ${symbol}`
}
