import { useEffect } from 'react'
import { useGameStore } from '../game/store'

export default function InputManager({ children }: { children: React.ReactNode }) {
  const setRunning = useGameStore((s) => s.setRunning)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
  const timeOfDay = useGameStore((s) => s.timeOfDay)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/select/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return

      switch (e.code) {
        // Sprint — Shift (both sides)
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault()
          setRunning(true)
          break

        // Jump — Space (on foot)
        // Handbrake — Space (in vehicle) — handled by VehicleSpawner
        // Enter/exit vehicle — E (handled by VehicleSpawner)

        // Change view — V
        case 'KeyV':
          e.preventDefault()
          break

        // Toggle HUD — H
        case 'KeyH':
          e.preventDefault()
          break

        // Night/Day toggle — N
        case 'KeyN':
          e.preventDefault()
          setTimeOfDay(timeOfDay === 'night' ? 'day' : 'night')
          break

        // F1 — Save screenshot / recording toggle
        case 'F1':
          e.preventDefault()
          break

        // F2 — Action Replay on
        case 'F2':
          e.preventDefault()
          break

        // F3 — Cancel recording / Action Replay off
        case 'F3':
          e.preventDefault()
          break

        // F5 — Save camera position
        case 'F5':
          e.preventDefault()
          break
      }

      // Character switch — Alt (L-Alt on Mac, Alt on Windows)
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ShiftLeft':
        case 'ShiftRight':
          setRunning(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setRunning, setTimeOfDay, timeOfDay])

  return <>{children}</>
}
