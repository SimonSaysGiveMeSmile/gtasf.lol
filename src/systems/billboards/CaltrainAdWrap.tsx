import { useGameStore } from '../../game/store'
import type { AdContent } from './adsConfig'

// Apply ad wrap to the Caltrain car body
// The caltrain car is 8 units long, 2.8 wide, 1.6 tall at body center
interface CaltrainAdWrapProps {
  ad: AdContent
  index: number // which car (0 = front car)
}

export function CaltrainAdWrap({ ad, index }: CaltrainAdWrapProps) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')

  // Alternate ad sides per car
  const showFront = index % 2 === 0

  return (
    <group>
      {/* Left side full-body wrap */}
      <mesh position={[-1.41, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.5, 1.3]} />
        <meshStandardMaterial
          color={ad.primaryColor}
          emissive={isNight ? ad.primaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.12 : 0}
          metalness={0.05}
          roughness={0.95}
          side={2}
        />
      </mesh>

      {/* Left side accent stripe */}
      <mesh position={[-1.42, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.6, 0.12]} />
        <meshStandardMaterial color={ad.accentColor} emissive={ad.accentColor} emissiveIntensity={0.4} />
      </mesh>

      {/* Left side brand bar */}
      <mesh position={[-1.42, 1.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.6, 0.3]} />
        <meshStandardMaterial
          color={ad.secondaryColor}
          emissive={isNight ? ad.secondaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Right side full-body wrap */}
      <mesh position={[1.41, 0.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[7.5, 1.3]} />
        <meshStandardMaterial
          color={ad.primaryColor}
          emissive={isNight ? ad.primaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.12 : 0}
          metalness={0.05}
          roughness={0.95}
          side={2}
        />
      </mesh>

      {/* Right side accent stripe */}
      <mesh position={[1.42, 0.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[7.6, 0.12]} />
        <meshStandardMaterial color={ad.accentColor} emissive={ad.accentColor} emissiveIntensity={0.4} />
      </mesh>

      {/* Right side brand bar */}
      <mesh position={[1.42, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[7.6, 0.3]} />
        <meshStandardMaterial
          color={ad.secondaryColor}
          emissive={isNight ? ad.secondaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Front end panel (when showing front ad) */}
      {showFront && (
        <mesh position={[0, 0.9, 4.01]}>
          <planeGeometry args={[2.6, 1.3]} />
          <meshStandardMaterial
            color={ad.primaryColor}
            emissive={isNight ? ad.primaryColor : '#000000'}
            emissiveIntensity={isNight ? 0.12 : 0}
            side={2}
          />
        </mesh>
      )}

      {/* Rear end panel */}
      {!showFront && (
        <mesh position={[0, 0.9, -4.01]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[2.6, 1.3]} />
          <meshStandardMaterial
            color={ad.primaryColor}
            emissive={isNight ? ad.primaryColor : '#000000'}
            emissiveIntensity={isNight ? 0.12 : 0}
            side={2}
          />
        </mesh>
      )}

      {/* Roof ad — visible from above */}
      <mesh position={[0, 1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 7.5]} />
        <meshStandardMaterial
          color={ad.primaryColor}
          emissive={isNight ? ad.primaryColor : '#000000'}
          emissiveIntensity={isNight ? 0.1 : 0}
          side={2}
        />
      </mesh>

      {/* Night glow */}
      {isNight && (
        <pointLight position={[0, 2.2, 0]} color={ad.primaryColor} intensity={3} distance={10} />
      )}
    </group>
  )
}