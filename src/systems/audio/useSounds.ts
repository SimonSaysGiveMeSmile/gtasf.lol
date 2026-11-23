import { useEffect, useRef } from 'react'
// @jiahe
import { useGameStore } from '../../game/store'
import { soundManager } from './SoundManager'

export function useSoundOnEvent<T>(
  trigger: T,
  soundId: 'jump' | 'land_thud' | 'metal_impact' | 'car_horn',
  opts: { volume?: number } = {}
) {
  const prevTrigger = useRef<T>(trigger)
  useEffect(() => {
    if (trigger !== prevTrigger.current) {
      prevTrigger.current = trigger
      soundManager.play(soundId, opts)
    }
  }, [trigger, soundId, opts.volume])
}

// ─── Footstep Sound Hook ─────────────────────────────────────────────────────
// Plays footstep at a given interval while the player is moving
export function useFootstepSound(isMoving: boolean, interval: number) {
  const lastStep = useRef(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!isMoving) { lastStep.current = 0; return }
    const id = requestAnimationFrame(function tick(now) {
      frameRef.current = requestAnimationFrame(tick)
      if (now - lastStep.current >= interval) {
        lastStep.current = now
        soundManager.play('footstep_walk', { volume: 0.6 })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [isMoving, interval])
}

// ─── Ambient Sound Hook ──────────────────────────────────────────────────────
export function useAmbientSound() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)

  useEffect(() => {
    soundManager.startAmbient(timeOfDay === 'night' ? 0.2 : 0.15)
    return () => soundManager.stopAmbient()
  }, [timeOfDay])
}
