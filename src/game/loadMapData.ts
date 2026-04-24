// Map data loader — switches between procedural and static map data sources
// To add a new static map: create src/game/maps/<name>.ts, export the map, then add to AVAILABLE_MAPS below

import type { LandscapeData } from './landscape.types'
import { generateProceduralData } from './landscape'

// ─── Available static maps ───────────────────────────────────────────────────
import { TEST_MAP } from './maps/test_map'

const STATIC_MAPS: Record<string, LandscapeData> = {
  test_map: TEST_MAP,
}

export const AVAILABLE_MAPS: { id: string; label: string }[] = [
  { id: 'procedural', label: 'Procedural City' },
  { id: 'test_map', label: 'Test Map' },
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
