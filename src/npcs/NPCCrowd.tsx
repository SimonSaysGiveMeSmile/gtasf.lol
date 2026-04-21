import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { NPC } from '../game/types'
import { NPC_COUNT, TRAFFIC_COUNT, NPC_COLORS, MAP_SIZE } from '../game/constants'
import { makeClothingTexture, makeVehiclePaintTexture } from '../utils/textureGen'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const ROAD_POSITIONS = [-120, -60, 0, 60, 120]
const ROAD_HALF = 6 // road is 12 units wide

// Find nearest road position
function snapToNearestRoad(val: number): number {
  let nearest = ROAD_POSITIONS[0]
  let minDist = Math.abs(val - nearest)
  for (const rp of ROAD_POSITIONS) {
    const d = Math.abs(val - rp)
    if (d < minDist) { minDist = d; nearest = rp }
  }
  return nearest
}

// Check if a position is on a road
function isOnRoad(x: number, z: number): boolean {
  for (const rp of ROAD_POSITIONS) {
    if (Math.abs(x - rp) < ROAD_HALF) return true
    if (Math.abs(z - rp) < ROAD_HALF) return true
  }
  return false
}

function PedestrianNPC({ x, z, color, seed }: { x: number; z: number; color: string; seed: number }) {
  const meshRef = useRef<THREE.Group>(null)
  const pos = useRef(new THREE.Vector3(x, 0.9, z))
  const angle = useRef(seededRandom(seed) * Math.PI * 2)
  const walkSpeed = 2.5 + seededRandom(seed * 13) * 1.5
  const timer = useRef(0)
  const clothingTex = useMemo(() => makeClothingTexture(color, seed), [color, seed])

  // Target road intersection or road point
  const targetX = useRef(0)
  const targetZ = useRef(0)
  const roadAxis = useRef<'x' | 'z'>('z') // which road axis we're on

  // Initialize to nearest road
  const nearestRoadX = snapToNearestRoad(x)
  const nearestRoadZ = snapToNearestRoad(z)

  // If neither is close to a road, place near nearest road intersection
  if (!isOnRoad(x, z)) {
    targetX.current = nearestRoadX
    targetZ.current = nearestRoadZ
    pos.current.set(nearestRoadX, 0.9, nearestRoadZ)
  } else {
    // Start on the closest road
    const distToXRoad = Math.min(...ROAD_POSITIONS.map(r => Math.abs(x - r)))
    const distToZRoad = Math.min(...ROAD_POSITIONS.map(r => Math.abs(z - r)))
    if (distToXRoad < distToZRoad) {
      targetX.current = x
      targetZ.current = snapToNearestRoad(z)
      roadAxis.current = 'z'
    } else {
      targetX.current = snapToNearestRoad(x)
      targetZ.current = z
      roadAxis.current = 'x'
    }
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    const dx = targetX.current - pos.current.x
    const dz = targetZ.current - pos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Reached target — pick new road point
    if (dist < 2 || timer.current > 5) {
      timer.current = 0
      // Move to a nearby intersection
      const offsetIdx = Math.floor(seededRandom(timer.current + seed) * ROAD_POSITIONS.length)
      const newX = ROAD_POSITIONS[offsetIdx % ROAD_POSITIONS.length]
      const newZ = ROAD_POSITIONS[Math.floor((offsetIdx + 2) % ROAD_POSITIONS.length)]

      // Prefer keeping on same axis but sometimes switch
      const sameAxis = seededRandom(timer.current + seed * 7) > 0.3
      if (sameAxis && roadAxis.current === 'z') {
        targetX.current = pos.current.x
        targetZ.current = newZ
      } else if (sameAxis && roadAxis.current === 'x') {
        targetX.current = newX
        targetZ.current = pos.current.z
      } else {
        // Cross to perpendicular road
        targetX.current = newX
        targetZ.current = newZ
        roadAxis.current = seededRandom(timer.current + seed * 3) > 0.5 ? 'x' : 'z'
      }
    }

    if (dist > 0.5) {
      pos.current.x += (dx / dist) * walkSpeed * dt
      pos.current.z += (dz / dist) * walkSpeed * dt
      angle.current = Math.atan2(dx, dz)
    }

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = angle.current
    }
  })

  return (
    <group ref={meshRef}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
        <meshStandardMaterial color={color} map={clothingTex} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#e8c090" roughness={0.8} />
      </mesh>
    </group>
  )
}

function TrafficCar({ x, z, rotation, color, seed }: { x: number; z: number; rotation: number; color: string; seed: number }) {
  const meshRef = useRef<THREE.Group>(null)
  const carAngle = useRef(rotation)
  const pos = useRef(new THREE.Vector3(x, 0, z))
  const speed = 8 + seededRandom(seed) * 6
  const timer = useRef(0)
  const paintTex = useMemo(() => makeVehiclePaintTexture(color, seed), [color, seed])

  // Road following state
  const roadAxis = useRef<'x' | 'z'>('z')
  const targetProgress = useRef(0) // progress along current road (0-1)
  const roadStart = useRef(0)
  const roadEnd = useRef(MAP_SIZE)
  const direction = useRef(1) // 1 = increasing, -1 = decreasing

  // Initialize: snap to nearest road
  const nearestX = snapToNearestRoad(x)
  const nearestZ = snapToNearestRoad(z)
  const distToXRoad = Math.min(...ROAD_POSITIONS.map(r => Math.abs(x - r)))
  const distToZRoad = Math.min(...ROAD_POSITIONS.map(r => Math.abs(z - r)))

  if (distToXRoad < distToZRoad) {
    // Snap to vertical road (x = constant)
    pos.current.x = nearestX
    pos.current.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, z))
    roadAxis.current = 'x'
    roadStart.current = -MAP_SIZE
    roadEnd.current = MAP_SIZE
    targetProgress.current = (pos.current.z - roadStart.current) / (roadEnd.current - roadStart.current)
    // Set angle to face along Z
    carAngle.current = direction.current > 0 ? 0 : Math.PI
  } else {
    // Snap to horizontal road (z = constant)
    pos.current.z = nearestZ
    pos.current.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, x))
    roadAxis.current = 'z'
    roadStart.current = -MAP_SIZE
    roadEnd.current = MAP_SIZE
    targetProgress.current = (pos.current.x - roadStart.current) / (roadEnd.current - roadStart.current)
    // Set angle to face along X (negate for our angle convention)
    carAngle.current = direction.current > 0 ? -Math.PI / 2 : Math.PI / 2
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    // Move along current road
    if (roadAxis.current === 'z') {
      pos.current.z += direction.current * speed * dt
      pos.current.x = snapToNearestRoad(pos.current.x)
    } else {
      pos.current.x += direction.current * speed * dt
      pos.current.z = snapToNearestRoad(pos.current.z)
    }

    // Check for intersection or road end — decide next action
    const nearIntersection = ROAD_POSITIONS.some(rp => {
      if (roadAxis.current === 'z') return Math.abs(pos.current.z - rp) < 2
      return Math.abs(pos.current.x - rp) < 2
    })

    if (nearIntersection || pos.current.z < -MAP_SIZE * 0.6 || pos.current.z > MAP_SIZE * 0.6 ||
        pos.current.x < -MAP_SIZE * 0.6 || pos.current.x > MAP_SIZE * 0.6) {

      // At intersection — decide: turn or continue
      if (nearIntersection) {
        const turnRoll = seededRandom(timer.current + seed)
        if (turnRoll < 0.25) {
          // Turn left (perpendicular road)
          roadAxis.current = roadAxis.current === 'z' ? 'x' : 'z'
          // Snap to intersection center
          const nearestX2 = snapToNearestRoad(pos.current.x)
          const nearestZ2 = snapToNearestRoad(pos.current.z)
          if (roadAxis.current === 'z') {
            pos.current.x = nearestX2
            // Choose random intersection along Z
            const newZ = ROAD_POSITIONS[Math.floor(turnRoll * 4 * ROAD_POSITIONS.length) % ROAD_POSITIONS.length]
            pos.current.z = nearestZ2
            direction.current = newZ > pos.current.z ? 1 : -1
            carAngle.current = direction.current > 0 ? 0 : Math.PI
          } else {
            pos.current.z = nearestZ2
            const newX = ROAD_POSITIONS[Math.floor(turnRoll * 4 * ROAD_POSITIONS.length) % ROAD_POSITIONS.length]
            pos.current.x = nearestX2
            direction.current = newX > pos.current.x ? 1 : -1
            carAngle.current = direction.current > 0 ? -Math.PI / 2 : Math.PI / 2
          }
        } else if (turnRoll < 0.35) {
          // U-turn
          direction.current *= -1
          if (roadAxis.current === 'z') {
            carAngle.current = direction.current > 0 ? 0 : Math.PI
          } else {
            carAngle.current = direction.current > 0 ? -Math.PI / 2 : Math.PI / 2
          }
        }
        // else continue straight (keep current direction)
      } else {
        // Hit map edge — wrap to opposite side at a random intersection
        direction.current *= -1
        const newX = ROAD_POSITIONS[Math.floor(seededRandom(timer.current + 99) * ROAD_POSITIONS.length)]
        const newZ = ROAD_POSITIONS[Math.floor(seededRandom(timer.current + 77) * ROAD_POSITIONS.length)]
        if (roadAxis.current === 'z') {
          pos.current.z = newZ
          carAngle.current = direction.current > 0 ? 0 : Math.PI
        } else {
          pos.current.x = newX
          carAngle.current = direction.current > 0 ? -Math.PI / 2 : Math.PI / 2
        }
      }
    }

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = carAngle.current
    }
  })

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <boxGeometry args={[1.7, 0.7, 3.8]} />
        <meshStandardMaterial color={color} map={paintTex} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.45, -0.2]}>
        <boxGeometry args={[1.5, 0.4, 2.0]} />
        <meshStandardMaterial color={color} map={paintTex} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function NPCCrowd() {
  const setNPCs = useGameStore((s) => s.setNPCs)

  const { pedestrians, cars } = useMemo(() => {
    const peds: { id: string; x: number; z: number; color: string; seed: number }[] = []
    const cars: { id: string; x: number; z: number; rotation: number; color: string; seed: number }[] = []
    const carColors = ['#334488', '#883333', '#338833', '#aaaaaa', '#444444', '#665522']

    // Spawn pedestrians on or near roads
    for (let i = 0; i < NPC_COUNT; i++) {
      const seed = i * 17
      // Pick a random road intersection
      const rx = ROAD_POSITIONS[i % ROAD_POSITIONS.length]
      const rz = ROAD_POSITIONS[Math.floor(i / ROAD_POSITIONS.length) % ROAD_POSITIONS.length]
      // Add small random offset along the road
      const offset = (seededRandom(seed * 3) - 0.5) * 20
      const axis = seededRandom(seed * 7) > 0.5
      const px = axis ? rx + offset : rx
      const pz = axis ? rz : rz + offset
      peds.push({
        id: `ped-${i}`,
        x: px,
        z: pz,
        color: NPC_COLORS[i % NPC_COLORS.length],
        seed,
      })
    }

    // Spawn traffic cars on roads
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const seed = i * 23 + 100
      // Pick a random road
      const useXRoad = seededRandom(seed) > 0.5
      const roadIdx = Math.floor(seededRandom(seed * 3) * ROAD_POSITIONS.length)
      const roadPos = ROAD_POSITIONS[roadIdx]
      const alongPos = (seededRandom(seed * 5) - 0.5) * MAP_SIZE * 0.8
      if (useXRoad) {
        cars.push({
          id: `traffic-${i}`,
          x: alongPos,
          z: roadPos,
          rotation: seededRandom(seed * 7) > 0.5 ? -Math.PI / 2 : Math.PI / 2,
          color: carColors[i % carColors.length],
          seed,
        })
      } else {
        cars.push({
          id: `traffic-${i}`,
          x: roadPos,
          z: alongPos,
          rotation: seededRandom(seed * 7) > 0.5 ? 0 : Math.PI,
          color: carColors[i % carColors.length],
          seed,
        })
      }
    }

    const npcData: NPC[] = [...peds.map(p => ({
      id: p.id, type: 'pedestrian' as const,
      position: [p.x, 0.9, p.z] as [number, number, number],
      rotation: 0, color: p.color, state: 'walking' as const
    })), ...cars.map(c => ({
      id: c.id, type: 'traffic' as const,
      position: [c.x, 0, c.z] as [number, number, number],
      rotation: c.rotation, color: c.color, state: 'driving' as const
    }))]
    setNPCs(npcData)

    return { pedestrians: peds, cars }
  }, [setNPCs])

  return (
    <>
      {pedestrians.map((p) => (
        <PedestrianNPC key={p.id} x={p.x} z={p.z} color={p.color} seed={p.seed} />
      ))}
      {cars.map((c) => (
        <TrafficCar key={c.id} x={c.x} z={c.z} rotation={c.rotation} color={c.color} seed={c.seed} />
      ))}
    </>
  )
}