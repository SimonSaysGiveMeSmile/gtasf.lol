// @t1an
import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { VehicleType } from '../game/types'
import { VEHICLES, MAP_SIZE, VEHICLE_COUNT, SCOOTER_COUNT, PLANE_COUNT, BOAT_COUNT } from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'
import { vehiclePositions, vehicleRadius, OBSTACLE_RADIUS } from '../game/vehicleState'
import { getNearbyBuildingsGrid } from '../world/World'
import { VehicleAdWrap } from '../systems/billboards/VehicleAdWraps'
import CaltrainAdWrap from '../systems/billboards/CaltrainAdWrap'

// Cheat-spawned vehicle type
interface CheatVehicle {
  id: string
  type: VehicleType
  x: number
  z: number
  rotation: number
  color: string
}

// Seeded random for deterministic spawns // @jiahe
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ── Obstacle collision helpers ───────────────────────────────────────────────
const TREE_RADIUS = 0.4

function isClearOfBuildings(x: number, z: number, r: number): boolean {
  for (const b of LANDSCAPE_CONFIG.buildings) {
    const hx = b.width / 2 + r + 2
    const hz = b.depth / 2 + r + 2
    if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return false
  }
  return true
}

function findSplineSpawnPoint(seed: number): { x: number; z: number } | null {
  // Collect all road path points as potential spawn locations
  const allPoints: { x: number; z: number }[] = []
  for (const path of LANDSCAPE_CONFIG.roadPaths) {
    for (let i = 0; i < path.length; i += 8) {
      allPoints.push({ x: path[i].x, z: path[i].z })
    }
  }
  if (allPoints.length === 0) return null

  // Shuffle with seed
  for (let i = allPoints.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i * 17) * (i + 1))
    const tmp = allPoints[i]
    allPoints[i] = allPoints[j]
    allPoints[j] = tmp
  }

  // Try to find a clear spot
  for (const pt of allPoints) {
    if (isClearOfBuildings(pt.x, pt.z, vehicleRadius('sedan'))) {
      return pt
    }
  }
  return allPoints[0]
}

function checkBuildingCollision(px: number, pz: number, r: number) {
  const nearby = getNearbyBuildingsGrid(px, pz, r)
  const buildings = LANDSCAPE_CONFIG.buildings
  for (const i of nearby) {
    const b = buildings[i]
    const hx = b.width / 2 + r
    const hz = b.depth / 2 + r
    const dx = px - b.x
    const dz = pz - b.z
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      return { hit: true, hx, hz, bounceX: dx, bounceZ: dz }
    }
  }
  return { hit: false, hx: 0, hz: 0, bounceX: 0, bounceZ: 0 }
}

function checkTreeCollision(px: number, pz: number, r: number) {
  for (const t of LANDSCAPE_CONFIG.trees) {
    const dx = px - t.x
    const dz = pz - t.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const minDist = r + TREE_RADIUS
    if (dist < minDist && dist > 0.001) {
      return { hit: true, dist, dx, dz }
    }
  }
  return { hit: false, dist: 0, dx: 0, dz: 0 }
}

// Vehicle mesh components
function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.25, 12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
    </mesh>
  )
}

function TeslaCybertruck({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.8, 4.8]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.15, -0.3]}>
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
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.9, 0.6, 4.4]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 1.4]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.85, 0.3, 1.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, -0.2]}>
        <boxGeometry args={[1.8, 0.5, 2.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, 0.8]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.75, 0.02, 1.0]} />
        <meshStandardMaterial color="#002233" metalness={0.9} transparent opacity={0.5} />
      </mesh>
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
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.9, 0.4, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.65, -0.1]}>
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
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.0, 0.8, 4.3]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.9, 0.6, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.25, -0.2]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.8, 0.02, 1.5]} />
        <meshStandardMaterial color="#001122" metalness={0.9} transparent opacity={0.5} />
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
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.85, 0.55, 4.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.85, -0.1]}>
        <boxGeometry args={[1.7, 0.45, 2.0]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.85, 0.6]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.65, 0.02, 1.0]} />
        <meshStandardMaterial color="#001122" metalness={0.9} transparent opacity={0.5} />
      </mesh>
      <Wheel position={[0.78, 0.33, 1.2]} />
      <Wheel position={[-0.78, 0.33, 1.2]} />
      <Wheel position={[0.78, 0.33, -1.2]} />
      <Wheel position={[-0.78, 0.33, -1.2]} />
    </group>
  )
}

function SemiTruck({ color }: { color: string }) {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 0.9, 1.5]}>
        <boxGeometry args={[2.4, 1.8, 3.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Cab roof visor */}
      <mesh position={[0, 1.75, 2.2]}>
        <boxGeometry args={[2.3, 0.15, 0.8]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.1, 3.1]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[2.2, 0.7, 0.05]} />
        <meshStandardMaterial color="#002233" metalness={0.9} transparent opacity={0.5} />
      </mesh>
      {/* Headlights */}
      <mesh position={[0.7, 0.6, 3.11]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffeecc" emissive="#ffcc44" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-0.7, 0.6, 3.11]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffeecc" emissive="#ffcc44" emissiveIntensity={2} />
      </mesh>
      {/* Cargo container */}
      <mesh position={[0, 1.5, -3.3]}>
        <boxGeometry args={[2.5, 3.0, 6.5]} />
        <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Cargo detail lines */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[2.52, 0.05, 6.52]} />
        <meshStandardMaterial color="#555555" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Exhaust stacks */}
      <mesh position={[1.15, 2.5, 1.5]}>
        <cylinderGeometry args={[0.08, 0.1, 1.5, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-1.15, 2.5, 1.5]}>
        <cylinderGeometry args={[0.08, 0.1, 1.5, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
      </mesh>
      <Wheel position={[0.9, 0.45, 2.5]} />
      <Wheel position={[-0.9, 0.45, 2.5]} />
      <Wheel position={[0.9, 0.45, -1.5]} />
      <Wheel position={[-0.9, 0.45, -1.5]} />
      <Wheel position={[0.9, 0.45, -5.5]} />
      <Wheel position={[-0.9, 0.45, -5.5]} />
    </group>
  )
}

function Scooter({ color }: { color: string }) {
  return (
    <group>
      {/* Deck */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.25, 0.08, 1.0]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.55, -0.3]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Handlebars */}
      <mesh position={[0, 0.95, -0.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Grips */}
      <mesh position={[0.3, 0.95, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#ff4444" roughness={0.9} />
      </mesh>
      <mesh position={[-0.3, 0.95, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#ff4444" roughness={0.9} />
      </mesh>
      {/* Front wheel */}
      <mesh position={[0, 0.15, -0.35]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      {/* Rear wheel */}
      <mesh position={[0, 0.15, 0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      {/* Platform body */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.24, 0.05, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Headlight */}
      <mesh position={[0, 0.85, -0.32]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffeeaa" emissiveIntensity={2} />
      </mesh>
      {/* Taillight */}
      <mesh position={[0, 0.3, 0.48]}>
        <boxGeometry args={[0.1, 0.05, 0.03]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function CaltrainCar({ color }: { color: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.8, 1.6, 8.0]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[2.7, 0.15, 7.8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Windows — left side */}
      {[-3.0, -1.5, 0, 1.5, 3.0].map((wx, idx) => (
        <mesh key={`wl-${idx}`} position={[-1.41, 0.9, wx]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.0, 0.6]} />
          <meshStandardMaterial color="#88ccff" metalness={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Windows — right side */}
      {[-3.0, -1.5, 0, 1.5, 3.0].map((wx, idx) => (
        <mesh key={`wr-${idx}`} position={[1.41, 0.9, wx]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.0, 0.6]} />
          <meshStandardMaterial color="#88ccff" metalness={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Doors */}
      <mesh position={[0, 0.7, -2.5]}>
        <boxGeometry args={[2.78, 1.0, 0.1]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 2.5]}>
        <boxGeometry args={[2.78, 1.0, 0.1]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Wheels / bogies */}
      <mesh position={[0.9, 0.2, -2.5]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.3, 0.3, 1.2]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 0.2, -2.5]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.3, 0.3, 1.2]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.2, 2.5]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.3, 0.3, 1.2]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 0.2, 2.5]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.3, 0.3, 1.2]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 1.9, -3.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 4]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Plane({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 1.0, 7.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 2.8]}>
        <boxGeometry args={[1.1, 0.6, 2.0]} />
        <meshStandardMaterial color="#001133" metalness={0.8} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[10.0, 0.15, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.2, -3.2]}>
        <boxGeometry args={[0.15, 1.2, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, -3.5]}>
        <boxGeometry args={[3.5, 0.1, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Boat({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2.2, 0.6, 4.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.8, -0.3]}>
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

export function VehicleMesh({ type, color }: { type: VehicleType; color: string }) {
  switch (type) {
    case 'cybertruck': return <TeslaCybertruck color={color} />
    case 'modelS': return <TeslaModelS color={color} />
    case 'sports': return <SportsCar color={color} />
    case 'suv': return <SUV color={color} />
    case 'sedan': return <Sedan color={color} />
    case 'semi': return <SemiTruck color={color} />
    case 'scooter': return <Scooter color={color} />
    case 'caltrain': return <CaltrainCar color={color} />
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
  const isCaltrain = type === 'caltrain'
  const isScooter = type === 'scooter'
  const isGround = !isPlane && !isBoat && !isCaltrain

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
      pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current - e.movementY * 0.002))
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
    const intract = interact || touch.interact

    const MAX_SPEED = 30 // m/s hard cap
    const accel = playerInThis && (boost || touch.boost || touch.run)
      ? spec.acceleration * 1.15
      : spec.acceleration

    if (isGround) {
      // Ground vehicle physics — W/S inverted so W moves backward, S moves forward (car-style)
      // Scooters: W=forward, S=backward (normal direction)
      const accelMod = isScooter ? -1 : 1
      if (playerInThis && fwd) vel.current.z += accel * dt * accelMod
      if (playerInThis && bwd) vel.current.z -= accel * dt * accelMod
      if (playerInThis && lft) angle.current -= spec.handling * dt * 2
      if (playerInThis && rgt) angle.current += spec.handling * dt * 2

      // Drag
      vel.current.z *= 0.97

      // Clamp speed
      const maxSpd = Math.min(spec.maxSpeed * 0.005, MAX_SPEED)
      vel.current.z = Math.max(-maxSpd, Math.min(maxSpd, vel.current.z))

      if (playerInThis && brk) vel.current.z *= 0.9

      // Pre-movement collision: try each axis independently, slide along walls
      const vR = vehicleRadius(type)
      const dx = Math.sin(angle.current) * vel.current.z * dt * 60
      const dz = Math.cos(angle.current) * vel.current.z * dt * 60
      const px = pos.current.x + dx
      const pz = pos.current.z + dz

      // Check X-only movement
      const xCol = checkBuildingCollision(px, pos.current.z, vR)
      // Check Z-only movement
      const zCol = checkBuildingCollision(pos.current.x, pz, vR)
      // Check full movement
      const fCol = checkBuildingCollision(px, pz, vR)

      let finalDx = 0
      let finalDz = 0

      if (!fCol.hit) {
        // Free path — move freely
        finalDx = dx
        finalDz = dz
      } else {
        // Collision in at least one axis — try sliding
        if (!xCol.hit) {
          finalDx = dx
        } else if (!zCol.hit) {
          // Sliding along Z axis
          finalDz = dz
          vel.current.z *= 0.5
        } else {
          // Corner — block movement
          vel.current.z *= 0.2
        }
      }

      pos.current.x += finalDx
      pos.current.z += finalDz
      pos.current.y = 0

      // Tree collision (push-out approach — trees are small enough this is fine)
      const tCol = checkTreeCollision(pos.current.x, pos.current.z, vR)
      if (tCol.hit) {
        const nd = tCol.dist - (vR + TREE_RADIUS)
        pos.current.x -= (tCol.dx / tCol.dist) * nd
        pos.current.z -= (tCol.dz / tCol.dist) * nd
        vel.current.z *= 0.4
      }

      // Vehicle-vehicle collision — push this vehicle away from all other vehicles
      for (const [otherId, other] of vehiclePositions) {
        if (otherId === id) continue
        const dvx = pos.current.x - other.x
        const dvz = pos.current.z - other.z
        const dvDist = Math.sqrt(dvx * dvx + dvz * dvz)
        const minV = vR + other.radius + 0.1
        if (dvDist < minV && dvDist > 0.001) {
          const nd = minV - dvDist
          pos.current.x += (dvx / dvDist) * nd
          pos.current.z += (dvz / dvDist) * nd
          vel.current.z *= 0.3
        }
      }

      // Light pole collision
      for (const lamp of LANDSCAPE_CONFIG.streetLamps) {
        const lx = lamp.x - pos.current.x
        const lz = lamp.z - pos.current.z
        const lDist = Math.sqrt(lx * lx + lz * lz)
        const minL = vR + OBSTACLE_RADIUS.lightPole + 0.1
        if (lDist < minL && lDist > 0.001) {
          const nd = minL - lDist
          pos.current.x += (lx / lDist) * nd
          pos.current.z += (lz / lDist) * nd
          vel.current.z *= 0.4
        }
      }

      // Traffic light / bench / hydrant collision
      for (const tl of LANDSCAPE_CONFIG.trafficLights) {
        const tx = tl.x - pos.current.x; const tz = tl.z - pos.current.z
        const tDist = Math.sqrt(tx * tx + tz * tz)
        const minT = vR + OBSTACLE_RADIUS.trafficLight + 0.1
        if (tDist < minT && tDist > 0.001) {
          const nd = minT - tDist
          pos.current.x += (tx / tDist) * nd; pos.current.z += (tz / tDist) * nd
          vel.current.z *= 0.4
        }
      }
      for (const bs of LANDSCAPE_CONFIG.busStops) {
        const bx = bs.x - pos.current.x; const bz = bs.z - pos.current.z
        const bDist = Math.sqrt(bx * bx + bz * bz)
        const minB = vR + OBSTACLE_RADIUS.busStop + 0.1
        if (bDist < minB && bDist > 0.001) {
          const nd = minB - bDist
          pos.current.x += (bx / bDist) * nd; pos.current.z += (bz / bDist) * nd
          vel.current.z *= 0.4
        }
      }
      for (const h of LANDSCAPE_CONFIG.hydrants) {
        const hx = h.x - pos.current.x; const hz = h.z - pos.current.z
        const hDist = Math.sqrt(hx * hx + hz * hz)
        const minH = vR + OBSTACLE_RADIUS.hydrant + 0.1
        if (hDist < minH && hDist > 0.001) {
          const nd = minH - hDist
          pos.current.x += (hx / hDist) * nd; pos.current.z += (hz / hDist) * nd
          vel.current.z *= 0.4
        }
      }

      if (playerInThis) setVehicleSpeed(Math.abs(vel.current.z) * 216)

    } else if (isBoat) {
      // Boat physics — W moves forward toward camera
      if (playerInThis && fwd) vel.current.z -= accel * dt
      if (playerInThis && bwd) vel.current.z += accel * dt
      if (playerInThis && lft) angle.current -= spec.handling * dt * 1.5
      if (playerInThis && rgt) angle.current += spec.handling * dt * 1.5

      vel.current.z *= 0.96
      const maxSpd = Math.min(spec.maxSpeed * 0.0004, MAX_SPEED)
      vel.current.z = Math.max(-maxSpd, Math.min(maxSpd, vel.current.z))

      if (playerInThis && brk) vel.current.z *= 0.9

      pos.current.x += Math.sin(angle.current) * vel.current.z * dt * 60
      pos.current.z += Math.cos(angle.current) * vel.current.z * dt * 60
      pos.current.y = Math.sin(Date.now() * 0.002) * 0.1

      if (playerInThis) {
        setVehicleSpeed(Math.abs(vel.current.z) * 216)
        setIsFlying(false)
        setAltitude(0)
      }

      // Boat-vehicle collision
      const boatR = vehicleRadius(type)
      for (const [otherId, other] of vehiclePositions) {
        if (otherId === id) continue
        const dvx = pos.current.x - other.x; const dvz = pos.current.z - other.z
        const dvDist = Math.sqrt(dvx * dvx + dvz * dvz)
        const minV = boatR + other.radius + 0.1
        if (dvDist < minV && dvDist > 0.001) {
          const nd = minV - dvDist
          pos.current.x += (dvx / dvDist) * nd; pos.current.z += (dvz / dvDist) * nd
        }
      }

    } else if (isCaltrain) {
      // Caltrain rail physics — follows the track automatically
      const railPaths = LANDSCAPE_CONFIG.caltransPaths
      const trackIdx = railPaths.length > 0 ? 0 : -1
      if (trackIdx >= 0 && railPaths[trackIdx].length > 0) {
        const path = railPaths[trackIdx]
        // Find nearest point on track
        let nearestIdx = 0
        let nearestDist = Infinity
        for (let i = 0; i < path.length; i++) {
          const dx = pos.current.x - path[i].x
          const dz = pos.current.z - path[i].z
          const d = Math.sqrt(dx * dx + dz * dz)
          if (d < nearestDist) { nearestDist = d; nearestIdx = i }
        }
        const targetIdx = (nearestIdx + (vel.current.z >= 0 ? 1 : -1) + path.length) % path.length
        const tgt = path[targetIdx]
        const dx = tgt.x - pos.current.x
        const dz = tgt.z - pos.current.z
        const distToTarget = Math.sqrt(dx * dx + dz * dz)

        // Auto-accelerate to max speed
        const maxSpd = Math.min(spec.maxSpeed * 0.003, 0.5)
        if (playerInThis) {
          if (fwd) vel.current.z = Math.min(maxSpd, vel.current.z + accel * dt * 0.5)
          else if (bwd) vel.current.z = Math.max(-maxSpd * 0.3, vel.current.z - accel * dt * 0.5)
          else vel.current.z *= 0.98
        } else {
          vel.current.z = maxSpd * 0.5
        }

        if (distToTarget > 0.1) {
          pos.current.x += (dx / distToTarget) * vel.current.z * dt * 60
          pos.current.z += (dz / distToTarget) * vel.current.z * dt * 60
          angle.current = Math.atan2(dx, dz)
        }
        pos.current.y = 0

        if (playerInThis) {
          setVehicleSpeed(Math.abs(vel.current.z) * 216)
          setIsFlying(false)
          setAltitude(0)
        }
      }

    } else {
      // Plane physics
      if (playerInThis && fwd) throttleRef.current = Math.max(0, throttleRef.current - 0.02)
      if (playerInThis && bwd) throttleRef.current = Math.min(1.0, throttleRef.current + 0.03)
      if (!playerInThis || (!fwd && !bwd)) throttleRef.current = Math.max(0, throttleRef.current - 0.01)

      const speed = throttleRef.current * accel * dt
      pos.current.x -= Math.sin(angle.current) * speed * dt * 10
      pos.current.z -= Math.cos(angle.current) * speed * dt * 10

      // Lift
      if (throttleRef.current > 0.1) {
        pos.current.y += throttleRef.current * 15 * dt
      }
      pos.current.y -= 5 * dt // gravity

      // Building collision (plane crashes into buildings at low altitude)
      if (pos.current.y < 30) {
        const pCol = checkBuildingCollision(pos.current.x, pos.current.z, 4)
        if (pCol.hit) {
          pos.current.y = Math.max(pos.current.y + 2, 30)
        }
      }

      // Altitude clamp
      pos.current.y = Math.max(1, Math.min(MAX_ALTITUDE, pos.current.y))

      // Pitch/yaw
      pitchRef.current *= 0.92
      if (playerInThis && lft) angle.current -= spec.handling * dt
      if (playerInThis && rgt) angle.current += spec.handling * dt

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
        const tx = pos.current.x - Math.sin(angle.current) * camDist
        const ty = pos.current.y + 5
        const tz = pos.current.z - Math.cos(angle.current) * camDist
        camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.08)
        camera.lookAt(pos.current.x, pos.current.y, pos.current.z)
      } else {
        const camDist = 8
        const tx = pos.current.x - Math.sin(angle.current) * camDist
        const ty = pos.current.y + 3
        const tz = pos.current.z - Math.cos(angle.current) * camDist
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
        setNearbyInteractable({ type: 'vehicle', id }, 'Press F to enter')
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
        enterVehicle(id, type)
        interactCooldown.current = true
        setTimeout(() => { interactCooldown.current = false }, 500)
      }
    }
    prevInteract.current = intract


      // Register vehicle position for NPC/pedestrian collision
      vehiclePositions.set(id, { x: pos.current.x, z: pos.current.z, radius: vehicleRadius(type) })

    // Show interaction prompt when in vehicle
    if (playerInThis) {
      setNearbyInteractable({ type: 'vehicle', id }, 'Press F to exit')
    }
  })

  return (
    <group ref={meshRef} position={[x, isPlane ? 50 : 0, z]}>
      <VehicleMesh type={type} color={color} />
      <VehicleAdWrap vehicleId={id} vehicleType={type} />
      {isCaltrain && <CaltrainAdWrap index={Math.floor(Math.abs(x * 7 + z * 13)) % 10} seedX={x} seedZ={z} />}
    </group>
  )
}

// Vehicle spawner
export default function VehicleSpawner() {
  const [cheatVehicles, setCheatVehicles] = useState<CheatVehicle[]>([])

  // Listen for cheat spawn events
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, type, x, z, rotation } = (e as CustomEvent).detail
      const spec = VEHICLES.find(v => v.type === type) || VEHICLES[0]
      setCheatVehicles(prev => [...prev, { id, type, x, z, rotation, color: spec.color }])
    }
    window.addEventListener('cheat-spawn', handler)
    return () => window.removeEventListener('cheat-spawn', handler)
  }, [])

  const { groundVehicles, boats, planes, scooters, caltrains } = useMemo(() => {
    const ground: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const water: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const air: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const scoot: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []
    const trains: { id: string; type: VehicleType; x: number; z: number; rotation: number; color: string }[] = []

    const scooterSpec = VEHICLES.find(v => v.type === 'scooter')!
    const caltrainSpec = VEHICLES.find(v => v.type === 'caltrain')!

    for (let i = 0; i < VEHICLE_COUNT; i++) {
      const spec = VEHICLES[i % 5]
      const rr = seededRandom(i * 53)
      const spawn = findSplineSpawnPoint(i * 137)
      const sx = spawn ? spawn.x : (seededRandom(i * 17) - 0.5) * MAP_SIZE * 0.5
      const sz = spawn ? spawn.z : (seededRandom(i * 31) - 0.5) * MAP_SIZE * 0.5
      ground.push({
        id: `vehicle-${i}`,
        type: spec.type,
        x: sx,
        z: sz,
        rotation: rr * Math.PI * 2,
        color: spec.color,
      })
    }

    // E-scooters scattered around pedestrian areas
    for (let i = 0; i < SCOOTER_COUNT; i++) {
      const sx = (seededRandom(1000 + i * 41) - 0.5) * MAP_SIZE * 0.7
      const sz = (seededRandom(1100 + i * 37) - 0.5) * MAP_SIZE * 0.7
      if (isClearOfBuildings(sx, sz, 1.5)) {
        scoot.push({
          id: `scooter-${i}`,
          type: 'scooter',
          x: sx,
          z: sz,
          rotation: seededRandom(1200 + i) * Math.PI * 2,
          color: scooterSpec.color,
        })
      }
    }

    // Caltrain cars — spawned along rail lines
    const railPaths = LANDSCAPE_CONFIG.caltransPaths
    for (let t = 0; t < railPaths.length; t++) {
      const path = railPaths[t]
      if (!path || path.length === 0) continue
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor((i / 2) * path.length) % path.length
        const pt = path[idx]
        const nextIdx = (idx + 1) % path.length
        const nextPt = path[nextIdx]
        const dx = nextPt.x - pt.x
        const dz = nextPt.z - pt.z
        trains.push({
          id: `caltrain-t${t}-${i}`,
          type: 'caltrain',
          x: pt.x,
          z: pt.z,
          rotation: Math.atan2(dx, dz),
          color: caltrainSpec.color,
        })
      }
    }

    // Boats in water region
    for (let i = 0; i < BOAT_COUNT; i++) {
      const spec = VEHICLES.find(v => v.type === 'boat')!
      const angle = seededRandom(200 + i) * Math.PI * 2
      const dist = MAP_SIZE * 0.55 + seededRandom(300 + i) * 60
      water.push({
        id: `boat-${i}`,
        type: 'boat',
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotation: seededRandom(400 + i) * Math.PI * 2,
        color: spec.color,
      })
    }

    for (let i = 0; i < PLANE_COUNT; i++) {
      const spec = VEHICLES.find(v => v.type === 'plane')!
      const angle = seededRandom(500 + i) * Math.PI * 2
      const dist = MAP_SIZE * 0.3 + seededRandom(600 + i) * MAP_SIZE * 0.4
      air.push({
        id: `plane-${i}`,
        type: 'plane',
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotation: seededRandom(700 + i) * Math.PI * 2,
        color: i % 2 === 0 ? spec.color : '#d0d0e0',
      })
    }

    return { groundVehicles: ground, boats: water, planes: air, scooters: scoot, caltrains: trains }
  }, [])

  return (
    <>
      {groundVehicles.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {scooters.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {caltrains.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {boats.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {planes.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
      {cheatVehicles.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
    </>
  )
}
