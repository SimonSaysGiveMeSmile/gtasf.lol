// Story mode — data model.
// A campaign is a list of Chapters; each Chapter is a linear list of Steps.
// Steps are plain data so chapters.ts stays readable and the runner/store own
// all behaviour. World positions are metres in the downtown_sf OSM frame
// (origin 37.7875 N, -122.405 W; +x east, +z north).

export interface Stats {
  cash: number    // dollars
  hype: number    // 0–100
  team: number    // headcount incl. you
  mrr: number     // dollars / month
  equity: number  // founder ownership, percent
  day: number     // in-story day counter (flavour)
}

export type StatDelta = Partial<Record<keyof Stats, number>>

export interface Choice {
  label: string
  effect?: StatDelta
  flag?: string
  flagValue?: string | number | boolean
  reply?: string          // spoken by `replySpeaker` (defaults to the line's speaker) after picking
  replySpeaker?: string
}

export interface Line {
  speaker: string
  text: string
  choices?: Choice[]
}

export interface Loc {
  x: number
  z: number
  snap?: boolean          // snap to the nearest road point at runtime (default true)
}

export type Step =
  | { kind: 'card'; title: string; subtitle?: string }
  | { kind: 'dialogue'; lines: Line[] }
  | { kind: 'goto'; id: string; at: Loc; label: string; hint?: string; timer?: number; failText?: string }
  | { kind: 'talk'; id: string; at: Loc; label: string; npc: { name: string; model: string }; lines: Line[]; hint?: string }
  | { kind: 'collect'; id: string; center: Loc; count: number; radius: number; timer: number; label: string; itemLabel: string; failText?: string }
  | { kind: 'deliver'; id: string; stops: { at: Loc; label: string }[]; timer: number; label: string; failText?: string }
  | { kind: 'effect'; delta: StatDelta; toast?: string }
  | { kind: 'wanted'; level: number }
  | { kind: 'spawnVehicle'; type: string; at: Loc; toast?: string }
  | { kind: 'teleport'; at: Loc }

export interface Chapter {
  id: string
  title: string
  subtitle: string
  steps: Step[]
}

export type Rank = 'Decacorn' | 'Unicorn' | 'Solid Exit' | 'Acquihire' | 'Zombie'

export interface Ending {
  valuation: number
  founderNetWorth: number
  rank: Rank
  blurb: string
}
