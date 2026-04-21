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

  const position = useRef(new THREE.Vector3(0, PLAYER_CONFIG.height / 2, 0))
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const cameraAngle = useRef({ theta: 0, phi: 0.3 })
  const isGrounded = useRef(true)
  const peakHeight = useRef(PLAYER_CONFIG.height / 2)
  const isMouseDown = useRef(false)
  const lastJumpTime = useRef(0)

  // Allow looking UP (phi can go negative, up to -1.3 radians ~ -75 degrees up)
  const CAM_PHI_MIN = -1.3
  const CAM_PHI_MAX = 0.9

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true
    }
    const handleMouseUp = () => { isMouseDown.current = false }
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return
      cameraAngle.current.theta -= e.movementX * 0.004
      cameraAngle.current.phi = Math.max(
        CAM_PHI_MIN,
        Math.min(CAM_PHI_MAX, cameraAngle.current.phi + e.movementY * 0.004)
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

  useFrame((_, delta) => {
    if (inVehicle || isDead) return

    const dt = Math.min(delta, 0.05)
    const { forward, backward, left, right, jump, run } = getKeys()

    // Touch input from window global
    const touch = (window as any).__touchInput || {}
    const fwd = forward || touch.forward
    const bwd = backward || touch.backward
    const lft = left || touch.left
    const rgt = right || touch.right
    const jmp = jump || touch.jump
    const rn = run || touch.run || isRunning

    const speed = rn ? PLAYER_CONFIG.runSpeed : PLAYER_CONFIG.walkSpeed
    const angle = cameraAngle.current.theta

    let dx = 0, dz = 0
    if (fwd) { dx -= Math.sin(angle); dz -= Math.cos(angle) }
    if (bwd) { dx += Math.sin(angle); dz += Math.cos(angle) }
    if (lft) { dx -= Math.cos(angle); dz += Math.sin(angle) }
    if (rgt) { dx += Math.cos(angle); dz -= Math.sin(angle) }

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) { dx /= len; dz /= len }

    // Smooth velocity
    velocity.current.x += (dx * speed - velocity.current.x) * 0.2
    velocity.current.z += (dz * speed - velocity.current.z) * 0.2

    // Jump with debounce
    const now = Date.now()
    if (jmp && isGrounded.current && now - lastJumpTime.current > 300) {
      velocity.current.y = PLAYER_CONFIG.jumpForce
      isGrounded.current = false
      peakHeight.current = position.current.y
      lastJumpTime.current = now
    }

    // Gravity
    if (!isGrounded.current) {
      velocity.current.y -= 28 * dt
    }

    // Move
    position.current.x += velocity.current.x * dt
    position.current.z += velocity.current.z * dt
    position.current.y += velocity.current.y * dt

    // Ground check
    if (position.current.y <= PLAYER_CONFIG.height / 2) {
      if (!isGrounded.current) {
        const fallDist = peakHeight.current - position.current.y
        if (fallDist > 2.5) {
          takeDamage(Math.floor(fallDist * 4))
        }
      }
      position.current.y = PLAYER_CONFIG.height / 2
      velocity.current.y = 0
      isGrounded.current = true
      peakHeight.current = position.current.y
    } else {
      isGrounded.current = false
      if (position.current.y > peakHeight.current) {
        peakHeight.current = position.current.y
      }
    }

    setIsFalling(!isGrounded.current && velocity.current.y < -1)

    // Map bounds
    position.current.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.current.x))
    position.current.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, position.current.z))

    setPlayerPosition([position.current.x, position.current.y, position.current.z])

    // Camera — can look up
    const camDist = PLAYER_CONFIG.cameraDistance
    const camH = PLAYER_CONFIG.cameraHeight
    const phi = cameraAngle.current.phi
    const tx = position.current.x + Math.sin(angle) * camDist
    // phi negative = look UP, phi positive = look DOWN
    const ty = position.current.y + camH - phi * camDist * 0.7
    const tz = position.current.z + Math.cos(angle) * camDist

    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.12)
    camera.lookAt(position.current.x, position.current.y + 0.8, position.current.z)

    if (meshRef.current) {
      meshRef.current.position.copy(position.current)
      meshRef.current.rotation.y = angle
    }
  })

  if (inVehicle || isDead) return null

  return (
    <group ref={meshRef}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <capsuleGeometry args={[PLAYER_CONFIG.radius, PLAYER_CONFIG.height - PLAYER_CONFIG.radius * 2, 6, 12]} />
        <meshStandardMaterial color="#2255aa" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#e8c090" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.8, -0.25]}>
        <boxGeometry args={[0.35, 0.55, 0.08]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} transparent opacity={0.7} />
      </mesh>
      <pointLight color="#00e5ff" intensity={4} distance={15} position={[0, 1.5, 0]} />
    </group>
  )
}

// Global touch input registry
;(window as any).__touchInput = { forward: false, backward: false, left: false, right: false, jump: false, run: false }
;(window as any).__setTouchInput = (input: Partial<typeof import('../player/Player').default extends never ? {} : {}>) => {
  Object.assign((window as any).__touchInput, input)
}