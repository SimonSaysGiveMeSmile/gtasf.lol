import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { NPC } from '../game/types'
import { NPC_COUNT, TRAFFIC_COUNT, NPC_COLORS, MAP_SIZE } from '../game/constants'
import { LANDSCAPE_CONFIG } from '../game/landscape'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid } from '../world/World'
import { VehicleMesh } from '../vehicles/Vehicle'

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// NPC spawn helpers — use road paths
function isClearOfBuildings(x: number, z: number, r: number): boolean {
  for (const b of LANDSCAPE_CONFIG.buildings) {
    const hx = b.width / 2 + r + 2
    const hz = b.depth / 2 + r + 2
    if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return false
  }
  return true
}

// NPC spawn registry — prevents overlapping NPCs at spawn time
const _spawnedNPCs: { x: number; z: number }[] = []

function findNPCSpawn(seed: number): { x: number; z: number } | null {
  const allPoints: { x: number; z: number }[] = []
  for (const path of LANDSCAPE_CONFIG.roadPaths) {
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
    if (isClearOfBuildings(pt.x, pt.z, 0.3)) {
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

function findCarSpawn(seed: number): { x: number; z: number } | null {
  const allPoints: { x: number; z: number }[] = []
  for (const path of LANDSCAPE_CONFIG.roadPaths) {
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
    for (const b of LANDSCAPE_CONFIG.buildings) {
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
const LEG_LEN = 0.5
const TORSO_H = 0.65
const TORSO_Y = LEG_LEN
const NECK_Y = TORSO_Y + TORSO_H
const HEAD_Y = NECK_Y + 0.18
const SHOULDER_Y = TORSO_Y + TORSO_H * 0.85
const ARM_LEN = 0.4

// ── Shared body mesh ────────────────────────────────────────────────────────
function BodyMesh({ shirt, pants, skin }: { shirt: string; pants: string; skin: string }) {
  return (
    <group>
      {/* Torso */}
      <mesh position={[0, TORSO_Y + TORSO_H / 2, 0]}>
        <boxGeometry args={[0.4, TORSO_H, 0.22]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, NECK_Y, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Head — simple smooth sphere */}
      <mesh position={[0, HEAD_Y, 0]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, SHOULDER_Y, 0]}>
        <capsuleGeometry args={[0.045, ARM_LEN * 0.6, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0.25, SHOULDER_Y, 0]}>
        <capsuleGeometry args={[0.045, ARM_LEN * 0.6, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.25, SHOULDER_Y - ARM_LEN - 0.1, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[0.25, SHOULDER_Y - ARM_LEN - 0.1, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, LEG_LEN / 2, 0]}>
        <capsuleGeometry args={[0.065, LEG_LEN * 0.65, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      <mesh position={[0.1, LEG_LEN / 2, 0]}>
        <capsuleGeometry args={[0.065, LEG_LEN * 0.65, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      {/* Lower legs */}
      <mesh position={[-0.1, 0.12, 0]}>
        <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.12, 0]}>
        <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
        <meshStandardMaterial color={pants} roughness={0.8} />
      </mesh>
      {/* Shoes */}
      <mesh position={[-0.1, 0.03, 0.05]}>
        <boxGeometry args={[0.1, 0.06, 0.18]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 0.03, 0.05]}>
        <boxGeometry args={[0.1, 0.06, 0.18]} />
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
  x: number; z: number; color: string; shirt: string; pants: string; hair: string; seed: number
}

function PedestrianNPC({ x, z, color, shirt, pants, hair: _hair, seed }: PedProps) {
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

      // Building collision for pedestrians
      const pR = 0.3
      const nearbyBuildings = getNearbyBuildingsGrid(pos.current.x, pos.current.z, pR + 10)
      for (const bi of nearbyBuildings) {
        const b = LANDSCAPE_CONFIG.buildings[bi]
        const hx = b.width / 2 + pR
        const hz = b.depth / 2 + pR
        const ddx = pos.current.x - b.x
        const ddz = pos.current.z - b.z
        if (Math.abs(ddx) < hx && Math.abs(ddz) < hz) {
          const ovX = hx - Math.abs(ddx)
          const ovZ = hz - Math.abs(ddz)
          if (ovX < ovZ) {
            pos.current.x -= Math.sign(ddx) * ovX
          } else {
            pos.current.z -= Math.sign(ddz) * ovZ
          }
        }
      }

      // Tree collision for pedestrians
      const tR = 0.25
      for (const t of LANDSCAPE_CONFIG.trees) {
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
        <group ref={leftArmRef} position={[-0.25, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LEN * 0.3, 0]}>
            <capsuleGeometry args={[0.045, ARM_LEN * 0.6, 4, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -ARM_LEN - 0.1, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.25, SHOULDER_Y, 0]}>
          <mesh position={[0, -ARM_LEN * 0.3, 0]}>
            <capsuleGeometry args={[0.045, ARM_LEN * 0.6, 4, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.8} />
          </mesh>
          <mesh position={[0, -ARM_LEN - 0.1, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
        <group ref={leftLegRef} position={[-0.1, 0, 0]}>
          <mesh position={[0, LEG_LEN * 0.35, 0]}>
            <capsuleGeometry args={[0.065, LEG_LEN * 0.65, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN + 0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN * 2 + 0.03, 0.05]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.1, 0, 0]}>
          <mesh position={[0, LEG_LEN * 0.35, 0]}>
            <capsuleGeometry args={[0.065, LEG_LEN * 0.65, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN + 0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.2, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LEN * 2 + 0.03, 0.05]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ── Traffic Car NPC ─────────────────────────────────────────────────────────
// Traffic cars are real vehicles: enterable, have NPC drivers, register in vehiclePositions
function TrafficCar({ x, z, rotation, color, id }: { x: number; z: number; rotation: number; color: string; id: string }) {
  const meshRef = useRef<THREE.Group>(null)
  const carAngle = useRef(rotation)
  const timer = useRef(0)
  const speed = 8 + seededRandom(x * 19 + z * 43 + rotation * 7) * 6
  const pos = useRef(new THREE.Vector3(x, 0, z))
  const driverRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    timer.current += dt

    const dx = Math.sin(carAngle.current) * speed * dt
    const dz = Math.cos(carAngle.current) * speed * dt
    const nx = pos.current.x + dx
    const nz = pos.current.z + dz

    // Building collision for traffic cars
    const tcR = 1.8
    let blocked = false
    const nearbyBuildings = getNearbyBuildingsGrid(nx, nz, tcR + 10)
    for (const bi of nearbyBuildings) {
      const b = LANDSCAPE_CONFIG.buildings[bi]
      const hx = b.width / 2 + tcR
      const hz = b.depth / 2 + tcR
      const ddx = nx - b.x
      const ddz = nz - b.z
      if (Math.abs(ddx) < hx && Math.abs(ddz) < hz) {
        blocked = true
        break
      }
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
    } else {
      carAngle.current += Math.PI / 2 + seededRandom(timer.current * 17) * Math.PI
    }

    // Wrap around map edges
    const half = MAP_SIZE * 0.6
    if (pos.current.x < -half) pos.current.x = half
    if (pos.current.x > half) pos.current.x = -half
    if (pos.current.z < -half) pos.current.z = half
    if (pos.current.z > half) pos.current.z = -half

    // Register position for collisions (NPC vehicles share same registry)
    vehiclePositions.set(id, { x: pos.current.x, z: pos.current.z, radius: 1.8 })

    if (meshRef.current) {
      meshRef.current.position.set(pos.current.x, 0, pos.current.z)
      meshRef.current.rotation.y = carAngle.current
    }

    // Driver head rotation — looks forward in direction of travel
    if (driverRef.current) {
      driverRef.current.rotation.y = carAngle.current
    }
  })

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
  const setNPCs = useGameStore((s) => s.setNPCs)

  const { pedestrians, cars } = useMemo(() => {
    const peds: { id: string; x: number; z: number; color: string; shirt: string; pants: string; hair: string; seed: number }[] = []
    const cars: { id: string; x: number; z: number; rotation: number; color: string }[] = []
    const carColors = ['#334488', '#883333', '#338833', '#aaaaaa', '#444444', '#665522']

    for (let i = 0; i < NPC_COUNT; i++) {
      const seed = i * 17
      const ang = seededRandom(seed * 13) * Math.PI * 2
      const dist = 15 + seededRandom(seed * 29) * MAP_SIZE * 0.35
      const spawn = findNPCSpawn(seed)
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

    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const carSpawn = findCarSpawn(i * 41 + 100)
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
  }, [setNPCs])

  return (
    <>
      {pedestrians.map(p => (
        <PedestrianNPC key={p.id} {...p} />
      ))}
      {cars.map(c => (
        <TrafficCar key={c.id} {...c} id={c.id} />
      ))}
    </>
  )
}
