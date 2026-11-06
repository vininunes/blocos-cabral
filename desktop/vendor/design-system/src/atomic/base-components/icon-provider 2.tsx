import {
  Activity,
  AlignHorizontalSpaceBetween,
  Anchor,
  BarChart3,
  Bell,
  BookText,
  CalendarClock,
  Cctv,
  ChartPie,
  ClipboardCheck,
  ClipboardList,
  DraftingCompass,
  Fuel,
  Gauge,
  Globe,
  Info,
  Layers,
  LayoutPanelLeft,
  Map,
  Play,
  PlayCircle,
  ScanBox,
  Settings,
  Ship,
  UserCog,
  Users,
  Waves,
  Waypoints,
  Wind,
} from 'lucide-react'

import {
  Antenna,
  IconBuoy,
  IconBuoyEnvCondition,
  IconBuoyMonitorable,
  IconCO2,
  IconEblVrm,
  IconENC,
  IconETA,
  IconKPI,
  IconLostVessel,
  IconMapVessel,
  IconPlatform,
  IconPortOffshore,
  IconPPU,
  IconVesselFleet,
  IconVesselTrail,
  IconVTS,
} from '@/assets/svg'

import { cn } from '@/lib/tailwind/utils'

export interface IIconProviderProps {
  icon: Icons
  className?: string
}

export type Icons =
  | 'ic-vts'
  | 'about'
  | 'region'
  | 'map'
  | 'carbon-intensity'
  | 'voyage-report'
  | 'enc'
  | 'performance'
  | 'initialization'
  | 'vessels'
  | 'general'
  | 'vts'
  | 'admin'
  | 'dynamic-objects'
  | 'fleets'
  | 'kpi-panels'
  | 'ports'
  | 'receptors'
  | 'customers'
  | 'voyage-scheduler'
  | 'vessel-trail'
  | 'vessel-lost'
  | 'details'
  | 'eta'
  | 'ports-onshore'
  | 'ports-offshore'
  | 'co2'
  | 'platforms'
  | 'trails'
  | 'areas'
  | 'planned-routes'
  | 'maneuvers'
  | 'eta-simulation'
  | 'statistics'
  | 'notifications'
  | 'notification'
  | 'player'
  | 'area-drawing'
  | 'terminals'
  | 'piers'
  | 'market-share'
  | 'cameras'
  | 'machinery'
  | 'env-conditions'
  | 'buoys'
  | 'buoy-env-condition'
  | 'buoy-monitorable'
  | 'weather-layers'
  | 'pilot-schedules'
  | 'ebl-vrm'
  | 'drift'
  | 'ppu'

export function IconProvider({ icon, className }: IIconProviderProps) {
  switch (icon) {
    case 'ic-vts':
      return <IconVTS className={cn(className)} />
    case 'about':
      return <Info className={cn(className)} />
    case 'region':
      return <Globe className={cn(className)} />
    case 'map':
      return <Map className={cn(className)} />
    case 'carbon-intensity':
      return <Fuel className={cn(className)} />
    case 'voyage-report':
      return <BookText className={cn(className)} />
    case 'enc':
      return <IconENC className={cn(className)} />
    case 'performance':
      return <Gauge className={cn(className)} />
    case 'initialization':
      return <PlayCircle className={cn(className)} />
    case 'vessels':
      return <IconMapVessel className={cn('rotate-[33deg]', className)} />
    case 'general':
      return <Settings className={cn(className)} />
    case 'admin':
      return <UserCog className={cn(className)} />
    case 'dynamic-objects':
      return <ScanBox className={cn(className)} />
    case 'fleets':
      return <IconVesselFleet className={cn(className)} />
    case 'kpi-panels':
      return <IconKPI className={cn(className)} />
    case 'ports':
      return <Anchor className={cn(className)} />
    case 'receptors':
      return <Antenna className={cn(className)} />
    case 'customers':
      return <Users className={cn(className)} />
    case 'voyage-scheduler':
      return <CalendarClock className={cn(className)} />
    case 'vessel-trail':
      return <IconVesselTrail className={cn(className)} />
    case 'vessel-lost':
      return <IconLostVessel className={cn(className)} />
    case 'details':
      return <ClipboardList className={cn(className)} />
    case 'eta':
      return <IconETA className={cn(className)} />
    case 'ports-onshore':
      return <Anchor className={cn(className)} />
    case 'ports-offshore':
      return <IconPortOffshore className={cn(className)} />
    case 'co2':
      return <IconCO2 className={cn(className)} />
    case 'platforms':
      return <IconPlatform className={cn(className)} />
    case 'trails':
      return <IconVesselTrail className={cn(className)} />
    case 'areas':
      return <Layers className={cn(className)} />
    case 'planned-routes':
      return <Waypoints className={cn(className)} />
    case 'maneuvers':
      return <Ship className={cn(className)} />
    case 'eta-simulation':
      return <IconETA className={cn(className)} />
    case 'statistics':
      return <BarChart3 className={cn(className)} />
    case 'notifications':
    case 'notification':
      return <Bell className={cn(className)} />
    case 'player':
      return <Play className={cn('fill-current', className)} />
    case 'area-drawing':
      return <DraftingCompass className={cn(className)} />
    case 'terminals':
      return <LayoutPanelLeft className={cn(className)} />
    case 'piers':
      return <AlignHorizontalSpaceBetween className={cn(className)} />
    case 'market-share':
      return <ChartPie className={cn(className)} />
    case 'cameras':
      return <Cctv className={cn(className)} />
    case 'machinery':
      return <Activity className={cn(className)} />
    case 'env-conditions':
      return <Waves className={cn(className)} />
    case 'buoys':
      return <IconBuoy className={cn(className)} />
    // S-52: BOYSUP01 (super-boia) = condição ambiental; BOYPIL01 (pilar) = monitorada
    case 'buoy-env-condition':
      return <IconBuoyEnvCondition className={cn(className)} />
    case 'buoy-monitorable':
      return <IconBuoyMonitorable className={cn(className)} />
    case 'drift':
      return <Wind className={cn(className)} />
    case 'weather-layers':
      return <Layers className={cn(className)} />
    case 'pilot-schedules':
      return <ClipboardCheck className={cn(className)} />
    case 'ebl-vrm':
      return <IconEblVrm className={cn(className)} />
    case 'ppu':
      return <IconPPU className={cn(className)} />

    default:
      return
  }
}
