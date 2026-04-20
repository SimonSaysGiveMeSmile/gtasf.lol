import { useMemo, useRef } from 'react'
import * as THREE from 'three'
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
    canvas.width = 128
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 128, 256)

    // Windows
    const rows = Math.floor(height / 3)
    const cols = Math.floor(width / 2)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (seededRandom(seed + r * 100 + c) > 0.3) {
          const wColor = WINDOW_COLORS[Math.floor(seededRandom(seed + r + c * 7) * WINDOW_COLORS.length)]
          ctx.fillStyle = wColor
          const wx = 10 + c * (100 / cols)
          const wy = 10 + r * (200 / rows)
          ctx.fillRect(wx, wy, 20, 25)
        }
      }
    }
    return new THREE.CanvasTexture(canvas)
  }, [color, height, width, seed])

  const emissiveIntensity = useMemo(() => {
    return 0.3 + seededRandom(seed * 3) * 0.7
  }, [seed])

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0.1}
          emissive="#ffaa00"
          emissiveIntensity={emissiveIntensity * 0.1}
          emissiveMap={windowPattern}
        />
      </mesh>
      {/* Rooftop details */}
      {seededRandom(seed + 1) > 0.5 && (
        <mesh position={[0, height / 2 + 1, 0]}>
          <boxGeometry args={[width * 0.3, 2, depth * 0.3]} />
          <meshStandardMaterial color="#0a0a1a" roughness={1} />
        </mesh>
      )}
      {seededRandom(seed + 2) > 0.7 && (
        <mesh position={[width * 0.3, height / 2 + 2, depth * 0.3]}>
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

      // Distribute across the map with city center density
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

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 3, 8]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
      {/* Foliage */}
      <mesh castShadow position={[0, 4, 0]}>
        <coneGeometry args={[1.8, 4, 8]} />
        <meshStandardMaterial color="#0a3a1a" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 5.5, 0]}>
        <coneGeometry args={[1.3, 3, 8]} />
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

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh castShadow position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 6, 8]} />
        <meshStandardMaterial color="#333344" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0, 6.2, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.4, 8]} />
        <meshStandardMaterial color="#222233" metalness={0.8} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0, 6.0, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffeecc" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      {/* Point light */}
      <pointLight color="#ffaa44" intensity={0.8} distance={15} position={[0, 6, 0]} />
    </group>
  )
}

function StreetLamps() {
  const lamps = useMemo(() => {
    const result = []
    for (let i = 0; i < 60; i++) {
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

function Water() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 0.5) * 0.05
    }
  })

  return (
    <>
      {/* Bay/water areas at the edges of the map */}
      <mesh ref={meshRef} position={[-MAP_SIZE * 0.5 - 50, -0.5, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAP_SIZE + 200, MAP_SIZE + 200]} />
        <meshStandardMaterial
          color="#0a1628"
          transparent
          opacity={0.65}
          metalness={0.3}
          roughness={0.2}
          emissive="#001133"
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  )
}

function Ground() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const groundColor = timeOfDay === 'night' ? '#0a0a15' : '#1a2a1a'

  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[MAP_SIZE * 2, MAP_SIZE * 2]} />
        <meshStandardMaterial color={groundColor} roughness={1} metalness={0} />
      </mesh>
    </>
  )
}

export default function World() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)

  const ambientIntensity = timeOfDay === 'night' ? 0.15 : 0.6
  const ambientColor = timeOfDay === 'night' ? '#1a2a4a' : '#4466aa'
  const fogColor = timeOfDay === 'night' ? '#050510' : '#0a1520'

  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={[fogColor, 50, 400]} />

      {/* Ambient light */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Moon / Sun directional light */}
      <directionalLight
        position={[50, 100, 50]}
        intensity={timeOfDay === 'night' ? 0.3 : 1.0}
        color={timeOfDay === 'night' ? '#4466aa' : '#ffeedd'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />

      {/* Moon glow */}
      {timeOfDay === 'night' && (
        <pointLight position={[100, 150, -100]} color="#4466ff" intensity={0.5} distance={500} />
      )}

      {/* Ground */}
      <Ground />

      {/* Buildings */}
      <Buildings />

      {/* Trees */}
      <Trees />

      {/* Street lamps */}
      <StreetLamps />

      {/* Water / Bay */}
      <Water />
    </>
  )
}