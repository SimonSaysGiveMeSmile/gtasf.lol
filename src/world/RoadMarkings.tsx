// Road markings for the OSM street grid: edge lines, centre lines (single
// dashed or double yellow by width), dashed white lane dividers, stop bars
// and zebra crosswalks — all laid out along the road direction and cut out
// of intersections so lines never run across a junction.
//
// Everything is baked once into two InstancedMeshes (white, yellow), each
// instance being a unit plane scaled to (across, along) metres.
//
// Orientation note: a flat unit plane must be rotated with Euler order
// 'YXZ' = (−π/2, yaw, 0). The older 'XYZ' = (−π/2, 0, −yaw) order only
// points the plane along the road for axis-aligned streets, which is why
// every marking on SF's rotated grid used to look skewed.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { PathPoint, RoadData, CrosswalkData } from '../game/landscape.types'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

/** Flat marking matrix: centre (x,z), road yaw `a` (forward = sin a, cos a), size across × along. */
export function flatMatrix(out: THREE.Matrix4, x: number, y: number, z: number, a: number, across: number, along: number) {
  _e.set(-Math.PI / 2, a + Math.PI, 0, 'YXZ')
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(across, along, 1)
  return out.compose(_p, _q, _s)
}

type Sample = { x: number; z: number; a: number; s: number; road: number }
type Mark = { x: number; z: number; a: number; w: number; l: number }

const STEP = 2            // metres between path samples
const Y_LINE = 0.045      // just above road (0.02) and sidewalks (0.03)
const Y_ZEBRA = 0.042
const CELL = 10

function resample(path: PathPoint[]): Sample[] {
  const out: Sample[] = []
  if (path.length < 2) return out
  let s = 0
  let carry = 0
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i], p1 = path[i + 1]
    const dx = p1.x - p0.x, dz = p1.z - p0.z
    const len = Math.hypot(dx, dz)
    if (len < 1e-3) continue
    const a = Math.atan2(dx, dz)
    let t = carry
    while (t <= len) {
      out.push({ x: p0.x + dx * (t / len), z: p0.z + dz * (t / len), a, s: s + t, road: -1 })
      t += STEP
    }
    carry = t - len
    s += len
  }
  return out
}

function laneLayout(w: number) {
  // Returns null for alleys; otherwise the marking recipe for this width.
  if (w < 7.5) return null
  const edge = w >= 9
  const centre: 'none' | 'dashed' | 'double' = w < 9 ? 'none' : w < 11 ? 'dashed' : 'double'
  const lanesPerDir = w >= 15 ? Math.max(2, Math.round(w / 2 / 3.6)) : 1
  const dividers: number[] = []
  if (lanesPerDir > 1) {
    const lw = w / 2 / lanesPerDir
    for (let k = 1; k < lanesPerDir; k++) dividers.push(k * lw)
  }
  return { edge, centre, dividers }
}

export function buildRoadMarkings(roadPaths: PathPoint[][], roads: RoadData[], osmCrosswalks: CrosswalkData[]) {
  const white: Mark[] = []
  const yellow: Mark[] = []

  // 1. Sample every road and index samples in a grid for junction tests.
  const samples: Sample[][] = []
  const halfW: number[] = []
  const grid = new Map<string, Sample[]>()
  const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`
  for (let r = 0; r < roadPaths.length; r++) {
    const w = roads[r]?.width ?? 10
    halfW[r] = w / 2
    const ss = resample(roadPaths[r])
    for (const s of ss) {
      s.road = r
      const k = key(s.x, s.z)
      let arr = grid.get(k)
      if (!arr) { arr = []; grid.set(k, arr) }
      arr.push(s)
    }
    samples[r] = ss
  }

  // Does another road *cross* the road at this sample? (A road that merely
  // ends here — a T-junction's stem — leaves the through road's lines intact.)
  const crossedAt = (p: Sample): boolean => {
    const cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL)
    const rx = -Math.cos(p.a), rz = Math.sin(p.a) // right-hand perpendicular
    let minOff = Infinity, maxOff = -Infinity, hit = false
    for (let gx = cx - 2; gx <= cx + 2; gx++) {
      for (let gz = cz - 2; gz <= cz + 2; gz++) {
        const arr = grid.get(`${gx},${gz}`)
        if (!arr) continue
        for (const o of arr) {
          if (o.road === p.road) continue
          const dx = o.x - p.x, dz = o.z - p.z
          const d = Math.hypot(dx, dz)
          if (d > halfW[o.road] + 1.2) continue
          // Roughly parallel neighbours are the same street continuing.
          let da = Math.abs(o.a - p.a) % Math.PI
          if (da > Math.PI / 2) da = Math.PI - da
          if (da < 0.45) continue
          hit = true
          const off = dx * rx + dz * rz
          if (off < minOff) minOff = off
          if (off > maxOff) maxOff = off
        }
      }
    }
    return hit && minOff < -1.2 && maxOff > 1.2
  }

  const autoCrosswalks: { x: number; z: number; a: number; w: number }[] = []

  for (let r = 0; r < roadPaths.length; r++) {
    const ss = samples[r]
    if (ss.length < 2) continue
    const w = halfW[r] * 2
    const layout = laneLayout(w)
    const masked = ss.map(crossedAt)

    // Widen the mask by the approach zone (crosswalk + stop bar) and emit
    // stop bars / crosswalks at each approach.
    const APPROACH = 5 // metres of no lane lines before a junction
    const blocked = masked.slice()
    for (let i = 0; i < ss.length; i++) {
      if (!masked[i]) continue
      const entering = i > 0 && !masked[i - 1]
      const leaving = i < ss.length - 1 && !masked[i + 1]
      if (entering) {
        // Forward traffic approaches this junction.
        for (let j = i - 1; j >= 0 && ss[i].s - ss[j].s < APPROACH; j--) blocked[j] = true
        if (w >= 9 && ss[i].s > APPROACH) {
          const p = ss[i]
          const fx = Math.sin(p.a), fz = Math.cos(p.a)
          const rx = -Math.cos(p.a), rz = Math.sin(p.a)
          autoCrosswalks.push({ x: p.x - fx * 2.0, z: p.z - fz * 2.0, a: p.a, w })
          // Stop bar on the right half (US: drive on the right).
          const sx = p.x - fx * 4.1 + rx * (w / 4), sz = p.z - fz * 4.1 + rz * (w / 4)
          white.push({ x: sx, z: sz, a: p.a, w: w / 2 - 0.3, l: 0.5 })
        }
      }
      if (leaving) {
        for (let j = i + 1; j < ss.length && ss[j].s - ss[i].s < APPROACH; j++) blocked[j] = true
        if (w >= 9 && ss[ss.length - 1].s - ss[i].s > APPROACH) {
          const p = ss[i]
          const fx = Math.sin(p.a), fz = Math.cos(p.a)
          const rx = -Math.cos(p.a), rz = Math.sin(p.a)
          autoCrosswalks.push({ x: p.x + fx * 2.0, z: p.z + fz * 2.0, a: p.a, w })
          // Opposing traffic approaches from ahead: its right is our left.
          const sx = p.x + fx * 4.1 - rx * (w / 4), sz = p.z + fz * 4.1 - rz * (w / 4)
          white.push({ x: sx, z: sz, a: p.a, w: w / 2 - 0.3, l: 0.5 })
        }
      }
    }

    if (!layout) continue

    // Runs of unblocked samples → line segments.
    let runStart = -1
    const flush = (i0: number, i1: number) => {
      if (i1 - i0 < 1) return
      const s0 = ss[i0].s, s1 = ss[i1].s
      const emitSolid = (offset: number, list: Mark[], width: number) => {
        for (let i = i0; i < i1; i++) {
          const p = ss[i], n = ss[i + 1]
          const mx = (p.x + n.x) / 2, mz = (p.z + n.z) / 2
          const len = Math.hypot(n.x - p.x, n.z - p.z) + 0.05
          const a = Math.atan2(n.x - p.x, n.z - p.z)
          const rx = -Math.cos(a), rz = Math.sin(a)
          list.push({ x: mx + rx * offset, z: mz + rz * offset, a, w: width, l: len })
        }
      }
      const emitDashed = (offset: number, list: Mark[], width: number, dash: number, gap: number) => {
        // March along the run in (dash+gap) steps, placing a dash centred on each.
        for (let d = s0 + gap / 2; d + dash <= s1; d += dash + gap) {
          // Find the sample segment containing d.
          let i = i0
          while (i < i1 && ss[i + 1].s < d) i++
          const p = ss[i], n = ss[Math.min(i + 1, i1)]
          const segLen = Math.max(1e-3, n.s - p.s)
          const t = Math.min(1, Math.max(0, (d + dash / 2 - p.s) / segLen))
          const x = p.x + (n.x - p.x) * t, z = p.z + (n.z - p.z) * t
          const a = Math.atan2(n.x - p.x, n.z - p.z)
          const rx = -Math.cos(a), rz = Math.sin(a)
          list.push({ x: x + rx * offset, z: z + rz * offset, a, w: width, l: dash })
        }
      }
      if (layout.edge) {
        emitSolid(w / 2 - 0.35, white, 0.12)
        emitSolid(-(w / 2 - 0.35), white, 0.12)
      }
      if (layout.centre === 'dashed') emitDashed(0, yellow, 0.12, 3, 6)
      else if (layout.centre === 'double') {
        emitSolid(0.14, yellow, 0.1)
        emitSolid(-0.14, yellow, 0.1)
      }
      for (const off of layout.dividers) {
        emitDashed(off, white, 0.12, 3, 6)
        emitDashed(-off, white, 0.12, 3, 6)
      }
    }
    for (let i = 0; i <= ss.length; i++) {
      const open = i < ss.length && !blocked[i]
      if (open && runStart < 0) runStart = i
      if (!open && runStart >= 0) { flush(runStart, i - 1); runStart = -1 }
    }
  }

  // 2. Zebra crosswalks: generated ones at junction approaches plus OSM
  //    crossing nodes that aren't already covered.
  const zebra: Mark[] = []
  const addZebra = (x: number, z: number, a: number, w: number) => {
    const n = Math.max(3, Math.floor((w - 1) / 1.1))
    const rx = -Math.cos(a), rz = Math.sin(a)
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 1.1
      zebra.push({ x: x + rx * off, z: z + rz * off, a, w: 0.55, l: 3 })
    }
  }
  for (const c of autoCrosswalks) addZebra(c.x, c.z, c.a, c.w)
  const nearestRoadWidth = (x: number, z: number): number => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
    let best = Infinity, bw = 10
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
      const arr = grid.get(`${gx},${gz}`)
      if (!arr) continue
      for (const o of arr) {
        const d = Math.hypot(o.x - x, o.z - z)
        if (d < best) { best = d; bw = halfW[o.road] * 2 }
      }
    }
    return bw
  }
  for (const c of osmCrosswalks) {
    let covered = false
    for (const a of autoCrosswalks) {
      if (Math.hypot(a.x - c.x, a.z - c.z) < 9) { covered = true; break }
    }
    if (covered) continue
    const w = nearestRoadWidth(c.x, c.z)
    if (w < 7.5) continue
    addZebra(c.x, c.z, c.angle, w)
  }

  return { white, yellow, zebra }
}

function MarkLayer({ marks, color, y, emissive, emissiveIntensity }: {
  marks: Mark[]; color: string; y: number; emissive: string; emissiveIntensity: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const n = marks.length
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < n; i++) {
      const m = marks[i]
      mesh.setMatrixAt(i, flatMatrix(_m, m.x, y, m.z, m.a, m.w, m.l))
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
  }, [marks, n, y])
  if (n === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} roughness={0.75} emissive={emissive} emissiveIntensity={emissiveIntensity} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </instancedMesh>
  )
}

export default function RoadMarkings({ roadPaths, roads, crosswalks }: {
  roadPaths: PathPoint[][]; roads: RoadData[]; crosswalks: CrosswalkData[]
}) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')
  const { white, yellow, zebra } = useMemo(
    () => buildRoadMarkings(roadPaths, roads, crosswalks),
    [roadPaths, roads, crosswalks],
  )
  const emW = isNight ? '#ffffff' : '#000000'
  const emY = isNight ? '#ffcc33' : '#000000'
  const ei = isNight ? 0.35 : 0
  return (
    <>
      <MarkLayer marks={white} color="#e9e9e4" y={Y_LINE} emissive={emW} emissiveIntensity={ei} />
      <MarkLayer marks={yellow} color="#e8b923" y={Y_LINE} emissive={emY} emissiveIntensity={ei} />
      <MarkLayer marks={zebra} color="#f0f0ea" y={Y_ZEBRA} emissive={emW} emissiveIntensity={ei} />
    </>
  )
}
