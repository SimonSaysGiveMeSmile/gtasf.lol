import { useRef, useEffect, useCallback, useState } from 'react'
import type { TouchEvent } from 'react'

// Touch input global registry (read by Player.tsx and VehicleSpawner.tsx)
;(window as any).__touchInput = {
  forward: false, backward: false, left: false, right: false,
  jump: false, run: false, brake: false, boost: false, interact: false,
}
;(window as any).__setTouchInput = (input: Record<string, boolean>) => {
  Object.assign((window as any).__touchInput, input)
}

interface JoystickState {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  dx: number
  dy: number
}

export default function TouchControls() {
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const joystick = useRef<JoystickState>({
    active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0,
  })
  const [showControls, setShowControls] = useState(false)

  useEffect(() => {
    const check = () => setShowControls('ontouchstart' in window || navigator.maxTouchPoints > 0)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = joystickRef.current?.getBoundingClientRect()
    if (!rect) return

    const joystickX = rect.left + rect.width / 2
    const joystickY = rect.top + rect.height / 2
    joystick.current.startX = joystickX
    joystick.current.startY = joystickY
    joystick.current.active = true
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!joystick.current.active) return
    const touch = e.touches[0]
    const rect = joystickRef.current?.getBoundingClientRect()
    if (!rect) return

    const maxDist = rect.width / 2 - 20
    let dx = touch.clientX - joystick.current.startX
    let dy = touch.clientY - joystick.current.startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist
      dy = (dy / dist) * maxDist
    }

    joystick.current.dx = dx / maxDist
    joystick.current.dy = dy / maxDist

    // Update knob visual position
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }

    // Map joystick to direction inputs
    const threshold = 0.3
    const ti = (window as any).__touchInput
    ti.forward = joystick.current.dy < -threshold
    ti.backward = joystick.current.dy > threshold
    ti.left = joystick.current.dx < -threshold
    ti.right = joystick.current.dx > threshold
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    joystick.current.active = false
    joystick.current.dx = 0
    joystick.current.dy = 0
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)'
    }
    const ti = (window as any).__touchInput
    ti.forward = false; ti.backward = false; ti.left = false; ti.right = false
  }, [])

  const pressButton = useCallback((key: string, pressed: boolean) => {
    const ti = (window as any).__touchInput
    ti[key] = pressed
  }, [])

  if (!showControls) return null

  return (
    <>
      {/* Joystick base */}
      <div
        ref={joystickRef}
        style={{
          position: 'fixed',
          bottom: 60,
          left: 30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(10, 10, 25, 0.5)',
          border: '2px solid rgba(0, 229, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          zIndex: 200,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Direction indicators */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.15 }} viewBox="0 0 120 120">
          <polygon points="60,8 55,22 65,22" fill="#00e5ff" />
          <polygon points="60,112 55,98 65,98" fill="#00e5ff" />
          <polygon points="8,60 22,55 22,65" fill="#00e5ff" />
          <polygon points="112,60 98,55 98,65" fill="#00e5ff" />
        </svg>
        {/* Joystick knob */}
        <div
          ref={knobRef}
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, rgba(0,229,255,0.8), rgba(0,229,255,0.3))',
            border: '2px solid rgba(0, 229, 255, 0.8)',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.5)',
            transition: joystick.current.active ? 'none' : 'transform 0.15s ease-out',
            zIndex: 1,
          }}
        />
      </div>

      {/* Right-side action buttons */}
      <div style={{
        position: 'fixed',
        bottom: 60,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 200,
      }}>
        {/* Top row: Brake + Boost */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <ActionButton
            label="BRK"
            color="#ff0040"
            onPress={() => pressButton('brake', true)}
            onRelease={() => pressButton('brake', false)}
            size={50}
          />
          <ActionButton
            label="BST"
            color="#ffb300"
            onPress={() => pressButton('boost', true)}
            onRelease={() => pressButton('boost', false)}
            size={50}
          />
        </div>
        {/* Middle row: Interact */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ActionButton
            label="F"
            color="#00ff88"
            onPress={() => pressButton('interact', true)}
            onRelease={() => pressButton('interact', false)}
            size={56}
          />
        </div>
        {/* Bottom row: Jump + Sprint */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <ActionButton
            label="RUN"
            color="#4d96ff"
            onPress={() => pressButton('run', true)}
            onRelease={() => pressButton('run', false)}
            size={50}
          />
          <ActionButton
            label="JMP"
            color="#c9b1ff"
            onPress={() => pressButton('jump', true)}
            onRelease={() => pressButton('jump', false)}
            size={50}
          />
        </div>
      </div>
    </>
  )
}

interface ActionButtonProps {
  label: string
  color: string
  onPress: () => void
  onRelease: () => void
  size: number
}

function ActionButton({ label, color, onPress, onRelease, size }: ActionButtonProps) {
  const [pressed, setPressed] = useState(false)

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    setPressed(true)
    onPress()
  }, [onPress])

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    setPressed(false)
    onRelease()
  }, [onRelease])

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: pressed
          ? `radial-gradient(circle at 40% 40%, ${color}, rgba(0,0,0,0.3))`
          : `radial-gradient(circle at 40% 40%, rgba(${hexToRgb(color)},0.3), rgba(10,10,25,0.7))`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        boxShadow: pressed
          ? `0 0 20px ${color}, inset 0 0 10px rgba(255,255,255,0.2)`
          : `0 0 10px rgba(${hexToRgb(color)},0.3)`,
        transition: 'all 0.1s ease',
        cursor: 'pointer',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.22,
        fontWeight: 700,
        letterSpacing: 1,
        color: pressed ? '#fff' : color,
        textShadow: pressed ? `0 0 8px ${color}` : 'none',
      }}>
        {label}
      </span>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0,229,255'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}