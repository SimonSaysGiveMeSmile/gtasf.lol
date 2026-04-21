// Landscape configuration — used by World.tsx for world layout
// Falls back to procedural defaults when not configured

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const MAP_SIZE = 400
const BUILDING_COUNT = 120
const TREE_COUNT = 80

const ROAD_POSITIONS_ARR = [-120, -60, 0, 60, 120]

interface BuildingData {
  x: number
  z: number
  width: number
  depth: number
  height: number
  color?: string
}

interface TreeData {
  x: number
  z: number
}

interface LampData {
  x: number
  z: number
}

interface WaterData {
  x: number
  z: number
  width: number
  height: number
}

// Procedural building layout (matches BUILDING_LAYOUT in buildings.ts)
const buildings: BuildingData[] = []
for (let i = 0; i < BUILDING_COUNT; i++) {
  const rng = seededRandom(i * 17 + 3)
  const rng2 = seededRandom(i * 31 + 7)
  const rng3 = seededRandom(i * 53 + 11)
  const width = 6 + rng * 14
  const depth = 6 + rng2 * 14
  const height = 10 + rng3 * 70
  const angle = rng * Math.PI * 2
  const dist = 20 + rng2 * MAP_SIZE * 0.45
  buildings.push({
    x: Math.cos(angle) * dist,
    z: Math.sin(angle) * dist,
    width, depth, height,
  })
}

// Procedural tree layout
const trees: TreeData[] = []
for (let i = 0; i < TREE_COUNT; i++) {
  const rng = seededRandom(i * 23 + 5)
  const angle = rng * Math.PI * 2
  const dist = 30 + rng * MAP_SIZE * 0.4
  trees.push({
    x: Math.cos(angle) * dist + (seededRandom(i * 41) - 0.5) * 40,
    z: Math.sin(angle) * dist + (seededRandom(i * 59) - 0.5) * 40,
  })
}

// Procedural street lamp layout
const streetLamps: LampData[] = []
for (let i = 0; i < 25; i++) {
  const rng = seededRandom(i * 37 + 3)
  streetLamps.push({
    x: (rng - 0.5) * MAP_SIZE * 0.7,
    z: (seededRandom(i * 71 + 7) - 0.5) * MAP_SIZE * 0.7,
  })
}

export const LANDSCAPE_CONFIG = {
  buildings,
  trees,
  streetLamps,
  hRoads: ROAD_POSITIONS_ARR,
  vRoads: ROAD_POSITIONS_ARR,
  water: {
    x: -MAP_SIZE * 0.5 - 50,
    z: 0,
    width: MAP_SIZE + 200,
    height: MAP_SIZE + 200,
  } as WaterData,
}
