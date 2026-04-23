// Landscape configuration — used by World.tsx for world layout
// Procedural generation using CatmullRom splines for curved roads
// @simonsaysgivemeslime
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const MAP_SIZE = 1600

// ─── CatmullRom Spline Utility ────────────────────────────────────────────────
interface Point { x: number; z: number }

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    z: 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  }
}

function splineTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): number {
  const t2 = t * t
  const dx = 0.5 * ((-p0.x + p2.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t +
    3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2)
  const dz = 0.5 * ((-p0.z + p2.z) + 2 * (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t +
    3 * (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t2)
  return Math.atan2(dx, dz)
}

// Sample a spline into a path of points with tangents
function sampleSpline(points: Point[], segments: number): { x: number; z: number; angle: number }[] {
  const result: { x: number; z: number; angle: number }[] = []
  for (let i = 0; i < points.length - 3; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2]
    for (let t = 0; t < 1; t += 1 / segments) {
      const pt = catmullRom(p0, p1, p2, p3, t)
      const angle = splineTangent(p0, p1, p2, p3, t)
      result.push({ x: pt.x, z: pt.z, angle })
    }
  }
  const last = points[points.length - 2]
  result.push({ x: last.x, z: last.z, angle: result.length > 0 ? result[result.length - 1].angle : 0 })
  return result
}

// Distance from point to line segment
function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (pz - (az + t * dz)) ** 2)
}

// Check if a point is near any road
function isNearRoads(roadPaths: { x: number; z: number; angle: number }[][], x: number, z: number, minDist: number): boolean {
  for (const path of roadPaths) {
    for (let i = 0; i < path.length - 1; i++) {
      if (distToSegment(x, z, path[i].x, path[i].z, path[i + 1].x, path[i + 1].z) < minDist) {
        return true
      }
    }
  }
  return false
}

// ─── Road Generation ──────────────────────────────────────────────────────────
interface RoadData {
  name: string
  color: string
  controlPoints: Point[]
  width: number
}

function generateRoadControlPoints(
  seed: number,
  startEdge: 'top' | 'bottom' | 'left' | 'right',
  numPoints: number
): Point[] {
  const points: Point[] = []
  const half = MAP_SIZE * 0.48

  let startX: number, startZ: number
  switch (startEdge) {
    case 'top': startX = (seededRandom(seed) - 0.5) * MAP_SIZE * 0.8; startZ = -half; break
    case 'bottom': startX = (seededRandom(seed) - 0.5) * MAP_SIZE * 0.8; startZ = half; break
    case 'left': startX = -half; startZ = (seededRandom(seed) - 0.5) * MAP_SIZE * 0.8; break
    case 'right': startX = half; startZ = (seededRandom(seed) - 0.5) * MAP_SIZE * 0.8; break
  }
  points.push({ x: startX, z: startZ })

  for (let i = 1; i < numPoints - 1; i++) {
    const progress = i / (numPoints - 1)
    let x: number, z: number
    switch (startEdge) {
      case 'top':
      case 'bottom':
        x = (seededRandom(seed + i * 17) - 0.5) * MAP_SIZE * 0.9
        z = -half + progress * MAP_SIZE * 0.96 + (seededRandom(seed + i * 31) - 0.5) * 120
        break
      default:
        x = -half + progress * MAP_SIZE * 0.96 + (seededRandom(seed + i * 31) - 0.5) * 120
        z = (seededRandom(seed + i * 17) - 0.5) * MAP_SIZE * 0.9
        break
    }
    points.push({ x, z })
  }

  let endX: number, endZ: number
  switch (startEdge) {
    case 'top': endX = (seededRandom(seed + 999) - 0.5) * MAP_SIZE * 0.8; endZ = half; break
    case 'bottom': endX = (seededRandom(seed + 999) - 0.5) * MAP_SIZE * 0.8; endZ = -half; break
    case 'left': endX = half; endZ = (seededRandom(seed + 999) - 0.5) * MAP_SIZE * 0.8; break
    case 'right': endX = -half; endZ = (seededRandom(seed + 999) - 0.5) * MAP_SIZE * 0.8; break
  }
  points.push({ x: endX, z: endZ })

  return points
}

const roadColors = ['#333344', '#2a2a3a', '#3a3a4a', '#282838']

const ROAD_CONTROL_POINTS: RoadData[] = [
  { name: 'Highway 1', color: roadColors[0], controlPoints: generateRoadControlPoints(1, 'left', 5), width: 16 },
  { name: 'Highway 2', color: roadColors[1], controlPoints: generateRoadControlPoints(2, 'left', 5), width: 16 },
  { name: 'Main St', color: roadColors[2], controlPoints: generateRoadControlPoints(3, 'left', 7), width: 12 },
  { name: 'Broadway', color: roadColors[0], controlPoints: generateRoadControlPoints(4, 'top', 5), width: 16 },
  { name: 'Market St', color: roadColors[1], controlPoints: generateRoadControlPoints(5, 'top', 5), width: 16 },
  { name: 'Mission', color: roadColors[2], controlPoints: generateRoadControlPoints(6, 'top', 7), width: 12 },
  { name: 'Bay Shore', color: roadColors[3], controlPoints: generateRoadControlPoints(7, 'top', 6), width: 10 },
  { name: 'Ocean Ave', color: roadColors[3], controlPoints: generateRoadControlPoints(8, 'bottom', 6), width: 10 },
  { name: 'Industrial Rd', color: roadColors[2], controlPoints: generateRoadControlPoints(9, 'left', 5), width: 10 },
  { name: 'Civic Center', color: roadColors[3], controlPoints: generateRoadControlPoints(10, 'top', 5), width: 10 },
  { name: 'University', color: roadColors[2], controlPoints: generateRoadControlPoints(11, 'left', 6), width: 10 },
  { name: 'Downtown Loop', color: roadColors[0], controlPoints: generateRoadControlPoints(12, 'top', 6), width: 14 },
]

// Sample all roads into path arrays
const ROAD_PATHS: { x: number; z: number; angle: number }[][] = ROAD_CONTROL_POINTS.map(r =>
  sampleSpline(r.controlPoints, 20)
)

// ─── Caltrain Rail Lines ─────────────────────────────────────────────────────
interface RailLineData {
  name: string
  color: string
  controlPoints: Point[]
  speedLimit: number
}

const CALTRANS_LINES: RailLineData[] = [
  {
    name: 'Caltrain - SF to SJ',
    color: '#cc4400',
    controlPoints: [
      { x: -MAP_SIZE * 0.45, z: -MAP_SIZE * 0.35 },
      { x: -MAP_SIZE * 0.3, z: -MAP_SIZE * 0.3 },
      { x: -MAP_SIZE * 0.1, z: -MAP_SIZE * 0.2 },
      { x: MAP_SIZE * 0.15, z: -MAP_SIZE * 0.1 },
      { x: MAP_SIZE * 0.35, z: MAP_SIZE * 0.05 },
      { x: MAP_SIZE * 0.45, z: MAP_SIZE * 0.15 },
    ],
    speedLimit: 80,
  },
  {
    name: 'Caltrain - Peninsula',
    color: '#cc4400',
    controlPoints: [
      { x: -MAP_SIZE * 0.4, z: MAP_SIZE * 0.3 },
      { x: -MAP_SIZE * 0.2, z: MAP_SIZE * 0.25 },
      { x: 0, z: MAP_SIZE * 0.15 },
      { x: MAP_SIZE * 0.2, z: MAP_SIZE * 0.2 },
      { x: MAP_SIZE * 0.4, z: MAP_SIZE * 0.3 },
    ],
    speedLimit: 80,
  },
]

const CALTRANS_PATHS: { x: number; z: number; angle: number }[][] = CALTRANS_LINES.map(r =>
  sampleSpline(r.controlPoints, 30)
)

// ─── Building Layout ──────────────────────────────────────────────────────────
interface BuildingData { x: number; z: number; width: number; depth: number; height: number; color?: string }
interface TreeData { x: number; z: number }
interface LampData { x: number; z: number }
interface TrafficLightData { x: number; z: number; angle: number }
interface BusStopData { x: number; z: number; angle: number; name: string }
interface CrosswalkData { x: number; z: number; angle: number }
interface SidewalkData { x: number; z: number; angle: number; len: number }
interface ParkingData { x: number; z: number; angle: number }
interface BenchData { x: number; z: number; angle: number }
interface HydrantData { x: number; z: number }

const BUILDING_COLORS_ARRAY = [
  '#1a1a3a', '#151535', '#202050', '#0f0f2a', '#1e1e40',
  '#12122a', '#18183a', '#222245', '#0d0d25', '#1c1c3a',
]

const buildings: BuildingData[] = []
for (let i = 0; i < 800; i++) {
  const rng = seededRandom(i * 17 + 3)
  const rng2 = seededRandom(i * 31 + 7)
  const rng3 = seededRandom(i * 53 + 11)
  const rng4 = seededRandom(i * 97 + 13)
  const width = 6 + rng * 18
  const depth = 6 + rng2 * 18
  const height = 10 + rng3 * 80
  const angle = rng * Math.PI * 2
  const dist = 30 + rng2 * MAP_SIZE * 0.44

  const x = Math.cos(angle) * dist
  const z = Math.sin(angle) * dist

  if (isNearRoads(ROAD_PATHS, x, z, 12)) continue
  if (isNearRoads(CALTRANS_PATHS, x, z, 10)) continue
  if (x < -MAP_SIZE * 0.48) continue

  buildings.push({
    x, z, width, depth, height,
    color: BUILDING_COLORS_ARRAY[Math.floor(rng4 * BUILDING_COLORS_ARRAY.length)],
  })
  if (buildings.length >= 200) break
}

// ─── Trees ────────────────────────────────────────────────────────────────────
const trees: TreeData[] = []
for (let i = 0; i < 120; i++) {
  const rng = seededRandom(i * 23 + 5)
  const angle = rng * Math.PI * 2
  const dist = 30 + rng * MAP_SIZE * 0.44
  const x = Math.cos(angle) * dist + (seededRandom(i * 41) - 0.5) * 40
  const z = Math.sin(angle) * dist + (seededRandom(i * 59) - 0.5) * 40
  if (isNearRoads(ROAD_PATHS, x, z, 6)) continue
  if (isNearRoads(CALTRANS_PATHS, x, z, 5)) continue
  if (x < -MAP_SIZE * 0.48) continue
  trees.push({ x, z })
}

// ─── Street Lamps ─────────────────────────────────────────────────────────────
const streetLamps: LampData[] = []
for (const path of ROAD_PATHS) {
  for (let i = 0; i < path.length; i += 15) {
    const pt = path[i]
    const perpX = Math.cos(pt.angle + Math.PI / 2) * 7
    const perpZ = Math.sin(pt.angle + Math.PI / 2) * 7
    streetLamps.push({ x: pt.x + perpX, z: pt.z + perpZ })
  }
}

// ─── Traffic Lights ───────────────────────────────────────────────────────────
interface TrafficLightData { x: number; z: number; angle: number }
const trafficLights: TrafficLightData[] = []
for (const path of ROAD_PATHS) {
  for (let i = 0; i < path.length; i += 20) {
    const pt = path[i]
    trafficLights.push({ x: pt.x, z: pt.z, angle: pt.angle })
  }
}

// ─── Bus Stops ────────────────────────────────────────────────────────────────
interface BusStopData { x: number; z: number; angle: number; name: string }
const BUS_STOP_NAMES = ['Market & 4th', 'Powell St', 'Van Ness', 'Castro', 'Mission', 'Embarcadero', 'Civic Center', '16th St', '24th St', 'Glen Park', 'BART', 'Ferry Bldg']
const busStops: BusStopData[] = []
for (let i = 0; i < 30; i++) {
  const path = ROAD_PATHS[i % ROAD_PATHS.length]
  if (!path || path.length === 0) continue
  const pt = path[Math.floor(path.length / 2)]
  const perpAngle = pt.angle + Math.PI / 2
  const side = i % 2 === 0 ? 1 : -1
  busStops.push({
    x: pt.x + Math.cos(perpAngle) * 10 * side,
    z: pt.z + Math.sin(perpAngle) * 10 * side,
    angle: pt.angle,
    name: BUS_STOP_NAMES[i % BUS_STOP_NAMES.length],
  })
}

// ─── Crosswalks ───────────────────────────────────────────────────────────────
interface CrosswalkData { x: number; z: number; angle: number }
const crosswalks: CrosswalkData[] = []
for (const path of ROAD_PATHS) {
  for (let i = 0; i < path.length; i += 20) {
    const pt = path[i]
    const nextPt = path[Math.min(i + 1, path.length - 1)]
    crosswalks.push({ x: pt.x, z: pt.z, angle: Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z) })
  }
}

// ─── Sidewalks ───────────────────────────────────────────────────────────────
interface SidewalkData { x: number; z: number; angle: number; len: number }
const sidewalks: SidewalkData[] = []
for (const path of ROAD_PATHS) {
  for (let i = 0; i < path.length; i += 6) {
    const pt = path[i]
    const nextPt = path[Math.min(i + 1, path.length - 1)]
    const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
    const perpAngle = angle + Math.PI / 2
    sidewalks.push({
      x: pt.x + Math.cos(perpAngle) * 8,
      z: pt.z + Math.sin(perpAngle) * 8,
      angle,
      len: 8,
    })
    sidewalks.push({
      x: pt.x - Math.cos(perpAngle) * 8,
      z: pt.z - Math.sin(perpAngle) * 8,
      angle,
      len: 8,
    })
  }
}

// ─── Parking Lots ─────────────────────────────────────────────────────────────
interface ParkingData { x: number; z: number; angle: number }
const parkingLots: ParkingData[] = []
for (let i = 0; i < 15; i++) {
  const path = ROAD_PATHS[i % ROAD_PATHS.length]
  if (!path || path.length < 5) continue
  const pt = path[Math.floor(path.length * 0.3)]
  const perpAngle = (pt.angle || 0) + Math.PI / 2
  parkingLots.push({
    x: pt.x + Math.cos(perpAngle) * 20,
    z: pt.z + Math.sin(perpAngle) * 20,
    angle: pt.angle || 0,
  })
}

// ─── Benches ─────────────────────────────────────────────────────────────────
interface BenchData { x: number; z: number; angle: number }
const benches: BenchData[] = []
for (let i = 0; i < 40; i++) {
  const path = ROAD_PATHS[i % ROAD_PATHS.length]
  if (!path || path.length === 0) continue
  const pt = path[Math.floor(path.length * 0.6)]
  benches.push({ x: pt.x, z: pt.z, angle: pt.angle || 0 })
}

// ─── Fire Hydrants ────────────────────────────────────────────────────────────
interface HydrantData { x: number; z: number }
const hydrants: HydrantData[] = []
for (let i = 0; i < 60; i++) {
  const path = ROAD_PATHS[i % ROAD_PATHS.length]
  if (!path || path.length === 0) continue
  const pt = path[Math.floor(path.length * 0.5)]
  hydrants.push({ x: pt.x + (seededRandom(i * 97) - 0.5) * 12, z: pt.z + (seededRandom(i * 113) - 0.5) * 12 })
}

// ─── Water ───────────────────────────────────────────────────────────────────
const WATER_X = -MAP_SIZE * 0.72
const WATER_WIDTH = MAP_SIZE * 0.56
const WATER_HEIGHT = MAP_SIZE * 2.2

// ─── Export ───────────────────────────────────────────────────────────────────
export const LANDSCAPE_CONFIG = {
  roads: ROAD_CONTROL_POINTS,
  roadPaths: ROAD_PATHS,
  buildings,
  trees,
  streetLamps,
  trafficLights,
  busStops,
  crosswalks,
  sidewalks,
  parkingLots,
  benches,
  hydrants,
  caltransLines: CALTRANS_LINES,
  caltransPaths: CALTRANS_PATHS,
  water: {
    x: WATER_X,
    z: 0,
    width: WATER_WIDTH,
    height: WATER_HEIGHT,
  },
}
