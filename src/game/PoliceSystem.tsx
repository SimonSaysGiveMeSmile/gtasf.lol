// @t1an
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { useLandscapeData } from '../game/LandscapeContext'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid, circleHitsBuilding, meshColliderHitsCircle } from '../world/World'
import { VehicleMesh } from '../vehicles/VehicleSpawner'
import { soundManager } from '../systems/audio/SoundManager'

const MAX_COPS = 4
const CHASE_SPEED = 14
const SIREN_INTERVAL = 3.5
const RAM_COOLDOWN = 1.5 // seconds between damage hits

function PoliceCar({ spawnX, spawnZ, idx }: { spawnX: number; spawnZ: number; idx: number }) {
  const pos = useRef(new THREE.Vector3(spawnX, 0, spawnZ))
  const angle = useRef(Math.random() * Math.PI * 2)
  const meshRef = useRef<THREE.Group>(null)
  const sirenTimer = useRef(idx * 1.2)
  const ramCooldown = useRef(0)
  const data = useLandscapeData()

  useFrame((_, delta) => {
    const state = useGameStore.getState()
    if (state.wantedLevel === 0) return
    const dt = Math.min(delta, 0.05)

    sirenTimer.current -= dt
    if (sirenTimer.current <= 0) {
      sirenTimer.current = SIREN_INTERVAL
      soundManager.play('car_horn', { volume: 0.35 })
    }

    ramCooldown.current = Math.max(0, ramCooldown.current - dt)

    const pp = state.playerPosition
    const tx = pp[0] - pos.current.x
    const tz = pp[2] - pos.current.z
    const dist = Math.sqrt(tx * tx + tz * tz)

    if (dist < 2.5 && ramCooldown.current === 0) {
      state.takeDamage(5)
      ramCooldown.current = RAM_COOLDOWN
    }

    if (dist < 0.5) return

    const targetAngle = Math.atan2(tx, tz)
    let diff = targetAngle - angle.current
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    angle.current += Math.max(-3 * dt, Math.min(3 * dt, diff))

    const nx = pos.current.x + Math.sin(angle.current) * CHASE_SPEED * dt
    const nz = pos.current.z + Math.cos(angle.current) * CHASE_SPEED * dt

    const r = 1.8
    let blocked = false
    for (const bi of getNearbyBuildingsGrid(nx, nz, r + 10)) {
      if (circleHitsBuilding(bi, nx, nz, r, data.buildings)) { blocked = true; break }
    }
    if (!blocked && meshColliderHitsCircle(nx, nz, r)) blocked = true

    if (!blocked) {
      pos.current.x = nx
      pos.current.z = nz
    } else {
      angle.current += Math.PI * 0.5
    }

    vehiclePositions.set(`cop-${idx}`, { x: pos.current.x, z: pos.current.z, radius: r })

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = angle.current
    }
  })

  useEffect(() => {
    return () => { vehiclePositions.delete(`cop-${idx}`) }
  }, [idx])

  return (
    <group ref={meshRef} position={[spawnX, 0, spawnZ]}>
      <VehicleMesh type="sports" color="#1a1aff" />
      <pointLight color="#0044ff" intensity={4} distance={12} position={[0, 2, 0]} />
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshBasicMaterial color="#0044ff" toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function PoliceSystem() {
  const wantedLevel = useGameStore((s) => s.wantedLevel)
  const tickWantedDecay = useGameStore((s) => s.tickWantedDecay)
  const decayTimer = useRef(0)
  const prevNumCops = useRef(0)

  useFrame((_, delta) => {
    decayTimer.current += delta
    if (decayTimer.current >= 1) {
      decayTimer.current = 0
      tickWantedDecay()
    }
  })

  const numCops = Math.min(Math.max(0, wantedLevel - 1), MAX_COPS)

  // Compute spawn positions once per numCops value change, not per render.
  // Read player position directly from store state (not as a subscription)
  // so this component doesn't re-render every frame.
  const spawnPositions = useMemo(() => {
    const pp = useGameStore.getState().playerPosition
    return Array.from({ length: numCops }, (_, i) => {
      const a = (i / MAX_COPS) * Math.PI * 2
      const r = 50 + i * 15
      return { x: pp[0] + Math.cos(a) * r, z: pp[2] + Math.sin(a) * r }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numCops])

  prevNumCops.current = numCops
  if (numCops === 0) return null

  return (
    <>
      {spawnPositions.map((sp, i) => (
        <PoliceCar key={i} idx={i} spawnX={sp.x} spawnZ={sp.z} />
      ))}
    </>
  )
}
