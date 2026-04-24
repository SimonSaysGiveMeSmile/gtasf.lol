// Cheat code system — press Tab to activate, then type vehicle keyword
import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/store'
import type { VehicleType } from '../game/types'

const CHEAT_MAP: Record<string, VehicleType> = {
  cybertruck: 'cybertruck',
  models: 'modelS',
  sports: 'sports',
  suv: 'suv',
  sedan: 'sedan',
  semi: 'semi',
  scooter: 'scooter',
  plane: 'plane',
  boat: 'boat',
  caltrain: 'caltrain',
}

const MAX_BUFFER = 20

export default function CheatConsole() {
  const activeRef = useRef(false)
  const bufferRef = useRef('')
  const spawnVehicle = useGameStore((s) => s.spawnVehicle)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return

      if (e.key === 'Tab') {
        e.preventDefault()
        activeRef.current = !activeRef.current
        bufferRef.current = ''
        return
      }

      if (!activeRef.current) return

      if (e.key === 'Escape') {
        activeRef.current = false
        bufferRef.current = ''
        return
      }
      if (e.key === 'Backspace') {
        bufferRef.current = bufferRef.current.slice(0, -1)
        return
      }
      if (e.key.length !== 1) return

      bufferRef.current += e.key.toLowerCase()
      if (bufferRef.current.length > MAX_BUFFER) {
        bufferRef.current = bufferRef.current.slice(-MAX_BUFFER)
      }

      const buf = bufferRef.current.trim()
      for (const [word, type] of Object.entries(CHEAT_MAP)) {
        if (buf.endsWith(word)) {
          spawnVehicle(type)
          bufferRef.current = ''
          activeRef.current = false
          return
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [spawnVehicle])

  return null
}