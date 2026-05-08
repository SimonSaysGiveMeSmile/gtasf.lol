// San Francisco static-mesh city (GLB) overlayed with OSM road network.
// The 3D building geometry comes from public/models/sf_obj/SanFrancisco_City.glb
// (converted from a commercial SF OBJ scan, 8K textures preserved via WebP q90,
// shipped via Git LFS — ~148 MB file). Roads, sidewalks, props, and
// traffic data are reused from the downtown_sf OSM export.
//
// Scale reasoning: raw OBJ AABB range is 7.504 × 0.685 × 7.466. Real downtown
// SF spans ~3 km east-west; scaling by 400 puts the model at ~3000m wide.
// Offsets centre the model on world origin (the OBJ's local origin sits in
// one corner) and lift it so the ground plane rests at y=0.
//   OBJ bounds: x[-4.607, 2.897], y[-0.162, 0.524], z[-4.516, 2.951]
//   scale = 400 →
//     offsetX = -(xMin+xMax)/2 * scale = 341.9
//     offsetZ = -(zMin+zMax)/2 * scale = 313.0
//     offsetY = -yMin * scale           = 64.7 (puts base at y=0)

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
    offsetX: 341.9,
    offsetY: 64.7,
    offsetZ: 313.0,
  },
}
