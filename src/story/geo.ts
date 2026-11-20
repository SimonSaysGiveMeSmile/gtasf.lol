// Geo helpers for the downtown_sf OSM frame.
// Verified against the baked data: Moscone West (37.7832 N, -122.4040 W)
// lands at (≈88, ≈-479) vs the data's (80, -496). +x = east, +z = north.
import type { PathPoint } from '../game/landscape.types'

export const ORIGIN_LAT = 37.7875
export const ORIGIN_LON = -122.405
const M_PER_DEG_LAT = 111_320
const M_PER_DEG_LON = 111_320 * Math.cos((ORIGIN_LAT * Math.PI) / 180)

export function latLonToWorld(lat: number, lon: number): { x: number; z: number } {
  return { x: (lon - ORIGIN_LON) * M_PER_DEG_LON, z: (lat - ORIGIN_LAT) * M_PER_DEG_LAT }
}

export function worldToLatLon(x: number, z: number): { lat: number; lon: number } {
  return { lat: ORIGIN_LAT + z / M_PER_DEG_LAT, lon: ORIGIN_LON + x / M_PER_DEG_LON }
}

// Nearest point on the road network within `maxDist` metres. Returns the
// input unchanged when nothing is close enough (or the network is empty).
export function snapToRoad(
  x: number,
  z: number,
  roadPaths: PathPoint[][],
  maxDist = 140,
): { x: number; z: number } {
  let best: { x: number; z: number } | null = null
  let bestD2 = maxDist * maxDist
  for (const path of roadPaths) {
    for (let i = 0; i < path.length; i++) {
      const p = path[i]
      const dx = p.x - x
      const dz = p.z - z
      const d2 = dx * dx + dz * dz
      if (d2 < bestD2) {
        bestD2 = d2
        best = p
      }
    }
  }
  return best ? { x: best.x, z: best.z } : { x, z }
}

export function dist2d(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx
  const dz = az - bz
  return Math.sqrt(dx * dx + dz * dz)
}
