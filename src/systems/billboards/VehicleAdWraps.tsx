import { useMemo } from 'react'
import { useGameStore } from '../../game/store'
import { VEHICLE_ADS } from './adsConfig'
import type { VehicleType } from '../../game/types'

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// Vehicle types that can display ad wraps
const AD_WRAP_TYPES: VehicleType[] = ['cybertruck', 'modelS', 'sports', 'suv', 'sedan']

// AdWrap component — overlays a flat panel with ad on a vehicle
function AdWrapMesh({ ad, style }: { ad: typeof VEHICLE_ADS[0]; style: 'side' | 'rear' | 'roof' }) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')

  if (style === 'side') {
    return (
      <group>
        {/* Side panel */}
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.05, 0.8, 3.5]} />
          <meshStandardMaterial
            color={ad.primaryColor}
            emissive={isNight ? ad.primaryColor : '#000000'}
            emissiveIntensity={isNight ? 0.1 : 0}
            metalness={0.05}
            roughness={0.95}
          />
        </mesh>
        {/* Accent stripe */}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.06, 0.1, 3.6]} />
          <meshStandardMaterial color={ad.accentColor} emissive={ad.accentColor} emissiveIntensity={0.3} />
        </mesh>
        {/* Brand bar */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.06, 0.3, 3.6]} />
          <meshStandardMaterial
            color={ad.secondaryColor}
            emissive={isNight ? ad.secondaryColor : '#000000'}
            emissiveIntensity={isNight ? 0.15 : 0}
          />
        </mesh>
        {/* Night glow */}
        {isNight && (
          <pointLight
            position={[0, 0.6, 0]}
            color={ad.primaryColor}
            intensity={0.8}
            distance={5}
          />
        )}
      </group>
    )
  }

  if (style === 'rear') {
    return (
      <group>
        {/* Rear panel */}
        <mesh position={[0, 0.8, -2.3]}>
          <boxGeometry args={[1.8, 0.6, 0.05]} />
          <meshStandardMaterial
            color={ad.primaryColor}
            emissive={isNight ? ad.primaryColor : '#000000'}
            emissiveIntensity={isNight ? 0.1 : 0}
          />
        </mesh>
        {/* Rear accent */}
        <mesh position={[0, 0.45, -2.31]}>
          <boxGeometry args={[1.9, 0.1, 0.03]} />
          <meshStandardMaterial color={ad.accentColor} emissive={ad.accentColor} emissiveIntensity={0.3} />
        </mesh>
      </group>
    )
  }

  // roof
  return (
    <group>
      <mesh position={[0, 1.2, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[1.4, 0.05, 2.0]} />
        <meshStandardMaterial
          color={ad.primaryColor}
          emissive={isNight ? ad.primaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.1 : 0}
        />
      </mesh>
    </group>
  )
}

// Ad panel mesh — a floating ad panel that can be parented to any vehicle
interface AdWrapProps {
  vehicleId: string
  vehicleType: VehicleType
}

export function VehicleAdWrap({ vehicleId, vehicleType }: AdWrapProps) {
  const ad = useMemo(() => {
    if (!AD_WRAP_TYPES.includes(vehicleType)) return null
    // Pick ad based on vehicle ID hash for consistency
    const hash = vehicleId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return VEHICLE_ADS[hash % VEHICLE_ADS.length]
  }, [vehicleId, vehicleType])

  if (!ad || !AD_WRAP_TYPES.includes(vehicleType)) return null

  return (
    <>
      <AdWrapMesh ad={ad} style="side" />
      <AdWrapMesh ad={ad} style="rear" />
      <AdWrapMesh ad={ad} style="roof" />
    </>
  )
}

// ── Ad Wrap Layer (manages which vehicles have ads) ────────────────────────────
// This component doesn't render itself — it exports a helper to check
// which vehicles should show ad wraps based on seed.
export function useVehicleAdWraps() {
  return useMemo(() => {
    const wraps: Map<string, typeof VEHICLE_ADS[0] | null> = new Map()
    // Vehicles with ad wraps — about 40% of eligible vehicles get ads
    for (let i = 0; i < 100; i++) {
      const vehicleId = `vehicle-${i}`
      const type = (['cybertruck', 'modelS', 'sports', 'suv', 'sedan'] as VehicleType[])[i % 5]
      if (!AD_WRAP_TYPES.includes(type)) continue
      const hash = vehicleId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      // ~40% get an ad wrap
      if (seededRandom(hash * 17) > 0.4) {
        wraps.set(vehicleId, VEHICLE_ADS[hash % VEHICLE_ADS.length])
      }
    }
    return wraps
  }, [])
}
