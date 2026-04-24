// @t1an
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { PLAYER_CONFIG, MAP_SIZE } from '../game/constants'
import { BUILDING_LAYOUT } from '../world/buildings'
import { getNearbyBuildingsGrid } from '../world/World'
import { soundManager } from '../systems/audio/SoundManager'
// @simonsaysgivemesmile

// Module-level refs for gyro (not component state, so they persist)
const gyroEnabled = { current: false }
const gyroBase = { current: { alpha: 0, beta: 0, gamma: 0 } }

// Player foot Y = world y = 0 // @jt886
// All body parts positioned relative to feet.
const FOOT_Y = 0
const LEG_LENGTH = 0.5
const TORSO_HEIGHT = 0.7
const TORSO_Y = FOOT_Y + LEG_LENGTH
const NECK_Y = TORSO_Y + TORSO_HEIGHT
const HEAD_Y = NECK_Y + 0.18
const SHOULDER_Y = TORSO_Y + TORSO_HEIGHT * 0.85
const ARM_LENGTH = 0.42

export default function Player() {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const isRunning = useGameStore((s) => s.isRunning)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const isDead = useGameStore((s) => s.isDead)
  const exitVehiclePosition = useGameStore((s) => s.exitVehiclePosition)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const takeDamage = useGameStore((s) => s.takeDamage)
  const setIsFalling = useGameStore((s) => s.setIsFalling)
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation)

  // Animation refs
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const bodyGroupRef = useRef<THREE.Group>(null)
  const animTime = useRef(0)
  const prevLeftArmRot = useRef(0)
  const prevRightArmRot = useRef(0)
  const prevLeftLegRot = useRef(0)
  const prevRightLegRot = useRef(0)

  const [, getKeys] = useKeyboardControls()

  // Position = feet on ground (y = 0)
  const position = useRef(new THREE.Vector3(0, FOOT_Y, 0))
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const cameraAngle = useRef({ theta: 0, phi: 0.3 })
  const isGrounded = useRef(true)
  const peakHeight = useRef(FOOT_Y)
  const isMouseDown = useRef(false)
  const mouseDownTime = useRef(0)
  const autoDragEnabled = useRef(false)
  const lastClickTime = useRef(0)
  const lastJumpTime = useRef(0)
  const lastFootstepTime = useRef(0)

  const CAM_PHI_MIN = -1.3
  const CAM_PHI_MAX = 0.9

  useEffect(() => {
    const AUTO_HOLD_MS = 1000

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const now = Date.now()
        if (autoDragEnabled.current) {
          autoDragEnabled.current = false
          lastClickTime.current = now
          return
        }
        if (now - lastClickTime.current < 300) {
          isMouseDown.current = false
          lastClickTime.current = now
          return
        }
        isMouseDown.current = true
        mouseDownTime.current = now
      }
    }
    const handleMouseUp = () => {
      isMouseDown.current = false
    }
    const handleMouseMove = (e: MouseEvent) => {
      const shouldDrag = isMouseDown.current || autoDragEnabled.current
      if (!shouldDrag) return
      if (isMouseDown.current && Date.now() - mouseDownTime.current >= AUTO_HOLD_MS) {
        autoDragEnabled.current = true
        isMouseDown.current = false
        return
      }
      // Left = turn right (negative theta — horizontal is inverted), down = look down (negative phi)
      cameraAngle.current.theta -= e.movementX * 0.004
      cameraAngle.current.phi = Math.max(
        CAM_PHI_MIN,
        Math.min(CAM_PHI_MAX, cameraAngle.current.phi - e.movementY * 0.004)
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

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!gyroEnabled.current) return
      if (e.alpha === null || e.beta === null || e.gamma === null) return

      if (gyroBase.current.alpha === 0) {
        gyroBase.current.alpha = e.alpha
        gyroBase.current.beta = e.beta
        gyroBase.current.gamma = e.gamma
      }

      const deltaAlpha = e.alpha - gyroBase.current.alpha
      const deltaBeta = e.beta - gyroBase.current.beta

      cameraAngle.current.theta = deltaAlpha * (Math.PI / 180)
      cameraAngle.current.phi = Math.max(
        CAM_PHI_MIN,
        Math.min(CAM_PHI_MAX, deltaBeta * (Math.PI / 180) * 0.5)
      )
    }

    const requestGyro = () => {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        ;(DeviceOrientationEvent as any).requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              gyroEnabled.current = true
              window.addEventListener('deviceorientation', handleOrientation)
            }
          })
          .catch(() => {})
      } else if ('DeviceOrientationEvent' in window) {
        gyroEnabled.current = true
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      requestGyro()
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  useEffect(() => {
    if (exitVehiclePosition && !inVehicle) {
      position.current.set(exitVehiclePosition[0], exitVehiclePosition[1], exitVehiclePosition[2])
      velocity.current.set(0, 0, 0)
    }
  }, [exitVehiclePosition, inVehicle])

  useFrame((_, delta) => {
    if (inVehicle || isDead) return

    const dt = Math.min(delta, 0.05)
    const { forward, backward, left, right, jump, run } = getKeys()

    const touch = (window as any).__touchInput || {}
    const fwd = forward || touch.forward
    const bwd = backward || touch.backward
    const lft = left || touch.left
    const rgt = right || touch.right
    const jmp = jump || touch.jump
    const rn = run || touch.run || isRunning

    const speed = rn ? PLAYER_CONFIG.runSpeed : PLAYER_CONFIG.walkSpeed
    // Camera-relative movement: forward/back/left/right follow where the camera looks
    const angle = cameraAngle.current.theta

    let dx = 0, dz = 0
    if (fwd) dz += 1
    if (bwd) dz -= 1
    if (lft) dx -= 1
    if (rgt) dx += 1

    const len = Math.sqrt(dx * dx + dz * dz)
    const isMoving = len > 0.1
    if (len > 0) { dx /= len; dz /= len }

    // Rotate movement by camera angle (camera-relative → world space)
    const worldDx = dx * Math.cos(angle) + dz * Math.sin(angle)
    const worldDz = -dx * Math.sin(angle) + dz * Math.cos(angle)

    // Smooth velocity
    velocity.current.x += (worldDx * speed - velocity.current.x) * 0.2
    velocity.current.z += (worldDz * speed - velocity.current.z) * 0.2

    // Jump
    const now = Date.now()
    if (jmp && isGrounded.current && now - lastJumpTime.current > 300) {
      velocity.current.y = PLAYER_CONFIG.jumpForce
      isGrounded.current = false
      peakHeight.current = position.current.y
      lastJumpTime.current = now
      soundManager.play('jump', { volume: 0.7 })
    }

    // Gravity
    if (!isGrounded.current) {
      velocity.current.y -= 28 * dt
    }

    // Building collision
    {
      const r = PLAYER_CONFIG.radius + 0.1
      const newX = position.current.x + velocity.current.x * dt
      const newZ = position.current.z + velocity.current.z * dt

      let hitX = false, hitZ = false
      const nearbyBuildings = getNearbyBuildingsGrid(newX, newZ, r + 10)
      for (const bi of nearbyBuildings) {
        const b = BUILDING_LAYOUT[bi]
        const hx = b.width / 2 + r
        const hz = b.depth / 2 + r
        const dxb = newX - b.x
        const dzb = newZ - b.z

        if (Math.abs(dxb) < hx && Math.abs(dzb) < hz) {
          const overlapX = hx - Math.abs(dxb)
          const overlapZ = hz - Math.abs(dzb)

          if (overlapX < overlapZ) {
            velocity.current.x = 0
            position.current.x = b.x + Math.sign(dxb) * hx
            hitX = true
          } else {
            velocity.current.z = 0
            position.current.z = b.z + Math.sign(dzb) * hz
            hitZ = true
          }
        }
      }

      if (!hitX) position.current.x = newX
      if (!hitZ) position.current.z = newZ
    }

    position.current.y += velocity.current.y * dt

    // Ground check
    if (position.current.y <= FOOT_Y) {
      if (!isGrounded.current) {
        const fallDist = peakHeight.current - position.current.y
        if (fallDist > 2.5) {
          takeDamage(Math.floor(fallDist * 4))
          soundManager.play('metal_impact', { volume: 0.8 })
        } else {
          soundManager.play('land_thud', { volume: fallDist > 1.5 ? 0.6 : 0.35 })
        }
      }
      position.current.y = FOOT_Y
      velocity.current.y = 0
      isGrounded.current = true
      peakHeight.current = FOOT_Y
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
    setPlayerRotation(angle)

    // Camera
    const camDist = PLAYER_CONFIG.cameraDistance
    const camH = PLAYER_CONFIG.cameraHeight
    const phi = cameraAngle.current.phi
    const camAngle = angle + Math.PI
    const tx = position.current.x + Math.sin(camAngle) * camDist
    const ty = position.current.y + camH - phi * camDist * 0.7
    const tz = position.current.z + Math.cos(camAngle) * camDist

    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.12)
    camera.lookAt(position.current.x, position.current.y + 0.8, position.current.z)

    // Animations
    if (isMoving && isGrounded.current) {
      animTime.current += dt * (rn ? 14 : 9)
    }
    const t = animTime.current

    // Leg swing (opposite phase)
    const legSwing = isMoving && isGrounded.current ? (rn ? 0.65 : 0.4) : 0
    const targetLeftLegRot = Math.sin(t) * legSwing
    const targetRightLegRot = Math.sin(t + Math.PI) * legSwing
    // Arm swing (opposite to legs, arms hang at sides)
    const armSwing = isMoving && isGrounded.current ? (rn ? 0.5 : 0.35) : 0
    const targetLeftArmRot = Math.sin(t + Math.PI) * armSwing
    const targetRightArmRot = Math.sin(t) * armSwing

    // Smooth animation transitions
    const lerpSpeed = 0.25
    prevLeftLegRot.current += (targetLeftLegRot - prevLeftLegRot.current) * lerpSpeed
    prevRightLegRot.current += (targetRightLegRot - prevRightLegRot.current) * lerpSpeed
    prevLeftArmRot.current += (targetLeftArmRot - prevLeftArmRot.current) * lerpSpeed
    prevRightArmRot.current += (targetRightArmRot - prevRightArmRot.current) * lerpSpeed

    if (leftLegRef.current) leftLegRef.current.rotation.x = prevLeftLegRot.current
    if (rightLegRef.current) rightLegRef.current.rotation.x = prevRightLegRot.current
    if (leftArmRef.current) leftArmRef.current.rotation.x = prevLeftArmRot.current
    if (rightArmRef.current) rightArmRef.current.rotation.x = prevRightArmRot.current

    // Body lean (lean forward when running fast)
    if (bodyGroupRef.current) {
      const speedFactor = Math.sqrt(velocity.current.x ** 2 + velocity.current.z ** 2) / PLAYER_CONFIG.runSpeed
      const leanTarget = isMoving && isGrounded.current ? speedFactor * 0.15 : 0
      bodyGroupRef.current.rotation.x += (leanTarget - bodyGroupRef.current.rotation.x) * 0.15
    }

    // Jump pose
    if (!isGrounded.current) {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.4
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.4
    }

    // Footstep sounds
    if (isMoving && isGrounded.current) {
      const stepInterval = rn ? 280 : 420
      if (now - lastFootstepTime.current >= stepInterval) {
        lastFootstepTime.current = now
        soundManager.play('footstep_walk', { volume: rn ? 0.7 : 0.45 })
      }
    }

    if (meshRef.current) {
      meshRef.current.position.copy(position.current)
      meshRef.current.rotation.y = angle
    }
  })

  if (inVehicle || isDead) return null

  return (
    <group ref={meshRef}>
      {/* Body group — tilts for lean */}
      <group ref={bodyGroupRef}>

        {/* Torso */}
        <mesh position={[0, TORSO_Y + TORSO_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.5, TORSO_HEIGHT, 0.28]} />
          <meshStandardMaterial color="#2255aa" metalness={0.3} roughness={0.6} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, NECK_Y, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
          <meshStandardMaterial color="#e8c090" roughness={0.8} />
        </mesh>

        {/* Head — simple smooth sphere */}
        <mesh position={[0, HEAD_Y, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#d4a574" roughness={0.8} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.32, SHOULDER_Y, 0]}>
          {/* Shoulder joint */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#2255aa" roughness={0.6} />
          </mesh>
          {/* Upper arm */}
          <mesh position={[0, -ARM_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.055, ARM_LENGTH * 0.6, 4, 8]} />
            <meshStandardMaterial color="#2255aa" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* Lower arm + hand */}
          <group position={[0, -ARM_LENGTH, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.045, 0.16, 4, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.24, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
          </group>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.32, SHOULDER_Y, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#2255aa" roughness={0.6} />
          </mesh>
          <mesh position={[0, -ARM_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.055, ARM_LENGTH * 0.6, 4, 8]} />
            <meshStandardMaterial color="#2255aa" metalness={0.3} roughness={0.6} />
          </mesh>
          <group position={[0, -ARM_LENGTH, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.045, 0.16, 4, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.24, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#d4a574" roughness={0.8} />
            </mesh>
          </group>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef} position={[-0.14, 0, 0]}>
          {/* Hip joint */}
          <mesh position={[0, LEG_LENGTH, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
          </mesh>
          {/* Upper leg (thigh) */}
          <mesh position={[0, LEG_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.08, LEG_LENGTH * 0.6, 4, 8]} />
            <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
          </mesh>
          {/* Lower leg + foot */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.15, 0]}>
              <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
              <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
            </mesh>
            {/* Foot */}
            <mesh position={[0, 0.03, 0.06]}>
              <boxGeometry args={[0.12, 0.06, 0.2]} />
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
          </group>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[0.14, 0, 0]}>
          <mesh position={[0, LEG_LENGTH, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, LEG_LENGTH * 0.5, 0]}>
            <capsuleGeometry args={[0.08, LEG_LENGTH * 0.6, 4, 8]} />
            <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
          </mesh>
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0.15, 0]}>
              <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
              <meshStandardMaterial color="#1a1a3a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.03, 0.06]}>
              <boxGeometry args={[0.12, 0.06, 0.2]} />
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Player glow light */}
    </group>
  )
}
