import { useMemo } from 'react'

import { useSettings } from '@/atomic/features/settings/hooks/use-settings'

import {
  convertAngle,
  convertArea,
  convertDepth,
  convertDistance,
  convertForce,
  convertLength,
  convertPower,
  convertPressure,
  convertSpeed,
  convertTemperature,
  symbolForAngle,
  symbolForArea,
  symbolForDepth,
  symbolForDistance,
  symbolForForce,
  symbolForLength,
  symbolForPower,
  symbolForPressure,
  symbolForSpeed,
  symbolForTemperature,
  type AngleUnitId,
  type AreaUnitId,
  type DepthUnitId,
  type DistanceUnitId,
  type ForceUnitId,
  type LengthUnitId,
  type PowerUnitId,
  type PressureUnitId,
  type SpeedUnitId,
  type TemperatureUnitId,
} from '@/lib/uom'

export interface UomConfig {
  speedUnit: SpeedUnitId
  distanceUnit: DistanceUnitId
  depthUnit: DepthUnitId
  angleUnit: AngleUnitId
  areaUnit: AreaUnitId
  powerUnit: PowerUnitId
  forceUnit: ForceUnitId
  lengthUnit: LengthUnitId
  temperatureUnit: TemperatureUnitId
  pressureUnit: PressureUnitId
  units: {
    speed: string
    distance: string
    depth: string
    angle: string
    area: string
    power: string
    force: string
    length: string
    temperature: string
    pressure: string
  }
  convert: {
    speed: {
      toUser: (value: number, from: SpeedUnitId) => number
      fromUser: (value: number, to: SpeedUnitId) => number
    }
    distance: {
      toUser: (value: number, from: DistanceUnitId) => number
      fromUser: (value: number, to: DistanceUnitId) => number
    }
    depth: {
      toUser: (value: number, from: DepthUnitId) => number
      fromUser: (value: number, to: DepthUnitId) => number
    }
    angle: {
      toUser: (value: number, from: AngleUnitId) => number
      fromUser: (value: number, to: AngleUnitId) => number
    }
    area: {
      toUser: (value: number, from: AreaUnitId) => number
      fromUser: (value: number, to: AreaUnitId) => number
    }
    power: {
      toUser: (value: number, from: PowerUnitId) => number
      fromUser: (value: number, to: PowerUnitId) => number
    }
    force: {
      toUser: (value: number, from: ForceUnitId) => number
      fromUser: (value: number, to: ForceUnitId) => number
    }
    length: {
      toUser: (value: number, from: LengthUnitId) => number
      fromUser: (value: number, to: LengthUnitId) => number
    }
    temperature: {
      toUser: (value: number, from: TemperatureUnitId) => number
      fromUser: (value: number, to: TemperatureUnitId) => number
    }
    pressure: {
      toUser: (value: number, from: PressureUnitId) => number
      fromUser: (value: number, to: PressureUnitId) => number
    }
  }
}

export function useUom(): UomConfig {
  const { getSetting } = useSettings()

  const speedUnit = getSetting('speed_unit')
  const distanceUnit = getSetting('distance_unit')
  const depthUnit = getSetting('depth_unit')
  const angleUnit = getSetting('angle_unit')
  const areaUnit = getSetting('area_unit')
  const powerUnit = getSetting('power_unit')
  const forceUnit = getSetting('force_unit')
  const lengthUnit = getSetting('vessel_length_unit')
  const temperatureUnit = getSetting('temperature_unit')
  const pressureUnit = getSetting('pressure_unit')

  const units = useMemo(
    () => ({
      speed: symbolForSpeed(speedUnit),
      distance: symbolForDistance(distanceUnit),
      depth: symbolForDepth(depthUnit),
      angle: symbolForAngle(angleUnit),
      area: symbolForArea(areaUnit),
      power: symbolForPower(powerUnit),
      force: symbolForForce(forceUnit),
      length: symbolForLength(lengthUnit),
      temperature: symbolForTemperature(temperatureUnit),
      pressure: symbolForPressure(pressureUnit),
    }),
    [
      speedUnit,
      distanceUnit,
      depthUnit,
      angleUnit,
      areaUnit,
      powerUnit,
      forceUnit,
      lengthUnit,
      temperatureUnit,
      pressureUnit,
    ]
  )

  const convert = useMemo(
    () => ({
      speed: {
        toUser: (value: number, from: SpeedUnitId) => convertSpeed(value, from, speedUnit),
        fromUser: (value: number, to: SpeedUnitId) => convertSpeed(value, speedUnit, to),
      },
      distance: {
        toUser: (value: number, from: DistanceUnitId) => convertDistance(value, from, distanceUnit),
        fromUser: (value: number, to: DistanceUnitId) => convertDistance(value, distanceUnit, to),
      },
      depth: {
        toUser: (value: number, from: DepthUnitId) => convertDepth(value, from, depthUnit),
        fromUser: (value: number, to: DepthUnitId) => convertDepth(value, depthUnit, to),
      },
      angle: {
        toUser: (value: number, from: AngleUnitId) => convertAngle(value, from, angleUnit),
        fromUser: (value: number, to: AngleUnitId) => convertAngle(value, angleUnit, to),
      },
      area: {
        toUser: (value: number, from: AreaUnitId) => convertArea(value, from, areaUnit),
        fromUser: (value: number, to: AreaUnitId) => convertArea(value, areaUnit, to),
      },
      power: {
        toUser: (value: number, from: PowerUnitId) => convertPower(value, from, powerUnit),
        fromUser: (value: number, to: PowerUnitId) => convertPower(value, powerUnit, to),
      },
      force: {
        toUser: (value: number, from: ForceUnitId) => convertForce(value, from, forceUnit),
        fromUser: (value: number, to: ForceUnitId) => convertForce(value, forceUnit, to),
      },
      length: {
        toUser: (value: number, from: LengthUnitId) => convertLength(value, from, lengthUnit),
        fromUser: (value: number, to: LengthUnitId) => convertLength(value, lengthUnit, to),
      },
      temperature: {
        toUser: (value: number, from: TemperatureUnitId) =>
          convertTemperature(value, from, temperatureUnit),
        fromUser: (value: number, to: TemperatureUnitId) =>
          convertTemperature(value, temperatureUnit, to),
      },
      pressure: {
        toUser: (value: number, from: PressureUnitId) => convertPressure(value, from, pressureUnit),
        fromUser: (value: number, to: PressureUnitId) => convertPressure(value, pressureUnit, to),
      },
    }),
    [
      speedUnit,
      distanceUnit,
      depthUnit,
      angleUnit,
      areaUnit,
      powerUnit,
      forceUnit,
      lengthUnit,
      temperatureUnit,
      pressureUnit,
    ]
  )

  return {
    speedUnit,
    distanceUnit,
    depthUnit,
    angleUnit,
    areaUnit,
    powerUnit,
    forceUnit,
    lengthUnit,
    temperatureUnit,
    pressureUnit,
    units,
    convert,
  }
}
