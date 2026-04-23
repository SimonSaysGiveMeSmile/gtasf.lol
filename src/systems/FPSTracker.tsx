// @simonsaysgivemesmile
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../game/store'

export default function FPSTracker() {
  const frames = useRef<number[]>([])
  const setFps = useGameStore((s) => s.setFps)

  useFrame(() => {
    const now = performance.now()
    frames.current.push(now)
    // Keep last 30 frames for ~0.5s sampling window
    while (frames.current.length > 30) {
      frames.current.shift()
    }
    if (frames.current.length >= 2) {
      const elapsed = frames.current[frames.current.length - 1] - frames.current[0]
      const fps = Math.round(((frames.current.length - 1) / elapsed) * 1000)
      setFps(fps)
    }
  })

  return null
}
