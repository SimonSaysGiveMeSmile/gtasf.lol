// Map data loader — switches between procedural and static map data sources
// To add a new static map: create src/game/maps/<name>.ts (export MAP_DATA + SPAWN_POINT),
// import it here, add to AVAILABLE_MAPS, and register in STATIC_MAPS below.

import type { LandscapeData } from './landscape.types'
import { generateProceduralData } from './landscape'

// ─── Available static maps ───────────────────────────────────────────────────
import { MAP_DATA as TEST_MAP_DATA, SPAWN_POINT as TEST_SPAWN } from './maps/test_map'
import { MAP_DATA as GOLDEN_GATE_MAP_DATA, SPAWN_POINT as GOLDEN_GATE_SPAWN } from './maps/golden_gate'
import { MAP_DATA as UNION_SQUARE_MAP_DATA, SPAWN_POINT as UNION_SQUARE_SPAWN } from './maps/union_square'

const STATIC_MAPS: Record<string, LandscapeData> = {
  test_map: TEST_MAP_DATA,
  golden_gate: GOLDEN_GATE_MAP_DATA,
  union_square: UNION_SQUARE_MAP_DATA,
}

export const SPAWN_POINTS: Record<string, [number, number, number]> = {
  test_map: TEST_SPAWN,
  golden_gate: GOLDEN_GATE_SPAWN,
  union_square: UNION_SQUARE_SPAWN,
}

export const AVAILABLE_MAPS: { id: string; label: string }[] = [
  { id: 'procedural', label: 'Procedural City' },
  { id: 'test_map', label: 'Test Map' },
  { id: 'golden_gate', label: 'Golden Gate / Presidio' },
  { id: 'union_square', label: 'Union Square / Downtown SF' },
]

// ─── Loader ─────────────────────────────────────────────────────────────────
export function loadLandscapeData(mapId: string): LandscapeData {
  if (mapId === 'procedural') {
    return generateProceduralData()
  }
  const found = STATIC_MAPS[mapId]
  if (!found) {
    console.warn(`[loadMapData] Unknown map "${mapId}", falling back to procedural`)
    return generateProceduralData()
  }
  return found
}
