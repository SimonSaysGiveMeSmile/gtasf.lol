import { useMemo } from 'react'
import Vehicle from './Vehicle'
import { VEHICLES } from '../game/constants'
import { MAP_SIZE, VEHICLE_COUNT } from '../game/constants'

const SPAWN_POSITIONS: [number, number, number][] = [
  [10, 0.5, 10],
  [-15, 0.5, 20],
  [25, 0.5, -10],
  [-20, 0.5, -25],
  [40, 0.5, 30],
  [-30, 0.5, 15],
  [50, 0.5, -20],
  [-40, 0.5, -40],
  [15, 0.5, 50],
  [-25, 0.5, -50],
  [60, 0.5, 10],
  [-55, 0.5, 30],
  [30, 0.5, 60],
  [-10, 0.5, -60],
  [70, 0.5, 40],
  [-60, 0.5, -10],
  [20, 0.5, -70],
  [-35, 0.5, 55],
  [80, 0.5, -30],
  [-75, 0.5, 25],
]

// Boat spawns in water areas
const BOAT_SPAWNS: [number, number, number][] = [
  [-80, 0.5, -80],
  [80, 0.5, -80],
  [-80, 0.5, 80],
  [80, 0.5, 80],
]

// Plane spawns on elevated areas
const PLANE_SPAWNS: [number, number, number][] = [
  [0, 50, 0],
  [-100, 50, 50],
  [100, 50, -50],
]

export default function VehicleSpawner() {
  const vehicles = useMemo(() => {
    const spawnedVehicles = []

    const randomPosition = (seed: number): [number, number, number] => {
      const x = Math.sin(seed * 12.9898) * 43758.5453
      const z = Math.sin((seed + 1) * 78.233) * 43758.5453
      return [
        (x - Math.floor(x)) * MAP_SIZE - MAP_SIZE / 2,
        0.5,
        (z - Math.floor(z)) * MAP_SIZE - MAP_SIZE / 2,
      ]
    }

    const randomRotation = (seed: number) => {
      const value = Math.sin(seed * 93.9898) * 43758.5453
      return (value - Math.floor(value)) * Math.PI * 2
    }

    for (let i = 0; i < Math.min(VEHICLE_COUNT, 15); i++) {
      const spec = VEHICLES[i % 5]
      spawnedVehicles.push(
        <Vehicle
          key={`vehicle-${i}`}
          id={`vehicle-${i}`}
          type={spec.type}
          position={SPAWN_POSITIONS[i] || randomPosition(i + 1)}
          rotation={randomRotation(i + 1)}
        />
      )
    }

    for (let i = 0; i < 3; i++) {
      const spec = VEHICLES.find((v) => v.type === 'boat')!
      spawnedVehicles.push(
        <Vehicle
          key={`boat-${i}`}
          id={`boat-${i}`}
          type="boat"
          position={BOAT_SPAWNS[i]}
          rotation={randomRotation(100 + i)}
          color={spec.color}
        />
      )
    }

    for (let i = 0; i < 2; i++) {
      const spec = VEHICLES.find((v) => v.type === 'plane')!
      spawnedVehicles.push(
        <Vehicle
          key={`plane-${i}`}
          id={`plane-${i}`}
          type="plane"
          position={PLANE_SPAWNS[i]}
          rotation={0}
          color={spec.color}
        />
      )
    }

    return spawnedVehicles
  }, [])

  return <>{vehicles}</>
}