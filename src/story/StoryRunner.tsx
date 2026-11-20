// Story mode — the in-canvas half. Drives timers, proximity triggers and the
// F-to-talk interaction, and renders beacons / collectibles / contact NPCs.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { useLandscapeData } from '../game/LandscapeContext'
import { useStoryStore } from './storyStore'
import KenneyCharacter from '../characters/KenneyCharacter'

const REACH_RADIUS = 7        // goto / deliver — generous so cars count
const TALK_RANGE = 4.5
const COLLECT_RANGE = 3.2

export default function StoryRunner() {
  const data = useLandscapeData()
  const setRoadPaths = useStoryStore((s) => s.setRoadPaths)
  useEffect(() => { setRoadPaths(data.roadPaths) }, [data.roadPaths, setRoadPaths])

  const [, getKeys] = useKeyboardControls()
  const prevInteract = useRef(false)
  // Edge-triggered interact: a keydown is latched until the next frame
  // consumes it, so a quick tap can't fall between two frames at low fps.
  const pendingInteract = useRef(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'KeyF' || e.code === 'KeyE') && !e.repeat) pendingInteract.current = true
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame((_, delta) => {
    const s = useStoryStore.getState()
    if (s.mode !== 'story' || s.screen !== 'none') return
    s.tick(Math.min(delta, 0.1))
    if (s.isPaused()) return

    const g = useGameStore.getState()
    const px = g.playerPosition[0]
    const pz = g.playerPosition[2]
    const step = s.currentStep()
    if (!step) return

    if ((step.kind === 'goto' || step.kind === 'deliver') && s.waypoint) {
      const d = Math.hypot(s.waypoint.x - px, s.waypoint.z - pz)
      if (d < REACH_RADIUS) {
        if (step.kind === 'goto') s.reachGoto()
        else s.reachDeliverStop()
      }
      return
    }

    if (step.kind === 'collect' && s.collect) {
      for (let i = 0; i < s.collect.length; i++) {
        const it = s.collect[i]
        if (it.taken) continue
        if (Math.hypot(it.x - px, it.z - pz) < COLLECT_RANGE) {
          s.takeCollectible(i)
          break
        }
      }
      return
    }

    if (step.kind === 'talk' && s.talkTarget) {
      const near = Math.hypot(s.talkTarget.x - px, s.talkTarget.z - pz) < TALK_RANGE && !g.inVehicle
      s.setNearTalk(near)
      const touch = (window as Window & { __touchInput?: { interact?: boolean } }).__touchInput || {}
      const held = !!(getKeys().interact || touch.interact)
      const pressed = pendingInteract.current || (held && !prevInteract.current)
      pendingInteract.current = false
      prevInteract.current = held
      if (near && pressed) s.beginTalk()
    } else {
      pendingInteract.current = false
    }
  })

  const mode = useStoryStore((s) => s.mode)
  const screen = useStoryStore((s) => s.screen)
  const waypoint = useStoryStore((s) => s.waypoint)
  const collect = useStoryStore((s) => s.collect)
  const talkTarget = useStoryStore((s) => s.talkTarget)
  if (mode !== 'story' || screen !== 'none') return null

  return (
    <>
      {waypoint && !talkTarget && <Beacon x={waypoint.x} z={waypoint.z} color={waypoint.color} />}
      {collect?.map((it, i) => (it.taken ? null : <Collectible key={i} x={it.x} z={it.z} phase={i} />))}
      {talkTarget && <ContactNPC {...talkTarget} />}
    </>
  )
}

// ─── Visuals ─────────────────────────────────────────────────────────────────

function Beacon({ x, z, color }: { x: number; z: number; color: string }) {
  const ring = useRef<THREE.Mesh>(null!)
  const ring2 = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring.current) {
      ring.current.rotation.z = t * 0.6
      ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08)
    }
    if (ring2.current) {
      const p = (t * 0.7) % 1
      ring2.current.scale.setScalar(1 + p * 2.2)
      ;(ring2.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.6
    }
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[0.35, 0.9, 40, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 40, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3, 0]} color={color} intensity={4} distance={22} />
      <mesh ref={ring} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 3.2, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3.0, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Collectible({ x, z, phase }: { x: number; z: number; phase: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase * 0.7
    if (ref.current) {
      ref.current.rotation.y = t * 1.6
      ref.current.position.y = 1.2 + Math.sin(t * 2.2) * 0.18
    }
  })
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <mesh>
          <octahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color="#06d6a0" emissive="#06d6a0" emissiveIntensity={1.4} roughness={0.3} toneMapped={false} />
        </mesh>
        <mesh scale={1.25}>
          <octahedronGeometry args={[0.45, 0]} />
          <meshBasicMaterial color="#06d6a0" transparent opacity={0.18} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 32]} />
        <meshBasicMaterial color="#06d6a0" toneMapped={false} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#06d6a0" intensity={1.5} distance={8} />
    </group>
  )
}

function ContactNPC({ x, z, name, model }: { x: number; z: number; name: string; model: string }) {
  const group = useRef<THREE.Group>(null!)
  const nearTalk = useStoryStore((s) => s.nearTalk)
  // Face the player as they approach.
  useFrame(() => {
    if (!group.current) return
    const pp = useGameStore.getState().playerPosition
    const dx = pp[0] - x
    const dz = pp[2] - z
    if (dx * dx + dz * dz < 40 * 40) {
      const target = Math.atan2(dx, dz)
      let diff = target - group.current.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      group.current.rotation.y += diff * 0.08
    }
  })
  return (
    <group position={[x, 0, z]}>
      <group ref={group}>
        <KenneyCharacter model={model} anim={nearTalk ? 'emote-yes' : 'idle'} />
      </group>
      <Billboard position={[0, 2.35, 0]} follow lockX lockZ>
        <Text
          fontSize={0.32}
          color="#ffffff"
          outlineWidth={0.03}
          outlineColor="#000000"
          anchorX="center"
          anchorY="bottom"
        >
          {name}
        </Text>
      </Billboard>
      <mesh position={[0, 2.95, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.18, 0.4, 4]} />
        <meshBasicMaterial color="#7cc4ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.95, 40]} />
        <meshBasicMaterial color="#7cc4ff" toneMapped={false} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.5, 0]} color="#7cc4ff" intensity={2} distance={12} />
    </group>
  )
}
