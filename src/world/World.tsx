// @simonsaysgivemesmile
import { useMemo } from 'react'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { MAP_SIZE } from '../game/constants'
import { default as BillboardLayer } from '../systems/billboards/BillboardLayer'
import { useLandscapeData } from '../game/LandscapeContext'
import type { BuildingData } from '../game/landscape.types'
import { InstancedBuildings, InstancedTrees } from './InstancedLayers'
import {
  InstancedLamps,
  InstancedTrafficLights,
  InstancedSidewalks,
  InstancedCrosswalks,
} from './InstancedLayers2'

// ─── Spatial Grid for Collision Detection ─────────────────────────────────────
// Divide the map into a grid; each cell stores building indices
// This reduces collision from O(n*m) to O(n) per frame
const GRID_CELL_SIZE = 60 // world units per cell

// Precomputed polygon data used for circle-vs-building collision.
// Buildings with a footprint use polygon collision to match the extruded mesh
// exactly. Buildings without a footprint fall back to AABB (width×depth).
interface BuildingColliderPoly {
  xs: Float32Array
  zs: Float32Array
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface SpatialGrid {
  cellSize: number
  buildings: Map<string, number[]> // "cx,cz" -> building indices
  // Null when the building has no footprint → AABB fallback.
  polys: (BuildingColliderPoly | null)[]
}

function buildPolys(buildings: BuildingData[]): (BuildingColliderPoly | null)[] {
  const out: (BuildingColliderPoly | null)[] = new Array(buildings.length)
  for (let i = 0; i < buildings.length; i++) {
    const fp = buildings[i].footprint
    if (!fp || fp.length < 3) { out[i] = null; continue }
    const xs = new Float32Array(fp.length)
    const zs = new Float32Array(fp.length)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (let k = 0; k < fp.length; k++) {
      xs[k] = fp[k].x; zs[k] = fp[k].z
      if (fp[k].x < minX) minX = fp[k].x
      if (fp[k].x > maxX) maxX = fp[k].x
      if (fp[k].z < minZ) minZ = fp[k].z
      if (fp[k].z > maxZ) maxZ = fp[k].z
    }
    out[i] = { xs, zs, minX, maxX, minZ, maxZ }
  }
  return out
}

function buildSpatialGrid(buildings: BuildingData[]): SpatialGrid {
  const cells = new Map<string, number[]>()
  const polys = buildPolys(buildings)
  for (let i = 0; i < buildings.length; i++) {
    const p = polys[i]
    const b = buildings[i]
    // Use the polygon AABB when available — the stored width/depth is rounded
    // and may not cover every footprint vertex.
    const bxMin = p ? p.minX : b.x - b.width / 2
    const bxMax = p ? p.maxX : b.x + b.width / 2
    const bzMin = p ? p.minZ : b.z - b.depth / 2
    const bzMax = p ? p.maxZ : b.z + b.depth / 2
    const minCx = Math.floor(bxMin / GRID_CELL_SIZE)
    const maxCx = Math.floor(bxMax / GRID_CELL_SIZE)
    const minCz = Math.floor(bzMin / GRID_CELL_SIZE)
    const maxCz = Math.floor(bzMax / GRID_CELL_SIZE)
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = `${cx},${cz}`
        if (!cells.has(key)) cells.set(key, [])
        cells.get(key)!.push(i)
      }
    }
  }
  return { cellSize: GRID_CELL_SIZE, buildings: cells, polys }
}

function getNearbyBuildings(px: number, pz: number, grid: SpatialGrid, radius: number): number[] {
  const cx = Math.floor(px / grid.cellSize)
  const cz = Math.floor(pz / grid.cellSize)
  const cellRadius = Math.ceil(radius / grid.cellSize) + 1
  const indices = new Set<number>()
  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      const key = `${cx + dx},${cz + dz}`
      const cell = grid.buildings.get(key)
      if (cell) {
        for (const idx of cell) indices.add(idx)
      }
    }
  }
  return Array.from(indices)
}

// Closest point on polygon edge(s) to (px, pz) + whether the point is inside.
// Uses the standard even-odd ray cast for containment and a per-edge projection
// for the closest boundary point. Works for any simple polygon (convex or not).
function closestPointOnPoly(xs: Float32Array, zs: Float32Array, px: number, pz: number) {
  let bestDx = 0, bestDz = 0, bestDist2 = Infinity
  let inside = false
  const n = xs.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const x1 = xs[j], z1 = zs[j]
    const x2 = xs[i], z2 = zs[i]

    // Point-in-polygon (ray cast along +x)
    if ((z1 > pz) !== (z2 > pz)) {
      const xAtPz = x1 + ((pz - z1) * (x2 - x1)) / (z2 - z1)
      if (px < xAtPz) inside = !inside
    }

    // Closest point on segment (j → i)
    const ex = x2 - x1, ez = z2 - z1
    const lenSq = ex * ex + ez * ez
    let t = lenSq > 0 ? ((px - x1) * ex + (pz - z1) * ez) / lenSq : 0
    if (t < 0) t = 0; else if (t > 1) t = 1
    const cx = x1 + ex * t, cz = z1 + ez * t
    const ddx = px - cx, ddz = pz - cz
    const d2 = ddx * ddx + ddz * ddz
    if (d2 < bestDist2) {
      bestDist2 = d2
      bestDx = ddx
      bestDz = ddz
    }
  }
  return { inside, dx: bestDx, dz: bestDz, dist: Math.sqrt(bestDist2) }
}

export interface BuildingPushOut {
  pushX: number  // additive correction to apply to px
  pushZ: number  // additive correction to apply to pz
}

// Minimum shape the AABB fallback needs. Callers that don't carry full
// BuildingData (e.g. TrafficCar stores a stripped-down array) can still pass
// their typed array without an unsafe cast.
type BuildingAABBLike = { x: number; z: number; width: number; depth: number }

// Test a circle at (px, pz) against one building. Returns a push-out vector
// that moves the circle just outside the wall, or null if no contact.
// Uses polygon collision when a footprint is present; falls back to AABB.
export function collideCircleWithBuilding(
  bi: number,
  px: number,
  pz: number,
  r: number,
  buildings: BuildingAABBLike[],
): BuildingPushOut | null {
  if (!_spatialGrid) return null
  const poly = _spatialGrid.polys[bi]
  if (poly) {
    if (px + r < poly.minX || px - r > poly.maxX || pz + r < poly.minZ || pz - r > poly.maxZ) {
      return null
    }
    const cp = closestPointOnPoly(poly.xs, poly.zs, px, pz)
    if (cp.inside) {
      // Inside the building — eject through the nearest wall. dx/dz points
      // from the wall point toward the player, so pushing in the opposite
      // direction by (cp.dist + r) lands us r units outside the wall.
      const d = cp.dist > 1e-5 ? cp.dist : 1
      const amount = cp.dist + r
      return { pushX: -(cp.dx / d) * amount, pushZ: -(cp.dz / d) * amount }
    }
    if (cp.dist >= r) return null
    const d = cp.dist > 1e-5 ? cp.dist : 1
    const overlap = r - cp.dist
    // cp.dx/d points from wall out to player — push further out by the
    // overlap to just graze the wall.
    return { pushX: (cp.dx / d) * overlap, pushZ: (cp.dz / d) * overlap }
  }
  // AABB fallback
  const b = buildings[bi]
  if (!b) return null
  const hx = b.width / 2 + r
  const hz = b.depth / 2 + r
  const ddx = px - b.x
  const ddz = pz - b.z
  if (Math.abs(ddx) >= hx || Math.abs(ddz) >= hz) return null
  const overlapX = hx - Math.abs(ddx)
  const overlapZ = hz - Math.abs(ddz)
  if (overlapX < overlapZ) {
    return { pushX: Math.sign(ddx) * overlapX, pushZ: 0 }
  }
  return { pushX: 0, pushZ: Math.sign(ddz) * overlapZ }
}

// Whether a circle at (px, pz) overlaps building `bi` at all.
// Cheaper than computing the exact push-out when the caller only needs a boolean.
export function circleHitsBuilding(
  bi: number,
  px: number,
  pz: number,
  r: number,
  buildings: BuildingAABBLike[],
): boolean {
  if (!_spatialGrid) return false
  const poly = _spatialGrid.polys[bi]
  if (poly) {
    if (px + r < poly.minX || px - r > poly.maxX || pz + r < poly.minZ || pz - r > poly.maxZ) {
      return false
    }
    const cp = closestPointOnPoly(poly.xs, poly.zs, px, pz)
    return cp.inside || cp.dist < r
  }
  const b = buildings[bi]
  if (!b) return false
  return (
    Math.abs(px - b.x) < b.width / 2 + r &&
    Math.abs(pz - b.z) < b.depth / 2 + r
  )
}

// Expose spatial grid getter for use in collision checks
let _spatialGrid: SpatialGrid | null = null

// ─── Building ─────────────────────────────────────────────────────────────────
// (Moved to InstancedLayers.tsx — per-mesh Building/Tree components removed.)


// ─── Road ─────────────────────────────────────────────────────────────────────
function RoadLayer({ roadPaths, roads: roadDefs }: {
  roadPaths: { x: number; z: number; angle: number }[][],
  roads: { width: number }[]
}) {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === "night"

  const roadShapes = useMemo(() => {
    const result: { key: string; shape: THREE.Shape; color: string }[] = []
    for (let ri = 0; ri < roadPaths.length; ri++) {
      const path = roadPaths[ri]
      if (path.length < 2) continue
      const width = roadDefs[ri]?.width ?? 10

      const leftEdge: THREE.Vector2[] = []
      const rightEdge: THREE.Vector2[] = []

      for (let i = 0; i < path.length; i++) {
        const pt = path[i]
        const perpX = Math.cos(pt.angle)
        const perpZ = -Math.sin(pt.angle)
        leftEdge.push(new THREE.Vector2(pt.x + perpX * width / 2, pt.z + perpZ * width / 2))
        rightEdge.push(new THREE.Vector2(pt.x - perpX * width / 2, pt.z - perpZ * width / 2))
      }

      const shape = new THREE.Shape()
      shape.moveTo(leftEdge[0].x, leftEdge[0].y)
      for (let i = 1; i < leftEdge.length; i++) {
        shape.lineTo(leftEdge[i].x, leftEdge[i].y)
      }
      for (let i = rightEdge.length - 1; i >= 0; i--) {
        shape.lineTo(rightEdge[i].x, rightEdge[i].y)
      }
      shape.closePath()

      result.push({ key: `road-${ri}`, shape, color: '#404050' })
    }
    return result
  }, [roadPaths, roadDefs])

  const roadLines = useMemo(() => {
    const lines: { x: number; z: number; angle: number }[] = []
    for (const road of roadPaths) {
      for (let i = 0; i < road.length; i += 4) {
        const pt = road[i]
        const nextPt = road[Math.min(i + 1, road.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        lines.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return lines
  }, [roadPaths])

  const lineColor = isNight ? '#ffdd00' : '#ffcc00'
  const lineEmissive = isNight ? '#ffaa00' : '#000000'
  const lineEmissiveInt = isNight ? 0.6 : 0

  return (
    <>
      {roadShapes.map(({ key, shape, color }) => (
        <mesh key={key} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
      {roadLines.map((line, i) => (
        <mesh key={`l-${i}`} position={[line.x, 0.03, line.z]} rotation={[-Math.PI / 2, 0, -line.angle]}>
          <planeGeometry args={[0.3, 4]} />
          <meshStandardMaterial
            color={lineColor}
            emissive={lineEmissive}
            emissiveIntensity={lineEmissiveInt}
          />
        </mesh>
      ))}
    </>
  )
}

// ─── Rail Track ───────────────────────────────────────────────────────────────
function RailLayer({ caltransPaths }: { caltransPaths: { x: number; z: number; angle: number }[][] }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  const tracks = useMemo(() => {
    const segments: { x: number; z: number; angle: number }[] = []
    for (const path of caltransPaths) {
      for (let i = 0; i < path.length; i += 3) {
        const pt = path[i]
        const nextPt = path[Math.min(i + 1, path.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        segments.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return segments
  }, [caltransPaths])

  const railColor = isNight ? '#666688' : '#888888'
  const steelEmissive = isNight ? '#334455' : '#000000'
  const steelEmissiveInt = isNight ? 0.3 : 0

  // Standard gauge: 1.435m between rails → ±0.72m from centerline
  const RAIL_HALF_GAUGE = 0.72

  return (
    <>
      {tracks.map((seg, i) => {
        const perpX = Math.cos(seg.angle)
        const perpZ = -Math.sin(seg.angle)
        const leftX = seg.x + perpX * RAIL_HALF_GAUGE
        const leftZ = seg.z + perpZ * RAIL_HALF_GAUGE
        const rightX = seg.x - perpX * RAIL_HALF_GAUGE
        const rightZ = seg.z - perpZ * RAIL_HALF_GAUGE
        return (
        <group key={i}>
          {/* Train bed / gravel */}
          <mesh position={[seg.x, 0.025, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[2.5, 14]} />
            <meshStandardMaterial color="#555555" roughness={0.95} />
          </mesh>
          {/* Left rail */}
          <mesh position={[leftX, 0.065, leftZ]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[0.08, 14]} />
            <meshStandardMaterial
              color={railColor}
              emissive={steelEmissive}
              emissiveIntensity={steelEmissiveInt}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {/* Right rail */}
          <mesh position={[rightX, 0.065, rightZ]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[0.08, 14]} />
            <meshStandardMaterial
              color={railColor}
              emissive={steelEmissive}
              emissiveIntensity={steelEmissiveInt}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {/* Cross ties every other segment */}
          {i % 2 === 0 && (
            <mesh position={[seg.x, 0.04, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
              <planeGeometry args={[2.0, 0.2]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </mesh>
          )}
        </group>
      )})}
    </>
  )
}

// ─── Street Lamp, Traffic Light, Crosswalk, Sidewalk ───────────────────────
// (Moved to InstancedLayers2.tsx — per-mesh components removed.)


// ─── Bus Stop ────────────────────────────────────────────────────────────────
function BusStop({ x, z }: { x: number; z: number; angle?: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
        <meshStandardMaterial color="#0055aa" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 3.0, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#0055aa" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Shelter roof */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Bench */}
      <mesh position={[0, 0.25, 0.2]}>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Bench legs */}
      <mesh position={[-0.6, 0.12, 0.2]}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.12, 0.2]}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BusStopsLayer({ busStops }: { busStops: { x: number; z: number; angle: number; name: string }[] }) {
  return (
    <>
      {busStops.map((s, i) => (
        <BusStop key={i} x={s.x} z={s.z} />
      ))}
    </>
  )
}

// ─── Parking Lot ─────────────────────────────────────────────────────────────
function ParkingLot({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
    </mesh>
  )
}

function ParkingLotsLayer({ parkingLots }: { parkingLots: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {parkingLots.map((l, i) => (
        <ParkingLot key={i} x={l.x} z={l.z} />
      ))}
    </>
  )
}

// ─── Fire Hydrant ────────────────────────────────────────────────────────────
function FireHydrant({ x, z }: { x: number; z: number }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.5, 8]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.2, 8]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[-0.15, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      {isNight && <pointLight position={[0, 0.5, 0]} color="#ff4444" intensity={0.5} distance={4} />}
    </group>
  )
}

function FireHydrantsLayer({ hydrants }: { hydrants: { x: number; z: number }[] }) {
  return (
    <>
      {hydrants.map((h, i) => (
        <FireHydrant key={i} x={h.x} z={h.z} />
      ))}
    </>
  )
}

// ─── Bench ─────────────────────────────────────────────────────────────────
function Bench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Seat */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.65, -0.15]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Legs */}
      {[-0.5, 0.5].map((lx, i) => (
        <mesh key={i} position={[lx, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.35]} />
          <meshStandardMaterial color="#444444" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function BenchesLayer({ benches }: { benches: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {benches.map((b, i) => (
        <Bench key={i} x={b.x} z={b.z} />
      ))}
    </>
  )
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground({ water }: { water: { x: number; z: number; width: number; height: number } }) {
  const groundColor = '#2a3a20'
  const waterColor = '#1a3a5a'
  // Large enough to cover the camera's 8000-unit far plane at any position
  const GROUND_SIZE = 20000

  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[water.x, -0.04, water.z]}>
        <planeGeometry args={[water.width, water.height]} />
        <meshStandardMaterial color={waterColor} roughness={0.3} metalness={0.1} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// ─── Main World ───────────────────────────────────────────────────────────────
export default function World() {
  const data = useLandscapeData()
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'

  // Build spatial grid once
  _spatialGrid = useMemo(() => buildSpatialGrid(data.buildings), [data])

  const skyProps = isNight
    ? { sunPosition: [-100, 20, -50] as [number,number,number], turbidity: 10, rayleigh: 0.5, mieCoefficient: 0.005, mieDirectionalG: 0.8 }
    : { sunPosition: [100, 80, -50] as [number,number,number], turbidity: 3, rayleigh: 0.5, mieCoefficient: 0.002, mieDirectionalG: 0.8 }

  return (
    <>
      <ambientLight intensity={isNight ? 0.4 : 3.0} />
      <directionalLight
        position={[100, 200, 80]}
        intensity={isNight ? 0.5 : 7.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-MAP_SIZE}
        shadow-camera-right={MAP_SIZE}
        shadow-camera-top={MAP_SIZE}
        shadow-camera-bottom={-MAP_SIZE}
      />
      <Sky {...skyProps} />

      <Ground water={data.water} />
      <RoadLayer roadPaths={data.roadPaths} roads={data.roads} />
      <RailLayer caltransPaths={data.caltransPaths} />
      <InstancedBuildings buildings={data.buildings} />
      <InstancedTrees trees={data.trees} />
      <InstancedLamps lamps={data.streetLamps} />
      <InstancedSidewalks sidewalks={data.sidewalks} />
      <InstancedCrosswalks crosswalks={data.crosswalks} />
      <BusStopsLayer busStops={data.busStops} />
      <ParkingLotsLayer parkingLots={data.parkingLots} />
      <FireHydrantsLayer hydrants={data.hydrants} />
      <BenchesLayer benches={data.benches} />
      <InstancedTrafficLights lights={data.trafficLights} />
      <BillboardLayer />
    </>
  )
}

// Export spatial grid getter for collision systems to use
export function getSpatialGrid() { return _spatialGrid }
export function getNearbyBuildingsGrid(px: number, pz: number, radius: number) {
  if (!_spatialGrid) return []
  return getNearbyBuildings(px, pz, _spatialGrid, radius)
}
