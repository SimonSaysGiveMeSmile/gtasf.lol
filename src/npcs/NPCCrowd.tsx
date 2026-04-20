import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSphere, useBox } from '@react-three/cannon'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { NPC_COUNT, TRAFFIC_COUNT, NPC_COLORS, MAP_SIZE } from '../game/constants'
import type { NPC } from '../game/types'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

interface NPCCProps {
  npc: NPC
}

function PedestrianNPC({ npc }: NPCCProps) {
  const meshRef = useRef<THREE.Group>(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const isRunning = useGameStore((s) => s.isRunning)

  // Spawn at y=1.5 so physics settles them ON the ground (y=0.3 is the sphere radius)
  const [, physApi] = useSphere(() => ({
    mass: 1,
    position: [npc.position[0], 1.5, npc.position[2]],
    args: [0.3],
    linearDamping: 0.9,
    angularDamping: 1,
    fixedRotation: true,
  }))

  const pos = useRef<[number, number, number]>([npc.position[0], 1.5, npc.position[2]])
  const vel = useRef<[number, number, number]>([0, 0, 0])
  const stateTimer = useRef(0)
  const targetPos = useRef<[number, number, number]>([
    npc.position[0] + (seededRandom(parseInt(npc.id) || 0) - 0.5) * 30,
    0,
    npc.position[2] + (seededRandom((parseInt(npc.id) || 0) * 2) - 0.5) * 30,
  ])

  useEffect(() => {
    const unsub = physApi.position.subscribe((p) => {
      pos.current = p as [number, number, number]
    })
    const velSub = physApi.velocity.subscribe((v) => {
      vel.current = v as [number, number, number]
    })
    return () => {
      unsub()
      velSub()
    }
  }, [physApi])

  useFrame((_, delta) => {
    stateTimer.current += delta

    const dx = targetPos.current[0] - pos.current[0]
    const dz = targetPos.current[2] - pos.current[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 2 || stateTimer.current > 5) {
      targetPos.current = [
        npc.position[0] + (seededRandom(stateTimer.current * 17) - 0.5) * 40,
        0,
        npc.position[2] + (seededRandom(stateTimer.current * 31) - 0.5) * 40,
      ]
      stateTimer.current = 0
    }

    const moveDir: [number, number, number] = [0, 0, 0]
    if (dist > 1) {
      const speed = 3
      moveDir[0] = (dx / dist) * speed
      moveDir[2] = (dz / dist) * speed
    }

    physApi.velocity.set(moveDir[0], vel.current[1], moveDir[2])

    // Flee from player if running
    const pdx = playerPosition[0] - pos.current[0]
    const pdz = playerPosition[2] - pos.current[2]
    const pDist = Math.sqrt(pdx * pdx + pdz * pdz)

    if (pDist < 10 && pDist > 2 && isRunning) {
      const fleeX = pos.current[0] - playerPosition[0]
      const fleeZ = pos.current[2] - playerPosition[2]
      const fleeLen = Math.sqrt(fleeX * fleeX + fleeZ * fleeZ)
      if (fleeLen > 0) {
        physApi.velocity.set(
          (fleeX / fleeLen) * 8,
          vel.current[1],
          (fleeZ / fleeLen) * 8
        )
      }
    }

    if (meshRef.current) {
      meshRef.current.position.set(pos.current[0], pos.current[1], pos.current[2])
      if (dist > 1) {
        meshRef.current.rotation.y = Math.atan2(dx, dz)
      }
    }
  })

  return (
    <group ref={meshRef}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
        <meshStandardMaterial color={npc.color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#e8c4a0" roughness={0.8} />
      </mesh>
    </group>
  )
}

function TrafficNPC({ npc }: NPCCProps) {
  const meshRef = useRef<THREE.Group>(null)

  // Spawn at y=1.5 so physics settles the vehicle on the ground
  const [, physApi] = useBox(() => ({
    mass: 1500,
    position: [npc.position[0], 1.5, npc.position[2]],
    args: [1.8, 1.2, 4],
    linearDamping: 0.5,
    angularDamping: 0.8,
  }))

  const pos = useRef<[number, number, number]>([npc.position[0], 1.5, npc.position[2]])
  const vel = useRef<[number, number, number]>([0, 0, 0])
  const rotation = useRef(npc.rotation)
  const stateTimer = useRef(0)

  useEffect(() => {
    const unsub = physApi.position.subscribe((p) => {
      pos.current = p as [number, number, number]
    })
    const velSub = physApi.velocity.subscribe((v) => {
      vel.current = v as [number, number, number]
    })
    return () => {
      unsub()
      velSub()
    }
  }, [physApi])

  useFrame((_, delta) => {
    stateTimer.current += delta

    const speed = 12
    const fwdX = -Math.sin(rotation.current) * speed
    const fwdZ = -Math.cos(rotation.current) * speed

    physApi.velocity.set(fwdX, vel.current[1], fwdZ)

    if (stateTimer.current > 3) {
      rotation.current += 0.3
      physApi.angularVelocity.set(0, 0.5, 0)
      if (stateTimer.current > 4) {
        stateTimer.current = 0
        physApi.angularVelocity.set(0, 0, 0)
      }
    }

    if (meshRef.current) {
      meshRef.current.position.set(pos.current[0], pos.current[1], pos.current[2])
      meshRef.current.rotation.y = rotation.current
    }
  })

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 1.0, 4]} />
        <meshStandardMaterial color={npc.color} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.6, 0.5, 2]} />
        <meshStandardMaterial color={npc.color} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function NPCCrowd() {
  const setNPCs = useGameStore((s) => s.setNPCs)

  const npcs = useMemo(() => {
    const result: NPC[] = []

    for (let i = 0; i < NPC_COUNT; i++) {
      const angle = seededRandom(i * 13) * Math.PI * 2
      const dist = 15 + seededRandom(i * 29) * MAP_SIZE * 0.35
      result.push({
        id: `ped-${i}`,
        type: 'pedestrian',
        position: [Math.cos(angle) * dist, 1.5, Math.sin(angle) * dist],
        rotation: seededRandom(i * 41) * Math.PI * 2,
        color: NPC_COLORS[i % NPC_COLORS.length],
        state: 'walking',
      })
    }

    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const x = (seededRandom(i * 23 + 100) - 0.5) * MAP_SIZE * 0.7
      const z = (seededRandom(i * 37 + 100) - 0.5) * MAP_SIZE * 0.7
      result.push({
        id: `traffic-${i}`,
        type: 'traffic',
        position: [x, 1.5, z],
        rotation: seededRandom(i * 53 + 100) * Math.PI * 2,
        color: ['#334488', '#883333', '#338833', '#aaaaaa', '#333333'][i % 5],
        state: 'driving',
      })
    }

    setNPCs(result)
    return result
  }, [setNPCs])

  return (
    <>
      {npcs.map((npc) =>
        npc.type === 'pedestrian' ? (
          <PedestrianNPC key={npc.id} npc={npc} />
        ) : (
          <TrafficNPC key={npc.id} npc={npc} />
        )
      )}
    </>
  )
}
