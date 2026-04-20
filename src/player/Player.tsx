import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { PLAYER_CONFIG, MAP_SIZE } from '../game/constants'

export default function Player() {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const isRunning = useGameStore((s) => s.isRunning)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const isDead = useGameStore((s) => s.isDead)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const takeDamage = useGameStore((s) => s.takeDamage)
  const setIsFalling = useGameStore((s) => s.setIsFalling)

  const [, getKeys] = useKeyboardControls()

  // Simple position-based movement — no physics for player
  const position = useRef(new THREE.Vector3(0, PLAYER_CONFIG.height / 2, 0))
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const cameraAngle = useRef({ theta: 0, phi: 0.3 })
  const isMouseDown = useRef(false)
  const peakHeight = useRef(PLAYER_CONFIG.height / 2)
  const isGrounded = useRef(true)
  const playerLightRef = useRef<THREE.PointLight>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true
    }
    const handleMouseUp = () => { isMouseDown.current = false }
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return
      cameraAngle.current.theta -= e.movementX * 0.004
      cameraAngle.current.phi = Math.max(0.1, Math.min(1.2, cameraAngle.current.phi + e.movementY * 0.003))
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

  useFrame((_, delta) => {
    if (inVehicle || isDead) return

    const dt = Math.min(delta, 0.05) // cap delta to prevent huge jumps
    const { forward, backward, left, right, jump, run } = getKeys()

    const speed = (run || isRunning) ? PLAYER_CONFIG.runSpeed : PLAYER_CONFIG.walkSpeed
    const angle = cameraAngle.current.theta

    // Direction relative to camera
    let dx = 0, dz = 0
    if (forward) { dx -= Math.sin(angle); dz -= Math.cos(angle) }
    if (backward) { dx += Math.sin(angle); dz += Math.cos(angle) }
    if (left) { dx -= Math.cos(angle); dz += Math.sin(angle) }
    if (right) { dx += Math.cos(angle); dz -= Math.sin(angle) }

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) { dx /= len; dz /= len }

    // Apply movement
    const targetVX = dx * speed
    const targetVZ = dz * speed

    // Smooth velocity
    velocity.current.x += (targetVX - velocity.current.x) * 0.2
    velocity.current.z += (targetVZ - velocity.current.z) * 0.2

    // Jump
    if (jump && isGrounded.current) {
      velocity.current.y = PLAYER_CONFIG.jumpForce
      isGrounded.current = false
      peakHeight.current = position.current.y
    }

    // Gravity
    if (!isGrounded.current) {
      velocity.current.y -= 25 * dt // gravity
    }

    // Move position
    position.current.x += velocity.current.x * dt
    position.current.z += velocity.current.z * dt
    position.current.y += velocity.current.y * dt

    // Ground collision
    if (position.current.y <= PLAYER_CONFIG.height / 2) {
      position.current.y = PLAYER_CONFIG.height / 2

      // Fall damage
      if (!isGrounded.current) {
        const fallDist = peakHeight.current - position.current.y
        if (fallDist > 2.5) {
          takeDamage(Math.floor(fallDist * 4))
        }
      }

      velocity.current.y = 0
      isGrounded.current = true
      peakHeight.current = position.current.y
    } else {
      isGrounded.current = false
      if (position.current.y > peakHeight.current) {
        peakHeight.current = position.current.y
      }
    }

    // Set falling state
    setIsFalling(!isGrounded.current && velocity.current.y < -1)

    // Clamp to map bounds
    position.current.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.current.x))
    position.current.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.current.z))

    // Update store
    setPlayerPosition([position.current.x, position.current.y, position.current.z])

    // Camera
    const camDist = PLAYER_CONFIG.cameraDistance
    const camH = PLAYER_CONFIG.cameraHeight
    const tx = position.current.x + Math.sin(angle) * camDist
    const ty = position.current.y + camH + Math.sin(cameraAngle.current.phi) * camDist * 0.3
    const tz = position.current.z + Math.cos(angle) * camDist

    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.15)
    camera.lookAt(position.current.x, position.current.y + 0.8, position.current.z)

    // Update mesh
    if (meshRef.current) {
      meshRef.current.position.copy(position.current)
      meshRef.current.rotation.y = angle
    }
  })

  if (inVehicle || isDead) return null

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <capsuleGeometry args={[PLAYER_CONFIG.radius, PLAYER_CONFIG.height - PLAYER_CONFIG.radius * 2, 6, 12]} />
        <meshStandardMaterial color="#2255aa" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#e8c090" roughness={0.7} />
      </mesh>
      {/* Backpack glow */}
      <mesh position={[0, 0.8, -0.25]}>
        <boxGeometry args={[0.35, 0.55, 0.08]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} transparent opacity={0.7} />
      </mesh>
      {/* Player light — bright enough to see in dark */}
      <pointLight ref={playerLightRef} color="#00e5ff" intensity={3} distance={12} position={[0, 1.5, 0]} />
    </group>
  )
}