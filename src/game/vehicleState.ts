// Shared mutable state between VehicleSpawner and NPCCrowd
// Written by VehicleSpawner each frame, read by NPCCrowd for collision

export const vehiclePositions = new Map<string, { x: number; z: number; radius: number }>()
