// San Francisco static-mesh city (GLB).
// The visual world is entirely inside public/models/sf_obj/SanFrancisco_City.glb
// — streets, sidewalks, trees and curb props are all baked into the texture
// atlas, so World.tsx skips the OSM overlays for this map to avoid z-fighting
// and double-drawing. The only OSM data reused is SPAWN_POINT metadata.
//
// Textures are 7 × 8192² WebP q90 embedded in the GLB (source ZIP's original
// resolution — no further downsampling is possible without a higher-res
// source scan). Shipped via Git LFS since the GLB is ~148 MB.
//
// Transform reasoning (raw OBJ AABB: x[-4.607, 2.897], y[-0.162, 0.524],
// z[-4.516, 2.951]):
//   scale = 400 → model spans ~3 km × ~275 m × ~3 km (roughly real SF)
//   offsetX/Z = -(min+max)/2 * scale → centres the city on world origin
//   offsetY = 0 → street-level (y≈0 in the raw OBJ) sits at world y=0.
//     A previous version used offsetY=+64.7 to lift yMin to y=0, but the
//     OBJ's yMin is a submerged plinth (13% of verts are below 0); street
//     level is already at y=0 so the whole city was floating +64m.
import type { LandscapeData } from '../landscape.types'
import { MAP_DATA as DOWNTOWN_SF_MAP_DATA } from './downtown_sf'

// Spawn somewhere near the centre of the scan, a few metres above ground so
// the player drops onto the street rather than spawning inside a building.
export const SPAWN_POINT: [number, number, number] = [0, 50, 0]

export const MAP_DATA: LandscapeData = {
  ...DOWNTOWN_SF_MAP_DATA,
  mapId: 'sf_obj',
  // Strip OSM buildings — the GLB provides the geometry. Colliders come
  // from the BVH built over the loaded mesh, not from footprint polygons.
  buildings: [],
  objModel: {
    url: '/models/sf_obj/SanFrancisco_City.glb',
    scale: 400,
    offsetX: 341.9,
    offsetY: 0,
    offsetZ: 313.0,
  },
}
