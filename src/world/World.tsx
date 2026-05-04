// @simonsaysgivemesmile
import { useMemo } from 'react'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { MAP_SIZE } from '../game/constants'
import { default as BillboardLayer } from '../systems/billboards/BillboardLayer'
import { useLandscapeData } from '../game/LandscapeContext'
import type { BuildingData } from '../game/landscape.types'

// ─── Spatial Grid for Collision Detection ─────────────────────────────────────
// Divide the map into a grid; each cell stores building indices
// This reduces collision from O(n*m) to O(n) per frame
const GRID_CELL_SIZE = 60 // world units per cell

interface SpatialGrid {
  cellSize: number
  buildings: Map<string, number[]> // "cx,cz" -> building indices
}

function buildSpatialGrid(buildings: BuildingData[]): SpatialGrid {
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
function Building({ x, z, width, depth, height, color }: {
  x: number; z: number; width: number; depth: number; height: number; color?: string
}) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  const baseColor = color || '#1a1a3a'
  const emissive = isNight ? '#222244' : '#000000'
  const emissiveIntensity = isNight ? 0.3 : 0

  return (
    <mesh position={[x, height / 2, z]}>
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
function BuildingsLayer({ buildings }: { buildings: BuildingData[] }) {
  return (
    <>
      {buildings.map((b, i) => (
        <Building key={i} x={b.x} z={b.z} width={b.width} depth={b.depth} height={b.height} color={b.color} />
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
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.25, 0.35, trunkHeight, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      {/* Lower canopy */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.3, 0]}>
        <coneGeometry args={[canopyRadius, canopyHeight * 0.6, 7]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
      {/* Upper canopy */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.7, 0]}>
        <coneGeometry args={[canopyRadius * 0.7, canopyHeight * 0.5, 6]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
      {/* Top */}
      <mesh position={[0, trunkHeight + canopyHeight * 0.95, 0]}>
        <coneGeometry args={[canopyRadius * 0.4, canopyHeight * 0.3, 5]} />
        <meshStandardMaterial color={canopyColor} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─── Trees Layer ─────────────────────────────────────────────────────────────
function TreesLayer({ trees }: { trees: { x: number; z: number }[] }) {
  return (
    <>
      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} idx={i} />
      ))}
    </>
  )
}

// ─── Road ─────────────────────────────────────────────────────────────────────
function RoadLayer({ roadPaths, roads: roadDefs }: {
  roadPaths: { x: number; z: number; angle: number }[][],
  roads: { width: number }[]
}) {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === "night"

  const roadShapes = useMemo(() => {
    const result: { key: string; shape: THREE.Shape; color: string }[] = []
    for (let ri = 0; ri < roadPaths.length; ri++) {
      const path = roadPaths[ri]
      if (path.length < 2) continue
      const width = roadDefs[ri]?.width ?? 10

      const leftEdge: THREE.Vector2[] = []
      const rightEdge: THREE.Vector2[] = []

      for (let i = 0; i < path.length; i++) {
        const pt = path[i]
        const perpX = Math.cos(pt.angle)
        const perpZ = -Math.sin(pt.angle)
        leftEdge.push(new THREE.Vector2(pt.x + perpX * width / 2, pt.z + perpZ * width / 2))
        rightEdge.push(new THREE.Vector2(pt.x - perpX * width / 2, pt.z - perpZ * width / 2))
      }

      const shape = new THREE.Shape()
      shape.moveTo(leftEdge[0].x, leftEdge[0].y)
      for (let i = 1; i < leftEdge.length; i++) {
        shape.lineTo(leftEdge[i].x, leftEdge[i].y)
      }
      for (let i = rightEdge.length - 1; i >= 0; i--) {
        shape.lineTo(rightEdge[i].x, rightEdge[i].y)
      }
      shape.closePath()

      result.push({ key: `road-${ri}`, shape, color: '#404050' })
    }
    return result
  }, [roadPaths, roadDefs])

  const roadLines = useMemo(() => {
    const lines: { x: number; z: number; angle: number }[] = []
    for (const road of roadPaths) {
      for (let i = 0; i < road.length; i += 4) {
        const pt = road[i]
        const nextPt = road[Math.min(i + 1, road.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        lines.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return lines
  }, [roadPaths])

  const lineColor = isNight ? '#ffdd00' : '#ffcc00'
  const lineEmissive = isNight ? '#ffaa00' : '#000000'
  const lineEmissiveInt = isNight ? 0.6 : 0

  return (
    <>
      {roadShapes.map(({ key, shape, color }) => (
        <mesh key={key} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
      {roadLines.map((line, i) => (
        <mesh key={`l-${i}`} position={[line.x, 0.03, line.z]} rotation={[-Math.PI / 2, 0, -line.angle]}>
          <planeGeometry args={[0.3, 4]} />
          <meshStandardMaterial
            color={lineColor}
            emissive={lineEmissive}
            emissiveIntensity={lineEmissiveInt}
          />
        </mesh>
      ))}
    </>
  )
}

// ─── Rail Track ───────────────────────────────────────────────────────────────
function RailLayer({ caltransPaths }: { caltransPaths: { x: number; z: number; angle: number }[][] }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  const tracks = useMemo(() => {
    const segments: { x: number; z: number; angle: number }[] = []
    for (const path of caltransPaths) {
      for (let i = 0; i < path.length; i += 3) {
        const pt = path[i]
        const nextPt = path[Math.min(i + 1, path.length - 1)]
        const angle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z)
        segments.push({ x: pt.x, z: pt.z, angle })
      }
    }
    return segments
  }, [caltransPaths])

  const railColor = isNight ? '#666688' : '#888888'
  const steelEmissive = isNight ? '#334455' : '#000000'
  const steelEmissiveInt = isNight ? 0.3 : 0

  return (
    <>
      {tracks.map((seg, i) => (
        <group key={i}>
          {/* Train bed / gravel */}
          <mesh position={[seg.x, 0.025, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[6, 14]} />
            <meshStandardMaterial color="#555555" roughness={0.95} />
          </mesh>
          {/* Left rail */}
          <mesh position={[seg.x, 0.065, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[0.3, 14]} />
            <meshStandardMaterial
              color={railColor}
              emissive={steelEmissive}
              emissiveIntensity={steelEmissiveInt}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {/* Right rail */}
          <mesh position={[seg.x, 0.065, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
            <planeGeometry args={[0.3, 14]} />
            <meshStandardMaterial
              color={railColor}
              emissive={steelEmissive}
              emissiveIntensity={steelEmissiveInt}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {/* Cross ties every other segment */}
          {i % 2 === 0 && (
            <mesh position={[seg.x, 0.04, seg.z]} rotation={[-Math.PI / 2, 0, -seg.angle]}>
              <planeGeometry args={[5.5, 0.3]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}

// ─── Street Lamp ──────────────────────────────────────────────────────────────
function StreetLamp({ x, z }: { x: number; z: number }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 3, 0]}>
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

function StreetLampsLayer({ streetLamps }: { streetLamps: { x: number; z: number }[] }) {
  return (
    <>
      {streetLamps.map((lamp, i) => (
        <StreetLamp key={i} x={lamp.x} z={lamp.z} />
      ))}
    </>
  )
}

// ─── Traffic Light ─────────────────────────────────────────────────────────────
function TrafficLight({ x, z }: { x: number; z: number; angle?: number }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      {/* Housing */}
      <mesh position={[0, 4.8, 0]}>
        <boxGeometry args={[0.25, 0.7, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Red light */}
      <mesh position={[0, 5.0, 0.11]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial
          color="#ff2200"
          emissive={isNight ? '#ff2200' : '#000000'}
          emissiveIntensity={isNight ? 1.5 : 0}
        />
      </mesh>
      {/* Yellow light */}
      <mesh position={[0, 4.8, 0.11]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial
          color="#888800"
          emissive={isNight ? '#888800' : '#000000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>
      {/* Green light */}
      <mesh position={[0, 4.6, 0.11]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial
          color="#00aa00"
          emissive={isNight ? '#00aa00' : '#000000'}
          emissiveIntensity={isNight ? 1.0 : 0}
        />
      </mesh>
      {isNight && <pointLight position={[0, 4.8, 0.5]} color="#ffffaa" intensity={1} distance={8} />}
    </group>
  )
}

function TrafficLightsLayer({ trafficLights }: { trafficLights: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {trafficLights.map((l, i) => (
        <TrafficLight key={i} x={l.x} z={l.z} />
      ))}
    </>
  )
}

// ─── Crosswalk ────────────────────────────────────────────────────────────────
function Crosswalk({ x, z, angle }: { x: number; z: number; angle: number }) {
  const STRIPES = 5
  const STRIPE_W = 0.4
  const STRIPE_L = 8
  return (
    <group position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, -angle]}>
      {Array.from({ length: STRIPES }).map((_, i) => (
        <mesh key={i} position={[(i - (STRIPES - 1) / 2) * (STRIPE_W + 0.3), 0, 0]}>
          <planeGeometry args={[STRIPE_W, STRIPE_L]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function CrosswalksLayer({ crosswalks }: { crosswalks: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {crosswalks.map((c, i) => (
        <Crosswalk key={i} x={c.x} z={c.z} angle={c.angle} />
      ))}
    </>
  )
}

// ─── Sidewalk ────────────────────────────────────────────────────────────────
function SidewalkSegment({ x, z, len }: { x: number; z: number; len: number }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2, len]} />
      <meshStandardMaterial color="#888888" roughness={0.95} />
    </mesh>
  )
}

function SidewalksLayer({ sidewalks }: { sidewalks: { x: number; z: number; angle: number; len: number }[] }) {
  return (
    <>
      {sidewalks.map((s, i) => (
        <SidewalkSegment key={i} x={s.x} z={s.z} len={s.len} />
      ))}
    </>
  )
}

// ─── Bus Stop ────────────────────────────────────────────────────────────────
function BusStop({ x, z }: { x: number; z: number; angle?: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
        <meshStandardMaterial color="#0055aa" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 3.0, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#0055aa" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Shelter roof */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Bench */}
      <mesh position={[0, 0.25, 0.2]}>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Bench legs */}
      <mesh position={[-0.6, 0.12, 0.2]}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.12, 0.2]}>
        <boxGeometry args={[0.05, 0.25, 0.05]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BusStopsLayer({ busStops }: { busStops: { x: number; z: number; angle: number; name: string }[] }) {
  return (
    <>
      {busStops.map((s, i) => (
        <BusStop key={i} x={s.x} z={s.z} />
      ))}
    </>
  )
}

// ─── Parking Lot ─────────────────────────────────────────────────────────────
function ParkingLot({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
    </mesh>
  )
}

function ParkingLotsLayer({ parkingLots }: { parkingLots: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {parkingLots.map((l, i) => (
        <ParkingLot key={i} x={l.x} z={l.z} />
      ))}
    </>
  )
}

// ─── Fire Hydrant ────────────────────────────────────────────────────────────
function FireHydrant({ x, z }: { x: number; z: number }) {
  const isNight = useGameStore((s) => s.timeOfDay === "night")
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.5, 8]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.2, 8]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      <mesh position={[-0.15, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
        <meshStandardMaterial color="#cc2200" roughness={0.8} />
      </mesh>
      {isNight && <pointLight position={[0, 0.5, 0]} color="#ff4444" intensity={0.5} distance={4} />}
    </group>
  )
}

function FireHydrantsLayer({ hydrants }: { hydrants: { x: number; z: number }[] }) {
  return (
    <>
      {hydrants.map((h, i) => (
        <FireHydrant key={i} x={h.x} z={h.z} />
      ))}
    </>
  )
}

// ─── Bench ─────────────────────────────────────────────────────────────────
function Bench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Seat */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.65, -0.15]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Legs */}
      {[-0.5, 0.5].map((lx, i) => (
        <mesh key={i} position={[lx, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.35]} />
          <meshStandardMaterial color="#444444" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function BenchesLayer({ benches }: { benches: { x: number; z: number; angle: number }[] }) {
  return (
    <>
      {benches.map((b, i) => (
        <Bench key={i} x={b.x} z={b.z} />
      ))}
    </>
  )
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function Ground({ water }: { water: { x: number; z: number; width: number; height: number } }) {
  const groundColor = '#2a3a20'
  const waterColor = '#1a3a5a'
  // Large enough to cover the camera's 8000-unit far plane at any position
  const GROUND_SIZE = 20000

  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[water.x, -0.04, water.z]}>
        <planeGeometry args={[water.width, water.height]} />
        <meshStandardMaterial color={waterColor} roughness={0.3} metalness={0.1} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// ─── Main World ───────────────────────────────────────────────────────────────
export default function World() {
  const data = useLandscapeData()
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isNight = timeOfDay === 'night'

  // Build spatial grid once
  _spatialGrid = useMemo(() => buildSpatialGrid(data.buildings), [data])

  const skyProps = isNight
    ? { sunPosition: [-100, 20, -50] as [number,number,number], turbidity: 10, rayleigh: 0.5, mieCoefficient: 0.005, mieDirectionalG: 0.8 }
    : { sunPosition: [100, 80, -50] as [number,number,number], turbidity: 3, rayleigh: 0.5, mieCoefficient: 0.002, mieDirectionalG: 0.8 }

  return (
    <>
      <ambientLight intensity={isNight ? 0.4 : 3.0} />
      <directionalLight
        position={[100, 200, 80]}
        intensity={isNight ? 0.5 : 7.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={5000}
        shadow-camera-left={-MAP_SIZE}
        shadow-camera-right={MAP_SIZE}
        shadow-camera-top={MAP_SIZE}
        shadow-camera-bottom={-MAP_SIZE}
      />
      <Sky {...skyProps} />

      <Ground water={data.water} />
      <RoadLayer roadPaths={data.roadPaths} roads={data.roads} />
      <RailLayer caltransPaths={data.caltransPaths} />
      <BuildingsLayer buildings={data.buildings} />
      <TreesLayer trees={data.trees} />
      <StreetLampsLayer streetLamps={data.streetLamps} />
      <SidewalksLayer sidewalks={data.sidewalks} />
      <CrosswalksLayer crosswalks={data.crosswalks} />
      <BusStopsLayer busStops={data.busStops} />
      <ParkingLotsLayer parkingLots={data.parkingLots} />
      <FireHydrantsLayer hydrants={data.hydrants} />
      <BenchesLayer benches={data.benches} />
      <TrafficLightsLayer trafficLights={data.trafficLights} />
      <BillboardLayer />
    </>
  )
}

// Export spatial grid getter for collision systems to use
export function getSpatialGrid() { return _spatialGrid }
export function getNearbyBuildingsGrid(px: number, pz: number, radius: number) {
  if (!_spatialGrid) return []
  return getNearbyBuildings(px, pz, _spatialGrid, radius)
}
