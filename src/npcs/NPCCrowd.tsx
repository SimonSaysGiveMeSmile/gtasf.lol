import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { NPC } from '../game/types'
import { NPC_COUNT, TRAFFIC_COUNT, NPC_COLORS, MAP_SIZE } from '../game/constants'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function PedestrianNPC({ x, z, color }: { x: number; z: number; color: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const pos = useRef(new THREE.Vector3(x, 0.9, z))
  const angle = useRef(seededRandom(x * 17 + z * 31) * Math.PI * 2)
  const timer = useRef(0)
  const targetX = useRef(x + (seededRandom(x * 23 + z * 41) - 0.5) * 30)
  const targetZ = useRef(z + (seededRandom(x * 37 + z * 59) - 0.5) * 30)
  const walkSpeed = 2.5 + seededRandom(x * 13 + z * 29) * 1.5

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    const dx = targetX.current - pos.current.x
    const dz = targetZ.current - pos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 1.5 || timer.current > 4) {
      targetX.current = x + (Math.random() - 0.5) * 40
      targetZ.current = z + (Math.random() - 0.5) * 40
      timer.current = 0
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
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#e8c090" roughness={0.8} />
      </mesh>
    </group>
  )
}

function TrafficCar({ x, z, rotation, color }: { x: number; z: number; rotation: number; color: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const carAngle = useRef(rotation)
  const timer = useRef(0)
  const speed = 8 + seededRandom(x * 19 + z * 43 + rotation * 7) * 6

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    // Drive forward
    pos.current.x -= Math.sin(carAngle.current) * speed * dt
    pos.current.z -= Math.cos(carAngle.current) * speed * dt

    // Turn occasionally
    if (timer.current > 3 + Math.random() * 2) {
      carAngle.current += (Math.random() - 0.5) * 0.6
      timer.current = 0
    }

    // Wrap around map
    if (pos.current.x < -MAP_SIZE * 0.6) pos.current.x = MAP_SIZE * 0.6
    if (pos.current.x > MAP_SIZE * 0.6) pos.current.x = -MAP_SIZE * 0.6
    if (pos.current.z < -MAP_SIZE * 0.6) pos.current.z = MAP_SIZE * 0.6
    if (pos.current.z > MAP_SIZE * 0.6) pos.current.z = -MAP_SIZE * 0.6

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = carAngle.current
    }
  })

  const pos = useRef(new THREE.Vector3(x, 0, z))

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <boxGeometry args={[1.7, 0.7, 3.8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.45, -0.2]}>
        <boxGeometry args={[1.5, 0.4, 2.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function NPCCrowd() {
  const setNPCs = useGameStore((s) => s.setNPCs)

  const { pedestrians, cars } = useMemo(() => {
    const peds: { id: string; x: number; z: number; color: string }[] = []
    const cars: { id: string; x: number; z: number; rotation: number; color: string }[] = []
    const carColors = ['#334488', '#883333', '#338833', '#aaaaaa', '#444444', '#665522']

    for (let i = 0; i < NPC_COUNT; i++) {
      const ang = seededRandom(i * 13) * Math.PI * 2
      const dist = 15 + seededRandom(i * 29) * MAP_SIZE * 0.35
      peds.push({
        id: `ped-${i}`,
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        color: NPC_COLORS[i % NPC_COLORS.length],
      })
    }

    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      cars.push({
        id: `traffic-${i}`,
        x: (seededRandom(i * 23 + 100) - 0.5) * MAP_SIZE * 0.6,
        z: (seededRandom(i * 37 + 100) - 0.5) * MAP_SIZE * 0.6,
        rotation: seededRandom(i * 53 + 100) * Math.PI * 2,
        color: carColors[i % carColors.length],
      })
    }

    const npcData: NPC[] = [...peds.map(p => ({
      id: p.id, type: 'pedestrian' as const,
      position: [p.x, 0.9, p.z] as [number, number, number], rotation: 0, color: p.color, state: 'walking' as const
    })), ...cars.map(c => ({
      id: c.id, type: 'traffic' as const,
      position: [c.x, 0, c.z] as [number, number, number], rotation: c.rotation, color: c.color, state: 'driving' as const
    }))]
    setNPCs(npcData)

    return { pedestrians: peds, cars }
  }, [setNPCs])

  return (
    <>
      {pedestrians.map((p) => (
        <PedestrianNPC key={p.id} x={p.x} z={p.z} color={p.color} />
      ))}
      {cars.map((c) => (
        <TrafficCar key={c.id} x={c.x} z={c.z} rotation={c.rotation} color={c.color} />
      ))}
    </>
  )
}