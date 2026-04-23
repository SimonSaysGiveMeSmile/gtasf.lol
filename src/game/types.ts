// @t1an
export type CityId = 'sf' | 'la' | 'nyc' | 'miami' | 'london'
export type PlayerMode = 'onfoot' | 'vehicle' | 'plane' | 'boat'
export type VehicleType = 'cybertruck' | 'modelS' | 'model3' | 'modelX' | 'semi' | 'sports' | 'suv' | 'sedan' | 'plane' | 'boat' | 'scooter' | 'caltrain'
export type NPCType = 'pedestrian' | 'traffic'

export interface NPC {
  id: string
  type: NPCType
  position: [number, number, number]
  rotation: number
  color: string
  path?: [number, number, number][]
  pathIndex?: number
  state: 'walking' | 'idle' | 'driving'
  vehicleId?: string
}

export interface VehicleSpec {
  type: VehicleType
  name: string
  brand: string
  color: string
  maxSpeed: number
  acceleration: number
  handling: number
  mass: number
  dimensions: { x: number; y: number; z: number }
}

export interface CityConfig {
  id: CityId
  name: string
  center: [number, number]
  zoom: number
  groundColor: string
  waterColor: string
}

export interface DamageSource {
  type: 'collision' | 'fall' | 'vehicle'
  speed?: number
  fallDistance?: number
  position: [number, number, number]
}

export interface RespawnPoint {
  position: [number, number, number]
  rotation: number
}

export interface CollisionEvent {
  contact: {
    impactVelocity: number
  }
}
