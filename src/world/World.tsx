// @simonsaysgivemesmile
import { useMemo, useRef, useLayoutEffect, useEffect, Component } from 'react'
import type { ReactNode } from 'react'
import { Sky, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

// Serve the Draco decoder from /public/draco/ instead of the default
// gstatic.com CDN. Two wins: (1) works offline and under strict CSPs,
// (2) no external network hop blocking the first paint of the scan map.
useGLTF.setDecoderPath('/draco/')
import * as THREE from 'three'
import { mergeBufferGeometries } from 'three-stdlib'
import { MeshBVH } from 'three-mesh-bvh'
import { useGameStore } from '../game/store'
import { MAP_SIZE } from '../game/constants'
import { default as BillboardLayer } from '../systems/billboards/BillboardLayer'
import { useLandscapeData } from '../game/LandscapeContext'
import type { BuildingData, ObjModelRef } from '../game/landscape.types'
import { InstancedBuildings, InstancedTrees } from './InstancedLayers'
import {
  InstancedLamps,
  InstancedTrafficLights,
  InstancedSidewalks,
  InstancedCrosswalks,
} from './InstancedLayers2'
import {
  InstancedBusStops,
  InstancedParkingLots,
  InstancedHydrants,
  InstancedBenches,
} from './InstancedProps'

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

// ─── BVH Collider (for static-mesh city models) ───────────────────────────────
// When a map ships with a detailed GLB (e.g. sf_obj), buildings is empty and
// colliders come from a MeshBVH built over the loaded geometry instead.
// Player/NPC/Vehicle circle checks consult this BVH alongside the spatial grid.
interface MeshCollider {
  bvh: MeshBVH
  worldMatrix: THREE.Matrix4
  inverseMatrix: THREE.Matrix4
  yMin: number  // world-space bounds of the collider — cheap early-out
  yMax: number
}

let _meshCollider: MeshCollider | null = null

export function setMeshCollider(mc: MeshCollider | null) {
  _meshCollider = mc
}

// Scratch objects reused between calls to avoid GC churn in the hot collision loop.
const _scratchBox = new THREE.Box3()
const _scratchMin = new THREE.Vector3()
const _scratchMax = new THREE.Vector3()
const _scratchPoint = new THREE.Vector3()
const _scratchTarget = new THREE.Vector3()
const _scratchLocal = new THREE.Vector3()
const _scratchWorld = new THREE.Vector3()

// Typical player/vehicle center heights we want to collide at. We test a
// short vertical pillar instead of a 2D circle so the BVH only considers
// triangles at body height (most of the mesh is ground or rooftop, which
// shouldn't block horizontal movement).
const BVH_CHECK_Y_LO = 0.2
const BVH_CHECK_Y_HI = 2.5

export function meshColliderHitsCircle(px: number, pz: number, r: number): boolean {
  if (!_meshCollider) return false
  const mc = _meshCollider
  // Box covering the circle × player-height span in world space.
  _scratchMin.set(px - r, BVH_CHECK_Y_LO, pz - r)
  _scratchMax.set(px + r, BVH_CHECK_Y_HI, pz + r)
  _scratchBox.set(_scratchMin, _scratchMax)
  // Transform into the collider's local space.
  _scratchBox.applyMatrix4(mc.inverseMatrix)
  return mc.bvh.intersectsBox(_scratchBox, mc.inverseMatrix)
}

export function meshColliderPushOutCircle(
  px: number,
  pz: number,
  r: number,
): BuildingPushOut | null {
  if (!_meshCollider) return null
  const mc = _meshCollider
  // Early reject via box test so we skip the (slightly) pricier closest-point
  // search when the player isn't near anything.
  if (!meshColliderHitsCircle(px, pz, r)) return null
  // Work at body height; query in the collider's local space.
  _scratchWorld.set(px, (BVH_CHECK_Y_LO + BVH_CHECK_Y_HI) / 2, pz)
  _scratchLocal.copy(_scratchWorld).applyMatrix4(mc.inverseMatrix)
  const hit = mc.bvh.closestPointToPoint(_scratchLocal, { point: _scratchPoint, distance: 0, faceIndex: -1 })
  if (!hit) return null
  // Back to world space.
  _scratchTarget.copy(_scratchPoint).applyMatrix4(mc.worldMatrix)
  const dx = px - _scratchTarget.x
  const dz = pz - _scratchTarget.z
  const distSq = dx * dx + dz * dz
  if (distSq >= r * r) return null
  const dist = Math.sqrt(distSq)
  const overlap = r - dist
  const d = dist > 1e-5 ? dist : 1
  return { pushX: (dx / d) * overlap, pushZ: (dz / d) * overlap }
}

// ─── Building ─────────────────────────────────────────────────────────────────
// (Moved to InstancedLayers.tsx — per-mesh Building/Tree components removed.)


// ─── Road ─────────────────────────────────────────────────────────────────────
function RoadLayer({ roadPaths, roads: roadDefs }: {
  roadPaths: { x: number; z: number; angle: number }[][],
  roads: { width: number }[]
}) {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === "night"

  // Merge all road polygons into ONE BufferGeometry — 1 draw call for
  // every street, instead of N shape-meshes.
  const mergedRoadGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []
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
      for (let i = 1; i < leftEdge.length; i++) shape.lineTo(leftEdge[i].x, leftEdge[i].y)
      for (let i = rightEdge.length - 1; i >= 0; i--) shape.lineTo(rightEdge[i].x, rightEdge[i].y)
      shape.closePath()
      const g = new THREE.ShapeGeometry(shape)
      g.rotateX(-Math.PI / 2)
      g.translate(0, 0.02, 0)
      geos.push(g)
    }
    if (geos.length === 0) return null
    const merged = mergeBufferGeometries(geos, false)
    for (const g of geos) g.dispose()
    return merged
  }, [roadPaths, roadDefs])

  // Instanced lane stripes — one draw for all of them.
  const lineData = useMemo(() => {
    const out: { x: number; z: number; angle: number }[] = []
    for (const road of roadPaths) {
      for (let i = 0; i < road.length; i += 4) {
        const pt = road[i]
        const nextPt = road[Math.min(i + 1, road.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        out.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return out
  }, [roadPaths])

  const lineRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = lineRef.current
    if (!mesh) return
    const tm = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < lineData.length; i++) {
      const l = lineData[i]
      e.set(-Math.PI / 2, 0, -l.angle, 'XYZ')
      q.setFromEuler(e)
      p.set(l.x, 0.03, l.z)
      tm.compose(p, q, s)
      mesh.setMatrixAt(i, tm)
    }
    mesh.count = lineData.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
  }, [lineData])

  const lineColor = isNight ? '#ffdd00' : '#ffcc00'
  const lineEmissive = isNight ? '#ffaa00' : '#000000'
  const lineEmissiveInt = isNight ? 0.6 : 0

  return (
    <>
      {mergedRoadGeo && (
        <mesh geometry={mergedRoadGeo} frustumCulled={false}>
          <meshStandardMaterial color="#404050" roughness={0.95} />
        </mesh>
      )}
      {lineData.length > 0 && (
        <instancedMesh
          ref={lineRef}
          args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, lineData.length]}
          frustumCulled={false}
        >
          <planeGeometry args={[0.3, 4]} />
          <meshStandardMaterial color={lineColor} emissive={lineEmissive} emissiveIntensity={lineEmissiveInt} />
        </instancedMesh>
      )}
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
// ─── Bus Stop / Parking Lot / Fire Hydrant / Bench ────────────────────────
// (Moved to InstancedProps.tsx — per-mesh components removed.)


// ─── Ground ───────────────────────────────────────────────────────────────────
// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground({ water }: { water: { x: number; z: number; width: number; height: number } }) {
  const groundColor = '#2a3a20'
  const waterColor = '#1a3a5a'
  // The ground follows the camera in X/Z so its far edge never enters view
  // — otherwise players past the map center would see drei's Sky horizon
  // through the gap and the world appears to "go dark" at distance.
  const GROUND_SIZE = 24000
  const groundRef = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    if (groundRef.current) {
      groundRef.current.position.x = camera.position.x
      groundRef.current.position.z = camera.position.z
    }
  })

  return (
    <>
      {/* Main ground — tracks the camera */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      {/* Water — stays world-anchored; skipped for scan maps that bake in their own water */}
      {water.width > 0 && water.height > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[water.x, -0.04, water.z]}>
          <planeGeometry args={[water.width, water.height]} />
          <meshStandardMaterial color={waterColor} roughness={0.3} metalness={0.1} transparent opacity={0.85} />
        </mesh>
      )}
    </>
  )
}

// ─── OBJ / GLB City Model ─────────────────────────────────────────────────────
// Loads a pre-converted GLB and builds a MeshBVH from its merged geometry so
// the player can collide against real building walls instead of OSM polygon
// extrusions. Typical use: a detailed SF city scan (public/models/sf_obj).
//
// Wrapped in GlbErrorBoundary below so a load failure (missing file, decoder
// error, corrupted bytes) doesn't blank the entire world.
function ObjCityModelInner({ model }: { model: ObjModelRef }) {
  const gltf = useGLTF(model.url)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!gltf || !groupRef.current) return
    const group = groupRef.current

    const geos: THREE.BufferGeometry[] = []
    let meshCount = 0
    gltf.scene.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh && m.geometry) {
        meshCount++
        // Clone so we can strip mismatched attributes without mutating the
        // shared gltf cache (re-entries would blow up otherwise).
        const g = m.geometry.clone()
        const pos = g.getAttribute('position')
        if (!pos) return
        const stripped = new THREE.BufferGeometry()
        stripped.setAttribute('position', pos.clone())
        if (g.index) stripped.setIndex(g.index.clone())
        geos.push(stripped)
      }
    })
    console.info(`[ObjCityModel] ${model.url}: ${meshCount} meshes, ${geos.length} with positions`)
    if (geos.length === 0) {
      console.warn('[ObjCityModel] no geometry — BVH collider skipped')
      return
    }

    const merged = mergeBufferGeometries(geos, false)
    for (const g of geos) g.dispose()
    if (!merged) {
      console.warn('[ObjCityModel] merge failed — BVH collider skipped')
      return
    }

    const bvh = new MeshBVH(merged)
    group.updateMatrixWorld(true)
    const worldMatrix = group.matrixWorld.clone()
    const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert()
    merged.computeBoundingBox()
    const bb = merged.boundingBox || new THREE.Box3()
    const yMin = bb.min.y * model.scale + model.offsetY
    const yMax = bb.max.y * model.scale + model.offsetY

    console.info(`[ObjCityModel] BVH built; world y bounds [${yMin.toFixed(1)}, ${yMax.toFixed(1)}]`)
    setMeshCollider({ bvh, worldMatrix, inverseMatrix, yMin, yMax })
    return () => {
      setMeshCollider(null)
      merged.dispose()
    }
  }, [gltf, model.url, model.scale, model.offsetY])

  return (
    <group
      ref={groupRef}
      position={[model.offsetX, model.offsetY, model.offsetZ]}
      scale={model.scale}
    >
      <primitive object={gltf.scene} />
    </group>
  )
}

// Catch GLB load / decode failures. The fallback is null — road network and
// props keep rendering so the user isn't staring at a blank scene while they
// look at the devtools console for the real error.
class GlbErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(err: Error) {
    console.error('[ObjCityModel] GLB failed to load:', err)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

function ObjCityModel({ model }: { model: ObjModelRef }) {
  return (
    <GlbErrorBoundary>
      <ObjCityModelInner model={model} />
    </GlbErrorBoundary>
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

  // When the map ships a static-mesh city (OBJ/GLB scan), the visual world
  // is entirely inside that mesh — roads, sidewalks, crosswalks, trees, and
  // curb furniture are all baked into the texture atlas. Drawing OSM
  // overlays on top double-draws every feature and causes z-fighting. In
  // this mode we skip the overlays and just render sky + lights + the mesh.
  const useObjWorld = !!data.objModel

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

      {data.objModel && <ObjCityModel model={data.objModel} />}
      {/* Render ground for every map — OBJ scans have finite extents and
          without a backstop plane the horizon reveals the Sky dome at a
          dark grazing angle, reading as "lighting falloff" at distance. */}
      {useObjWorld && <Ground water={{ x: 0, z: 0, width: 0, height: 0 }} />}

      {!useObjWorld && <Ground water={data.water} />}
      {!useObjWorld && <RoadLayer roadPaths={data.roadPaths} roads={data.roads} />}
      {!useObjWorld && <RailLayer caltransPaths={data.caltransPaths} />}
      {!useObjWorld && <InstancedBuildings buildings={data.buildings} />}
      {!useObjWorld && <InstancedTrees trees={data.trees} />}
      {!useObjWorld && <InstancedLamps lamps={data.streetLamps} />}
      {!useObjWorld && <InstancedSidewalks sidewalks={data.sidewalks} />}
      {!useObjWorld && <InstancedCrosswalks crosswalks={data.crosswalks} />}
      {!useObjWorld && <InstancedBusStops busStops={data.busStops} />}
      {!useObjWorld && <InstancedParkingLots lots={data.parkingLots} />}
      {!useObjWorld && <InstancedHydrants hydrants={data.hydrants} />}
      {!useObjWorld && <InstancedBenches benches={data.benches} />}
      {!useObjWorld && <InstancedTrafficLights lights={data.trafficLights} />}
      {!useObjWorld && <BillboardLayer />}
    </>
  )
}

// Export spatial grid getter for collision systems to use
export function getSpatialGrid() { return _spatialGrid }
export function getNearbyBuildingsGrid(px: number, pz: number, radius: number) {
  if (!_spatialGrid) return []
  return getNearbyBuildings(px, pz, _spatialGrid, radius)
}
