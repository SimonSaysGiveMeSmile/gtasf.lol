import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useBox, usePlane } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../game/store'
import {
  MAP_SIZE,
  BUILDING_COUNT,
  TREE_COUNT,
  BUILDING_COLORS,
  WINDOW_COLORS,
} from '../game/constants'

// Seeded random for deterministic world generation
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ─── PHYSICS GROUND ─────────────────────────────────────────────────────────
function PhysicsGround() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const groundColor = timeOfDay === 'night' ? '#0a0a1a' : '#1a2a1a'

  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static',
  }))

  return (
    <mesh ref={ref as any} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[MAP_SIZE * 2, MAP_SIZE * 2]} />
      <meshStandardMaterial color={groundColor} roughness={0.9} metalness={0} />
    </mesh>
  )
}

// ─── PHYSICS BUILDING ───────────────────────────────────────────────────────
function Building({ position, width, depth, height, color, seed }: {
  position: [number, number, number]
  width: number
  depth: number
  height: number
  color: string
  seed: number
}) {
  const windowPattern = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 64, 128)

    const rows = Math.floor(Math.min(height / 3, 20))
    const cols = Math.floor(Math.min(width / 2, 10))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (seededRandom(seed + r * 100 + c) > 0.3) {
          const wColor = WINDOW_COLORS[Math.floor(seededRandom(seed + r + c * 7) * WINDOW_COLORS.length)]
          ctx.fillStyle = wColor
          const wx = 4 + c * (54 / Math.max(cols, 1))
          const wy = 4 + r * (118 / Math.max(rows, 1))
          ctx.fillRect(wx, wy, 10, 14)
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [color, height, width, seed])

  const emissiveIntensity = useMemo(() => 0.3 + seededRandom(seed * 3) * 0.7, [seed])

  // Static physics body for building collision
  const [physRef] = useBox(() => ({
    position,
    args: [width, height, depth],
    type: 'Static',
  }))

  return (
    <group>
      {/* Physics collider (invisible) */}
      <mesh ref={physRef as any} visible={false}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial />
      </mesh>
      {/* Visual mesh */}
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0.15}
          emissive="#ffaa00"
          emissiveIntensity={emissiveIntensity * 0.08}
          emissiveMap={windowPattern}
        />
      </mesh>
      {/* Rooftop antenna */}
      {seededRandom(seed + 2) > 0.7 && (
        <mesh position={[position[0] + width * 0.3, position[1] + height / 2 + 2, position[2] + depth * 0.3]}>
          <cylinderGeometry args={[0.3, 0.3, 4, 8]} />
          <meshStandardMaterial color="#333344" roughness={1} />
        </mesh>
      )}
    </group>
  )
}

function Buildings() {
  const buildings = useMemo(() => {
    const result = []
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const rng = seededRandom(i * 17 + 3)
      const rng2 = seededRandom(i * 31 + 7)
      const rng3 = seededRandom(i * 53 + 11)
      const rng4 = seededRandom(i * 97 + 13)

      const width = 6 + rng * 14
      const depth = 6 + rng2 * 14
      const height = 10 + rng3 * 70
      const color = BUILDING_COLORS[Math.floor(rng4 * BUILDING_COLORS.length)]

      const angle = rng * Math.PI * 2
      const dist = 20 + rng2 * MAP_SIZE * 0.45
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      result.push({ id: i, position: [x, height / 2, z] as [number, number, number], width, depth, height, color, seed: i })
    }
    return result
  }, [])

  return (
    <>
      {buildings.map((b) => (
        <Building key={b.id} {...b} />
      ))}
    </>
  )
}

// ─── TREES ───────────────────────────────────────────────────────────────────
function Tree({ position }: { position: [number, number, number] }) {
  const [ref] = useBox(() => ({
    position: [position[0], position[1] + 2.5, position[2]],
    args: [0.5, 5, 0.5],
    type: 'Static',
  }))

  return (
    <group>
      <mesh ref={ref as any} visible={false}>
        <boxGeometry args={[0.5, 5, 0.5]} />
        <meshBasicMaterial />
      </mesh>
      {/* Trunk */}
      <mesh position={[position[0], position[1] + 1.5, position[2]]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 3, 6]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
      {/* Foliage */}
      <mesh position={[position[0], position[1] + 4, position[2]]} castShadow>
        <coneGeometry args={[1.8, 4, 6]} />
        <meshStandardMaterial color="#0a3a1a" roughness={1} />
      </mesh>
      <mesh position={[position[0], position[1] + 5.5, position[2]]} castShadow>
        <coneGeometry args={[1.3, 3, 6]} />
        <meshStandardMaterial color="#0a4a1a" roughness={1} />
      </mesh>
    </group>
  )
}

function Trees() {
  const trees = useMemo(() => {
    const result = []
    for (let i = 0; i < TREE_COUNT; i++) {
      const rng = seededRandom(i * 23 + 5)
      const angle = rng * Math.PI * 2
      const dist = 30 + rng * MAP_SIZE * 0.4
      const x = Math.cos(angle) * dist + (seededRandom(i * 41) - 0.5) * 40
      const z = Math.sin(angle) * dist + (seededRandom(i * 59) - 0.5) * 40
      result.push({ id: i, position: [x, 0, z] as [number, number, number] })
    }
    return result
  }, [])

  return (
    <>
      {trees.map((t) => (
        <Tree key={t.id} position={t.position} />
      ))}
    </>
  )
}

// ─── STREET LAMPS ────────────────────────────────────────────────────────────
function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 6, 6]} />
        <meshStandardMaterial color="#333344" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Lamp */}
      <mesh position={[0, 6.2, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.4, 6]} />
        <meshStandardMaterial color="#222233" metalness={0.8} />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, 6.0, 0]}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshStandardMaterial color="#ffeecc" emissive="#ffaa00" emissiveIntensity={3} />
      </mesh>
      <pointLight color="#ffaa44" intensity={1.5} distance={20} position={[0, 6, 0]} />
    </group>
  )
}

function StreetLamps() {
  const lamps = useMemo(() => {
    const result = []
    for (let i = 0; i < 40; i++) {
      const rng = seededRandom(i * 37 + 3)
      const x = (rng - 0.5) * MAP_SIZE * 0.8
      const z = (seededRandom(i * 71 + 7) - 0.5) * MAP_SIZE * 0.8
      result.push({ id: i, position: [x, 0, z] as [number, number, number] })
    }
    return result
  }, [])

  return (
    <>
      {lamps.map((l) => (
        <StreetLamp key={l.id} position={l.position} />
      ))}
    </>
  )
}

// ─── WATER ───────────────────────────────────────────────────────────────────
function Water() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 0.5) * 0.08
    }
  })

  const [waterRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [-MAP_SIZE * 0.5 - 50, -0.5, 0],
    type: 'Static',
  }))

  return (
    <mesh ref={waterRef as any} rotation={[-Math.PI / 2, 0, 0]} position={[-MAP_SIZE * 0.5 - 50, -0.5, 0]}>
      <planeGeometry args={[MAP_SIZE + 200, MAP_SIZE + 200, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        color="#061420"
        transparent
        opacity={0.6}
        metalness={0.4}
        roughness={0.15}
        emissive="#001133"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

// ─── MAIN WORLD ──────────────────────────────────────────────────────────────
export default function World() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)

  const ambientIntensity = timeOfDay === 'night' ? 0.25 : 0.8
  const ambientColor = timeOfDay === 'night' ? '#1a2a4a' : '#6688bb'
  const fogColor = timeOfDay === 'night' ? '#050510' : '#0a1520'
  const dirIntensity = timeOfDay === 'night' ? 0.4 : 1.2
  const dirColor = timeOfDay === 'night' ? '#4466aa' : '#ffe8cc'
  const isNight = timeOfDay === 'night'

  return (
    <>
      {/* Distance fog */}
      <fog attach="fog" args={[fogColor, 60, 350]} />

      {/* Ambient — the base fill light */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Main directional light (moon/sun) */}
      <directionalLight
        position={[80, 150, 60]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={400}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.001}
      />

      {/* Night-specific lights */}
      {isNight && (
        <>
          {/* Moon glow from above */}
          <pointLight position={[100, 200, -100]} color="#4466ff" intensity={1.0} distance={600} />
          {/* City center warm glow */}
          <pointLight position={[0, 30, 0]} color="#ff8844" intensity={0.8} distance={200} />
          {/* Street-level fill */}
          <hemisphereLight skyColor="#1a2a4a" groundColor="#050510" intensity={0.3} />
        </>
      )}

      {/* Day sun */}
      {!isNight && (
        <hemisphereLight skyColor="#4488cc" groundColor="#2a4a2a" intensity={0.4} />
      )}

      {/* Physics ground */}
      <PhysicsGround />

      {/* Buildings with physics */}
      <Buildings />

      {/* Trees */}
      <Trees />

      {/* Street lamps */}
      <StreetLamps />

      {/* Water */}
      <Water />
    </>
  )
}