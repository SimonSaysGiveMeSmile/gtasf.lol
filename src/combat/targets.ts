// Shared, frame-rate-hot registries for combat. Kept out of the zustand
// store on purpose: positions change every frame and must not re-render UI.
import * as THREE from 'three'

/** Pedestrian positions (also read by the crowd for separation). */
export const pedPositions = new Map<string, { x: number; z: number }>()

/** Police officers on foot. */
export const copPositions = new Map<string, { x: number; z: number }>()

export type HitInfo = {
  damage: number
  /** horizontal direction the shot was travelling (unit) */
  dirX: number
  dirZ: number
  point: THREE.Vector3
  weapon: string
  /** true if the player fired it */
  byPlayer: boolean
}

/**
 * Anything that can be shot registers a handler under its id. Ids are shared
 * with pedPositions / copPositions / vehiclePositions so the hitscan can
 * route a hit to the owner.
 */
export const hitHandlers = new Map<string, (hit: HitInfo) => void>()

/** Dead / downed pedestrians are skipped by the hitscan and crowd logic. */
export const downedPeds = new Set<string>()

/** Last gunfire, used by pedestrians to panic and by police to converge. */
export const combatState = {
  lastShotAt: 0,
  lastMeleeAt: 0,
  lastShotX: 0,
  lastShotZ: 0,
  /** player is currently holding the aim button */
  aiming: false,
  /** hit marker flash timestamp */
  lastHitAt: 0,
  /** kills this session (for the HUD stat line) */
  kills: 0,
}

/** One-shot visual effects produced by the hitscan, drained by CombatFX. */
export type Fx =
  | { kind: 'tracer'; from: THREE.Vector3; to: THREE.Vector3; t: number }
  | { kind: 'spark'; at: THREE.Vector3; n: THREE.Vector3; t: number; color: string }
  | { kind: 'flash'; at: THREE.Vector3; t: number }
export const fxQueue: Fx[] = []
