// Player combat: aiming, hitscan weapons, melee, reloading, weapon pickups
// and the transient visual effects (muzzle flash, tracers, impact sparks).
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { useStoryStore } from '../story/storyStore'
import { useLandscapeData } from '../game/LandscapeContext'
import { vehiclePositions } from '../game/vehicleState'
import { getNearbyBuildingsGrid, circleHitsBuilding, meshColliderHitsCircle } from '../world/World'
import { WEAPONS, WEAPON_ORDER, type WeaponId } from './weapons'
import { pedPositions, copPositions, hitHandlers, downedPeds, combatState, fxQueue } from './targets'
import { sfx } from '../systems/audio/synth'
import WeaponModel from './WeaponModel'

// ─── Input state (module level so listeners survive re-renders) ─────────────
const input = {
  fireDown: false,
  firePressed: false, // edge, consumed per frame
  aimDown: false,
  reloadPressed: false,
}

const _dir = new THREE.Vector3()
const _origin = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _muzzle = new THREE.Vector3()

type Hit = { t: number; id: string | null; kind: 'ped' | 'cop' | 'vehicle' | 'world'; point: THREE.Vector3 }

// Ray vs vertical cylinder (axis through (cx, cz), radius r, y in [0,h]).
function rayCylinder(o: THREE.Vector3, d: THREE.Vector3, cx: number, cz: number, r: number, h: number, maxT: number): number {
  const ox = o.x - cx, oz = o.z - cz
  const a = d.x * d.x + d.z * d.z
  if (a < 1e-8) return -1
  const b = 2 * (ox * d.x + oz * d.z)
  const c = ox * ox + oz * oz - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return -1
  const sq = Math.sqrt(disc)
  let t = (-b - sq) / (2 * a)
  if (t < 0) t = (-b + sq) / (2 * a)
  if (t < 0 || t > maxT) return -1
  const y = o.y + d.y * t
  if (y < 0 || y > h) return -1
  return t
}

function hitscan(o: THREE.Vector3, d: THREE.Vector3, range: number, buildings: Parameters<typeof circleHitsBuilding>[4]): Hit {
  let best: Hit = { t: range, id: null, kind: 'world', point: new THREE.Vector3().copy(o).addScaledVector(d, range) }
  const consider = (t: number, id: string, kind: Hit['kind']) => {
    if (t >= 0 && t < best.t) best = { t, id, kind, point: new THREE.Vector3().copy(o).addScaledVector(d, t) }
  }
  for (const [id, p] of pedPositions) {
    if (downedPeds.has(id)) continue
    consider(rayCylinder(o, d, p.x, p.z, 0.42, 1.85, best.t), id, 'ped')
  }
  for (const [id, p] of copPositions) {
    if (downedPeds.has(id)) continue
    consider(rayCylinder(o, d, p.x, p.z, 0.42, 1.85, best.t), id, 'cop')
  }
  for (const [id, v] of vehiclePositions) {
    if (v.player) continue
    consider(rayCylinder(o, d, v.x, v.z, Math.max(1.2, v.radius), 1.7, best.t), id, 'vehicle')
  }
  // Ground plane.
  if (d.y < -1e-4) {
    const t = -o.y / d.y
    if (t > 0 && t < best.t) best = { t, id: null, kind: 'world', point: new THREE.Vector3().copy(o).addScaledVector(d, t) }
  }
  // Buildings: march the ray; stop at the first blocked step.
  const step = 0.8
  for (let t = step; t < best.t; t += step) {
    _tmp.copy(o).addScaledVector(d, t)
    if (_tmp.y > 60) break
    let blocked = false
    for (const bi of getNearbyBuildingsGrid(_tmp.x, _tmp.z, 12)) {
      if (circleHitsBuilding(bi, _tmp.x, _tmp.z, 0.15, buildings)) { blocked = true; break }
    }
    if (!blocked && meshColliderHitsCircle(_tmp.x, _tmp.z, 0.15)) blocked = true
    if (blocked) {
      best = { t, id: null, kind: 'world', point: _tmp.clone() }
      break
    }
  }
  return best
}

export default function CombatSystem() {
  const { camera } = useThree()
  const data = useLandscapeData()
  const lastFire = useRef(0)
  const lastEmptyClick = useRef(0)

  // ── Listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    const isUi = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && !!el.closest && !!el.closest('button, input, select, textarea, a, .hud-menu, .story-ui, [data-ui]')
    }
    const down = (e: MouseEvent) => {
      if (isUi(e.target)) return
      if (e.button === 0) { input.fireDown = true; input.firePressed = true }
      if (e.button === 2) input.aimDown = true
    }
    const up = (e: MouseEvent) => {
      if (e.button === 0) input.fireDown = false
      if (e.button === 2) input.aimDown = false
    }
    const key = (e: KeyboardEvent) => {
      if (useStoryStore.getState().screen !== 'none') return
      const g = useGameStore.getState()
      if (e.code === 'KeyR' && !e.repeat) input.reloadPressed = true
      // 1–5 pick a weapon slot (story dialogue uses the digits only while a
      // dialogue is open, and that pauses combat input anyway).
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code)
      if (n >= 0 && !e.repeat && !useStoryStore.getState().dialogue) {
        const id = WEAPON_ORDER[n]
        if (g.weapons[id].owned && id !== g.currentWeapon) { g.selectWeapon(id); sfx.weaponSwitch() }
      }
      if ((e.code === 'KeyQ' || e.code === 'Tab') && !e.repeat) {
        e.preventDefault()
        g.cycleWeapon(e.shiftKey ? -1 : 1)
        sfx.weaponSwitch()
      }
    }
    const wheel = (e: WheelEvent) => {
      if (isUi(e.target)) return
      const g = useGameStore.getState()
      if (Math.abs(e.deltaY) < 2) return
      g.cycleWeapon(e.deltaY > 0 ? 1 : -1)
      sfx.weaponSwitch()
    }
    const blur = () => { input.fireDown = false; input.aimDown = false }
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    window.addEventListener('keydown', key)
    window.addEventListener('wheel', wheel, { passive: true })
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('keydown', key)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('blur', blur)
    }
  }, [])

  useFrame(() => {
    const g = useGameStore.getState()
    const story = useStoryStore.getState()
    const touch = (window as Window & { __touchInput?: { fire?: boolean; aim?: boolean } }).__touchInput || {}
    const blocked = g.isDead || g.isLoading || story.screen !== 'none' || (story.mode === 'story' && story.isPaused())
    const weapon = WEAPONS[g.currentWeapon]
    const now = performance.now()

    // Aiming state (RMB / touch AIM). Fists can't aim.
    const wantAim = !blocked && !!(input.aimDown || touch.aim) && weapon.id !== 'fist'
    combatState.aiming = wantAim
    g.setAiming(wantAim)

    if (blocked) { input.firePressed = false; input.reloadPressed = false; return }

    // Reload.
    if (g.reloadingUntil > 0 && Date.now() >= g.reloadingUntil) g.finishReload()
    if (input.reloadPressed) {
      input.reloadPressed = false
      if (g.startReload()) sfx.reload()
    }
    const reloading = g.reloadingUntil > Date.now()

    // Fire?
    const fireHeld = input.fireDown || !!touch.fire
    const wantFire = weapon.auto ? fireHeld : (input.firePressed || (!!touch.fire && !input.fireDown))
    const pressedThisFrame = input.firePressed
    input.firePressed = false
    if (!wantFire || reloading) return
    const interval = 60000 / weapon.rpm
    if (now - lastFire.current < interval) return
    // In a vehicle only one-handed guns work (drive-by).
    if (g.inVehicle && weapon.hold === 'both') return
    if (g.inVehicle && weapon.id === 'fist') return

    // ── Melee ─────────────────────────────────────────────────────────────
    if (weapon.id === 'fist') {
      if (!pressedThisFrame && !touch.fire) return
      lastFire.current = now
      combatState.lastMeleeAt = now
      const px = g.playerPosition[0], pz = g.playerPosition[2]
      const fx = Math.sin(g.playerRotation), fz = Math.cos(g.playerRotation)
      let bestId: string | null = null, bestD = weapon.range
      const scan = (m: Map<string, { x: number; z: number }>) => {
        for (const [id, p] of m) {
          if (downedPeds.has(id)) continue
          const dx = p.x - px, dz = p.z - pz
          const d = Math.hypot(dx, dz)
          if (d < bestD && (dx * fx + dz * fz) / Math.max(d, 1e-3) > 0.5) { bestD = d; bestId = id }
        }
      }
      scan(pedPositions); scan(copPositions)
      if (bestId) {
        const h = hitHandlers.get(bestId)
        h?.({ damage: weapon.damage, dirX: fx, dirZ: fz, point: new THREE.Vector3(px + fx * bestD, 1.2, pz + fz * bestD), weapon: 'fist', byPlayer: true })
        sfx.punch(true, [px, pz])
        combatState.lastHitAt = now
        g.setWantedAtLeast(1)
      } else {
        sfx.punch(false)
      }
      return
    }

    // ── Guns ───────────────────────────────────────────────────────────────
    if (!g.fireRound()) {
      if (now - lastEmptyClick.current > 250) {
        lastEmptyClick.current = now
        sfx.weaponSwitch()
        if (g.startReload()) sfx.reload()
      }
      return
    }
    lastFire.current = now
    combatState.lastShotAt = now
    combatState.lastShotX = g.playerPosition[0]
    combatState.lastShotZ = g.playerPosition[2]

    // Shots go where the camera looks (GTA-style), starting from the plane
    // of the player's chest so the stretch between camera and player can't
    // intercept the ray.
    camera.getWorldDirection(_dir)
    const px = g.playerPosition[0], py = g.playerPosition[1], pz = g.playerPosition[2]
    _tmp.set(px, py + 1.3, pz).sub(camera.position)
    const t0 = Math.max(0, _tmp.dot(_dir))
    _origin.copy(camera.position).addScaledVector(_dir, t0)
    // Muzzle (for the tracer): hand height, slightly right and forward.
    const yaw = g.playerRotation
    const rx = -Math.cos(yaw), rz = Math.sin(yaw)
    _muzzle.set(px + Math.sin(yaw) * 0.55 + rx * 0.22, py + (g.inVehicle ? 1.05 : 1.32), pz + Math.cos(yaw) * 0.55 + rz * 0.22)
    fxQueue.push({ kind: 'flash', at: _muzzle.clone(), t: now })
    if (weapon.sound) sfx.shot(weapon.sound)
    g.setWantedAtLeast(1)

    const spread = weapon.spread * (combatState.aiming ? 0.55 : 1) * (g.inVehicle ? 1.6 : 1)
    for (let p = 0; p < weapon.pellets; p++) {
      const d = _dir.clone()
      if (spread > 0) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * spread
        const side = new THREE.Vector3().crossVectors(d, THREE.Object3D.DEFAULT_UP).normalize()
        const up = new THREE.Vector3().crossVectors(side, d).normalize()
        d.addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize()
      }
      const hit = hitscan(_origin, d, weapon.range, data.buildings)
      fxQueue.push({ kind: 'tracer', from: _muzzle.clone(), to: hit.point.clone(), t: now })
      if (hit.id) {
        hitHandlers.get(hit.id)?.({ damage: weapon.damage, dirX: d.x, dirZ: d.z, point: hit.point, weapon: weapon.id, byPlayer: true })
        combatState.lastHitAt = now
        if (hit.kind === 'vehicle') { fxQueue.push({ kind: 'spark', at: hit.point, n: d.clone().negate(), t: now, color: '#ffd27a' }); sfx.ricochet([hit.point.x, hit.point.z]) }
        else { fxQueue.push({ kind: 'spark', at: hit.point, n: d.clone().negate(), t: now, color: '#9c1a1a' }); sfx.bodyHit([hit.point.x, hit.point.z]) }
      } else if (hit.t < weapon.range) {
        fxQueue.push({ kind: 'spark', at: hit.point, n: d.clone().negate(), t: now, color: '#cfc8ba' })
        sfx.ricochet([hit.point.x, hit.point.z])
      }
    }
    if (combatState.lastHitAt === now) sfx.hitmarker()
  })

  return (
    <>
      <CombatFX />
      <WeaponPickups />
    </>
  )
}

// ─── Effects ────────────────────────────────────────────────────────────────
const MAX_TRACERS = 24
const MAX_SPARKS = 160

function CombatFX() {
  const tracers = useRef<THREE.InstancedMesh>(null)
  const sparks = useRef<THREE.InstancedMesh>(null)
  const flash = useRef<THREE.PointLight>(null)
  const live = useRef<{ tr: { from: THREE.Vector3; to: THREE.Vector3; t: number }[]; sp: { p: THREE.Vector3; v: THREE.Vector3; t: number; c: THREE.Color }[]; flashT: number; flashAt: THREE.Vector3 }>({ tr: [], sp: [], flashT: 0, flashAt: new THREE.Vector3() })
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const s = useMemo(() => new THREE.Vector3(), [])
  const c = useMemo(() => new THREE.Color(), [])

  useFrame((_, delta) => {
    const now = performance.now()
    const L = live.current
    // Drain queue.
    while (fxQueue.length) {
      const fx = fxQueue.shift()!
      if (fx.kind === 'tracer') { L.tr.push({ from: fx.from, to: fx.to, t: fx.t }); if (L.tr.length > MAX_TRACERS) L.tr.shift() }
      else if (fx.kind === 'flash') { L.flashT = fx.t; L.flashAt.copy(fx.at) }
      else {
        const n = 6 + Math.floor(Math.random() * 6)
        for (let i = 0; i < n; i++) {
          const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
          v.addScaledVector(fx.n, 1.2).normalize().multiplyScalar(2 + Math.random() * 5)
          L.sp.push({ p: fx.at.clone(), v, t: fx.t, c: new THREE.Color(fx.color) })
        }
        while (L.sp.length > MAX_SPARKS) L.sp.shift()
      }
    }
    // Tracers: thin boxes stretched between from→to, fading over 70 ms.
    const tm = tracers.current
    if (tm) {
      let k = 0
      L.tr = L.tr.filter((t) => now - t.t < 70)
      for (const t of L.tr) {
        const len = t.from.distanceTo(t.to)
        if (len < 0.1) continue
        _tmp.subVectors(t.to, t.from).normalize()
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _tmp)
        s.set(1, 1, len)
        m.compose(_tmp.copy(t.from).lerp(t.to, 0.5), q, s)
        tm.setMatrixAt(k++, m)
      }
      tm.count = k
      tm.instanceMatrix.needsUpdate = true
    }
    // Sparks: tiny cubes under gravity, 450 ms life.
    const sm = sparks.current
    if (sm) {
      let k = 0
      L.sp = L.sp.filter((p) => now - p.t < 450)
      for (const p of L.sp) {
        p.v.y -= 14 * delta
        p.p.addScaledVector(p.v, delta)
        if (p.p.y < 0.02) { p.p.y = 0.02; p.v.y *= -0.3; p.v.x *= 0.6; p.v.z *= 0.6 }
        const age = (now - p.t) / 450
        s.setScalar(0.05 * (1 - age * 0.7))
        q.identity()
        m.compose(p.p, q, s)
        sm.setMatrixAt(k, m)
        c.copy(p.c).multiplyScalar(1.6 - age)
        sm.setColorAt(k, c)
        k++
      }
      sm.count = k
      sm.instanceMatrix.needsUpdate = true
      if (sm.instanceColor) sm.instanceColor.needsUpdate = true
    }
    if (flash.current) {
      const age = now - L.flashT
      flash.current.intensity = age < 60 ? 25 * (1 - age / 60) : 0
      flash.current.position.copy(L.flashAt)
    }
  })

  return (
    <>
      <instancedMesh ref={tracers} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, MAX_TRACERS]} frustumCulled={false}>
        <boxGeometry args={[0.025, 0.025, 1]} />
        <meshBasicMaterial color="#ffe9a8" toneMapped={false} transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={sparks} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, MAX_SPARKS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight ref={flash} color="#ffc266" distance={9} intensity={0} />
    </>
  )
}

// ─── Pickups ────────────────────────────────────────────────────────────────
type Pickup = { id: string; weapon: WeaponId; x: number; z: number; ammoOnly?: boolean }

function WeaponPickups() {
  const data = useLandscapeData()
  const currentMapName = useGameStore((s) => s.currentMapName)
  const takenUntil = useRef(new Map<string, number>())
  const groupRefs = useRef(new Map<string, THREE.Group>())

  // Deterministic spots: the map spawn plus points along a few long roads,
  // nudged 4 m off the centreline so they sit at the kerb.
  const pickups = useMemo<Pickup[]>(() => {
    const spawn = useGameStore.getState().playerPosition
    const out: Pickup[] = []
    const paths = data.roadPaths.filter((p) => p.length >= 6)
    const pick = (i: number): [number, number] | null => {
      const p = paths[(i * 37) % Math.max(1, paths.length)]
      if (!p) return null
      const k = Math.floor(p.length / 2)
      const a = p[k].angle
      return [p[k].x - Math.cos(a) * 4.5, p[k].z + Math.sin(a) * 4.5]
    }
    out.push({ id: 'pk-pistol-0', weapon: 'pistol', x: spawn[0] + 7, z: spawn[2] + 4 })
    const plan: [WeaponId, number][] = [['smg', 3], ['shotgun', 7], ['rifle', 11], ['pistol', 15], ['smg', 19], ['shotgun', 23], ['rifle', 29], ['pistol', 33]]
    plan.forEach(([w, i], n) => { const s = pick(i); if (s) out.push({ id: `pk-${w}-${n + 1}`, weapon: w, x: s[0], z: s[1] }) })
    // Ammo caches next to every third pickup.
    for (let i = 1; i < out.length; i += 3) out.push({ id: `am-${i}`, weapon: out[i].weapon, x: out[i].x + 2, z: out[i].z + 1.5, ammoOnly: true })
    return out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, currentMapName])

  useFrame(({ clock }) => {
    const g = useGameStore.getState()
    if (g.isDead) return
    const px = g.playerPosition[0], pz = g.playerPosition[2]
    const now = Date.now()
    for (const p of pickups) {
      const grp = groupRefs.current.get(p.id)
      const until = takenUntil.current.get(p.id) ?? 0
      const visible = now >= until
      if (grp) {
        grp.visible = visible
        if (visible) {
          grp.rotation.y = clock.elapsedTime * 1.4 + p.x
          grp.position.y = 0.9 + Math.sin(clock.elapsedTime * 2.2 + p.z) * 0.08
        }
      }
      if (!visible || g.inVehicle) continue
      if (Math.hypot(p.x - px, p.z - pz) < 1.7) {
        if (p.ammoOnly) {
          if (!g.addAmmo(p.weapon, WEAPONS[p.weapon].pickupAmmo)) continue
        } else {
          g.giveWeapon(p.weapon)
        }
        takenUntil.current.set(p.id, now + 90000)
        sfx.pickup()
      }
    }
  })

  return (
    <>
      {pickups.map((p) => (
        <group key={p.id} position={[p.x, 0.9, p.z]}>
          <group ref={(el) => { if (el) groupRefs.current.set(p.id, el); else groupRefs.current.delete(p.id) }}>
            {p.ammoOnly ? (
              <mesh>
                <boxGeometry args={[0.4, 0.26, 0.26]} />
                <meshStandardMaterial color="#4f6b2f" roughness={0.6} />
              </mesh>
            ) : (
              <group scale={1.7}><WeaponModel id={p.weapon} /></group>
            )}
          </group>
          <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.7, 28]} />
            <meshBasicMaterial color={p.ammoOnly ? '#9fd36a' : '#7cc4ff'} toneMapped={false} transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 0.3, 0]} color={p.ammoOnly ? '#9fd36a' : '#7cc4ff'} intensity={1.2} distance={6} />
        </group>
      ))}
    </>
  )
}
