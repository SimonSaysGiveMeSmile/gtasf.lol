import { useMemo } from 'react'
import { Sky, Stars } from '@react-three/drei'
import { useGameStore } from '../game/store'
import {
  makeGrassTexture, makeBrickTexture, makeAsphaltTexture,
  makeBarkTexture, makeFoliageTexture, makeConcreteTexture,
  makeWaterTexture,
} from '../utils/textureGen'
import {
  MAP_SIZE, BUILDING_COUNT, TREE_COUNT,
  BUILDING_COLORS, WINDOW_COLORS,
} from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ─── GROUND ──────────────────────────────────────────────────────────────────
function Ground() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'
  const grassTex = useMemo(() => makeGrassTexture(isNight ? 42 : 0), [isNight])
  const baseColor = isNight ? '#0a1520' : '#1e3a1e'

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[MAP_SIZE * 2, MAP_SIZE * 2]} />
      <meshStandardMaterial color={baseColor} map={grassTex} roughness={0.95} />
    </mesh>
  )
}

// ─── BUILDING ────────────────────────────────────────────────────────────────
function Building({ x, z, width, depth, height, color, seed }: {
  x: number; z: number; width: number; depth: number; height: number; color: string; seed: number
}) {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'
  const wallTex = useMemo(() => makeBrickTexture(seed), [seed])
  const windowScale = 2 + Math.floor(height / 15)
  const isTall = height > 30

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          map={wallTex}
          roughness={0.85}
          metalness={0.15}
          emissive="#ffaa00"
          emissiveIntensity={isNight ? 0.08 : 0.02}
        />
      </mesh>

      {/* Window panels on front face */}
      {Array.from({ length: Math.floor(height / windowScale) }, (_, row) =>
        Array.from({ length: Math.floor(width / windowScale) }, (_, col) => {
          const wx = -width / 2 + col * windowScale + windowScale / 2
          const wy = row * windowScale + windowScale / 2
          const isLit = seededRandom(seed + row * 17 + col * 23) > 0.3
          const winColor = WINDOW_COLORS[Math.floor(seededRandom(seed + row + col) * WINDOW_COLORS.length)]

          return (
            <mesh key={`win-${row}-${col}`} position={[wx, wy, depth / 2 + 0.02]}>
              <planeGeometry args={[windowScale * 0.6, windowScale * 0.7]} />
              <meshStandardMaterial
                color={isNight && isLit ? winColor : '#001122'}
                emissive={isNight && isLit ? winColor : '#000000'}
                emissiveIntensity={isNight && isLit ? 1.2 : 0}
                transparent={!isNight || !isLit}
                opacity={isNight && !isLit ? 0.3 : 1}
              />
            </mesh>
          )
        })
      )}

      {/* Antenna on tall buildings */}
      {seededRandom(seed + 2) > 0.6 && isTall && (
        <mesh position={[0, height / 2 + 3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 6, 6]} />
          <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}

// Use landscape config for building positions, or fall back to procedural
function Buildings() {
  const buildings = useMemo(() => {
    if (LANDSCAPE_CONFIG.buildings.length > 0) {
      return LANDSCAPE_CONFIG.buildings.map((b, i) => ({
        id: `lc-${i}`,
        x: b.x, z: b.z,
        width: b.width, depth: b.depth,
        height: b.height,
        color: b.color ?? BUILDING_COLORS[i % BUILDING_COLORS.length],
        seed: i,
      }))
    }
    // Procedural fallback
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
function Tree({ x, z, seed }: { x: number; z: number; seed: number }) {
  const barkTex = useMemo(() => makeBarkTexture(seed), [seed])
  const leafTex = useMemo(() => makeFoliageTexture(seed + 50), [seed + 50])
  const trunkColor = seededRandom(seed + 1) > 0.5 ? '#2a1810' : '#1a1008'
  const leafColor1 = seededRandom(seed + 3) > 0.5 ? '#0a3a1a' : '#0a2a12'
  const leafColor2 = seededRandom(seed + 5) > 0.5 ? '#0a4a1a' : '#0a3820'

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 3, 5]} />
        <meshStandardMaterial color={trunkColor} map={barkTex} roughness={1} />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <coneGeometry args={[1.8, 4, 5]} />
        <meshStandardMaterial color={leafColor1} map={leafTex} roughness={1} />
      </mesh>
      <mesh position={[0, 5.8, 0]} castShadow>
        <coneGeometry args={[1.3, 3, 5]} />
        <meshStandardMaterial color={leafColor2} roughness={1} />
      </mesh>
    </group>
  )
}

// Use landscape config for tree positions, or fall back to procedural
function TreeInstances() {
  const trees = useMemo(() => {
    if (LANDSCAPE_CONFIG.trees.length > 0) {
      return LANDSCAPE_CONFIG.trees.map((t, i) => ({ id: `lt-${i}`, x: t.x, z: t.z, seed: i }))
    }
    const result = []
    for (let i = 0; i < TREE_COUNT; i++) {
      const rng = seededRandom(i * 23 + 5)
      const angle = rng * Math.PI * 2
      const dist = 30 + rng * MAP_SIZE * 0.4
      result.push({
        id: i,
        x: Math.cos(angle) * dist + (seededRandom(i * 41) - 0.5) * 40,
        z: Math.sin(angle) * dist + (seededRandom(i * 59) - 0.5) * 40,
        seed: i,
      })
    }
    return result
  }, [])
  return <>{trees.map((t) => <Tree key={t.id} {...t} />)}</>
}

// ─── ROADS ───────────────────────────────────────────────────────────────────
// Use landscape config for road positions
function Roads() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'
  const roadTex = useMemo(() => makeAsphaltTexture(isNight ? 99 : 0), [isNight])
  const crosswalkTex = useMemo(() => makeConcreteTexture(77), [])
  const roadColor = isNight ? '#1a1a1a' : '#2a2a2a'
  const lineColor = '#ffdd00'

  const { hRoads, vRoads } = LANDSCAPE_CONFIG

  return (
    <>
      {hRoads.map((z) => (
        <group key={`h-${z}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]} receiveShadow>
            <planeGeometry args={[MAP_SIZE, 12]} />
            <meshStandardMaterial color={roadColor} map={roadTex} roughness={0.9} />
          </mesh>
          {[-3, 0, 3].map((offset, i) => (
            <mesh key={`hm-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z + offset]} receiveShadow>
              <planeGeometry args={[MAP_SIZE, 0.3]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={isNight ? 0.5 : 0} />
            </mesh>
          ))}
        </group>
      ))}
      {vRoads.map((x) => (
        <group key={`v-${x}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0]} receiveShadow>
            <planeGeometry args={[12, MAP_SIZE]} />
            <meshStandardMaterial color={roadColor} map={roadTex} roughness={0.9} />
          </mesh>
          {[-3, 0, 3].map((offset, i) => (
            <mesh key={`vm-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x + offset, 0.01, 0]} receiveShadow>
              <planeGeometry args={[0.3, MAP_SIZE]} />
              <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={isNight ? 0.5 : 0} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Crosswalks at all intersections */}
      {hRoads.flatMap((z) =>
        vRoads.map((x) => (
          <mesh key={`cw-${x}-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, z]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#3a3a3a" map={crosswalkTex} roughness={0.8} />
          </mesh>
        ))
      )}
    </>
  )
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

// Use landscape config for lamp positions, or fall back to procedural
function StreetLamps() {
  const lamps = useMemo(() => {
    if (LANDSCAPE_CONFIG.streetLamps.length > 0) {
      return LANDSCAPE_CONFIG.streetLamps.map((l, i) => ({ id: `ll-${i}`, x: l.x, z: l.z }))
    }
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
  return <>{lamps.map((l) => <StreetLamp key={l.id} {...l} />)}</>
}

// ─── WATER ───────────────────────────────────────────────────────────────────
function Water() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'
  const waterTex = useMemo(() => makeWaterTexture(isNight ? 88 : 0), [isNight])
  const { water } = LANDSCAPE_CONFIG

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[water.x, -0.02, water.z]}>
      <planeGeometry args={[water.width, water.height]} />
      <meshStandardMaterial
        color={isNight ? '#0a2040' : '#1a4060'}
        map={waterTex}
        transparent
        opacity={isNight ? 0.75 : 0.65}
        metalness={0.3}
        roughness={0.2}
        emissive="#1a3a6a"
        emissiveIntensity={isNight ? 0.5 : 0.3}
      />
    </mesh>
  )
}

// ─── MAIN WORLD ──────────────────────────────────────────────────────────────
export default function World() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'

  const ambientIntensity = isNight ? 0.3 : 2.0
  const ambientColor = isNight ? '#1a2a5a' : '#f5f0e8'
  const fogColor = isNight ? '#050510' : '#c8dce8'
  const dirIntensity = isNight ? 0.4 : 5.0
  const dirColor = isNight ? '#3355aa' : '#ffffff'

  return (
    <>
      <fog attach="fog" args={[fogColor, isNight ? 60 : 1400, isNight ? 300 : 3200]} />
      {!isNight && <Sky sunPosition={[0, 250, -50]} inclination={0.4995} azimuth={0.25} turbidity={1.2} rayleigh={0.2} />}
      {isNight && <Stars radius={500} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[20, 250, 30]}
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
      {isNight && (
        <>
          <hemisphereLight args={['#1a2a5a', '#050820', 0.4]} />
          <pointLight position={[0, 40, 0]} color="#ff8844" intensity={0.6} distance={200} />
        </>
      )}
      {!isNight && (
        <hemisphereLight args={['#9ec8ff', '#a8c87a', 0.7]} />
      )}
      <Ground />
      <Roads />
      <Buildings />
      <TreeInstances />
      <StreetLamps />
      <Water />
    </>
  )
}