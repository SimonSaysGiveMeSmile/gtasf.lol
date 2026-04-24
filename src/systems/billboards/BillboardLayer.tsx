import { useMemo } from 'react'
import { useGameStore } from '../../game/store'
import { LANDSCAPE_CONFIG } from '../../game/landscape'
import { BILLBOARD_ADS, type AdContent } from './adsConfig'
import type { BuildingData, PathPoint } from '../../game/landscape.types'

function seededRandom(seed: number): number { // @t1an
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// Billboard structure: pole + face
function BillboardStructure({ x, z, height, ad }: { x: number; z: number; height: number; ad: AdContent }) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')
  const BOARD_W = 8
  const BOARD_H = 4.5
  const POLE_H = height

  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, POLE_H / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, POLE_H, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.7} />
      </mesh>
      {/* Cross-arm */}
      <mesh position={[0, POLE_H - 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, BOARD_W + 1, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.7} />
      </mesh>

      {/* Billboard face — front */}
      <mesh
        position={[0, POLE_H - 0.5, BOARD_W / 2]}
        rotation={[0, 0, 0]}
       
      >
        <boxGeometry args={[BOARD_W, BOARD_H, 0.15]} />
        <meshStandardMaterial color={ad.primaryColor} metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Billboard border frame */}
      <mesh position={[0, POLE_H - 0.5, BOARD_W / 2 + 0.08]}>
        <boxGeometry args={[BOARD_W + 0.2, BOARD_H + 0.2, 0.05]} />
        <meshStandardMaterial color={ad.secondaryColor} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Ad panel front */}
      <mesh position={[0, POLE_H - 0.5, BOARD_W / 2 + 0.04]}>
        <boxGeometry args={[BOARD_W - 0.3, BOARD_H - 0.3, 0.08]} />
        <meshStandardMaterial
          color={ad.primaryColor}
          emissive={isNight ? ad.primaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.15 : 0}
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Back face */}
      <mesh position={[0, POLE_H - 0.5, -BOARD_W / 2]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[BOARD_W, BOARD_H, 0.15]} />
        <meshStandardMaterial color={ad.primaryColor} metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Brand text line (top bar) */}
      <mesh position={[0, POLE_H + BOARD_H / 2 - 1.0, BOARD_W / 2 + 0.05]}>
        <boxGeometry args={[BOARD_W - 0.4, 0.6, 0.03]} />
        <meshStandardMaterial
          color={ad.accentColor}
          emissive={isNight ? ad.accentColor : '#000000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Bottom bar */}
      <mesh position={[0, POLE_H - BOARD_H / 2 + 0.8, BOARD_W / 2 + 0.05]}>
        <boxGeometry args={[BOARD_W - 0.4, 0.4, 0.03]} />
        <meshStandardMaterial color={ad.secondaryColor} />
      </mesh>

      {/* Glow light at night */}
      {isNight && (
        <pointLight
          position={[0, POLE_H - 0.5, BOARD_W / 2 + 1]}
          color={ad.primaryColor}
          intensity={2}
          distance={12}
        />
      )}
    </group>
  )
}

// Determine billboard position from a road segment
function getBillboardSpot(
  pathIdx: number,
  segIdx: number,
  side: 'left' | 'right',
  paths: PathPoint[][]
): { x: number; z: number; rotation: number } | null {
  if (pathIdx >= paths.length) return null
  const path = paths[pathIdx]
  if (segIdx >= path.length) return null

  const pt = path[segIdx]
  const perpAngle = pt.angle + Math.PI / 2
  const offset = side === 'left' ? 18 : -18

  return {
    x: pt.x + Math.cos(perpAngle) * offset,
    z: pt.z + Math.sin(perpAngle) * offset,
    rotation: -pt.angle,
  }
}

// Check if a billboard spot is clear of buildings
function isClearOfBuildings(x: number, z: number, r: number, buildings: BuildingData[]): boolean {
  for (const b of buildings) {
    const hx = b.width / 2 + r
    const hz = b.depth / 2 + r
    if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return false
  }
  return true
}

// ── Billboard Layer ────────────────────────────────────────────────────────────
export default function BillboardLayer() {
  const billboards = useMemo(() => {
    const spots: { x: number; z: number; height: number; ad: AdContent }[] = []
    const paths = LANDSCAPE_CONFIG.roadPaths
    const buildings = LANDSCAPE_CONFIG.buildings

    let idx = 0
    // Place billboards along roads — one per ~3 segments, alternating sides
    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi]
      if (pi % 2 !== 0) continue
      for (let si = 5; si < path.length - 5; si += 4) {
        const side: 'left' | 'right' = (si / 4) % 2 === 0 ? 'left' : 'right'
        const spot = getBillboardSpot(pi, si, side, paths)
        if (!spot) continue
        if (!isClearOfBuildings(spot.x, spot.z, 5, buildings)) continue

        const ad = BILLBOARD_ADS[idx % BILLBOARD_ADS.length]
        const height = 6 + seededRandom(idx * 37) * 5
        spots.push({ ...spot, height, ad })
        idx++
        if (spots.length >= 25) break
      }
      if (spots.length >= 25) break
    }

    // Add some near buildings (at major intersections)
    for (let pi = 0; pi < paths.length && spots.length < 30; pi++) {
      const path = paths[pi]
      for (const si of [0, Math.floor(path.length / 2)]) {
        if (spots.length >= 30) break
        const side: 'left' | 'right' = pi % 2 === 0 ? 'right' : 'left'
        const spot = getBillboardSpot(pi, si, side, paths)
        if (!spot) continue
        if (!isClearOfBuildings(spot.x, spot.z, 5, buildings)) continue
        let tooClose = false
        for (const s of spots) {
          const dx = s.x - spot.x
          const dz = s.z - spot.z
          if (Math.sqrt(dx * dx + dz * dz) < 20) { tooClose = true; break }
        }
        if (tooClose) continue

        const ad = BILLBOARD_ADS[(idx + 7) % BILLBOARD_ADS.length]
        spots.push({ ...spot, height: 10, ad })
        idx++
      }
    }

    return spots
  }, [])

  return (
    <>
      {billboards.map((b, i) => (
        <BillboardStructure key={`bb-${i}`} {...b} />
      ))}
    </>
  )
}