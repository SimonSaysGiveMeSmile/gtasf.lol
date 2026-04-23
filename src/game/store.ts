// @simonsaysgivemesmile
import { create } from 'zustand'
import type { CityId, NPC, PlayerMode, VehicleType } from './types'

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
  vehicleSpeed: number
  currentVehicleType: VehicleType | null
  exitVehiclePosition: [number, number, number] | null

  // Interaction
  nearbyInteractable: { type: string; id: string } | null
  interactionPrompt: string

  // Damage
  lastDamageTime: number
  damageFlash: boolean

  // Flying state
  isFalling: boolean
  isFlying: boolean
  altitude: number
  fps: number
  isLoading: boolean
  qualityPreset: 'low' | 'med' | 'high' | 'ultra' | '8k'
  qualityNpcCount: number
  qualityVehicleCount: number

  // Actions
  takeDamage: (amount: number) => void
  setIsFalling: (falling: boolean) => void
  heal: (amount: number) => void
  setPlayerPosition: (pos: [number, number, number]) => void
  setPlayerRotation: (rot: number) => void
  setPlayerMode: (mode: PlayerMode) => void
  setInVehicle: (id: string | null) => void
  setRunning: (running: boolean) => void
  enterVehicle: (id: string, vehicleType?: VehicleType) => void
  exitVehicle: (exitPos?: [number, number, number]) => void
  die: () => void
  respawn: () => void
  setCity: (city: CityId) => void
  setNPCs: (npcs: NPC[]) => void
  updateNPC: (id: string, update: Partial<NPC>) => void
  setNearbyInteractable: (item: { type: string; id: string } | null, prompt?: string) => void
  triggerDamageFlash: () => void
  setTimeOfDay: (time: 'day' | 'night') => void
  setVehicleSpeed: (speed: number) => void
  setCurrentVehicleType: (type: VehicleType | null) => void
  setIsFlying: (flying: boolean) => void
  setAltitude: (altitude: number) => void
  setFps: (fps: number) => void
  setIsLoading: (loading: boolean) => void
  setQualityPreset: (preset: 'low' | 'med' | 'high' | 'ultra' | '8k') => void
  setQualityCounts: (npc: number, vehicle: number) => void
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
  timeOfDay: 'day',
  npcs: [],
  activeVehicles: [],
  nearbyInteractable: null,
  interactionPrompt: '',
  lastDamageTime: 0,
  damageFlash: false,
  vehicleSpeed: 0,
  currentVehicleType: null,
  isFalling: false,
  isFlying: false,
  altitude: 0,
  fps: 60,
  isLoading: true,
  qualityPreset: 'high',
  qualityNpcCount: 50,
  qualityVehicleCount: 30,
  
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

  enterVehicle: (id: string, vehicleType?: VehicleType) => set({ inVehicle: id, playerMode: 'vehicle', currentVehicleType: vehicleType || null }),
  exitVehicle: (exitPos) => set({ inVehicle: null, playerMode: 'onfoot', vehicleSpeed: 0, currentVehicleType: null, exitVehiclePosition: exitPos || null }),
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
      currentVehicleType: null,
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
  setIsFalling: (falling) => set({ isFalling: falling }),
  setVehicleSpeed: (speed) => set({ vehicleSpeed: speed }),
  setCurrentVehicleType: (type) => set({ currentVehicleType: type }),
  setIsFlying: (flying) => set({ isFlying: flying }),
  setAltitude: (altitude) => set({ altitude }),
  setFps: (fps) => set({ fps }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setQualityPreset: (preset) => set({ qualityPreset: preset }),
  setQualityCounts: (npc, vehicle) => set({ qualityNpcCount: npc, qualityVehicleCount: vehicle }),
  exitVehiclePosition: null,
}))
