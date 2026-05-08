// San Francisco static-mesh city (GLB) overlayed with OSM road network.
// The 3D building geometry comes from public/models/sf_obj/SanFrancisco_City.glb
// (converted from a commercial SF OBJ scan). Roads, sidewalks, props, and
// traffic data are reused from the downtown_sf OSM export so the street
// network lines up with real SF streets.
//
// Scale reasoning: raw OBJ AABB range is 7.5 × 0.7 × 7.5. Real downtown SF
// spans ~3 km east-west; scaling by 400 puts the model at ~3000m wide,
// matching OSM. Fine-tune offsetX/offsetZ after visual inspection.

import type { LandscapeData } from '../landscape.types'
import { MAP_DATA as DOWNTOWN_SF_MAP_DATA } from './downtown_sf'

export const SPAWN_POINT: [number, number, number] = [0, 3, 0]

export const MAP_DATA: LandscapeData = {
  ...DOWNTOWN_SF_MAP_DATA,
  mapId: 'sf_obj',
  // Strip OSM buildings — the GLB provides the geometry. Colliders come
  // from the BVH built over the loaded mesh, not from footprint polygons.
  buildings: [],
  objModel: {
    url: '/models/sf_obj/SanFrancisco_City.glb',
    scale: 400,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
  },
}
