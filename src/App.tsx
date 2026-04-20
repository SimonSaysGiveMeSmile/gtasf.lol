import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/cannon'
import { Suspense } from 'react'
import World from './world/World'
import Player from './player/Player'
import VehicleSpawner from './vehicles/VehicleSpawner'
import NPCCrowd from './npcs/NPCCrowd'
import HUD from './ui/HUD'
import InputManager from './systems/InputManager'
import { useGameStore } from './game/store'

const keyMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'brake', keys: ['Space'] },
  { name: 'boost', keys: ['ShiftLeft', 'ShiftRight'] },
]

export default function App() {
  const isDead = useGameStore((s) => s.isDead)

  return (
    <KeyboardControls map={keyMap}>
      <InputManager>
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
          <Canvas
            shadows
            camera={{ fov: 60, near: 0.1, far: 2000 }}
            gl={{ antialias: true, alpha: false }}
            style={{ background: '#050510' }}
          >
            <Suspense fallback={null}>
              <Physics gravity={[0, -30, 0]} defaultContactMaterial={{ friction: 0.3, restitution: 0.2 }}>
                <World />
                <Player />
                <VehicleSpawner />
                <NPCCrowd />
              </Physics>
            </Suspense>
          </Canvas>
          <HUD />
          {!isDead && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-muted)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              WASD to move · SHIFT to run · SPACE to jump · E to enter/exit vehicles
            </div>
          )}
        </div>
      </InputManager>
    </KeyboardControls>
  )
}