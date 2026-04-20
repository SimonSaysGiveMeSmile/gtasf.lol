import { useFrame } from '@react-three/fiber'
import { useBox } from '@react-three/cannon'
import { useKeyboardControls } from '@react-three/drei'
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
      <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
    </mesh>
  )
}

function TeslaCybertruck({ color }: { color: string }) {
  return (
    <group>
      {/* Main body - angular cybertruck shape */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.8, 4.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Angular top section */}
      <mesh castShadow position={[0, 1.15, -0.3]}>
        <boxGeometry args={[2.0, 0.5, 2.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.1, 1.0]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.9, 0.02, 1.2]} />
        <meshStandardMaterial color="#003344" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 1.1, -1.5]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.9, 0.02, 0.8]} />
        <meshStandardMaterial color="#003344" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      {/* Neon trim */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.25, 0.05, 4.85]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      {/* Headlights */}
      <pointLight position={[0.7, 0.6, 2.4]} color="#00e5ff" intensity={2} distance={8} />
      <pointLight position={[-0.7, 0.6, 2.4]} color="#00e5ff" intensity={2} distance={8} />
      {/* Taillights */}
      <mesh position={[0.9, 0.7, -2.4]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.9, 0.7, -2.4]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={3} />
      </mesh>
      {/* Wheels */}
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
      {/* Body */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.9, 0.6, 4.4]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Hood slope */}
      <mesh castShadow position={[0, 0.7, 1.4]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.85, 0.3, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh castShadow position={[0, 0.9, -0.2]}>
        <boxGeometry args={[1.8, 0.5, 2.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, 0.9, 0.8]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.75, 0.02, 1.0]} />
        <meshStandardMaterial color="#002233" metalness={0.9} transparent opacity={0.5} />
      </mesh>
      {/* Headlights */}
      <pointLight position={[0.6, 0.5, 2.2]} color="#aaeeff" intensity={1.5} distance={8} />
      <pointLight position={[-0.6, 0.5, 2.2]} color="#aaeeff" intensity={1.5} distance={8} />
      {/* Wheels */}
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
      {/* Low body */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.9, 0.4, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Aerodynamic top */}
      <mesh castShadow position={[0, 0.65, -0.1]}>
        <boxGeometry args={[1.7, 0.35, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Spoiler */}
      <mesh position={[0, 0.75, -2.0]}>
        <boxGeometry args={[1.6, 0.08, 0.3]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.85, -2.0]}>
        <boxGeometry args={[0.05, 0.25, 0.3]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      {/* Wheels */}
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
      {/* Fuselage */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 1.0, 7.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cockpit */}
      <mesh castShadow position={[0, 1.0, 2.8]}>
        <boxGeometry args={[1.1, 0.6, 2.0]} />
        <meshStandardMaterial color="#001133" metalness={0.8} transparent opacity={0.6} />
      </mesh>
      {/* Wings */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[10.0, 0.15, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Tail */}
      <mesh castShadow position={[0, 1.2, -3.2]}>
        <boxGeometry args={[0.15, 1.2, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -3.5]}>
        <boxGeometry args={[3.5, 0.1, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Prop */}
      <mesh position={[0, 0.6, 4.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.1, 2.5, 0.1]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
    </group>
  )
}

function Boat({ color }: { color: string }) {
  return (
    <group>
      {/* Hull */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[2.2, 0.6, 4.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Cabin */}
      <mesh castShadow position={[0, 0.8, -0.3]}>
        <boxGeometry args={[1.8, 0.8, 2.2]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 0.9, 0.7]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.7, 0.4, 0.05]} />
        <meshStandardMaterial color="#003366" transparent opacity={0.5} />
      </mesh>
      {/* Bow taper */}
      <mesh position={[0, 0.25, 2.4]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.4, 1.0]} />
        <meshStandardMaterial color={color} roughness={0.6} />
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

export default function Vehicle({ id, type, position, rotation = 0, color }: VehicleProps) {
  const spec = VEHICLES.find((v) => v.type === type) || VEHICLES[0]
  const vehicleColor = color || spec.color
  const isWater = type === 'boat'

  const setNearbyInteractable = useGameStore((s) => s.setNearbyInteractable)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const enterVehicle = useGameStore((s) => s.enterVehicle)
  const exitVehicle = useGameStore((s) => s.exitVehicle)

  const [, physApi] = useBox(() => ({
    mass: spec.mass,
    position,
    args: [spec.dimensions.x, spec.dimensions.y, spec.dimensions.z],
    linearDamping: 0.5,
    angularDamping: 0.8,
  }))

  const [, getKeys] = useKeyboardControls()

  const playerInThis = inVehicle === id

  // Vehicle physics controls
  useFrame(() => {
    if (!playerInThis) return

    const { forward, backward, left, right, brake, boost } = getKeys()

    const accel = boost ? spec.acceleration * 1.15 : spec.acceleration

    // Simple arcade vehicle physics
    if (forward) {
      physApi.applyForce([0, 0, -accel * 100], [0, 0, 1])
    }
    if (backward) {
      physApi.applyForce([0, 0, accel * 60], [0, 0, -1])
    }
    if (left) {
      physApi.applyTorque([0, 20 * spec.handling, 0])
    }
    if (right) {
      physApi.applyTorque([0, -20 * spec.handling, 0])
    }
    if (brake) {
      const vel = physApi.velocity
      vel.subscribe((v) => {
        physApi.velocity.set(v[0] * 0.9, v[1], v[2] * 0.9)
      })
    }

    // Buoyancy for boats
    if (isWater) {
      physApi.position.subscribe((p) => {
        if (p[1] < 0.5) {
          physApi.applyForce([0, 150, 0], [0, 0, 0])
        }
      })
    }

    // Ground fix - keep vehicles from falling through
    physApi.position.subscribe((p) => {
      if (p[1] < spec.dimensions.y / 2) {
        physApi.position.set(p[0], spec.dimensions.y / 2, p[2])
      }
    })
  })

  // Check proximity for interaction
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
      if (useGameStore.getState().nearbyInteractable?.id === id) {
        setNearbyInteractable(null)
      }
    }
  })

  // Handle E key for enter/exit
  useFrame(() => {
    const { interact } = getKeys()
    if (interact) {
      const dx = playerPosition[0] - position[0]
      const dz = playerPosition[2] - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (playerInThis) {
        exitVehicle()
      } else if (dist < 4) {
        enterVehicle(id)
      }
    }
  })

  // Hide when player is inside
  if (playerInThis) return null

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
    >
      <VehicleMesh type={type} color={vehicleColor} />
    </group>
  )
}