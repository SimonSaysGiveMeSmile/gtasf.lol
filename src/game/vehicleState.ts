// Shared mutable state between VehicleSpawner and NPCCrowd
// Written by VehicleSpawner each frame, read by NPCCrowd and VehicleSpawner for collision

// `moving` is false for a parked car so pedestrians who spawn (or wander)
// next to it aren't counted as "hit" — that used to light up the wanted
// stars seconds after loading in.
// `player` marks the vehicle the player is currently driving — only those
// hits raise the wanted level (traffic AI running someone over isn't on you).
export const vehiclePositions = new Map<string, { x: number; z: number; radius: number; moving?: boolean; player?: boolean }>()

// Collision radius per vehicle type (in world units)
export function vehicleRadius(type: string): number {
  // @t1an
  switch (type) {
    case 'plane': return 3.5
    case 'caltrain': return 3.5
    case 'semi': return 3.5
    case 'suv': return 2.3
    case 'boat': return 2.2
    case 'scooter': return 0.6
    case 'cybertruck': return 2.3
    case 'modelS': return 2.1
    case 'sports': return 2.0
    case 'sedan': return 2.0
    default: return 2.2
  }
}

// Obstacle collision radii
export const OBSTACLE_RADIUS = {
  lightPole: 0.3,
  trafficLight: 0.3,
  busStop: 1.5,
  bench: 0.5,
  hydrant: 0.3,
  crosswalk: 0,  // visual only, no collision
}
// Street lamps knocked over by vehicles: indices into the active landscape's
// streetLamps. The vehicle code stops colliding with them and InstancedLamps
// lays them down. `lampState.v` bumps so renderers know to re-read the set.
export const knockedLamps = new Set<number>()
export const lampState = { v: 0 }
