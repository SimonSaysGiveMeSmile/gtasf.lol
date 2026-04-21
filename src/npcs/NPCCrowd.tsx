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

// ── Humanoid shared body dimensions ──────────────────────────────────────────
const FOOT_Y = 0
const LEG_LENGTH = 0.5
const TORSO_HEIGHT = 0.65
const TORSO_Y = FOOT_Y + LEG_LENGTH
const NECK_Y = TORSO_Y + TORSO_HEIGHT
const HEAD_Y = NECK_Y + 0.18
const SHOULDER_Y = TORSO_Y + TORSO_HEIGHT * 0.85
const ARM_LENGTH = 0.4

// ── Humanoid body component ──────────────────────────────────────────────────
interface HumanoidProps {
  color: string
  shirtColor: string
  pantsColor: string
  leftArmRef?: React.RefObject<THREE.Group | null>
  rightArmRef?: React.RefObject<THREE.Group | null>
  leftLegRef?: React.RefObject<THREE.Group | null>
  rightLegRef?: React.RefObject<THREE.Group | null>
  bodyGroupRef?: React.RefObject<THREE.Group | null>
}

function Humanoid({ color, shirtColor, pantsColor, leftArmRef, rightArmRef, leftLegRef, rightLegRef, bodyGroupRef }: HumanoidProps) {
  return (
    <group>
      <group ref={bodyGroupRef || undefined}>
        {/* Torso */}
        <mesh castShadow position={[0, TORSO_Y + TORSO_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.4, TORSO_HEIGHT, 0.22]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} />
        </mesh>

        {/* Neck */}
        <mesh castShadow position={[0, NECK_Y, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.1, 8]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>

        {/* Head */}
        <mesh castShadow position={[0, HEAD_Y, 0]}>
          <sphereGeometry args={[0.15, 10, 10]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef || undefined} position={[-0.25, SHOULDER_Y, 0]}>
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -ARM_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.045, ARM_LENGTH * 0.55, 4, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -ARM_LENGTH - 0.1, 0]}>
            <capsuleGeometry args={[0.038, 0.14, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef || undefined} position={[0.25, SHOULDER_Y, 0]}>
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -ARM_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.045, ARM_LENGTH * 0.55, 4, 8]} />
            <meshStandardMaterial color={shirtColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -ARM_LENGTH - 0.1, 0]}>
            <capsuleGeometry args={[0.038, 0.14, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef || undefined} position={[-0.1, 0, 0]}>
          <mesh castShadow position={[0, LEG_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.065, LEG_LENGTH * 0.65, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 0.03, 0.05]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef || undefined} position={[0.1, 0, 0]}>
          <mesh castShadow position={[0, LEG_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.065, LEG_LENGTH * 0.65, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 0.03, 0.05]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ── Pedestrian NPC ───────────────────────────────────────────────────────────
interface PedestrianProps {
  x: number; z: number; color: string; shirtColor: string; pantsColor: string; seed: number
}

function PedestrianNPC({ x, z, color, shirtColor, pantsColor, seed }: PedestrianProps) {
  const meshRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const bodyGroupRef = useRef<THREE.Group>(null)

  const pos = useRef(new THREE.Vector3(x, FOOT_Y, z))
  const angle = useRef(seededRandom(seed) * Math.PI * 2)
  const walkSpeed = 2.5 + seededRandom(seed * 13) * 1.5
  const animTime = useRef(seededRandom(seed * 7) * 100)
  const timer = useRef(0)
  const targetX = useRef(x)
  const targetZ = useRef(z)
  const prevLArm = useRef(0)
  const prevRArm = useRef(0)
  const prevLLeg = useRef(0)
  const prevRLeg = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    const dx = targetX.current - pos.current.x
    const dz = targetZ.current - pos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    const isMoving = dist > 0.3
    const speed = isMoving ? walkSpeed : 0

    if (dist < 1.5 || timer.current > 4) {
      timer.current = 0
      targetX.current = x + (seededRandom(timer.current + seed) - 0.5) * 40
      targetZ.current = z + (seededRandom(timer.current + seed * 3) - 0.5) * 40
    }

    if (dist > 0.1) {
      pos.current.x += (dx / dist) * speed * dt
      pos.current.z += (dz / dist) * speed * dt
      angle.current = Math.atan2(dx, dz)
    }

    // Animation
    if (isMoving) animTime.current += dt * 9
    const t = animTime.current
    const ls = 0.38
    const as = 0.28
    const tLL = Math.sin(t) * ls
    const tRL = Math.sin(t + Math.PI) * ls
    const tLA = Math.sin(t + Math.PI) * as
    const tRA = Math.sin(t) * as
    prevLLeg.current += (tLL - prevLLeg.current) * 0.22
    prevRLeg.current += (tRL - prevRLeg.current) * 0.22
    prevLArm.current += (tLA - prevLArm.current) * 0.22
    prevRArm.current += (tRA - prevRArm.current) * 0.22

    if (leftLegRef.current) leftLegRef.current.rotation.x = prevLLeg.current
    if (rightLegRef.current) rightLegRef.current.rotation.x = prevRLeg.current
    if (leftArmRef.current) leftArmRef.current.rotation.x = prevLArm.current
    if (rightArmRef.current) rightArmRef.current.rotation.x = prevRArm.current

    if (bodyGroupRef.current) {
      const leanTarget = isMoving ? 0.08 : 0
      bodyGroupRef.current.rotation.x += (leanTarget - bodyGroupRef.current.rotation.x) * 0.1
    }

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = angle.current
    }
  })

  return (
    <group ref={meshRef}>
      <Humanoid
        color={color}
        shirtColor={shirtColor}
        pantsColor={pantsColor}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        leftLegRef={leftLegRef}
        rightLegRef={rightLegRef}
        bodyGroupRef={bodyGroupRef}
      />
    </group>
  )
}

// ── Traffic Car NPC ───────────────────────────────────────────────────────────
function TrafficCar({ x, z, rotation, color }: { x: number; z: number; rotation: number; color: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const carAngle = useRef(rotation)
  const timer = useRef(0)
  const speed = 8 + seededRandom(x * 19 + z * 43 + rotation * 7) * 6
  const pos = useRef(new THREE.Vector3(x, 0, z))

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    pos.current.x -= Math.sin(carAngle.current) * speed * dt
    pos.current.z -= Math.cos(carAngle.current) * speed * dt

    if (timer.current > 3 + Math.random() * 2) {
      carAngle.current += (Math.random() - 0.5) * 0.6
      timer.current = 0
    }

    if (pos.current.x < -MAP_SIZE * 0.6) pos.current.x = MAP_SIZE * 0.6
    if (pos.current.x > MAP_SIZE * 0.6) pos.current.x = -MAP_SIZE * 0.6
    if (pos.current.z < -MAP_SIZE * 0.6) pos.current.z = MAP_SIZE * 0.6
    if (pos.current.z > MAP_SIZE * 0.6) pos.current.z = -MAP_SIZE * 0.6

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = carAngle.current
    }
  })

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

// ── NPC Crowd ────────────────────────────────────────────────────────────────
const SHIRT_COLORS = ['#cc3333', '#3366cc', '#33aa55', '#ccaa33', '#8833cc', '#cc8844', '#338888']
const PANTS_COLORS = ['#1a1a3a', '#2a2a2a', '#3a3020', '#1a2a1a', '#2a1a2a', '#1a1a1a', '#2a3a2a']

export default function NPCCrowd() {
  const setNPCs = useGameStore((s) => s.setNPCs)

  const { pedestrians, cars } = useMemo(() => {
    const peds: { id: string; x: number; z: number; color: string; shirtColor: string; pantsColor: string; seed: number }[] = []
    const cars: { id: string; x: number; z: number; rotation: number; color: string }[] = []
    const carColors = ['#334488', '#883333', '#338833', '#aaaaaa', '#444444', '#665522']

    for (let i = 0; i < NPC_COUNT; i++) {
      const seed = i * 17
      const ang = seededRandom(seed * 13) * Math.PI * 2
      const dist = 15 + seededRandom(seed * 29) * MAP_SIZE * 0.35
      peds.push({
        id: `ped-${i}`,
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        color: NPC_COLORS[i % NPC_COLORS.length],
        shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
        pantsColor: PANTS_COLORS[i % PANTS_COLORS.length],
        seed,
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
        <PedestrianNPC key={p.id} x={p.x} z={p.z} color={p.color} shirtColor={p.shirtColor} pantsColor={p.pantsColor} seed={p.seed} />
      ))}
      {cars.map((c) => (
        <TrafficCar key={c.id} x={c.x} z={c.z} rotation={c.rotation} color={c.color} />
      ))}
    </>
  )
}
