// @t1an
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { useLandscapeData } from '../game/LandscapeContext'

type RoadPt = { x: number; z: number }

// Pick a random point along a road so missions always land on something
// drivable, never inside a building or the water.
function randomRoadPoint(paths: RoadPt[][], seed: number): RoadPt | null {
  if (!paths.length) return null
  const rng = mulberry(seed)
  for (let tries = 0; tries < 30; tries++) {
    const path = paths[Math.floor(rng() * paths.length)]
    if (!path?.length) continue
    const pt = path[Math.floor(rng() * path.length)]
    if (pt) return { x: pt.x, z: pt.z }
  }
  return null
}

function mulberry(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DISTRICT_NAMES = ['Marina', 'SoMa', 'Mission', 'Nob Hill', 'Embarcadero', 'Castro', 'Richmond', 'Sunset', 'North Beach', 'Dogpatch']

function nextDistrict(seed: number): string {
  return DISTRICT_NAMES[seed % DISTRICT_NAMES.length]
}

// Minimum pickup→dropoff distance (so missions aren't trivial).
const MIN_LEG = 80
const REACH_RADIUS = 5

export default function MissionRunner() {
  const data = useLandscapeData()
  const playerPosition = useGameStore((s) => s.playerPosition)
  const activeMission = useGameStore((s) => s.activeMission)
  const missionsCompleted = useGameStore((s) => s.missionsCompleted)
  const startMission = useGameStore((s) => s.startMission)
  const reachMissionWaypoint = useGameStore((s) => s.reachMissionWaypoint)
  const seedCounter = useRef(0)

  // Seed the first mission — and subsequent ones — whenever activeMission
  // is null. We guard against immediate re-seeding by waiting one frame via
  // useEffect so missionsCompleted has flushed.
  useEffect(() => {
    if (activeMission) return
    if (!data.roadPaths?.length) return
    seedCounter.current += 1
    const seed = Date.now() + seedCounter.current * 17 + missionsCompleted * 97

    let pickup: RoadPt | null = null
    let dropoff: RoadPt | null = null
    for (let attempt = 0; attempt < 20; attempt++) {
      pickup = randomRoadPoint(data.roadPaths, seed + attempt)
      dropoff = randomRoadPoint(data.roadPaths, seed + attempt * 7 + 91)
      if (pickup && dropoff) {
        const dx = pickup.x - dropoff.x
        const dz = pickup.z - dropoff.z
        if (Math.sqrt(dx * dx + dz * dz) >= MIN_LEG) break
      }
    }
    if (!pickup || !dropoff) return

    const reward = 250 + Math.floor(Math.random() * 500)
    startMission({
      id: `m-${seed}`,
      pickup: { x: pickup.x, z: pickup.z, label: 'Pickup' },
      dropoff: { x: dropoff.x, z: dropoff.z, label: nextDistrict(missionsCompleted) },
      phase: 'pickup',
      reward,
    })
  }, [activeMission, data.roadPaths, missionsCompleted, startMission])

  useFrame(() => {
    const m = useGameStore.getState().activeMission
    if (!m) return
    const target = m.phase === 'pickup' ? m.pickup : m.dropoff
    const dx = playerPosition[0] - target.x
    const dz = playerPosition[2] - target.z
    if (dx * dx + dz * dz < REACH_RADIUS * REACH_RADIUS) {
      reachMissionWaypoint()
    }
  })

  if (!activeMission) return null
  const target = activeMission.phase === 'pickup' ? activeMission.pickup : activeMission.dropoff
  const colour = activeMission.phase === 'pickup' ? '#ffd166' : '#06d6a0'

  return <MissionBeacon x={target.x} z={target.z} color={colour} />
}

function MissionBeacon({ x, z, color }: { x: number; z: number; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = clock.elapsedTime * 0.8
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.1
      ringRef.current.scale.setScalar(pulse)
    }
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 30, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3, 0]} color={color} intensity={3} distance={20} />
      <mesh ref={ringRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.2, 12, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}
