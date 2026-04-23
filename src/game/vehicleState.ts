// Shared mutable state between VehicleSpawner and NPCCrowd
// Written by VehicleSpawner each frame, read by NPCCrowd and VehicleSpawner for collision

export const vehiclePositions = new Map<string, { x: number; z: number; radius: number }>()

// Collision radius per vehicle type (in world units)
export function vehicleRadius(type: string): number {
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