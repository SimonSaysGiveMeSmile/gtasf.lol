import { useMemo } from 'react'
import { Sky, Stars } from '@react-three/drei'
import { useGameStore } from '../game/store'
import {
 makeGrassTexture, makeBrickTexture, makeAsphaltTexture,
 makeBarkTexture, makeFoliageTexture,
 makeWaterTexture,
} from '../utils/textureGen'
import {
 MAP_SIZE,
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
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
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
   <mesh position={[0, height / 2, 0]}>
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

function Buildings() {
 const buildings = useMemo(() => {
  return LANDSCAPE_CONFIG.buildings.map((b, i) => ({
   id: `b-${i}`,
   x: b.x, z: b.z,
   width: b.width, depth: b.depth,
   height: b.height,
   color: b.color ?? BUILDING_COLORS[i % BUILDING_COLORS.length],
   seed: i,
  }))
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
   <mesh position={[0, 1.5, 0]}>
    <cylinderGeometry args={[0.15, 0.25, 3, 5]} />
    <meshStandardMaterial color={trunkColor} map={barkTex} roughness={1} />
   </mesh>
   <mesh position={[0, 4.2, 0]}>
    <coneGeometry args={[1.8, 4, 5]} />
    <meshStandardMaterial color={leafColor1} map={leafTex} roughness={1} />
   </mesh>
   <mesh position={[0, 5.8, 0]}>
    <coneGeometry args={[1.3, 3, 5]} />
    <meshStandardMaterial color={leafColor2} roughness={1} />
   </mesh>
  </group>
 )
}

function TreeInstances() {
 const trees = useMemo(() => {
  return LANDSCAPE_CONFIG.trees.map((t, i) => ({ id: `lt-${i}`, x: t.x, z: t.z, seed: i }))
 }, [])
 return <>{trees.map((t) => <Tree key={t.id} {...t} />)}</>
}

// ─── ROADS ───────────────────────────────────────────────────────────────────
function Roads() {
 const timeOfDay = useGameStore((s) => s.timeOfDay)
 const isNight = timeOfDay === 'night'
 const roadTex = useMemo(() => makeAsphaltTexture(isNight ? 99 : 0), [isNight])
 const roadColor = isNight ? '#1a1a1a' : '#2a2a2a'
 const lineColor = '#ffdd00'

 const { roadPaths } = LANDSCAPE_CONFIG

 return (
  <>
   {roadPaths.map((path, roadIdx) => (
    <group key={`road-${roadIdx}`}>
     {path.map((pt, i) => {
      if (i === path.length - 1) return null
      const next = path[i + 1]
      const dx = next.x - pt.x
      const dz = next.z - pt.z
      const segLen = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)
      const midX = (pt.x + next.x) / 2
      const midZ = (pt.z + next.z) / 2
      return (
       <mesh
        key={`seg-${i}`}
        rotation={[-Math.PI / 2, 0, angle]}
        position={[midX, 0.005, midZ]}
       >
        <planeGeometry args={[segLen + 0.5, 12]} />
        <meshStandardMaterial color={roadColor} map={roadTex} roughness={0.9} />
       </mesh>
      )
     })}
     {path.map((pt, i) => {
      if (i === path.length - 1) return null
      return (
       <mesh key={`line-${i}`} rotation={[-Math.PI / 2, 0, pt.angle]} position={[pt.x, 0.01, pt.z]}>
        <planeGeometry args={[4, 0.3]} />
        <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={isNight ? 0.5 : 0} />
       </mesh>
      )
     })}
    </group>
   ))}
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

function StreetLamps() {
 const lamps = useMemo(() => {
  return LANDSCAPE_CONFIG.streetLamps.map((l, i) => ({ id: `ll-${i}`, x: l.x, z: l.z }))
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

// ─── RAIL TRACKS ─────────────────────────────────────────────────────────────
function RailTracks() {
 const { caltransPaths } = LANDSCAPE_CONFIG

 return (
  <>
   {caltransPaths.map((path, idx) => (
    <group key={`rail-${idx}`}>
     {[-0.75, 0.75].map((offset, ri) => (
      <group key={`rail-${ri}`}>
       {path.map((pt, i) => {
        if (i === path.length - 1) return null
        const next = path[i + 1]
        const dx = next.x - pt.x
        const dz = next.z - pt.z
        const segLen = Math.sqrt(dx * dx + dz * dz)
        const angle = Math.atan2(dx, dz)
        const midX = (pt.x + next.x) / 2
        const midZ = (pt.z + next.z) / 2
        const perpX = -dz / segLen * offset
        const perpZ = dx / segLen * offset
        return (
         <mesh key={`rs-${i}`}
          rotation={[-Math.PI / 2, 0, angle]}
          position={[midX + perpX, 0.015, midZ + perpZ]}
         >
          <planeGeometry args={[segLen + 0.2, 0.15]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.4} />
         </mesh>
        )
       })}
      </group>
     ))}
     {path.map((pt, i) => {
      if (i === path.length - 1) return null
      const next = path[i + 1]
      const angle = Math.atan2(next.x - pt.x, next.z - pt.z)
      return (
       <mesh key={`tie-${i}`} rotation={[-Math.PI / 2, 0, angle]} position={[pt.x, 0.008, pt.z]}>
        <planeGeometry args={[2.5, 0.3]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
       </mesh>
      )
     })}
    </group>
   ))}
  </>
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
 const dirColor = isNight ? '#3355aa' : '#fff4d6'

 return (
  <>
   <fog attach="fog" args={[fogColor, isNight ? 80 : 1800, isNight ? 400 : 5000]} />
   {!isNight && <Sky sunPosition={[0, 250, -50]} inclination={0.4995} azimuth={0.25} turbidity={1.2} rayleigh={0.2} />}
   {isNight && <Stars radius={500} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />}
   <ambientLight intensity={ambientIntensity} color={ambientColor} />
   <directionalLight position={[20, 250, 30]} intensity={dirIntensity} color={dirColor} />
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
   <RailTracks />
   <Buildings />
   <TreeInstances />
   <StreetLamps />
   <Water />
  </>
 )
}