// @t1an
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { useLandscapeData } from '../game/LandscapeContext'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid, circleHitsBuilding, meshColliderHitsCircle } from '../world/World'
import { VehicleMesh } from '../vehicles/VehicleSpawner'
import { soundManager } from '../systems/audio/SoundManager'

// One police car per star above 1 (max 4 cops at 5 stars).
const MAX_COPS = 4
const CHASE_SPEED = 14
const SIREN_INTERVAL = 3.5 // seconds between siren blips

function PoliceCar({ spawnX, spawnZ, idx }: { spawnX: number; spawnZ: number; idx: number }) {
  const pos = useRef(new THREE.Vector3(spawnX, 0, spawnZ))
  const angle = useRef(Math.random() * Math.PI * 2)
  const meshRef = useRef<THREE.Group>(null)
  const sirenTimer = useRef(idx * 1.2) // stagger sirens

  const playerPosition = useGameStore((s) => s.playerPosition)
  const wantedLevel = useGameStore((s) => s.wantedLevel)
  const takeDamage = useGameStore((s) => s.takeDamage)
  const addWanted = useGameStore((s) => s.addWanted)
  const data = useLandscapeData()

  useFrame((_, delta) => {
    if (wantedLevel === 0) return
    const dt = Math.min(delta, 0.05)
    sirenTimer.current -= dt
    if (sirenTimer.current <= 0) {
      sirenTimer.current = SIREN_INTERVAL
      soundManager.play('car_horn', { volume: 0.35 })
    }

    const tx = playerPosition[0] - pos.current.x
    const tz = playerPosition[2] - pos.current.z
    const dist = Math.sqrt(tx * tx + tz * tz)

    // Ram the player if close enough
    if (dist < 2.5) {
      takeDamage(8)
      addWanted(0) // keep level, just damage
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
      {/* Blue/red siren lights */}
      <pointLight color="#0044ff" intensity={4} distance={12} position={[0, 2, 0]}>
        <mesh>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color="#0044ff" toneMapped={false} />
        </mesh>
      </pointLight>
    </group>
  )
}

export default function PoliceSystem() {
  const wantedLevel = useGameStore((s) => s.wantedLevel)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const tickWantedDecay = useGameStore((s) => s.tickWantedDecay)
  const decayTimer = useRef(0)

  // Decay wanted level every second
  useFrame((_, delta) => {
    decayTimer.current += delta
    if (decayTimer.current >= 1) {
      decayTimer.current = 0
      tickWantedDecay()
    }
  })

  const numCops = Math.max(0, wantedLevel - 1)
  if (numCops === 0) return null

  // Spawn cops in a ring around the player
  return (
    <>
      {Array.from({ length: Math.min(numCops, MAX_COPS) }, (_, i) => {
        const a = (i / MAX_COPS) * Math.PI * 2
        const r = 40 + i * 15
        return (
          <PoliceCar
            key={i}
            idx={i}
            spawnX={playerPosition[0] + Math.cos(a) * r}
            spawnZ={playerPosition[2] + Math.sin(a) * r}
          />
        )
      })}
    </>
  )
}
