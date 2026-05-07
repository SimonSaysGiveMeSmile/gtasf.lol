// Instanced small street props: bus stops, hydrants, benches, parking lots.
import { useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

function compose(
  out: THREE.Matrix4,
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  sx: number = 1, sy: number = 1, sz: number = 1
) {
  _e.set(rx, ry, rz, 'XYZ')
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(sx, sy, sz)
  out.compose(_p, _q, _s)
  return out
}

// ── Bus Stops ──────────────────────────────────────────────────────────
// 7 meshes per bus stop → 7 InstancedMesh draws regardless of count.
export function InstancedBusStops({ busStops }: { busStops: { x: number; z: number; angle?: number; name?: string }[] }) {
  const n = busStops.length
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const signRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)
  const benchRef = useRef<THREE.InstancedMesh>(null)
  const legLRef = useRef<THREE.InstancedMesh>(null)
  const legRRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const refs = [poleRef, signRef, roofRef, benchRef, legLRef, legRRef]
    if (refs.some((r) => !r.current)) return
    for (let i = 0; i < n; i++) {
      const b = busStops[i]
      compose(_m, b.x, 1.5, b.z, 0, 0, 0)
      poleRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x, 3.0, b.z, 0, 0, 0)
      signRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x, 2.6, b.z, 0, 0, 0)
      roofRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x, 0.25, b.z + 0.2, 0, 0, 0)
      benchRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x - 0.6, 0.12, b.z + 0.2, 0, 0, 0)
      legLRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x + 0.6, 0.12, b.z + 0.2, 0, 0, 0)
      legRRef.current!.setMatrixAt(i, _m)
    }
    for (const r of refs) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [busStops, n])

  if (n === 0) return null
  const g = undefined as unknown as THREE.BufferGeometry
  const M = undefined as unknown as THREE.Material
  return (
    <>
      <instancedMesh ref={poleRef} args={[g, M, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
        <meshStandardMaterial color="#0055aa" metalness={0.3} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={signRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#0055aa" metalness={0.2} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.3} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={benchRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={legLRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={legRRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </instancedMesh>
    </>
  )
}

// ── Parking Lots ──────────────────────────────────────────────────────
export function InstancedParkingLots({ lots }: { lots: { x: number; z: number }[] }) {
  const n = lots.length
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < n; i++) {
      compose(_m, lots[i].x, 0.015, lots[i].z, -Math.PI / 2, 0, 0, 18, 18, 1)
      mesh.setMatrixAt(i, _m)
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
  }, [lots, n])
  if (n === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
    </instancedMesh>
  )
}

// ── Fire Hydrants ────────────────────────────────────────────────────
export function InstancedHydrants({ hydrants }: { hydrants: { x: number; z: number }[] }) {
  const n = hydrants.length
  const baseRef = useRef<THREE.InstancedMesh>(null)
  const topRef = useRef<THREE.InstancedMesh>(null)
  const capRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const refs = [baseRef, topRef, capRef]
    if (refs.some((r) => !r.current)) return
    for (let i = 0; i < n; i++) {
      const h = hydrants[i]
      compose(_m, h.x, 0.35, h.z, 0, 0, 0)
      baseRef.current!.setMatrixAt(i, _m)
      compose(_m, h.x, 0.75, h.z, 0, 0, 0)
      topRef.current!.setMatrixAt(i, _m)
      compose(_m, h.x, 0.95, h.z, 0, 0, 0)
      capRef.current!.setMatrixAt(i, _m)
    }
    for (const r of refs) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [hydrants, n])
  if (n === 0) return null
  const g = undefined as unknown as THREE.BufferGeometry
  const M = undefined as unknown as THREE.Material
  return (
    <>
      <instancedMesh ref={baseRef} args={[g, M, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.22, 0.25, 0.7, 8]} />
        <meshStandardMaterial color="#cc2200" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={topRef} args={[g, M, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.18, 0.18, 0.1, 8]} />
        <meshStandardMaterial color="#ffaa00" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[g, M, n]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color="#cc2200" roughness={0.7} />
      </instancedMesh>
    </>
  )
}

// ── Benches ──────────────────────────────────────────────────────────
export function InstancedBenches({ benches }: { benches: { x: number; z: number; angle: number }[] }) {
  const n = benches.length
  const seatRef = useRef<THREE.InstancedMesh>(null)
  const backRef = useRef<THREE.InstancedMesh>(null)
  const legLRef = useRef<THREE.InstancedMesh>(null)
  const legRRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const refs = [seatRef, backRef, legLRef, legRRef]
    if (refs.some((r) => !r.current)) return
    for (let i = 0; i < n; i++) {
      const b = benches[i]
      const ry = -b.angle
      const cos = Math.cos(ry), sin = Math.sin(ry)
      // seat: local (0, 0.4, 0)
      compose(_m, b.x, 0.4, b.z, 0, ry, 0)
      seatRef.current!.setMatrixAt(i, _m)
      // back: local (0, 0.75, -0.25) rotated by ry
      const bx = -0.25 * sin, bz = -0.25 * cos
      compose(_m, b.x + bx, 0.75, b.z + bz, 0, ry, 0)
      backRef.current!.setMatrixAt(i, _m)
      // legs: local (-0.7, 0.2, 0) and (0.7, 0.2, 0)
      const lx = -0.7 * cos, lz = 0.7 * sin
      compose(_m, b.x + lx, 0.2, b.z + lz, 0, ry, 0)
      legLRef.current!.setMatrixAt(i, _m)
      compose(_m, b.x - lx, 0.2, b.z - lz, 0, ry, 0)
      legRRef.current!.setMatrixAt(i, _m)
    }
    for (const r of refs) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [benches, n])
  if (n === 0) return null
  const g = undefined as unknown as THREE.BufferGeometry
  const M = undefined as unknown as THREE.Material
  return (
    <>
      <instancedMesh ref={seatRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.08, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={backRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={legLRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.4, 0.4]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={legRRef} args={[g, M, n]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.4, 0.4]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </instancedMesh>
    </>
  )
}
