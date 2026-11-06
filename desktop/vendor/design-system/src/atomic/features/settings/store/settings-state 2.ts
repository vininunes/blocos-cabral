import { atom } from 'jotai'

import { readPersistedMapTheme } from '../helpers/map-theme-storage'
import type { Settings } from '../models/settings'

export type SettingKey = keyof Settings
export type SettingStateTypes = Map<SettingKey, Settings[SettingKey]>

export const defaultSettings: Settings = {
  user: '',
  open_sea_map_enable: false,
  enc_enable: false,
  enc_opacity: 100,
  enc_text: false,
  enc_lights: false,
  enc_shallow_soundings: false,
  enc_deep_soundings: false,
  areas_enable: true,
  area_name_zoom_range: [0, 22],
  map_theme: 'vanilla',
  map_utm_grid_enable: false,
  map_square_grid_enable: false,
  coordinate_format: 'decimal',
  font_scale: 1,
  language: 'en-US',
  timezone: 'local-time',
  twenty_four_hour_time: true,
  clock_enable: true,
  notification_toast_position: 'center',
  projection: 'mercator',
  app_theme: 'light',
  decrease_gpu_usage: false,
  weather_particle_density: 'medium',
  speed_unit: 'kn',
  distance_unit: 'nm',
  depth_unit: 'm',
  angle_unit: 'deg',
  area_unit: 'km2',
  power_unit: 'kW',
  force_unit: 'kN',
  temperature_unit: 'degC',
  pressure_unit: 'hPa',

  vessel_length_unit: 'm',

  // Vessel settings
  vessel_name_zoom_range: [8, 22],
  vessel_hull_zoom_range: [14, 22],
  vessel_use_fleet_color: false,
  vessel_category_legend_enable: true,
  vessel_category_colors: {
    default: '#00008b',
    pilot: '#ffaa28',
    tug: '#000000',
    passenger: '#006e78',
    cargo: '#50c878',
    tanker: '#dc3c3c',
  },
  vessel_category_visibility: {
    default: true,
    pilot: true,
    tug: true,
    passenger: true,
    cargo: true,
    tanker: true,
  },
  vessel_lost_signal_timeout: 60,
  vessel_lost_zoom_range: [0, 22],
  vessel_opacity_timeout: 180,
  vessel_hide_timeout: 1440,

  // Player settings
  player_vessel_interpolation: false,

  // Port settings
  port_offshore_area_visible: true,
  port_onshore_area_visible: true,

  // Map widgets
  north_reference_enable: true,
  map_tilt_enable: true,

  // Fleet settings
  fleet_plot_only_bypass_categories: {
    default: false,
    pilot: false,
    tug: false,
    passenger: false,
    cargo: false,
    tanker: false,
  },

  // Fleet table settings (details page)
  fleet_table_column_order: [],
  fleet_table_column_visibility: {},

  // Fleet table settings (main app)
  fleet_main_table_column_order: [],
  fleet_main_table_column_visibility: {},

  // Env-condition settings — vazio = todos os campos visíveis
  env_condition_field_visibility: {},
  env_condition_windsock_enable: true,

  buoy_label_enable: true,
}

const defaultSettingsMap = new Map<SettingKey, Settings[SettingKey]>(
  Object.entries(defaultSettings) as [SettingKey, Settings[SettingKey]][]
)

// Inicializa o atom com o último tema de mapa conhecido (localStorage), para que a tela de
// carregamento já apareça no tema do usuário no boot frio, antes das settings chegarem do backend.
const initialSettingsMap = new Map<SettingKey, Settings[SettingKey]>(defaultSettingsMap)
const persistedMapTheme = readPersistedMapTheme()
if (persistedMapTheme) {
  initialSettingsMap.set('map_theme', persistedMapTheme)
}

export const settingsState = atom<SettingStateTypes>(initialSettingsMap)

// Indica que o `map_theme` já é o do usuário — seja pelo localStorage no boot, seja porque a
// query de settings do backend resolveu. Enquanto false, a tela de carregamento NÃO monta o
// mapa, garantindo que ele só inicie no tema do usuário (sem flash no tema default).
export const mapThemeReadyState = atom<boolean>(persistedMapTheme !== null)

// Derivado dedicado ao FloatCard/Window: só notifica quando o VALOR muda —
// os (muitos) cards da aplicação não re-renderizam a cada mudança de
// qualquer outra setting.
export const decreaseGpuUsageState = atom<boolean>(
  (get) => (get(settingsState).get('decrease_gpu_usage') as boolean | undefined) ?? false
)
