// @jt886
import { useAmbientSound, useVehicleEngine } from './useSounds'
import { useGameStore } from '../../game/store'

export default function AudioManager() {
  useAmbientSound()

  const inVehicle = useGameStore((s) => s.inVehicle)
  const speed = useGameStore((s) => s.vehicleSpeed)
  useVehicleEngine(inVehicle, speed)

  return null
}