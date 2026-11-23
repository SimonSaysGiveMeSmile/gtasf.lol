// Procedural low-poly firearms (our own geometry). Modelled with the muzzle
// pointing down −Z... no: along +Z, grip hanging −Y, in metres at 1:1 scale.
import type { WeaponId } from './weapons'

const METAL = { color: '#2b2d31', roughness: 0.45, metalness: 0.75 }
const DARK = { color: '#17181b', roughness: 0.6, metalness: 0.5 }
const WOOD = { color: '#5a3a1e', roughness: 0.7, metalness: 0.05 }
const POLY = { color: '#3a3c40', roughness: 0.8, metalness: 0.1 }

function Box({ p, s, m }: { p: [number, number, number]; s: [number, number, number]; m: typeof METAL }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial {...m} />
    </mesh>
  )
}

export default function WeaponModel({ id }: { id: WeaponId }) {
  switch (id) {
    case 'pistol':
      return (
        <group>
          <Box p={[0, 0.02, 0.07]} s={[0.03, 0.035, 0.17]} m={METAL} />   {/* slide */}
          <Box p={[0, -0.005, 0.05]} s={[0.028, 0.02, 0.13]} m={DARK} />  {/* frame */}
          <Box p={[0, -0.05, -0.005]} s={[0.028, 0.085, 0.035]} m={POLY} /> {/* grip */}
          <Box p={[0, -0.025, 0.03]} s={[0.012, 0.03, 0.012]} m={DARK} />  {/* trigger guard */}
        </group>
      )
    case 'smg':
      return (
        <group>
          <Box p={[0, 0.02, 0.1]} s={[0.04, 0.05, 0.3]} m={METAL} />     {/* receiver */}
          <Box p={[0, 0.02, 0.29]} s={[0.018, 0.018, 0.1]} m={DARK} />   {/* barrel */}
          <Box p={[0, -0.06, 0.09]} s={[0.03, 0.14, 0.04]} m={DARK} />   {/* magazine */}
          <Box p={[0, -0.045, -0.01]} s={[0.03, 0.08, 0.035]} m={POLY} /> {/* grip */}
          <Box p={[0, 0.03, -0.1]} s={[0.025, 0.03, 0.12]} m={POLY} />   {/* stock */}
        </group>
      )
    case 'shotgun':
      return (
        <group>
          <Box p={[0, 0.03, 0.18]} s={[0.025, 0.025, 0.5]} m={METAL} />  {/* barrel */}
          <Box p={[0, 0.0, 0.18]} s={[0.028, 0.028, 0.4]} m={DARK} />    {/* mag tube */}
          <Box p={[0, 0.0, 0.26]} s={[0.04, 0.04, 0.12]} m={WOOD} />     {/* pump */}
          <Box p={[0, 0.015, -0.04]} s={[0.04, 0.06, 0.16]} m={METAL} /> {/* receiver */}
          <Box p={[0, -0.01, -0.2]} s={[0.035, 0.07, 0.18]} m={WOOD} />  {/* stock */}
          <Box p={[0, -0.045, 0.0]} s={[0.03, 0.06, 0.03]} m={WOOD} />   {/* grip */}
        </group>
      )
    case 'rifle':
      return (
        <group>
          <Box p={[0, 0.03, 0.08]} s={[0.045, 0.06, 0.34]} m={METAL} />  {/* receiver */}
          <Box p={[0, 0.03, 0.36]} s={[0.02, 0.02, 0.26]} m={DARK} />    {/* barrel */}
          <Box p={[0, 0.0, 0.3]} s={[0.04, 0.04, 0.18]} m={POLY} />      {/* handguard */}
          <Box p={[0, 0.075, 0.08]} s={[0.012, 0.03, 0.12]} m={DARK} />  {/* sight */}
          <Box p={[0, -0.08, 0.06]} s={[0.03, 0.16, 0.05]} m={DARK} />   {/* magazine */}
          <Box p={[0, -0.05, -0.05]} s={[0.03, 0.09, 0.035]} m={POLY} /> {/* grip */}
          <Box p={[0, 0.02, -0.2]} s={[0.035, 0.05, 0.2]} m={POLY} />    {/* stock */}
        </group>
      )
    default:
      return null
  }
}
