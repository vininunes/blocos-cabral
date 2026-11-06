import type {
  AngleUnitId,
  AreaUnitId,
  DepthUnitId,
  DistanceUnitId,
  ForceUnitId,
  LengthUnitId,
  PowerUnitId,
  PressureUnitId,
  SpeedUnitId,
  TemperatureUnitId,
} from '@/lib/uom'

export interface VesselCategoryColors {
  default: string
  pilot: string // type 50
  tug: string // type 52
  passenger: string // type 60-69
  cargo: string // type 70-79
  tanker: string // type 80-89
}

export type VesselCategoryVisibility = Record<keyof VesselCategoryColors, boolean>

/** Densidade das partículas animadas das weather layers (`off` = só o gradiente). */
export type WeatherParticleDensity = 'off' | 'low' | 'medium' | 'high'

export interface Settings {
  user: string

  app_theme: 'light' | 'dark' | 'system'

  /** Desativa o backdrop-blur dos FloatCards/janelas — reduz uso de GPU
   *  (para máquinas sem GPU dedicada). */
  decrease_gpu_usage: boolean

  /** Densidade das partículas das weather layers — menos partículas, menos GPU. */
  weather_particle_density: WeatherParticleDensity

  projection: 'mercator' | 'globe'
  map_utm_grid_enable: boolean
  map_square_grid_enable: boolean
  map_theme: 'vanilla' | 'streets' | 'dark' | 'satellite'
  coordinate_format: 'decimal' | 'dms' | 'utm'

  open_sea_map_enable: boolean
  enc_enable: boolean
  enc_opacity: number
  enc_text: boolean
  enc_lights: boolean
  enc_shallow_soundings: boolean
  enc_deep_soundings: boolean
  areas_enable: boolean
  area_name_zoom_range: [number, number]

  /**
   * Experimental: multiplicador do tamanho dos labels do mapa (1 = 100%).
   * Escala apenas textos plotados no mapa (nomes de vessel, área, estações);
   * não afeta a fonte do layout da aplicação.
   */
  font_scale: number

  language: 'en-US' | 'pt-BR'
  timezone: 'utc' | 'local-time'
  twenty_four_hour_time: boolean
  clock_enable: boolean

  speed_unit: SpeedUnitId
  distance_unit: DistanceUnitId
  depth_unit: DepthUnitId
  angle_unit: AngleUnitId
  area_unit: AreaUnitId
  power_unit: PowerUnitId
  force_unit: ForceUnitId
  temperature_unit: TemperatureUnitId
  pressure_unit: PressureUnitId

  vessel_length_unit: LengthUnitId

  // Vessel settings
  vessel_name_zoom_range: [number, number]
  vessel_hull_zoom_range: [number, number]
  vessel_category_colors: VesselCategoryColors
  vessel_lost_signal_timeout: number
  vessel_lost_zoom_range: [number, number]
  vessel_use_fleet_color: boolean
  vessel_category_legend_enable: boolean
  vessel_category_visibility: VesselCategoryVisibility
  vessel_opacity_timeout: number // minutes, 0 = disabled
  vessel_hide_timeout: number // minutes, 0 = disabled

  // Player settings
  /** Fantasma translúcido da posição interpolada dos navios no player. */
  player_vessel_interpolation: boolean

  // Fleet settings
  fleet_plot_only_bypass_categories: VesselCategoryVisibility

  // Fleet table settings (details page)
  fleet_table_column_order: string[]
  fleet_table_column_visibility: Record<string, boolean>

  // Port settings
  port_offshore_area_visible: boolean
  port_onshore_area_visible: boolean

  // Map widgets
  north_reference_enable: boolean
  map_tilt_enable: boolean

  // Fleet table settings (main app)
  fleet_main_table_column_order: string[]
  fleet_main_table_column_visibility: Record<string, boolean>

  // Env-condition settings
  // Visibilidade por nome de condição (`condition_name`). Chave ausente = visível, para que
  // novas condições apareçam por default e o usuário só persista o que optou por esconder.
  env_condition_field_visibility: Record<string, boolean>
  /** Disponibiliza (ou não) a rosa dos ventos das estações no mapa. */
  env_condition_windsock_enable: boolean

  /** Exibe (ou não) o nome de cada boia no mapa. Só boias — não afeta alvos. */
  buoy_label_enable: boolean

  /** Lado do toast de notificação do socket (VTS): centralizado abaixo dos
   *  widgets ou no canto direito. */
  notification_toast_position: 'center' | 'right'
}
