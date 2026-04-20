import { useEffect } from 'react'
import { useGameStore } from '../game/store'

export default function InputManager({ children }: { children: React.ReactNode }) {
  const setRunning = useGameStore((s) => s.setRunning)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setRunning(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setRunning(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setRunning])

  return <>{children}</>
}