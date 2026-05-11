// @jiahe
import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { NPC } from '../game/types'
import { NPC_COLORS, MAP_SIZE } from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid, collideCircleWithBuilding, circleHitsBuilding, meshColliderPushOutCircle, meshColliderHitsCircle } from '../world/World'
import { VehicleMesh } from '../vehicles/VehicleSpawner'
import { useLandscapeData } from '../game/LandscapeContext'
// @simonsaysgivemesmile

function seededRandom(seed: number) { // @t1an
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// NPC spawn helpers — use road paths
function isClearOfBuildings(x: number, z: number, r: number, buildings: typeof LANDSCAPE_CONFIG.buildings): boolean {
  for (const b of buildings) {
    const hx = b.width / 2 + r + 2
    const hz = b.depth / 2 + r + 2
    if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return false
  }
  return true
}

// NPC spawn registry — prevents overlapping NPCs at spawn time.
// Cleared at the start of every crowd rebuild so it doesn't accumulate
// across map switches.
const _spawnedNPCs: { x: number; z: number }[] = []

// Live pedestrian positions, keyed by id — used for ped-ped separation each frame.
const pedPositions = new Map<string, { x: number; z: number }>()

function findNPCSpawn(seed: number, roadPaths: typeof LANDSCAPE_CONFIG.roadPaths, buildings: typeof LANDSCAPE_CONFIG.buildings): { x: number; z: number } | null {
  const allPoints: { x: number; z: number }[] = []
  for (const path of roadPaths) {
    for (let i = 0; i < path.length; i += 12) {
      allPoints.push({ x: path[i].x, z: path[i].z })
    }
  }
  if (allPoints.length === 0) return null
  for (let i = allPoints.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i * 13) * (i + 1))
    const tmp = allPoints[i]
    allPoints[i] = allPoints[j]
    allPoints[j] = tmp
  }
  for (const pt of allPoints) {
    if (isClearOfBuildings(pt.x, pt.z, 0.3, buildings)) {
      let clearOfVehicles = true
      for (const [, v] of vehiclePositions) {
        const dx = pt.x - v.x; const dz = pt.z - v.z
        if (Math.sqrt(dx * dx + dz * dz) < 0.8 + v.radius) { clearOfVehicles = false; break }
      }
      if (!clearOfVehicles) continue
      let clearOfNPCs = true
      for (const np of _spawnedNPCs) {
        const dx = pt.x - np.x; const dz = pt.z - np.z
        if (Math.sqrt(dx * dx + dz * dz) < 1.0) { clearOfNPCs = false; break }
      }
      if (!clearOfNPCs) continue
      return pt
    }
  }
  return null
}

function findCarSpawn(seed: number, roadPaths: typeof LANDSCAPE_CONFIG.roadPaths, buildings: typeof LANDSCAPE_CONFIG.buildings): { x: number; z: number } | null {
  const allPoints: { x: number; z: number }[] = []
  for (const path of roadPaths) {
    for (let i = 0; i < path.length; i += 8) {
      allPoints.push({ x: path[i].x, z: path[i].z })
    }
  }
  if (allPoints.length === 0) return null
  for (let i = allPoints.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i * 19) * (i + 1))
    const tmp = allPoints[i]
    allPoints[i] = allPoints[j]
    allPoints[j] = tmp
  }
  const vR = 2.0
  for (const pt of allPoints) {
    let clear = true
    for (const b of buildings) {
      const hx = b.width / 2 + vR + 3
      const hz = b.depth / 2 + vR + 3
      if (Math.abs(pt.x - b.x) < hx && Math.abs(pt.z - b.z) < hz) { clear = false; break }
    }
    if (!clear) continue
    for (const [, v] of vehiclePositions) {
      const dx = pt.x - v.x; const dz = pt.z - v.z
      if (Math.sqrt(dx * dx + dz * dz) < vR + v.radius + 1.5) { clear = false; break }
    }
    if (clear) return pt
  }
  return null
}

// ── Body dimensions ────────────────────────────────────────────────────────
// Scale: 1 unit = 1 meter. Top of head = 1.83m (6 ft).
// Breakdown: legs 0.87 + torso 0.58 + neck-to-head 0.20 + head radius 0.18 = 1.83
const LEG_LEN = 0.87
const TORSO_H = 0.58
const TORSO_Y = LEG_LEN
const NECK_Y = TORSO_Y + TORSO_H
const HEAD_Y = NECK_Y + 0.20
const HEAD_R = 0.18
const SHOULDER_Y = TORSO_Y + TORSO_H * 0.85
const ARM_LEN = 0.55
const LOWER_LEG_Y = LEG_LEN / 4
const LOWER_LEG_LEN = LEG_LEN * 0.4

// ── Shared body mesh ────────────────────────────────────────────────────────
function BodyMesh({ shirt, pants, skin }: { shirt: string; pants: string; skin: string }) {
  return (
    <group>
      {/* Torso */}
      <mesh position={[0, TORSO_Y + TORSO_H / 2, 0]}>
        <boxGeometry args={[0.48, TORSO_H, 0.26]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, NECK_Y, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Head — simple smooth sphere */}
      <mesh position={[0, HEAD_Y, 0]}>
        <sphereGeometry args={[HEAD_R, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.3, SHOULDER_Y, 0]}>
        <capsuleGeometry args={[0.055, ARM_LEN * 0.6, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, SHOULDER_Y, 0]}>
        <capsuleGeometry args={[0.055, ARM_LEN * 0.6, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.3, SHOULDER_Y - ARM_LEN - 0.12, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, SHOULDER_Y - ARM_LEN - 0.12, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.13, LEG_LEN * 0.6, 0]}>
        <capsuleGeometry args={[0.08, LEG_LEN * 0.55, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      <mesh position={[0.13, LEG_LEN * 0.6, 0]}>
        <capsuleGeometry args={[0.08, LEG_LEN * 0.55, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      {/* Lower legs */}
      <mesh position={[-0.13, LOWER_LEG_Y, 0]}>
        <capsuleGeometry args={[0.055, LOWER_LEG_LEN, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      <mesh position={[0.13, LOWER_LEG_Y, 0]}>
        <capsuleGeometry args={[0.055, LOWER_LEG_LEN, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      {/* Shoes */}
      <mesh position={[-0.13, 0.04, 0.06]}>
        <boxGeometry args={[0.12, 0.07, 0.22]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh position={[0.13, 0.04, 0.06]}>
        <boxGeometry args={[0.12, 0.07, 0.22]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ── Pedestrian NPC ───────────────────────────────────────────────────────────
const SHIRTS = ['#cc3333', '#3366cc', '#33aa55', '#ccaa33', '#8833cc', '#cc8844', '#338888']
const PANTS = ['#1a1a3a', '#2a2a2a', '#3a3020', '#1a2a1a', '#2a1a2a', '#1a1a1a', '#2a3a2a']
const HAIR_COLORS = ['#0a0505', '#1a0f08', '#2a1a10', '#3a2515', '#8a6030', '#c0a060', '#404040', '#c0c0c0']

interface PedProps {
  id: string; x: number; z: number; color: string; shirt: string; pants: string; hair: string; seed: number
  buildings: { x: number; z: number; width: number; depth: number }[]
  trees: { x: number; z: number }[]
}

function PedestrianNPC({ id, x, z, color, shirt, pants, hair: _hair, seed, buildings, trees }: PedProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyGroupRef = useRef<THREE.Group>(null!)
  const leftLegRef = useRef<THREE.Group>(null!)
  const rightLegRef = useRef<THREE.Group>(null!)
  const leftArmRef = useRef<THREE.Group>(null!)
  const rightArmRef = useRef<THREE.Group>(null!)

  const pos = useRef(new THREE.Vector3(x, 0, z))
  const angle = useRef(seededRandom(seed) * Math.PI * 2)
  const walkSpeed = 2.5 + seededRandom(seed * 13) * 1.5
  const animTime = useRef(seededRandom(seed * 7) * 100)
  const timer = useRef(0)
  const tgtX = useRef(x)
  const tgtZ = useRef(z)
  const pLL = useRef(0)
  const pRL = useRef(0)
  const pLA = useRef(0)
  const pRA = useRef(0)

  useEffect(() => {
    return () => { pedPositions.delete(id) }
  }, [id])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    const dx = tgtX.current - pos.current.x
    const dz = tgtZ.current - pos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const isMoving = dist > 0.3

    if (dist < 1.5 || timer.current > 4) {
      timer.current = 0
      tgtX.current = x + (seededRandom(timer.current + seed) - 0.5) * 40
      tgtZ.current = z + (seededRandom(timer.current + seed * 3) - 0.5) * 40
    }

    if (dist > 0.1) {
      pos.current.x += (dx / dist) * walkSpeed * dt
      pos.current.z += (dz / dist) * walkSpeed * dt
      angle.current = Math.atan2(dx, dz)

      // Building collision for pedestrians — polygon-accurate
      const pR = 0.3
      const nearbyBuildings = getNearbyBuildingsGrid(pos.current.x, pos.current.z, pR + 10)
      for (const bi of nearbyBuildings) {
        const push = collideCircleWithBuilding(bi, pos.current.x, pos.current.z, pR, buildings)
        if (!push) continue
        pos.current.x += push.pushX
        pos.current.z += push.pushZ
      }
      // Static-mesh (GLB) collider fallback.
      const meshPush = meshColliderPushOutCircle(pos.current.x, pos.current.z, pR)
      if (meshPush) {
        pos.current.x += meshPush.pushX
        pos.current.z += meshPush.pushZ
      }

      // Tree collision for pedestrians
      const tR = 0.25
      for (const t of trees) {
        const tdx = pos.current.x - t.x
        const tdz = pos.current.z - t.z
        const tDist = Math.sqrt(tdx * tdx + tdz * tdz)
        if (tDist < pR + tR) {
          const nd = tDist - (pR + tR)
          pos.current.x -= (tdx / tDist) * nd
          pos.current.z -= (tdz / tDist) * nd
        }
      }

    // Vehicle collision — push pedestrians away from vehicles
    for (const [, v] of vehiclePositions) {
      const vdx = pos.current.x - v.x
      const vdz = pos.current.z - v.z
      const vDist = Math.sqrt(vdx * vdx + vdz * vdz)
      const minDist = 0.3 + v.radius
      if (vDist < minDist && vDist > 0.001) {
        const nd = minDist - vDist
        pos.current.x += (vdx / vDist) * nd
        pos.current.z += (vdz / vDist) * nd
      }
    }
    }

    // Ped-ped separation — runs every frame so crowds don't overlap.
    const myR = 0.3
    for (const [otherId, p] of pedPositions) {
      if (otherId === id) continue
      const pdx = pos.current.x - p.x
      const pdz = pos.current.z - p.z
      const pDist = Math.sqrt(pdx * pdx + pdz * pdz)
      const minPedDist = myR * 2
      if (pDist < minPedDist && pDist > 0.001) {
        const nd = (minPedDist - pDist) * 0.5
        pos.current.x += (pdx / pDist) * nd
        pos.current.z += (pdz / pDist) * nd
      }
    }

    pedPositions.set(id, { x: pos.current.x, z: pos.current.z })

    // Animation
    if (isMoving) animTime.current += dt * 9
    const t = animTime.current
    const ls = 0.38
    const ar = 0.28
    const tLL = Math.sin(t) * ls
    const tRL = Math.sin(t + Math.PI) * ls
    const tLA = Math.sin(t + Math.PI) * ar
    const tRA = Math.sin(t) * ar
    const lp = 0.22
    pLL.current += (tLL - pLL.current) * lp
    pRL.current += (tRL - pRL.current) * lp
    pLA.current += (tLA - pLA.current) * lp
    pRA.current += (tRA - pRA.current) * lp

    if (leftLegRef.current) leftLegRef.current.rotation.x = pLL.current
    if (rightLegRef.current) rightLegRef.current.rotation.x = pRL.current
    if (leftArmRef.current) leftArmRef.current.rotation.x = pLA.current
    if (rightArmRef.current) rightArmRef.current.rotation.x = pRA.current

    if (bodyGroupRef.current) {
      const lean = isMoving ? 0.08 : 0
      bodyGroupRef.current.rotation.x += (lean - bodyGroupRef.current.rotation.x) * 0.1
    }

    if (groupRef.current) {
      groupRef.current.position.set(pos.current.x, 0, pos.current.z)
      groupRef.current.rotation.y = angle.current
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body — rotates for lean */}
      <group ref={bodyGroupRef}>
        {/* Core body parts */}
        <BodyMesh shirt={shirt} pants={pants} skin={color} />
        {/* Animated limbs — pivot at shoulder/hip joints */}
        <group ref={leftArmRef} position={[-0.3, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LEN * 0.3, 0]}>
            <capsuleGeometry args={[0.055, ARM_LEN * 0.6, 4, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -ARM_LEN - 0.12, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.3, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LEN * 0.3, 0]}>
            <capsuleGeometry args={[0.055, ARM_LEN * 0.6, 4, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -ARM_LEN - 0.12, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
        <group ref={leftLegRef} position={[-0.13, 0, 0]}>
          <mesh position={[0, LEG_LEN * 0.35, 0]}>
            <capsuleGeometry args={[0.08, LEG_LEN * 0.55, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN + 0.12, 0]}>
            <capsuleGeometry args={[0.055, LEG_LEN * 0.4, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN * 2 + 0.04, 0.06]}>
            <boxGeometry args={[0.12, 0.07, 0.22]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.13, 0, 0]}>
          <mesh position={[0, LEG_LEN * 0.35, 0]}>
            <capsuleGeometry args={[0.08, LEG_LEN * 0.55, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN + 0.12, 0]}>
            <capsuleGeometry args={[0.055, LEG_LEN * 0.4, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN * 2 + 0.04, 0.06]}>
            <boxGeometry args={[0.12, 0.07, 0.22]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ── Traffic Car NPC ─────────────────────────────────────────────────────────
// Traffic cars are AI-driven until the player hijacks them. On hijack, the
// traffic entry is removed and a real player-drivable Vehicle spawns at the
// same pose via the existing 'cheat-spawn' pipe in VehicleSpawner.
type RoadPath = { x: number; z: number }[]

function pickRoadPath(x: number, z: number, roadPaths: RoadPath[]): { pathIdx: number; ptIdx: number; dir: 1 | -1 } | null {
  let bestPath = -1
  let bestPt = -1
  let bestDist = Infinity
  for (let p = 0; p < roadPaths.length; p++) {
    const path = roadPaths[p]
    if (path.length < 2) continue
    for (let i = 0; i < path.length; i++) {
      const dx = path[i].x - x
      const dz = path[i].z - z
      const d = dx * dx + dz * dz
      if (d < bestDist) { bestDist = d; bestPath = p; bestPt = i }
    }
  }
  if (bestPath < 0) return null
  // Prefer advancing forward along the path; flip direction at the tail end.
  const path = roadPaths[bestPath]
  const dir: 1 | -1 = bestPt < path.length - 1 ? 1 : -1
  return { pathIdx: bestPath, ptIdx: bestPt, dir }
}

function TrafficCar({ x, z, rotation, color, id, buildings, roadPaths }: { x: number; z: number; rotation: number; color: string; id: string; buildings: { x: number; z: number; width: number; depth: number }[]; roadPaths: RoadPath[] }) {
  const meshRef = useRef<THREE.Group>(null)
  const carAngle = useRef(rotation)
  const timer = useRef(0)
  const speed = 8 + seededRandom(x * 19 + z * 43 + rotation * 7) * 6
  const pos = useRef(new THREE.Vector3(x, 0, z))
  const driverRef = useRef<THREE.Group>(null!)
  const [hijacked, setHijacked] = useState(false)
  const prevInteract = useRef(false)

  // Route state — populated from roadPaths at mount, refreshed if path data changes.
  const route = useRef(pickRoadPath(x, z, roadPaths))
  const stuckTimer = useRef(0)

  const [, getKeys] = useKeyboardControls()
  const inVehicle = useGameStore((s) => s.inVehicle)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const setNearbyInteractable = useGameStore((s) => s.setNearbyInteractable)

  useFrame((_, delta) => {
    if (hijacked) return
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    // ── Waypoint steering ─────────────────────────────────────────────────
    // If we have a route, steer the car toward the next waypoint along the
    // chosen road path. Falls back to straight-line travel if no roadPaths.
    const r = route.current
    let targetAngle: number | null = null
    if (r && roadPaths[r.pathIdx]) {
      const path = roadPaths[r.pathIdx]
      const tgt = path[r.ptIdx]
      if (tgt) {
        const ddx = tgt.x - pos.current.x
        const ddz = tgt.z - pos.current.z
        const dd = Math.sqrt(ddx * ddx + ddz * ddz)
        if (dd < 3) {
          // Reached waypoint — advance. If we fall off the end, flip direction.
          r.ptIdx += r.dir
          if (r.ptIdx < 0 || r.ptIdx >= path.length) {
            r.dir = (r.dir * -1) as 1 | -1
            r.ptIdx = Math.max(0, Math.min(path.length - 1, r.ptIdx + r.dir))
          }
        } else {
          targetAngle = Math.atan2(ddx, ddz)
        }
      }
    }

    // Steer toward target angle (wrapped). Smooth turn rate so cars don't pivot in place.
    if (targetAngle !== null) {
      let diff = targetAngle - carAngle.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const maxTurn = 2.5 * dt
      carAngle.current += Math.max(-maxTurn, Math.min(maxTurn, diff))
    }

    // ── Obstacle look-ahead ───────────────────────────────────────────────
    // Slow down (don't pancake the brake) if another vehicle is within
    // ~6 m in our forward cone. Keeps traffic from piling up at intersections.
    let speedScale = 1
    const fwdX = Math.sin(carAngle.current)
    const fwdZ = Math.cos(carAngle.current)
    for (const [otherId, other] of vehiclePositions) {
      if (otherId === id) continue
      const ox = other.x - pos.current.x
      const oz = other.z - pos.current.z
      const dot = ox * fwdX + oz * fwdZ
      if (dot < 0 || dot > 6) continue
      const perp = Math.abs(ox * -fwdZ + oz * fwdX)
      if (perp < 2.2) {
        speedScale = Math.min(speedScale, dot / 6)
      }
    }
    // Yield to player on foot in the same cone.
    if (!inVehicle) {
      const px = playerPosition[0] - pos.current.x
      const pz = playerPosition[2] - pos.current.z
      const dot = px * fwdX + pz * fwdZ
      const perp = Math.abs(px * -fwdZ + pz * fwdX)
      if (dot > 0 && dot < 4 && perp < 2) speedScale = 0
    }

    const effSpeed = speed * speedScale
    const dx = fwdX * effSpeed * dt
    const dz = fwdZ * effSpeed * dt
    const nx = pos.current.x + dx
    const nz = pos.current.z + dz

    // Building collision for traffic cars — polygon-accurate
    const tcR = 1.8
    let blocked = false
    const nearbyBuildings = getNearbyBuildingsGrid(nx, nz, tcR + 10)
    for (const bi of nearbyBuildings) {
      if (circleHitsBuilding(bi, nx, nz, tcR, buildings)) {
        blocked = true
        break
      }
    }
    if (!blocked && meshColliderHitsCircle(nx, nz, tcR)) {
      blocked = true
    }

    // Vehicle-vehicle collision — push traffic cars away from other vehicles
    for (const [otherId, other] of vehiclePositions) {
      if (otherId === id) continue
      const dvx = pos.current.x - other.x
      const dvz = pos.current.z - other.z
      const dvDist = Math.sqrt(dvx * dvx + dvz * dvz)
      const minV = 1.8 + other.radius + 0.15
      if (dvDist < minV && dvDist > 0.001) {
        const nd = minV - dvDist
        pos.current.x += (dvx / dvDist) * nd
        pos.current.z += (dvz / dvDist) * nd
      }
    }

    if (!blocked) {
      pos.current.x = nx
      pos.current.z = nz
      stuckTimer.current = 0
    } else {
      // Wall ahead — increment stuck timer. If we've been stuck for a
      // while, re-pick a route from our current position and try again.
      stuckTimer.current += dt
      if (stuckTimer.current > 1.2) {
        route.current = pickRoadPath(pos.current.x, pos.current.z, roadPaths)
        stuckTimer.current = 0
      } else {
        // Nudge the angle a bit to escape grazing collisions without the
        // old random flail.
        carAngle.current += (seededRandom(timer.current * 7 + x) - 0.5) * 0.5
      }
    }

    // Wrap around map edges
    const half = MAP_SIZE * 0.6
    if (pos.current.x < -half) pos.current.x = half
    if (pos.current.x > half) pos.current.x = -half
    if (pos.current.z < -half) pos.current.z = half
    if (pos.current.z > half) pos.current.z = -half

    vehiclePositions.set(id, { x: pos.current.x, z: pos.current.z, radius: 1.8 })

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = carAngle.current
    }

    if (driverRef.current) {
      driverRef.current.rotation.y = carAngle.current
    }

    // Hijack prompt + input. Only when player is on foot and not inside any vehicle.
    if (!inVehicle) {
      const pdx = playerPosition[0] - pos.current.x
      const pdz = playerPosition[2] - pos.current.z
      const pdist = Math.sqrt(pdx * pdx + pdz * pdz)

      if (pdist < 4) {
        setNearbyInteractable({ type: 'vehicle', id }, 'Press F to hijack')

        const touch = (window as Window & { __touchInput?: { interact?: boolean } }).__touchInput || {}
        const { interact } = getKeys()
        const intract = !!(interact || touch.interact)

        if (intract && !prevInteract.current) {
          const newId = `hijacked-${id}-${Date.now()}`
          window.dispatchEvent(new CustomEvent('cheat-spawn', {
            detail: { id: newId, type: 'sports', x: pos.current.x, z: pos.current.z, rotation: carAngle.current },
          }))
          useGameStore.getState().enterVehicle(newId, 'sports')
          vehiclePositions.delete(id)
          setNearbyInteractable(null)
          setHijacked(true)
        }
        prevInteract.current = intract
      } else {
        prevInteract.current = false
        const current = useGameStore.getState()
        if (current.nearbyInteractable?.id === id) setNearbyInteractable(null)
      }
    }
  })

  if (hijacked) return null

  return (
    <group ref={meshRef} position={[x, 0, z]}>
      {/* Vehicle body */}
      <VehicleMesh type="sports" color={color} />
      {/* NPC driver in the car — visible through windows */}
      <group position={[0, 0.6, -0.3]} ref={driverRef}>
        {/* Head */}
        <mesh>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#d4a574" roughness={0.8} />
        </mesh>
        {/* Simple torso */}
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.25, 0.35, 0.15]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}


// ── NPC Crowd ───────────────────────────────────────────────────────────────
export default function NPCCrowd() {
  const data = useLandscapeData()
  const setNPCs = useGameStore((s) => s.setNPCs)
  const qualityNpcCount = useGameStore((s) => s.qualityNpcCount)
  const qualityVehicleCount = useGameStore((s) => s.qualityVehicleCount)

  const { pedestrians, cars } = useMemo(() => {
    // Clear registries — each rebuild (map switch, quality slider) starts fresh.
    _spawnedNPCs.length = 0
    pedPositions.clear()

    const peds: { id: string; x: number; z: number; color: string; shirt: string; pants: string; hair: string; seed: number }[] = []
    const cars: { id: string; x: number; z: number; rotation: number; color: string }[] = []
    const carColors = ['#334488', '#883333', '#338833', '#aaaaaa', '#444444', '#665522']

    for (let i = 0; i < qualityNpcCount; i++) {
      const seed = i * 17
      const ang = seededRandom(seed * 13) * Math.PI * 2
      const dist = 15 + seededRandom(seed * 29) * MAP_SIZE * 0.35
      const spawn = findNPCSpawn(seed, data.roadPaths, data.buildings)
      const x = spawn ? spawn.x : Math.cos(ang) * dist
      const z = spawn ? spawn.z : Math.sin(ang) * dist
      peds.push({
        id: `ped-${i}`,
        x,
        z,
        color: NPC_COLORS[i % NPC_COLORS.length],
        shirt: SHIRTS[i % SHIRTS.length],
        pants: PANTS[i % PANTS.length],
        hair: HAIR_COLORS[i % HAIR_COLORS.length],
        seed,
      })
      _spawnedNPCs.push({ x, z })
    }

    for (let i = 0; i < qualityVehicleCount; i++) {
      const carSpawn = findCarSpawn(i * 41 + 100, data.roadPaths, data.buildings)
      cars.push({
        id: `traffic-${i}`,
        x: carSpawn ? carSpawn.x : (seededRandom(i * 23) - 0.5) * MAP_SIZE * 0.8,
        z: carSpawn ? carSpawn.z : (seededRandom(i * 37 + 50) - 0.5) * MAP_SIZE * 0.8,
        rotation: seededRandom(i * 53 + 100) * Math.PI * 2,
        color: carColors[i % carColors.length],
      })
    }

    const npcData: NPC[] = [...peds.map(p => ({
      id: p.id, type: 'pedestrian' as const,
      position: [p.x, 0.9, p.z] as [number, number, number],
      rotation: 0, color: p.color, state: 'walking' as const
    })), ...cars.map(c => ({
      id: c.id, type: 'traffic' as const,
      position: [c.x, 0, c.z] as [number, number, number],
      rotation: c.rotation, color: c.color, state: 'driving' as const
    }))]
    setNPCs(npcData)

    return { pedestrians: peds, cars }
  }, [data, setNPCs, qualityNpcCount, qualityVehicleCount])

  return (
    <>
      {pedestrians.map(p => (
        <PedestrianNPC key={p.id} {...p} buildings={data.buildings} trees={data.trees} />
      ))}
      {cars.map(c => (
        <TrafficCar key={c.id} {...c} id={c.id} buildings={data.buildings} roadPaths={data.roadPaths} />
      ))}
    </>
  )
}
