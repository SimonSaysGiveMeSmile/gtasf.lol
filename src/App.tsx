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
import TouchControls from './ui/TouchControls'
import FPSTracker from './systems/FPSTracker'
import { useGameStore } from './game/store'

const keyMap = [
 { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
 { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
 { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
 { name: 'right', keys: ['KeyD', 'ArrowRight'] },
 { name: 'jump', keys: ['Space'] },
 { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
 { name: 'interact', keys: ['KeyF'] },
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
      shadows={false}
      camera={{ fov: 60, near: 0.1, far: 8000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preferWebGl2: true }}
      style={{ background: '#87CEEB' }}
      frameloop="always"
      dpr={[1, 1]}
     >
      <Suspense fallback={null}>
       <Physics gravity={[0, -25, 0]} defaultContactMaterial={{ friction: 0.5, restitution: 0.1 }}>
        <World />
        <Player />
       </Physics>
       <VehicleSpawner />
       <NPCCrowd />
       <FPSTracker />
      </Suspense>
     </Canvas>
     <HUD />
     <TouchControls />
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
       WASD · SHIFT run · SPACE jump · F enter vehicle
      </div>
     )}
    </div>
   </InputManager>
  </KeyboardControls>
 )
}
