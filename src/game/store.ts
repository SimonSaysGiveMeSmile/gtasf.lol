import { create } from 'zustand'
import type { CityId, NPC, PlayerMode } from './types'

interface GameState {
  // Player state
  playerHealth: number
  playerMode: PlayerMode
  inVehicle: string | null
  playerPosition: [number, number, number]
  playerRotation: number
  isRunning: boolean
  isDead: boolean
  isRespawning: boolean

  // World state
  currentCity: CityId
  timeOfDay: 'day' | 'night'

  // NPCs
  npcs: NPC[]

  // Vehicles
  activeVehicles: string[]

  // Interaction
  nearbyInteractable: { type: string; id: string } | null
  interactionPrompt: string

  // Damage
  lastDamageTime: number
  damageFlash: boolean

  // Actions
  takeDamage: (amount: number) => void
  heal: (amount: number) => void
  setPlayerPosition: (pos: [number, number, number]) => void
  setPlayerRotation: (rot: number) => void
  setPlayerMode: (mode: PlayerMode) => void
  setInVehicle: (id: string | null) => void
  setRunning: (running: boolean) => void
  enterVehicle: (id: string) => void
  exitVehicle: () => void
  die: () => void
  respawn: () => void
  setCity: (city: CityId) => void
  setNPCs: (npcs: NPC[]) => void
  updateNPC: (id: string, update: Partial<NPC>) => void
  setNearbyInteractable: (item: { type: string; id: string } | null, prompt?: string) => void
  triggerDamageFlash: () => void
  setTimeOfDay: (time: 'day' | 'night') => void
}

export const useGameStore = create<GameState>((set, get) => ({
  playerHealth: 100,
  playerMode: 'onfoot',
  inVehicle: null,
  playerPosition: [0, 2, 0],
  playerRotation: 0,
  isRunning: false,
  isDead: false,
  isRespawning: false,
  currentCity: 'sf',
  timeOfDay: 'night',
  npcs: [],
  activeVehicles: [],
  nearbyInteractable: null,
  interactionPrompt: '',
  lastDamageTime: 0,
  damageFlash: false,

  takeDamage: (amount) => {
    const state = get()
    if (state.isDead) return
    const newHealth = Math.max(0, state.playerHealth - amount)
    set({ playerHealth: newHealth, lastDamageTime: Date.now(), damageFlash: true })
    setTimeout(() => set({ damageFlash: false }), 300)
    if (newHealth <= 0) {
      get().die()
    }
  },

  heal: (amount) => {
    set((s) => ({ playerHealth: Math.min(100, s.playerHealth + amount) }))
  },

  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  setPlayerRotation: (rot) => set({ playerRotation: rot }),
  setPlayerMode: (mode) => set({ playerMode: mode }),
  setRunning: (running) => set({ isRunning: running }),

  enterVehicle: (id) => set({ inVehicle: id, playerMode: 'vehicle' }),
  exitVehicle: () => set({ inVehicle: null, playerMode: 'onfoot' }),
  setInVehicle: (id) => set({ inVehicle: id }),

  die: () => {
    set({ isDead: true, isRespawning: false })
    setTimeout(() => {
      set({ isRespawning: true })
    }, 1000)
    setTimeout(() => {
      get().respawn()
    }, 4000)
  },

  respawn: () => {
    set({
      isDead: false,
      isRespawning: false,
      playerHealth: 100,
      playerMode: 'onfoot',
      inVehicle: null,
      playerPosition: [0, 3, 0],
    })
  },

  setCity: (city) => set({ currentCity: city }),
  setNPCs: (npcs) => set({ npcs }),
  updateNPC: (id, update) =>
    set((s) => ({
      npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...update } : n)),
    })),

  setNearbyInteractable: (item, prompt = '') =>
    set({ nearbyInteractable: item, interactionPrompt: prompt }),

  triggerDamageFlash: () => {
    set({ damageFlash: true })
    setTimeout(() => set({ damageFlash: false }), 300)
  },

  setTimeOfDay: (time) => set({ timeOfDay: time }),
}))
