import { useMemo } from 'react'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { MAP_SIZE } from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'

// ─── Spatial Grid for Collision Detection ─────────────────────────────────────
// Divide the map into a grid; each cell stores building indices
// This reduces collision from O(n*m) to O(n) per frame
const GRID_CELL_SIZE = 60 // world units per cell

interface SpatialGrid {
  cellSize: number
  buildings: Map<string, number[]> // "cx,cz" -> building indices
}

function buildSpatialGrid(buildings: typeof LANDSCAPE_CONFIG.buildings): SpatialGrid {
  const cells = new Map<string, number[]>()
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i]
    const minCx = Math.floor((b.x - b.width / 2) / GRID_CELL_SIZE)
    const maxCx = Math.floor((b.x + b.width / 2) / GRID_CELL_SIZE)
    const minCz = Math.floor((b.z - b.depth / 2) / GRID_CELL_SIZE)
    const maxCz = Math.floor((b.z + b.depth / 2) / GRID_CELL_SIZE)
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = `${cx},${cz}`
        if (!cells.has(key)) cells.set(key, [])
        cells.get(key)!.push(i)
      }
    }
  }
  return { cellSize: GRID_CELL_SIZE, buildings: cells }
}

function getNearbyBuildings(px: number, pz: number, grid: SpatialGrid, radius: number): number[] {
  const cx = Math.floor(px / grid.cellSize)
  const cz = Math.floor(pz / grid.cellSize)
  const cellRadius = Math.ceil(radius / grid.cellSize) + 1
  const indices = new Set<number>()
  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      const key = `${cx + dx},${cz + dz}`
      const cell = grid.buildings.get(key)
      if (cell) {
        for (const idx of cell) indices.add(idx)
      }
    }
  }
  return Array.from(indices)
}

// Expose spatial grid getter for use in collision checks
let _spatialGrid: SpatialGrid | null = null

// ─── Building ─────────────────────────────────────────────────────────────────
function Building({ x, z, width, depth, height, colorIdx }: {
  x: number; z: number; width: number; depth: number; height: number; colorIdx: number
}) {
  const isNight = useGameStore((s) => s.isNight)
  const colors = ['#1a1a3a', '#151535', '#202050', '#0f0f2a', '#1e1e40',
    '#12122a', '#18183a', '#222245', '#0d0d25', '#1c1c3a',
    '#252560', '#1a1a50', '#2a2a55', '#181845', '#202048']
  const baseColor = colors[colorIdx % colors.length]
  const emissive = isNight ? '#222244' : '#000000'
  const emissiveIntensity = isNight ? 0.3 : 0

  return (
    <mesh position={[x, height / 2, z]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={baseColor}
        metalness={0.1}
        roughness={0.8}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  )
}

// ─── Buildings Layer ───────────────────────────────────────────────────────────
function BuildingsLayer() {
  const buildings = useMemo(() => LANDSCAPE_CONFIG.buildings, [])
  return (
    <>
      {buildings.map((b, i) => (
        <Building key={i} x={b.x} z={b.z} width={b.width} depth={b.depth} height={b.height} colorIdx={i} />
      ))}
    </>
  )
}

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ x, z, idx }: { x: number; z: number; idx: number }) {
  const heightMod = 0.8 + (idx % 7) * 0.08
  const trunkHeight = 2.5 * heightMod
  const canopyRadius = 2.2 * heightMod
  const canopyHeight = 4.0 * heightMod
  const trunkColor = '#4a3520'
  const canopyColor = '#1a4a20'

  return (
    <group position={[x, 0, z]}>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, trunkHeight, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      {/* Lower canopy */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.3, 0]} castShadow>
        <coneGeometry args={[canopyRadius, canopyHeight * 0.6, 7]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
      {/* Upper canopy */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.7, 0]} castShadow>
        <coneGeometry args={[canopyRadius * 0.7, canopyHeight * 0.5, 6]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
      {/* Top */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.95, 0]} castShadow>
        <coneGeometry args={[canopyRadius * 0.4, canopyHeight * 0.3, 5]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─── Trees Layer ─────────────────────────────────────────────────────────────
function TreesLayer() {
  const trees = useMemo(() => LANDSCAPE_CONFIG.trees, [])
  return (
    <>
      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} idx={i} />
      ))}
    </>
  )
}

// ─── Road ─────────────────────────────────────────────────────────────────────
function RoadSegment({ x, z, angle, width, color }: {
  x: number; z: number; angle: number; width: number; color: string
}) {
  return (
    <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, -angle]}>
      <planeGeometry args={[width, 10]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

function RoadLayer() {
  const roads = useMemo(() => {
    const segments: { x: number; z: number; angle: number; width: number; color: string }[] = []
    for (const road of LANDSCAPE_CONFIG.roadPaths) {
      for (let i = 0; i < road.length; i += 3) {
        const pt = road[i]
        const nextPt = road[Math.min(i + 1, road.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        segments.push({ x: pt.x, z: pt.z, angle, width: 14, color: road === LANDSCAPE_CONFIG.roadPaths[0] ? '#333344' : '#2a2a3a' })
      }
    }
    return segments
  }, [])

  return (
    <>
      {roads.map((seg, i) => (
        <RoadSegment key={i} {...seg} />
      ))}
    </>
  )
}

// ─── Rail Track ───────────────────────────────────────────────────────────────
function RailLayer() {
  const tracks = useMemo(() => {
    const segments: { x: number; z: number; angle: number }[] = []
    for (const path of LANDSCAPE_CONFIG.caltransPaths) {
      for (let i = 0; i < path.length; i += 4) {
        const pt = path[i]
        const nextPt = path[Math.min(i + 1, path.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        segments.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return segments
  }, [])

  return (
    <>
      {tracks.map((seg, i) => (
        <mesh key={i} position={[seg.x, 0.03, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
          <planeGeometry args={[4, 12]} />
          <meshStandardMaterial color="#888888" roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}

// ─── Street Lamp ──────────────────────────────────────────────────────────────
function StreetLamp({ x, z }: { x: number; z: number }) {
  const isNight = useGameStore((s) => s.isNight)
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 6, 6]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.8, 5.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
        <meshStandardMaterial color="#444444" roughness={0.9} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[1.6, 5.7, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#ffffee"
          emissive={isNight ? '#ffffaa' : '#000000'}
          emissiveIntensity={isNight ? 2 : 0}
          roughness={0.5}
        />
      </mesh>
      {/* Light */}
      {isNight && <pointLight position={[1.6, 5.5, 0]} color="#ffeeaa" intensity={6} distance={25} />}
    </group>
  )
}

function StreetLampsLayer() {
  const lamps = useMemo(() => LANDSCAPE_CONFIG.streetLamps, [])
  return (
    <>
      {lamps.map((lamp, i) => (
        <StreetLamp key={i} x={lamp.x} z={lamp.z} />
      ))}
    </>
  )
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground() {
  const water = LANDSCAPE_CONFIG.water
  const groundColor = '#2a3a20'
  const waterColor = '#1a3a5a'

  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE * 2.2, MAP_SIZE * 2.2]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[water.x, -0.04, water.z]} receiveShadow>
        <planeGeometry args={[water.width, water.height]} />
        <meshStandardMaterial color={waterColor} roughness={0.3} metalness={0.1} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// ─── Main World ───────────────────────────────────────────────────────────────
export default function World() {
  // Build spatial grid once
  _spatialGrid = useMemo(() => buildSpatialGrid(LANDSCAPE_CONFIG.buildings), [])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[100, 200, 80]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-MAP_SIZE}
        shadow-camera-right={MAP_SIZE}
        shadow-camera-top={MAP_SIZE}
        shadow-camera-bottom={-MAP_SIZE}
      />
      <Sky sunPosition={[100, 80, -50]} turbidity={3} rayleigh={0.5} />

      <Ground />
      <RoadLayer />
      <RailLayer />
      <BuildingsLayer />
      <TreesLayer />
      <StreetLampsLayer />
    </>
  )
}

// Export spatial grid getter for collision systems to use
export function getSpatialGrid() { return _spatialGrid }
export function getNearbyBuildingsGrid(px: number, pz: number, radius: number) {
  if (!_spatialGrid) return LANDSCAPE_CONFIG.buildings.map((_, i) => i)
  return getNearbyBuildings(px, pz, _spatialGrid, radius)
}
