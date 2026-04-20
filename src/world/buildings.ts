// Seeded random for deterministic building generation
// Must use identical algorithm to World.tsx for consistent positioning
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const BUILDING_COUNT = 120
const MAP_SIZE = 400

export interface BuildingData {
  x: number
  z: number
  width: number
  depth: number
  height: number
}

function generateBuildings(): BuildingData[] {
  const result: BuildingData[] = []
  for (let i = 0; i < BUILDING_COUNT; i++) {
    const rng = seededRandom(i * 17 + 3)
    const rng2 = seededRandom(i * 31 + 7)
    const rng3 = seededRandom(i * 53 + 11)

    const width = 6 + rng * 14
    const depth = 6 + rng2 * 14
    const height = 10 + rng3 * 70

    // Distribute across the map with city center density (same formula as World.tsx)
    const angle = rng * Math.PI * 2
    const dist = 20 + rng2 * MAP_SIZE * 0.45
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist

    result.push({ x, z, width, depth, height })
  }
  return result
}

// Computed once at module load time, not re-computed on render
export const BUILDING_LAYOUT: BuildingData[] = generateBuildings()