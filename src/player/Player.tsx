// @t1an
import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import { PLAYER_CONFIG, MAP_SIZE } from '../game/constants'
import { getNearbyBuildingsGrid, collideCircleWithBuilding, meshColliderPushOutCircle } from '../world/World'
import { useLandscapeData } from '../game/LandscapeContext'
import { soundManager } from '../systems/audio/SoundManager'
// @simonsaysgivemesmile

// Module-level refs for gyro (not component state, so they persist)
const gyroEnabled = { current: false }
const gyroBase = { current: { alpha: 0, beta: 0, gamma: 0 } }

// Player foot Y = world y = 0 // @jt886
// All body parts positioned relative to feet.
// Scale: 1 unit = 1 meter. Top of head = 1.83m (6 ft).
// Breakdown: legs 0.87 + torso 0.55 + neck-to-head 0.22 + head radius 0.19 = 1.83
const FOOT_Y = 0
const LEG_LENGTH = 0.87
const TORSO_HEIGHT = 0.55
const TORSO_Y = FOOT_Y + LEG_LENGTH
const NECK_Y = TORSO_Y + TORSO_HEIGHT
const HEAD_Y = NECK_Y + 0.22
const HEAD_RADIUS = 0.19
const SHOULDER_Y = TORSO_Y + TORSO_HEIGHT * 0.85
const ARM_LENGTH = 0.58

export default function Player() {
  const meshRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const landscapeData = useLandscapeData()
  const buildings = landscapeData.buildings
  const isRunning = useGameStore((s) => s.isRunning)
  const inVehicle = useGameStore((s) => s.inVehicle)
  const isDead = useGameStore((s) => s.isDead)
  const exitVehiclePosition = useGameStore((s) => s.exitVehiclePosition)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const takeDamage = useGameStore((s) => s.takeDamage)
  const setIsFalling = useGameStore((s) => s.setIsFalling)
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation)
  const playerFaceTexture = useGameStore((s) => s.playerFaceTexture)
  const godMode = useGameStore((s) => s.godMode)

  // Load face texture as equirectangular map for sphere
  const headTexture = useMemo(() => {
    if (!playerFaceTexture) return null
    const loader = new THREE.TextureLoader()
    const tex = loader.load(playerFaceTexture)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [playerFaceTexture])

  useEffect(() => {
    return () => { headTexture?.dispose() }
  }, [headTexture])

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

  // Touch drag camera control (mobile) — any non-control touch rotates the camera.
  useEffect(() => {
    const active = new Map<number, { x: number; y: number }>()

    const isControlTarget = (t: EventTarget | null) => {
      let el = t as HTMLElement | null
      while (el) {
        if (el.dataset && el.dataset.touchControl) return true
        el = el.parentElement
      }
      return false
    }

    const onStart = (e: globalThis.TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (isControlTarget(t.target)) continue
        active.set(t.identifier, { x: t.clientX, y: t.clientY })
      }
    }
    const onMove = (e: globalThis.TouchEvent) => {
      let moved = false
      for (const t of Array.from(e.changedTouches)) {
        const prev = active.get(t.identifier)
        if (!prev) continue
        const dx = t.clientX - prev.x
        const dy = t.clientY - prev.y
        prev.x = t.clientX
        prev.y = t.clientY
        // Match mouse: left-drag turns right (theta -=), down-drag looks down (phi -=).
        cameraAngle.current.theta -= dx * 0.005
        cameraAngle.current.phi = Math.max(
          CAM_PHI_MIN,
          Math.min(CAM_PHI_MAX, cameraAngle.current.phi - dy * 0.005)
        )
        moved = true
      }
      if (moved) {
        // Touch-drag overrides gyro so they don't fight each other.
        if (gyroEnabled.current) gyroEnabled.current = false
        e.preventDefault()
      }
    }
    const onEnd = (e: globalThis.TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) active.delete(t.identifier)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
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
      setPlayerPosition([exitVehiclePosition[0], exitVehiclePosition[1], exitVehiclePosition[2]])
    }
  }, [exitVehiclePosition, inVehicle, setPlayerPosition])

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

    const speed = godMode
      ? PLAYER_CONFIG.runSpeed * 2.5
      : (rn ? PLAYER_CONFIG.runSpeed : PLAYER_CONFIG.walkSpeed)
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

    // Jump / vertical
    const now = Date.now()
    if (godMode) {
      // Space ascends, Shift descends. No gravity, no ground — a free fly cam.
      let vy = 0
      if (jmp) vy += PLAYER_CONFIG.runSpeed
      if (rn) vy -= PLAYER_CONFIG.runSpeed
      velocity.current.y += (vy - velocity.current.y) * 0.2
      isGrounded.current = false
      // Keep peakHeight pinned low so toggling god mode off at altitude doesn't
      // charge (peakHeight - y) worth of fall damage on the next landing.
      peakHeight.current = FOOT_Y
    } else {
      if (jmp && isGrounded.current && now - lastJumpTime.current > 300) {
        velocity.current.y = PLAYER_CONFIG.jumpForce
        isGrounded.current = false
        peakHeight.current = position.current.y
        lastJumpTime.current = now
        soundManager.play('jump', { volume: 0.7 })
      }
      if (!isGrounded.current) {
        velocity.current.y -= 28 * dt
      }
    }

    // Building collision — skipped entirely in god mode.
    if (godMode) {
      position.current.x += velocity.current.x * dt
      position.current.z += velocity.current.z * dt
    } else {
      // Polygon-accurate when footprint is present
      const r = PLAYER_CONFIG.radius + 0.1
      let cx = position.current.x + velocity.current.x * dt
      let cz = position.current.z + velocity.current.z * dt

      const nearbyBuildings = getNearbyBuildingsGrid(cx, cz, r + 10)
      for (const bi of nearbyBuildings) {
        const push = collideCircleWithBuilding(bi, cx, cz, r, buildings)
        if (!push) continue
        cx += push.pushX
        cz += push.pushZ
        // Kill the velocity component driving us into the wall so the next
        // step slides along the surface instead of pressing harder into it.
        if (Math.abs(push.pushX) > Math.abs(push.pushZ)) {
          velocity.current.x = 0
        } else {
          velocity.current.z = 0
        }
      }

      // Static-mesh (GLB) collider, if the current map has one.
      const meshPush = meshColliderPushOutCircle(cx, cz, r)
      if (meshPush) {
        cx += meshPush.pushX
        cz += meshPush.pushZ
        if (Math.abs(meshPush.pushX) > Math.abs(meshPush.pushZ)) {
          velocity.current.x = 0
        } else {
          velocity.current.z = 0
        }
      }

      position.current.x = cx
      position.current.z = cz
    }

    position.current.y += velocity.current.y * dt

    if (godMode) {
      // Clamp altitude to something reasonable so the camera doesn't detach.
      // Floor prevents sinking below the terrain; ceiling keeps the sky in frame.
      if (position.current.y < FOOT_Y) {
        position.current.y = FOOT_Y
        if (velocity.current.y < 0) velocity.current.y = 0
      }
      if (position.current.y > 800) position.current.y = 800
    } else if (position.current.y <= FOOT_Y) {
      // Ground check
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
    camera.lookAt(position.current.x, position.current.y + 1.3, position.current.z)

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
          <boxGeometry args={[0.52, TORSO_HEIGHT, 0.29]} />
          <meshStandardMaterial color="#2255aa" metalness={0.3} roughness={0.6} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, NECK_Y, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
          <meshStandardMaterial color="#e8c090" roughness={0.8} />
        </mesh>

        {/* Head — simple smooth sphere */}
        <mesh position={[0, HEAD_Y, 0]}>
          <sphereGeometry args={[HEAD_RADIUS, 24, 24]} />
          {headTexture ? (
            <meshStandardMaterial map={headTexture} roughness={0.8} />
          ) : (
            <meshStandardMaterial color="#d4a574" roughness={0.8} />
          )}
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
