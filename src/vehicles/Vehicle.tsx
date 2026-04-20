import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { useBox } from '@react-three/cannon'
import { useGameStore } from '../game/store'
import type { VehicleType } from '../game/types'
import { VEHICLES } from '../game/constants'

interface VehicleProps {
  id: string
  type: VehicleType
  position: [number, number, number]
  rotation?: number
  color?: string
}

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

const MAX_ALTITUDE = 500

export default function Vehicle({ id, type, position, rotation = 0, color }: VehicleProps) {
  const spec = VEHICLES.find((v) => v.type === type) || VEHICLES[0]
  const vehicleColor = color || spec.color
  const isPlane = type === 'plane'
  const isBoat = type === 'boat'

  const setNearbyInteractable = useGameStore((s) => s.setNearbyInteractable)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const enterVehicle = useGameStore((s) => s.enterVehicle)
  const exitVehicle = useGameStore((s) => s.exitVehicle)
  const setVehicleSpeed = useGameStore((s) => s.setVehicleSpeed)
  const setIsFlying = useGameStore((s) => s.setIsFlying)
  const setAltitude = useGameStore((s) => s.setAltitude)

  const pitchRef = useRef(0)
  const throttleRef = useRef(0)
  const planeVelRef = useRef<[number, number, number]>([0, 0, 0])
  const planePosRef = useRef<[number, number, number]>([0, 0, 0])
  const interactCooldown = useRef(false)

  const [, physApi] = useBox(() => ({
    mass: spec.mass,
    // Spawn at y=1.5 so physics settles vehicle on ground
    position: [position[0], 1.5, position[2]],
    args: [spec.dimensions.x, spec.dimensions.y, spec.dimensions.z],
    linearDamping: isPlane ? 0.1 : 0.5,
    angularDamping: isPlane ? 0.3 : 0.8,
  }))

  const [, getKeys] = useKeyboardControls()
  const playerInThis = inVehicle === id

  // Mouse pitch for planes
  useEffect(() => {
    if (!isPlane) return
    const handleMouseMove = (e: MouseEvent) => {
      pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current + e.movementY * 0.002))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isPlane])

  // Subscribe to velocity for speed updates
  useEffect(() => {
    const unsub = physApi.velocity.subscribe((v) => {
      const vel = v as [number, number, number]
      planeVelRef.current = vel
      if (playerInThis) {
        const hSpeed = Math.sqrt(vel[0] ** 2 + vel[2] ** 2)
        setVehicleSpeed(hSpeed * 50)
      }
    })
    const posUnsub = physApi.position.subscribe((p) => {
      planePosRef.current = p as [number, number, number]
      if (playerInThis) {
        setAltitude(Math.round((p as [number, number, number])[1]))
      }
    })
    return () => {
      unsub()
      posUnsub()
    }
  }, [physApi, playerInThis, setVehicleSpeed, setAltitude])

  useFrame(() => {
    if (!playerInThis) return

    const { forward, backward, left, right, brake, boost } = getKeys()
    const accel = boost ? spec.acceleration * 1.15 : spec.acceleration

    if (isPlane) {
      // Throttle
      if (forward) throttleRef.current = Math.min(1.0, throttleRef.current + 0.03)
      if (backward) throttleRef.current = Math.max(0, throttleRef.current - 0.02)
      if (!forward && !backward) throttleRef.current = Math.max(0, throttleRef.current - 0.01)

      if (throttleRef.current > 0) {
        physApi.applyForce([0, 0, -throttleRef.current * accel * 100], [0, 0, 1])
      }

      // Lift
      const vel = planeVelRef.current
      const speed = Math.sqrt(vel[0] ** 2 + vel[2] ** 2)
      const altitude = planePosRef.current[1]

      if (speed > 5 && throttleRef.current > 0.1) {
        const lift = speed * 0.25 * throttleRef.current
        if (altitude < MAX_ALTITUDE) {
          physApi.applyForce([0, lift * 50, 0], [0, 0, 0])
        }
      }

      // Pitch/Yaw
      pitchRef.current *= 0.92
      physApi.applyTorque([pitchRef.current * 6, 0, 0])
      if (left) physApi.applyTorque([0, 12, 0])
      if (right) physApi.applyTorque([0, -12, 0])

      // Altitude floor
      if (planePosRef.current[1] < 1) {
        physApi.position.set(planePosRef.current[0], 1, planePosRef.current[2])
      }

      setIsFlying(altitude > 2)

    } else {
      // Regular vehicle
      if (forward) physApi.applyForce([0, 0, -accel * 100], [0, 0, 1])
      if (backward) physApi.applyForce([0, 0, accel * 60], [0, 0, -1])
      if (left) physApi.applyTorque([0, 18 * spec.handling, 0])
      if (right) physApi.applyTorque([0, -18 * spec.handling, 0])

      if (brake) {
        const v = planeVelRef.current
        physApi.velocity.set(v[0] * 0.85, v[1], v[2] * 0.85)
      }

      // Boat buoyancy
      if (isBoat && planePosRef.current[1] < 0.5) {
        physApi.applyForce([0, 200, 0], [0, 0, 0])
      }

      // Ground clamp
      const minY = isBoat ? 0.3 : spec.dimensions.y / 2
      if (planePosRef.current[1] < minY) {
        physApi.position.set(planePosRef.current[0], minY, planePosRef.current[2])
      }
    }
  })

  // Interaction detection (separate from physics frame)
  useFrame(() => {
    if (playerInThis) {
      setNearbyInteractable({ type: 'vehicle', id }, 'Press E to exit vehicle')
      return
    }

    const dx = playerPosition[0] - position[0]
    const dz = playerPosition[2] - position[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 4) {
      setNearbyInteractable({ type: 'vehicle', id }, 'Press E to enter vehicle')
    } else {
      const current = useGameStore.getState()
      if (current.nearbyInteractable?.id === id) {
        setNearbyInteractable(null)
      }
    }
  })

  // E key handler — debounced
  useFrame(() => {
    const { interact } = getKeys()
    if (interact && !interactCooldown.current) {
      const dx = playerPosition[0] - position[0]
      const dz = playerPosition[2] - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (playerInThis) {
        exitVehicle()
        interactCooldown.current = true
        setTimeout(() => { interactCooldown.current = false }, 500)
      } else if (dist < 4) {
        enterVehicle(id)
        interactCooldown.current = true
        setTimeout(() => { interactCooldown.current = false }, 500)
      }
    }
  })

  if (playerInThis) return null

  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotation, 0]}>
      <VehicleMesh type={type} color={vehicleColor} />
    </group>
  )
}
