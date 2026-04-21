import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { VehicleType } from '../game/types'
import { VEHICLES, MAP_SIZE, VEHICLE_COUNT } from '../game/constants'

// Seeded random for deterministic spawns
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// Vehicle mesh components
function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.35, 0.35, 0.25, 12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
    </mesh>
  )
}

function TeslaCybertruck({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.8, 4.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 1.15, -0.3]}>
        <boxGeometry args={[2.0, 0.5, 2.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.1, 1.0]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.9, 0.02, 1.2]} />
        <meshStandardMaterial color="#003344" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 1.1, -1.5]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.9, 0.02, 0.8]} />
        <meshStandardMaterial color="#003344" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.25, 0.05, 4.85]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0.7, 0.6, 2.4]} color="#00e5ff" intensity={2} distance={10} />
      <pointLight position={[-0.7, 0.6, 2.4]} color="#00e5ff" intensity={2} distance={10} />
      <mesh position={[0.9, 0.7, -2.4]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.9, 0.7, -2.4]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={3} />
      </mesh>
      <Wheel position={[0.9, 0.35, 1.5]} />
      <Wheel position={[-0.9, 0.35, 1.5]} />
      <Wheel position={[0.9, 0.35, -1.5]} />
      <Wheel position={[-0.9, 0.35, -1.5]} />
    </group>
  )
}

function TeslaModelS({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.9, 0.6, 4.4]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.7, 1.4]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.85, 0.3, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.9, -0.2]}>
        <boxGeometry args={[1.8, 0.5, 2.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, 0.8]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.75, 0.02, 1.0]} />
        <meshStandardMaterial color="#002233" metalness={0.9} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[0.6, 0.5, 2.2]} color="#aaeeff" intensity={1.5} distance={8} />
      <pointLight position={[-0.6, 0.5, 2.2]} color="#aaeeff" intensity={1.5} distance={8} />
      <Wheel position={[0.8, 0.35, 1.3]} />
      <Wheel position={[-0.8, 0.35, 1.3]} />
      <Wheel position={[0.8, 0.35, -1.3]} />
      <Wheel position={[-0.8, 0.35, -1.3]} />
    </group>
  )
}

function SportsCar({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.9, 0.4, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.65, -0.1]}>
        <boxGeometry args={[1.7, 0.35, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.75, -2.0]}>
        <boxGeometry args={[1.6, 0.08, 0.3]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      <Wheel position={[0.85, 0.32, 1.3]} />
      <Wheel position={[-0.85, 0.32, 1.3]} />
      <Wheel position={[0.85, 0.32, -1.3]} />
      <Wheel position={[-0.85, 0.32, -1.3]} />
    </group>
  )
}

function SUV({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.0, 0.8, 4.3]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 1.25, 0]}>
        <boxGeometry args={[1.9, 0.6, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      <Wheel position={[0.85, 0.35, 1.3]} />
      <Wheel position={[-0.85, 0.35, 1.3]} />
      <Wheel position={[0.85, 0.35, -1.3]} />
      <Wheel position={[-0.85, 0.35, -1.3]} />
    </group>
  )
}

function Sedan({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.85, 0.55, 4.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.85, -0.1]}>
        <boxGeometry args={[1.7, 0.45, 2.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      <Wheel position={[0.78, 0.33, 1.2]} />
      <Wheel position={[-0.78, 0.33, 1.2]} />
      <Wheel position={[0.78, 0.33, -1.2]} />
      <Wheel position={[-0.78, 0.33, -1.2]} />
    </group>
  )
}

function Plane({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 1.0, 7.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 1.0, 2.8]}>
        <boxGeometry args={[1.1, 0.6, 2.0]} />
        <meshStandardMaterial color="#001133" metalness={0.8} transparent opacity={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[10.0, 0.15, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 1.2, -3.2]}>
        <boxGeometry args={[0.15, 1.2, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -3.5]}>
        <boxGeometry args={[3.5, 0.1, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Boat({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[2.2, 0.6, 4.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.8, -0.3]}>
        <boxGeometry args={[1.8, 0.8, 2.2]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.9, 0.7]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.7, 0.4, 0.05]} />
        <meshStandardMaterial color="#003366" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function VehicleMesh({ type, color }: { type: VehicleType; color: string }) {
  switch (type) {
    case 'cybertruck': return <TeslaCybertruck color={color} />
    case 'modelS': return <TeslaModelS color={color} />
    case 'sports': return <SportsCar color={color} />
    case 'suv': return <SUV color={color} />
    case 'sedan': return <Sedan color={color} />
    case 'plane': return <Plane color={color} />
    case 'boat': return <Boat color={color} />
    default: return <TeslaCybertruck color={color} />
  }
}

// Individual vehicle component with position-based physics
interface VehicleProps {
  id: string
  type: VehicleType
  x: number
  z: number
  rotation: number
  color: string
}

const MAX_ALTITUDE = 500

function Vehicle({ id, type, x, z, rotation, color }: VehicleProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const pos = useRef(new THREE.Vector3(x, type === 'plane' ? 50 : 0, z))
  const vel = useRef(new THREE.Vector3(0, 0, 0))
  const angle = useRef(rotation)
  const throttleRef = useRef(0)
  const pitchRef = useRef(0)
  const interactCooldown = useRef(false)
  const prevInteract = useRef(false)

  const isPlane = type === 'plane'
  const isBoat = type === 'boat'
  const isGround = !isPlane && !isBoat

  const spec = VEHICLES.find(v => v.type === type) || VEHICLES[0]

  const playerPosition = useGameStore(s => s.playerPosition)
  const inVehicle = useGameStore(s => s.inVehicle)
  const enterVehicle = useGameStore(s => s.enterVehicle)
  const exitVehicle = useGameStore(s => s.exitVehicle)
  const setVehicleSpeed = useGameStore(s => s.setVehicleSpeed)
  const setNearbyInteractable = useGameStore(s => s.setNearbyInteractable)
  const setIsFlying = useGameStore(s => s.setIsFlying)
  const setAltitude = useGameStore(s => s.setAltitude)
  const setPlayerPosition = useGameStore(s => s.setPlayerPosition)

  const [, getKeys] = useKeyboardControls()
  const playerInThis = inVehicle === id

  // Plane mouse pitch control
  useEffect(() => {
    if (!isPlane) return
    const handleMouseMove = (e: MouseEvent) => {
      pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current + e.movementY * 0.002))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isPlane])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    // Touch input from global
    const touch = (window as any).__touchInput || {}
    const { forward, backward, left, right, brake, boost, interact } = getKeys()
    const fwd = forward || touch.forward
    const bwd = backward || touch.backward
    const lft = left || touch.left
    const rgt = right || touch.right
    const brk = brake || touch.brake
    const bst = playerInThis && (boost || touch.boost || touch.run)
    const intract = interact || touch.interact

    const MAX_SPEED = 30 // m/s hard cap

    if (isGround) {
      // Ground vehicle physics
      if (playerInThis && fwd) vel.current.z -= accel * dt
      if (playerInThis && bwd) vel.current.z += accel * dt
      if (playerInThis && lft) angle.current += spec.handling * dt * 2
      if (playerInThis && rgt) angle.current -= spec.handling * dt * 2

      // Drag
      vel.current.z *= 0.97

      // Clamp speed
      const maxSpd = Math.min(spec.maxSpeed * 0.05, MAX_SPEED)
      vel.current.z = Math.max(-maxSpd, Math.min(maxSpd, vel.current.z))

      if (playerInThis && brk) vel.current.z *= 0.9

      // Move
      pos.current.x -= Math.sin(angle.current) * vel.current.z * dt * 60
      pos.current.z -= Math.cos(angle.current) * vel.current.z * dt * 60
      pos.current.y = 0

      if (playerInThis) setVehicleSpeed(Math.abs(vel.current.z) * 3.6)

    } else if (isBoat) {
      // Boat physics - slower, more floaty
      if (playerInThis && fwd) vel.current.z -= accel * dt
      if (playerInThis && bwd) vel.current.z += accel * dt
      if (playerInThis && lft) angle.current += spec.handling * dt * 1.5
      if (playerInThis && rgt) angle.current -= spec.handling * dt * 1.5

      vel.current.z *= 0.96
      const maxSpd = Math.min(spec.maxSpeed * 0.04, MAX_SPEED)
      vel.current.z = Math.max(-maxSpd, Math.min(maxSpd, vel.current.z))

      if (playerInThis && brk) vel.current.z *= 0.9

      pos.current.x -= Math.sin(angle.current) * vel.current.z * dt * 60
      pos.current.z -= Math.cos(angle.current) * vel.current.z * dt * 60
      pos.current.y = Math.sin(Date.now() * 0.002) * 0.1

      if (playerInThis) {
        setVehicleSpeed(Math.abs(vel.current.z) * 3.6)
        setIsFlying(false)
        setAltitude(0)
      }

    } else {
      // Plane physics
      if (playerInThis && fwd) throttleRef.current = Math.min(1.0, throttleRef.current + 0.03)
      if (playerInThis && bwd) throttleRef.current = Math.max(0, throttleRef.current - 0.02)
      if (!playerInThis || (!fwd && !bwd)) throttleRef.current = Math.max(0, throttleRef.current - 0.01)

      // Move forward in direction of angle
      const speed = throttleRef.current * accel * dt
      pos.current.x -= Math.sin(angle.current) * speed * dt * 10
      pos.current.z -= Math.cos(angle.current) * speed * dt * 10

      // Lift
      if (throttleRef.current > 0.1) {
        pos.current.y += throttleRef.current * 15 * dt
      }
      pos.current.y -= 5 * dt // gravity

      // Altitude clamp
      pos.current.y = Math.max(1, Math.min(MAX_ALTITUDE, pos.current.y))

      // Pitch/yaw
      pitchRef.current *= 0.92
      if (playerInThis && lft) angle.current += spec.handling * dt
      if (playerInThis && rgt) angle.current -= spec.handling * dt

      const hSpeed = Math.sqrt(vel.current.x ** 2 + vel.current.z ** 2)
      if (playerInThis) {
        setVehicleSpeed(hSpeed * 3.6)
        setAltitude(Math.round(pos.current.y))
        setIsFlying(pos.current.y > 2)
      }
    }

    // Map bounds
    pos.current.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, pos.current.x))
    pos.current.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, pos.current.z))

    // Update mesh
    if (meshRef.current) {
      meshRef.current.position.copy(pos.current)
      meshRef.current.rotation.y = angle.current
      if (isPlane) {
        meshRef.current.rotation.z = pitchRef.current * 0.3
      }
    }

    // Sync player position when in vehicle
    if (playerInThis) {
      const height = isPlane ? pos.current.y : (isBoat ? 1.2 : 1.0)
      setPlayerPosition([pos.current.x, height, pos.current.z])

      // Camera follow
      if (isPlane) {
        const camDist = 15
        const tx = pos.current.x + Math.sin(angle.current) * camDist
        const ty = pos.current.y + 5
        const tz = pos.current.z + Math.cos(angle.current) * camDist
        camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.08)
        camera.lookAt(pos.current.x, pos.current.y, pos.current.z)
      } else {
        const camDist = 8
        const tx = pos.current.x + Math.sin(angle.current) * camDist
        const ty = pos.current.y + 3
        const tz = pos.current.z + Math.cos(angle.current) * camDist
        camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.1)
        camera.lookAt(pos.current.x, pos.current.y + 0.5, pos.current.z)
      }
    }

    // Interaction detection
    if (!playerInThis) {
      const dx = playerPosition[0] - pos.current.x
      const dz = playerPosition[2] - pos.current.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 4) {
        setNearbyInteractable({ type: 'vehicle', id }, 'Press E to enter')
      } else {
        const current = useGameStore.getState()
        if (current.nearbyInteractable?.id === id) {
          setNearbyInteractable(null)
        }
      }
    }

    // E key for enter/exit
    if (intract && !prevInteract.current && !interactCooldown.current) {
      const dx = playerPosition[0] - pos.current.x
      const dz = playerPosition[2] - pos.current.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (playerInThis) {
        exitVehicle([pos.current.x, isBoat ? 1.2 : 1.0, pos.current.z])
        interactCooldown.current = true
        setTimeout(() => { interactCooldown.current = false }, 500)
      } else if (dist < 4) {
        enterVehicle(id)
        interactCooldown.current = true
        setTimeout(() => { interactCooldown.current = false }, 500)
      }
    }
    prevInteract.current = intract

    // Show interaction prompt when in vehicle
    if (playerInThis) {
      setNearbyInteractable({ type: 'vehicle', id }, 'Press E to exit')
    }
  })

  return (
    <group ref={meshRef} position={[x, isPlane ? 50 : 0, z]}>
      <VehicleMesh type={type} color={color} />
    </group>
  )
}

// Vehicle spawner
export default function VehicleSpawner() {
  const { groundVehicles, boats, planes } = useMemo(() => {
    const ground: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const water: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const air: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []

    for (let i = 0; i < VEHICLE_COUNT; i++) {
      const spec = VEHICLES[i % 5]
      const rx = seededRandom(i * 17)
      const rz = seededRandom(i * 31)
      const rr = seededRandom(i * 53)
      ground.push({
        id: `vehicle-${i}`,
        type: spec.type,
        x: (rx - 0.5) * MAP_SIZE * 0.6,
        z: (rz - 0.5) * MAP_SIZE * 0.6,
        rotation: rr * Math.PI * 2,
        color: spec.color,
      })
    }

    for (let i = 0; i < 3; i++) {
      const spec = VEHICLES.find(v => v.type === 'boat')!
      const angle = seededRandom(200 + i) * Math.PI * 2
      const dist = MAP_SIZE * 0.5 + seededRandom(300 + i) * 50
      water.push({
        id: `boat-${i}`,
        type: 'boat',
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotation: seededRandom(400 + i) * Math.PI * 2,
        color: spec.color,
      })
    }

    for (let i = 0; i < 2; i++) {
      const spec = VEHICLES.find(v => v.type === 'plane')!
      air.push({
        id: `plane-${i}`,
        type: 'plane',
        x: seededRandom(500 + i) * MAP_SIZE - MAP_SIZE / 2,
        z: seededRandom(600 + i) * MAP_SIZE - MAP_SIZE / 2,
        rotation: seededRandom(700 + i) * Math.PI * 2,
        color: spec.color,
      })
    }

    return { groundVehicles: ground, boats: water, planes: air }
  }, [])

  return (
    <>
      {groundVehicles.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {boats.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {planes.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
    </>
  )
}
