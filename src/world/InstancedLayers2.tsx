// Additional instanced layers: lamps, traffic lights, crosswalks, sidewalks.
import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { knockedLamps, lampState } from '../game/vehicleState'
import { flatMatrix } from './RoadMarkings'
import type {
  LampData, TrafficLightData, SidewalkData,
} from '../game/landscape.types'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

function compose(
  out: THREE.Matrix4,
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number
) {
  _e.set(rx, ry, rz, 'XYZ')
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(sx, sy, sz)
  out.compose(_p, _q, _s)
  return out
}

// ── Street Lamps ─────────────────────────────────────────────────────────
// Pole + arm + head per lamp → 3 InstancedMesh draws instead of 3×N meshes.
// Point lights at night are a killer — forward-rendered per-vertex — so they
// are capped to the N lamps nearest the player.
export function InstancedLamps({ lamps }: { lamps: LampData[] }) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')
  const playerPos = useGameStore((s) => s.playerPosition)

  const n = lamps.length
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const armRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!poleRef.current || !armRef.current || !headRef.current) return
    for (let i = 0; i < n; i++) {
      const l = lamps[i]
      compose(_m, l.x, 3, l.z, 0, 0, 0, 1, 1, 1)
      poleRef.current.setMatrixAt(i, _m)
      compose(_m, l.x + 0.8, 5.8, l.z, 0, 0, Math.PI / 2, 1, 1, 1)
      armRef.current.setMatrixAt(i, _m)
      compose(_m, l.x + 1.6, 5.7, l.z, 0, 0, 0, 1, 1, 1)
      headRef.current.setMatrixAt(i, _m)
    }
    for (const r of [poleRef, armRef, headRef]) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [lamps, n])

  // Lay knocked-over poles on the ground (see vehicleState.knockedLamps).
  const seenVersion = useRef(-1)
  useFrame(() => {
    if (seenVersion.current === lampState.v) return
    if (!poleRef.current || !armRef.current || !headRef.current) return
    seenVersion.current = lampState.v
    for (const i of knockedLamps) {
      if (i >= n) continue
      const l = lamps[i]
      compose(_m, l.x + 2.9, 0.22, l.z + 0.4, 0.12, 0, Math.PI / 2 - 0.06, 1, 1, 1)
      poleRef.current.setMatrixAt(i, _m)
      compose(_m, l.x + 6.0, 0.3, l.z + 0.4, 0, 0, 0, 1, 1, 1)
      armRef.current.setMatrixAt(i, _m)
      compose(_m, l.x + 6.6, 0.2, l.z + 0.4, 0, 0, 0.3, 1, 1, 1)
      headRef.current.setMatrixAt(i, _m)
    }
    for (const r of [poleRef, armRef, headRef]) r.current!.instanceMatrix.needsUpdate = true
  })

  const nearest = useMemo(() => {
    if (!isNight) return [] as LampData[]
    const MAX_LAMPS = 8
    const pxv = playerPos[0], pzv = playerPos[2]
    const scored: { d: number; l: LampData }[] = []
    for (const l of lamps) {
      const dx = l.x - pxv, dz = l.z - pzv
      const d = dx * dx + dz * dz
      if (d < 40 * 40) scored.push({ d, l })
    }
    scored.sort((a, b) => a.d - b.d)
    return scored.slice(0, MAX_LAMPS).map((s) => s.l)
  }, [isNight, lamps, Math.round(playerPos[0] / 10), Math.round(playerPos[2] / 10)])

  if (n === 0) return null
  return (
    <>
      <instancedMesh ref={poleRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.08, 0.1, 6, 6]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#ffffee"
          emissive={isNight ? '#ffffaa' : '#000000'}
          emissiveIntensity={isNight ? 2 : 0}
          roughness={0.5}
        />
      </instancedMesh>
      {nearest.map((l, i) => (
        <pointLight
          key={`lamp-${l.x}-${l.z}-${i}`}
          position={[l.x + 1.6, 5.5, l.z]}
          color="#ffeeaa"
          intensity={6}
          distance={25}
        />
      ))}
    </>
  )
}

// ── Traffic Lights ──────────────────────────────────────────────────────
// 5 instanced parts: pole, housing, red/yellow/green bulbs.
export function InstancedTrafficLights({ lights }: { lights: TrafficLightData[] }) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')
  const n = lights.length
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const housingRef = useRef<THREE.InstancedMesh>(null)
  const redRef = useRef<THREE.InstancedMesh>(null)
  const yellowRef = useRef<THREE.InstancedMesh>(null)
  const greenRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const refs = [poleRef, housingRef, redRef, yellowRef, greenRef]
    if (refs.some((r) => !r.current)) return
    for (let i = 0; i < n; i++) {
      const l = lights[i]
      const ry = -(l.angle || 0)
      // Pole
      compose(_m, l.x, 2.5, l.z, 0, ry, 0, 1, 1, 1)
      poleRef.current!.setMatrixAt(i, _m)
      // Housing (local (0, 4.8, 0) rotated by ry about world Y, translated by (l.x,_,l.z))
      compose(_m, l.x, 4.8, l.z, 0, ry, 0, 1, 1, 1)
      housingRef.current!.setMatrixAt(i, _m)
      // Bulbs: local offsets rotated by ry
      const offX = 0, offZ = 0.11
      const cos = Math.cos(ry), sin = Math.sin(ry)
      const rx = offX * cos + offZ * sin
      const rz = -offX * sin + offZ * cos
      compose(_m, l.x + rx, 5.0, l.z + rz, 0, ry, 0, 1, 1, 1)
      redRef.current!.setMatrixAt(i, _m)
      compose(_m, l.x + rx, 4.8, l.z + rz, 0, ry, 0, 1, 1, 1)
      yellowRef.current!.setMatrixAt(i, _m)
      compose(_m, l.x + rx, 4.6, l.z + rz, 0, ry, 0, 1, 1, 1)
      greenRef.current!.setMatrixAt(i, _m)
    }
    for (const r of refs) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [lights, n])

  if (n === 0) return null
  return (
    <>
      <instancedMesh ref={poleRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={housingRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <boxGeometry args={[0.25, 0.7, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={redRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#ff2200" emissive={isNight ? '#ff2200' : '#000000'} emissiveIntensity={isNight ? 1.5 : 0} />
      </instancedMesh>
      <instancedMesh ref={yellowRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#888800" emissive={isNight ? '#888800' : '#000000'} emissiveIntensity={isNight ? 0.5 : 0} />
      </instancedMesh>
      <instancedMesh ref={greenRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#00aa00" emissive={isNight ? '#00aa00' : '#000000'} emissiveIntensity={isNight ? 1.0 : 0} />
      </instancedMesh>
    </>
  )
}

// ── Sidewalks ───────────────────────────────────────────────────────────
// Each sidewalk is a plane of width 3m × length `len`. Unit-plane scaled.
export function InstancedSidewalks({ sidewalks }: { sidewalks: SidewalkData[] }) {
  const n = sidewalks.length
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < n; i++) {
      const s = sidewalks[i]
      flatMatrix(_m, s.x, 0.03, s.z, s.angle, 3, s.len)
      mesh.setMatrixAt(i, _m)
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
  }, [sidewalks, n])

  if (n === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#888888" roughness={0.95} />
    </instancedMesh>
  )
}

