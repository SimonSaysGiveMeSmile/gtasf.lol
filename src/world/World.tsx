import { useMemo } from 'react'
import { useGameStore } from '../game/store'
import { MAP_SIZE, BUILDING_COUNT, TREE_COUNT, BUILDING_COLORS } from '../game/constants'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ─── GROUND ──────────────────────────────────────────────────────────────────
function Ground() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const color = timeOfDay === 'night' ? '#0f1520' : '#1e3a1e'

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[MAP_SIZE * 2, MAP_SIZE * 2]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

// ─── BUILDING ────────────────────────────────────────────────────────────────
function Building({ x, z, width, depth, height, color, seed }: {
  x: number; z: number; width: number; depth: number; height: number; color: string; seed: number
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.8}
          metalness={0.2}
          emissive="#ffaa00"
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* Antenna on taller buildings */}
      {seededRandom(seed + 2) > 0.6 && height > 30 && (
        <mesh position={[0, height / 2 + 3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 6, 6]} />
          <meshStandardMaterial color="#444455" roughness={1} />
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
      result.push({
        id: i,
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        width, depth, height, color, seed: i
      })
    }
    return result
  }, [])

  return <>{buildings.map((b) => <Building key={b.id} {...b} />)}</>
}

// ─── TREES ───────────────────────────────────────────────────────────────────
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 3, 5]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <coneGeometry args={[1.8, 4, 5]} />
        <meshStandardMaterial color="#0a3a1a" roughness={1} />
      </mesh>
      <mesh position={[0, 5.8, 0]} castShadow>
        <coneGeometry args={[1.3, 3, 5]} />
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
      result.push({
        id: i,
        x: Math.cos(angle) * dist + (seededRandom(i * 41) - 0.5) * 40,
        z: Math.sin(angle) * dist + (seededRandom(i * 59) - 0.5) * 40,
      })
    }
    return result
  }, [])
  return <>{trees.map((t) => <Tree key={t.id} x={t.x} z={t.z} />)}</>
}

// ─── STREET LAMPS ────────────────────────────────────────────────────────────
function StreetLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 6, 5]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color="#ffeecc" emissive="#ffcc44" emissiveIntensity={4} />
      </mesh>
    </group>
  )
}

function StreetLamps() {
  const lamps = useMemo(() => {
    const result = []
    for (let i = 0; i < 25; i++) {
      const rng = seededRandom(i * 37 + 3)
      result.push({
        id: i,
        x: (rng - 0.5) * MAP_SIZE * 0.7,
        z: (seededRandom(i * 71 + 7) - 0.5) * MAP_SIZE * 0.7,
      })
    }
    return result
  }, [])
  return <>{lamps.map((l) => <StreetLamp key={l.id} x={l.x} z={l.z} />)}</>
}

// ─── WATER ───────────────────────────────────────────────────────────────────
function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-MAP_SIZE * 0.5 - 50, -0.02, 0]}>
      <planeGeometry args={[MAP_SIZE + 200, MAP_SIZE + 200]} />
      <meshStandardMaterial
        color="#1a4060"
        transparent
        opacity={0.65}
        metalness={0.3}
        roughness={0.2}
        emissive="#1a3a6a"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

// ─── MAIN WORLD ──────────────────────────────────────────────────────────────
export default function World() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'

  // MUCH brighter lighting
  const ambientIntensity = isNight ? 0.4 : 1.2
  const ambientColor = isNight ? '#1a2a5a' : '#aabbdd'
  const fogColor = isNight ? '#050510' : '#8aaac0'
  const dirIntensity = isNight ? 0.6 : 2.0
  const dirColor = isNight ? '#3355aa' : '#fff5e0'

  return (
    <>
      {/* Bright fog */}
      <fog attach="fog" args={[fogColor, isNight ? 80 : 300, isNight ? 300 : 800]} />

      {/* Ambient — fill the entire scene */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Main sun/moon */}
      <directionalLight
        position={[80, 150, 60]}
        intensity={dirIntensity}
        color={dirColor}
        castShadow={!isNight}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.001}
      />

      {/* Night extras */}
      {isNight && (
        <>
          <hemisphereLight args={['#1a2a5a', '#050820', 0.4]} />
          <pointLight position={[0, 40, 0]} color="#ff8844" intensity={0.6} distance={200} />
        </>
      )}

      {/* Day sky fill */}
      {!isNight && (
        <hemisphereLight args={['#88aadd', '#3a6a3a', 0.5]} />
      )}

      <Ground />
      <Buildings />
      <Trees />
      <StreetLamps />
      <Water />
    </>
  )
}