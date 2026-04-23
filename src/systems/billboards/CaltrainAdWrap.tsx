import { useGameStore } from '../../game/store'

// Inlined caltrain ads to avoid barrel re-export runtime issues in Vite dev pre-bundler
type AdContent = {
  id: string
  brand: string
  headline: string
  subline?: string
  primaryColor: string
  secondaryColor: string
  textColor: string
  accentColor: string
  style: string
}

const FALLBACK_AD: AdContent = {
  id: 'fallback',
  brand: 'Salesforce',
  headline: 'HELLO, TRAINS',
  primaryColor: '#00a1e0',
  secondaryColor: '#001122',
  textColor: '#ffffff',
  accentColor: '#0099cc',
  style: 'tech',
}

const CALTRAIN_ADS: AdContent[] = [
  {
    id: 'caltrain-salesforce',
    brand: 'Salesforce',
    headline: 'HELLO, TRAINS',
    subline: 'salesforce.com',
    primaryColor: '#00a1e0',
    secondaryColor: '#001122',
    textColor: '#ffffff',
    accentColor: '#0099cc',
    style: 'tech',
  },
  {
    id: 'caltrain-lyft',
    brand: 'Lyft',
    headline: 'CONNECTING BAYS',
    subline: 'lyft.com/caltrain',
    primaryColor: '#ff71ce',
    secondaryColor: '#1a0033',
    textColor: '#ffffff',
    accentColor: '#ff99ee',
    style: 'transit',
  },
  {
    id: 'caltrain-caltrain',
    brand: 'Caltrain',
    headline: 'PENINSULA RAIL',
    subline: 'Caltrain · 505-9900',
    primaryColor: '#cc4422',
    secondaryColor: '#ffdd00',
    textColor: '#ffffff',
    accentColor: '#ffee66',
    style: 'transit',
  },
  {
    id: 'caltrain-uber',
    brand: 'Uber',
    headline: 'FIRST RIDE FREE',
    subline: 'Get Uber · Download now',
    primaryColor: '#000000',
    secondaryColor: '#06c170',
    textColor: '#ffffff',
    accentColor: '#00ff88',
    style: 'transit',
  },
  {
    id: 'caltrain-stripe',
    brand: 'Stripe',
    headline: 'SF HQ',
    subline: 'stripe.com/careers',
    primaryColor: '#635bff',
    secondaryColor: '#111111',
    textColor: '#ffffff',
    accentColor: '#9b99ff',
    style: 'tech',
  },
]

// Apply ad wrap to the Caltrain car body
// The caltrain car is 8 units long, 2.8 wide, 1.6 tall at body center
interface CaltrainAdWrapProps {
  index: number // which car (0 = front car) — used to pick ad variant
  seedX?: number // x position for ad selection
  seedZ?: number // z position for ad selection
}

export default function CaltrainAdWrap({ index, seedX = 0, seedZ = 0 }: CaltrainAdWrapProps) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')
  const idx = Math.abs(Math.round(seedX * 17 + seedZ)) % CALTRAIN_ADS.length
  const ad = CALTRAIN_ADS[idx] ?? FALLBACK_AD

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
        <pointLight
          position={[0, 2.2, 0]}
          color={ad.primaryColor}
          intensity={1}
          distance={8}
        />
      )}
    </group>
  )
}