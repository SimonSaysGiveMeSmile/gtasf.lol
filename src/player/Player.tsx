import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { useSphere } from '@react-three/cannon'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { PLAYER_CONFIG } from '../game/constants'

export default function Player() {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const isRunning = useGameStore((s) => s.isRunning)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const isDead = useGameStore((s) => s.isDead)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const takeDamage = useGameStore((s) => s.takeDamage)

  const [, getKeys] = useKeyboardControls()

  const [, physApi] = useSphere(() => ({
    mass: 1,
    position: [0, 3, 0],
    args: [PLAYER_CONFIG.radius],
    fixedRotation: true,
    linearDamping: 0.9,
    angularDamping: 1,
    onCollide: (e) => {
      const impactSpeed = Math.sqrt(
        e.contact.impactVelocity ** 2
      )
      if (impactSpeed > 5) {
        const dmg = Math.floor(impactSpeed * 1.5)
        takeDamage(dmg)
      }
    },
  }))

  const velocity = useRef<[number, number, number]>([0, 0, 0])
  const position = useRef<[number, number, number]>([0, 3, 0])
  const cameraAngle = useRef({ theta: 0, phi: 0.3 })
  const isMouseDown = useRef(false)

  useEffect(() => {
    const unsub = physApi.velocity.subscribe((v) => {
      velocity.current = v as [number, number, number]
    })
    const posSub = physApi.position.subscribe((p) => {
      position.current = p as [number, number, number]
      setPlayerPosition(p as [number, number, number])
    })
    return () => {
      unsub()
      posSub()
    }
  }, [physApi, setPlayerPosition])

  // Mouse look
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true
    }
    const handleMouseUp = () => { isMouseDown.current = false }
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return
      cameraAngle.current.theta -= e.movementX * 0.003
      cameraAngle.current.phi = Math.max(
        0.1,
        Math.min(1.2, cameraAngle.current.phi + e.movementY * 0.003)
      )
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  useFrame(() => {
    if (inVehicle || isDead) return

    const { forward, backward, left, right, jump, run } = getKeys()

    const speed = (run || isRunning) ? PLAYER_CONFIG.runSpeed : PLAYER_CONFIG.walkSpeed
    const angle = cameraAngle.current.theta

    const dir: [number, number, number] = [0, 0, 0]
    if (forward) {
      dir[0] -= Math.sin(angle) * speed
      dir[2] -= Math.cos(angle) * speed
    }
    if (backward) {
      dir[0] += Math.sin(angle) * speed
      dir[2] += Math.cos(angle) * speed
    }
    if (left) {
      dir[0] -= Math.cos(angle) * speed
      dir[2] += Math.sin(angle) * speed
    }
    if (right) {
      dir[0] += Math.cos(angle) * speed
      dir[2] -= Math.sin(angle) * speed
    }

    // Normalize diagonal movement
    const len = Math.sqrt(dir[0] ** 2 + dir[2] ** 2)
    if (len > speed) {
      dir[0] = (dir[0] / len) * speed
      dir[2] = (dir[2] / len) * speed
    }

    physApi.velocity.set(dir[0], velocity.current[1], dir[2])

    // Jump
    if (jump && Math.abs(velocity.current[1]) < 0.5) {
      physApi.velocity.set(dir[0], PLAYER_CONFIG.jumpForce, dir[2])
    }

    // Camera follow
    const [px, py, pz] = position.current
    const camDist = PLAYER_CONFIG.cameraDistance
    const camH = PLAYER_CONFIG.cameraHeight
    const targetCamX = px + Math.sin(angle) * camDist
    const targetCamY = py + camH + Math.sin(cameraAngle.current.phi) * camDist * 0.5
    const targetCamZ = pz + Math.cos(angle) * camDist

    camera.position.lerp(
      new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
      0.1
    )
    camera.lookAt(px, py + 1, pz)

    // Update mesh
    if (meshRef.current) {
      meshRef.current.position.set(px, py, pz)
      meshRef.current.rotation.y = angle
    }
  })

  if (inVehicle || isDead) return null

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <capsuleGeometry args={[PLAYER_CONFIG.radius, PLAYER_CONFIG.height - PLAYER_CONFIG.radius * 2, 8, 16]} />
        <meshStandardMaterial color="#1a3a5c" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#e8c4a0" roughness={0.8} />
      </mesh>
      {/* Backpack glow */}
      <mesh position={[0, 0.8, -0.25]}>
        <boxGeometry args={[0.4, 0.6, 0.1]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Point light on player */}
      <pointLight color="#00e5ff" intensity={0.5} distance={5} position={[0, 1.5, 0]} />
    </group>
  )
}