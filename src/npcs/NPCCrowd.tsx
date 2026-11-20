// @jiahe
import { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { NPC } from '../game/types'
import { NPC_COLORS, MAP_SIZE } from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid, collideCircleWithBuilding, circleHitsBuilding, meshColliderPushOutCircle, meshColliderHitsCircle } from '../world/World'
import { VehicleMesh, TRAFFIC_MODELS } from '../vehicles/VehicleSpawner'
import KenneyCharacter, { CHARACTER_MODELS, type CharacterAnim } from '../characters/KenneyCharacter'
import { useLandscapeData } from '../game/LandscapeContext'
import { soundManager } from '../systems/audio/SoundManager'
import { interactLatched, consumeInteract } from '../game/interactLatch'
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

// ── Pedestrian NPC ───────────────────────────────────────────────────────────
// (Body is a rigged Kenney character now — see characters/KenneyCharacter.tsx)
const SHIRTS = ['#cc3333', '#3366cc', '#33aa55', '#ccaa33', '#8833cc', '#cc8844', '#338888']
const PANTS = ['#1a1a3a', '#2a2a2a', '#3a3020', '#1a2a1a', '#2a1a2a', '#1a1a1a', '#2a3a2a']
const HAIR_COLORS = ['#0a0505', '#1a0f08', '#2a1a10', '#3a2515', '#8a6030', '#c0a060', '#404040', '#c0c0c0']

interface PedProps {
  id: string; x: number; z: number; color: string; shirt: string; pants: string; hair: string; seed: number
  buildings: { x: number; z: number; width: number; depth: number }[]
  trees: { x: number; z: number }[]
}

function PedestrianNPC({ id, x, z, seed, buildings, trees }: PedProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Rigged Kenney character — model picked per ped, clip driven by state.
  const model = CHARACTER_MODELS[Math.floor(seededRandom(seed * 3.7) * CHARACTER_MODELS.length)]
  const [anim, setAnim] = useState<CharacterAnim>('idle')
  const animRef = useRef<CharacterAnim>('idle')
  const setClip = (next: CharacterAnim) => {
    if (animRef.current !== next) { animRef.current = next; setAnim(next) }
  }

  const pos = useRef(new THREE.Vector3(x, 0, z))
  const angle = useRef(seededRandom(seed) * Math.PI * 2)
  const walkSpeed = 2.5 + seededRandom(seed * 13) * 1.5
  const timer = useRef(0)
  const tgtX = useRef(x)
  const tgtZ = useRef(z)
  const isFleeing = useRef(false)
  const isHit = useRef(false)
  const hitTimer = useRef(0)
  const hitVelX = useRef(0)
  const hitVelZ = useRef(0)

  useEffect(() => {
    return () => { pedPositions.delete(id) }
  }, [id])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    // ── Hit ragdoll ───────────────────────────────────────────────────────
    if (isHit.current) {
      hitTimer.current -= dt
      setClip('fall')
      pos.current.x += hitVelX.current * dt
      pos.current.z += hitVelZ.current * dt
      hitVelX.current *= 0.85
      hitVelZ.current *= 0.85
      pos.current.y = Math.max(0, pos.current.y - 12 * dt)
      if (hitTimer.current <= 0) {
        isHit.current = false
        pos.current.y = 0
      }
      if (groupRef.current) {
        groupRef.current.position.set(pos.current.x, pos.current.y, pos.current.z)
        groupRef.current.rotation.z += 8 * dt
      }
      pedPositions.set(id, { x: pos.current.x, z: pos.current.z })
      return
    }

    // ── Vehicle proximity — flee or detect hit ────────────────────────────
    for (const [, v] of vehiclePositions) {
      const vdx = pos.current.x - v.x
      const vdz = pos.current.z - v.z
      const vDist = Math.sqrt(vdx * vdx + vdz * vdz)
      const minDist = 0.3 + v.radius

      if (vDist < minDist && vDist > 0.001 && v.moving !== false) {
        // Direct hit — launch the ped
        isHit.current = true
        hitTimer.current = 0.8
        const spd = 8
        hitVelX.current = (vdx / vDist) * spd
        hitVelZ.current = (vdz / vDist) * spd
        pos.current.y = 0.5
        soundManager.play('metal_impact', { volume: 0.5 })
        if (v.player) useGameStore.getState().addWanted(1)
        isFleeing.current = false
      } else if (vDist < 15) {
        // Nearby fast vehicle — flee away from it
        isFleeing.current = true
        tgtX.current = pos.current.x + (vdx / vDist) * 20
        tgtZ.current = pos.current.z + (vdz / vDist) * 20
        timer.current = 0
      }
    }

    const dx = tgtX.current - pos.current.x
    const dz = tgtZ.current - pos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const isMoving = dist > 0.3

    if (dist < 1.5 || timer.current > 4) {
      timer.current = 0
      isFleeing.current = false
      tgtX.current = x + (seededRandom(timer.current + seed) - 0.5) * 40
      tgtZ.current = z + (seededRandom(timer.current + seed * 3) - 0.5) * 40
    }

    const effectiveSpeed = isFleeing.current ? walkSpeed * 2.5 : walkSpeed

    if (dist > 0.1) {
      pos.current.x += (dx / dist) * effectiveSpeed * dt
      pos.current.z += (dz / dist) * effectiveSpeed * dt
      angle.current = Math.atan2(dx, dz)

      // Building collision
      const pR = 0.3
      const nearbyBuildings = getNearbyBuildingsGrid(pos.current.x, pos.current.z, pR + 10)
      for (const bi of nearbyBuildings) {
        const push = collideCircleWithBuilding(bi, pos.current.x, pos.current.z, pR, buildings)
        if (!push) continue
        pos.current.x += push.pushX
        pos.current.z += push.pushZ
      }
      const meshPush = meshColliderPushOutCircle(pos.current.x, pos.current.z, pR)
      if (meshPush) {
        pos.current.x += meshPush.pushX
        pos.current.z += meshPush.pushZ
      }

      // Tree collision
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

    // Animation clip from state
    setClip(isMoving ? (isFleeing.current ? 'sprint' : 'walk') : 'idle')

    if (groupRef.current) {
      groupRef.current.position.set(pos.current.x, 0, pos.current.z)
      groupRef.current.rotation.y = angle.current
      groupRef.current.rotation.z = 0 // clear any leftover ragdoll spin
    }
  })

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        <KenneyCharacter
          model={model}
          anim={anim}
          height={1.65 + seededRandom(seed * 5.1) * 0.25}
          timeScale={anim === 'walk' ? 0.9 + seededRandom(seed * 2.3) * 0.3 : 1}
        />
      </Suspense>
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
  const [hijacked, setHijacked] = useState(false)
  const prevInteract = useRef(false)
  const landscape = useLandscapeData()
  const curSpeed = useRef(0)
  const trafficModel = TRAFFIC_MODELS[Math.abs(Math.floor(x * 7 + z * 13)) % TRAFFIC_MODELS.length]
  const driverModel = CHARACTER_MODELS[Math.abs(Math.floor(x * 3 + z * 11)) % CHARACTER_MODELS.length]

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

    // Traffic lights: one global two-phase cycle (E–W green, then N–S, 10 s).
    // A car heading toward a red within ~16 m rolls to a stop ~5 m short.
    const tl = (performance.now() / 1000) % 10
    const greenForUs = Math.abs(fwdX) > Math.abs(fwdZ) ? tl < 4.6 : (tl >= 5 && tl < 9.6)
    if (!greenForUs) {
      for (const light of landscape.trafficLights) {
        const lx = light.x - pos.current.x
        const lz = light.z - pos.current.z
        if (lx * lx + lz * lz > 400) continue
        const dot = lx * fwdX + lz * fwdZ
        const perp = Math.abs(lx * -fwdZ + lz * fwdX)
        if (dot > 1 && dot < 16 && perp < 7) speedScale = Math.min(speedScale, Math.max(0, (dot - 5) / 11))
      }
    }

    // Smooth acceleration / braking instead of snapping to the target speed.
    const targetSpeed = speed * speedScale
    curSpeed.current += (targetSpeed - curSpeed.current) * Math.min(1, dt * (targetSpeed < curSpeed.current ? 4 : 1.2))
    const effSpeed = curSpeed.current
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


    // Hijack prompt + input. Only when player is on foot and not inside any vehicle.
    if (!inVehicle) {
      const pdx = playerPosition[0] - pos.current.x
      const pdz = playerPosition[2] - pos.current.z
      const pdist = Math.sqrt(pdx * pdx + pdz * pdz)

      if (pdist < 4) {
        setNearbyInteractable({ type: 'vehicle', id }, 'Press F to hijack')

        const touch = (window as Window & { __touchInput?: { interact?: boolean } }).__touchInput || {}
        const { interact } = getKeys()
        const intract = !!(interact || touch.interact || interactLatched())

        if (intract && !prevInteract.current) {
          consumeInteract()
          const newId = `hijacked-${id}-${Date.now()}`
          window.dispatchEvent(new CustomEvent('cheat-spawn', {
            detail: { id: newId, type: 'sports', x: pos.current.x, z: pos.current.z, rotation: carAngle.current, modelUrl: trafficModel },
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
      {/* Vehicle body — model picked per car so traffic has variety */}
      <VehicleMesh type="sports" color={color} modelUrl={trafficModel} />
      {/* NPC driver, seated behind the wheel */}
      <group position={[0.34, 0.42, 0.05]}>
        <Suspense fallback={null}>
          <KenneyCharacter model={driverModel} anim="drive" height={1.35} />
        </Suspense>
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
