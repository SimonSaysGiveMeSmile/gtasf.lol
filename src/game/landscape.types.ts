// Landscape element type interfaces — single source of truth for all element types
// Use these when defining static map data or consuming LANDSCAPE_CONFIG

export interface Point { x: number; z: number }

export interface PathPoint { x: number; z: number; angle: number }

export interface RoadData {
  name: string
  color: string
  controlPoints: Point[]
  width: number
}

export interface RailLineData {
  name: string
  color: string
  controlPoints: Point[]
  speedLimit: number
}

export interface BuildingData {
  x: number
  z: number
  width: number
  depth: number
  height: number
  color?: string
  label?: string
  footprint?: { x: number; z: number }[]
}

export interface TreeData {
  x: number
  z: number
  label?: string  // e.g. "Oak Tree #12"
}

export interface LampData {
  x: number
  z: number
  label?: string  // e.g. "Lamp post — Mission St"
}

export interface TrafficLightData {
  x: number
  z: number
  angle: number
  label?: string
}

export interface BusStopData {
  x: number
  z: number
  angle: number
  name: string
  label?: string
}

export interface CrosswalkData {
  x: number
  z: number
  angle: number
  label?: string
}

export interface SidewalkData {
  x: number
  z: number
  angle: number
  len: number
  label?: string
}

export interface ParkingData {
  x: number
  z: number
  angle: number
  label?: string
}

export interface BenchData {
  x: number
  z: number
  angle: number
  label?: string
}

export interface HydrantData {
  x: number
  z: number
  label?: string
}

export interface WaterData {
  x: number
  z: number
  width: number
  height: number
}

// OSM source bounds — lat/lon rectangle the map was converted from.
// Game coordinates (x, z) are meters relative to the center of this rectangle.
// Preserving this lets future imports align to the same world origin and
// lets tools convert between game units and lat/lon.
export interface OsmBounds {
  minlat: number
  maxlat: number
  minlon: number
  maxlon: number
}

// Full landscape data bundle — returned by loadLandscapeData()
export interface LandscapeData {
  roads: RoadData[]
  roadPaths: PathPoint[][]
  buildings: BuildingData[]
  trees: TreeData[]
  streetLamps: LampData[]
  trafficLights: TrafficLightData[]
  busStops: BusStopData[]
  crosswalks: CrosswalkData[]
  sidewalks: SidewalkData[]
  parkingLots: ParkingData[]
  benches: BenchData[]
  hydrants: HydrantData[]
  caltransLines: RailLineData[]
  caltransPaths: PathPoint[][]
  water: WaterData
  // Provenance — only present on OSM-derived maps. Consumers should treat as optional.
  osmBounds?: OsmBounds
  osmFile?: string
  mapId?: string
}
