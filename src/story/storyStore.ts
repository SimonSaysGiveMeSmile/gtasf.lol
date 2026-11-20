// Story mode — state machine + persistence.
// Owns: which chapter/step is live, the player's stats, the open dialogue,
// timers, collectibles and the current waypoint. The runner (StoryRunner)
// feeds it proximity/interaction events; the UI (StoryUI) renders it.
import { create } from 'zustand'
import type { PathPoint } from '../game/landscape.types'
import { useGameStore } from '../game/store'
import { CHAPTERS, INITIAL_STATS } from './chapters'
import { snapToRoad } from './geo'
import type { Chapter, Choice, Ending, Line, Loc, StatDelta, Stats, Step } from './types'

const SAVE_KEY = 'foundersim.story.v1'
const STORY_MAP = 'downtown_sf'
const CARD_SECONDS = 3.2
const TOAST_SECONDS = 3.5

interface SaveData {
  chapter: number
  stats: Stats
  flags: Record<string, string | number | boolean>
  finished?: boolean
}

export interface Waypoint { x: number; z: number; label: string; color: string }
export interface CollectItem { x: number; z: number; taken: boolean }

interface StoryState {
  mode: 'free' | 'story'
  screen: 'title' | 'none' | 'ending'
  hasSave: boolean
  chapter: number
  step: number
  stats: Stats
  flags: Record<string, string | number | boolean>
  dialogue: { lines: Line[]; index: number } | null
  timer: { remaining: number; total: number } | null
  card: { title: string; subtitle?: string; remaining: number } | null
  toast: { text: string; remaining: number } | null
  collect: CollectItem[] | null
  deliverIdx: number
  waypoint: Waypoint | null
  talkTarget: { x: number; z: number; name: string; model: string } | null
  nearTalk: boolean
  ending: Ending | null
  // non-reactive helpers
  roadPaths: PathPoint[][]

  // lifecycle
  openTitle: () => void
  startNewStory: () => void
  continueStory: () => void
  freeRoam: () => void
  // runner hooks
  setRoadPaths: (paths: PathPoint[][]) => void
  tick: (dt: number) => void
  reachGoto: () => void
  reachDeliverStop: () => void
  takeCollectible: (i: number) => void
  setNearTalk: (near: boolean) => void
  beginTalk: () => void
  // dialogue
  nextLine: () => void
  choose: (i: number) => void
  // derived
  currentStep: () => Step | null
  currentChapter: () => Chapter | null
  companyName: () => string
  isPaused: () => boolean
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (typeof data.chapter !== 'number' || !data.stats) return null
    return data
  } catch {
    return null
  }
}

function writeSave(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch { /* private mode etc. */ }
}

function applyDelta(stats: Stats, d: StatDelta): Stats {
  const out = { ...stats }
  for (const k of Object.keys(d) as (keyof Stats)[]) {
    out[k] = (out[k] ?? 0) + (d[k] ?? 0)
  }
  out.hype = Math.max(0, Math.min(100, out.hype))
  out.equity = Math.max(0, Math.min(100, out.equity))
  out.team = Math.max(1, Math.round(out.team))
  return out
}

export function computeEnding(stats: Stats, flags: Record<string, unknown>): Ending {
  // ARR × a hype-driven multiple, plus half the cash on the balance sheet.
  const arr = stats.mrr * 12
  const multiple = 12 + stats.hype * 0.45
  let valuation = arr * multiple + stats.cash * 0.5
  if (flags.rival === 'bought') valuation *= 1.15
  if (flags.billboard === 'big') valuation *= 1.05
  valuation = Math.round(valuation / 1e6) * 1e6
  const founderNetWorth = Math.round((valuation * stats.equity) / 100)
  let rank: Ending['rank']
  let blurb: string
  if (valuation >= 10e9) { rank = 'Decacorn'; blurb = 'The stock opened up 80%. Someone named a sandwich after you.' }
  else if (valuation >= 1e9) { rank = 'Unicorn'; blurb = 'Ten figures. Priya bought the Jones Hotel and turned it into a hacker house.' }
  else if (valuation >= 200e6) { rank = 'Solid Exit'; blurb = 'Not a unicorn, but everyone on the team can buy a house. In Oakland.' }
  else if (valuation >= 40e6) { rank = 'Acquihire'; blurb = 'A larger company bought the team, kept the name, and sunset the product in 14 months.' }
  else { rank = 'Zombie'; blurb = 'Still alive. Still shipping. The dentist still pays $800 a month.' }
  return { valuation, founderNetWorth, rank, blurb }
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(abs >= 10e9 ? 0 : 1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 10e6 ? 0 : 1)}M`
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

let lastTick = typeof performance !== 'undefined' ? performance.now() : 0

const snapLoc = (loc: Loc, roads: PathPoint[][]) =>
  loc.snap === false ? { x: loc.x, z: loc.z } : snapToRoad(loc.x, loc.z, roads)

function teleportPlayer(x: number, z: number) {
  const g = useGameStore.getState()
  g.teleport([x, 0.5, z])
}

export const useStoryStore = create<StoryState>((set, get) => {
  // Enter a step: set up its runtime state. Steps that need no player input
  // (effect/wanted/spawn/teleport) resolve immediately and chain forward.
  function enterStep(chapterIdx: number, stepIdx: number) {
    const chapter = CHAPTERS[chapterIdx]
    if (!chapter) { finishStory(); return }
    if (stepIdx >= chapter.steps.length) {
      // Chapter done → save at the boundary and move on.
      const next = chapterIdx + 1
      if (next >= CHAPTERS.length) { finishStory(); return }
      const { stats, flags } = get()
      writeSave({ chapter: next, stats, flags })
      set({ hasSave: true })
      enterStep(next, 0)
      return
    }
    const step = chapter.steps[stepIdx]
    const roads = get().roadPaths
    const base = {
      chapter: chapterIdx,
      step: stepIdx,
      timer: null as StoryState['timer'],
      collect: null as StoryState['collect'],
      deliverIdx: 0,
      waypoint: null as Waypoint | null,
      talkTarget: null as StoryState['talkTarget'],
      nearTalk: false,
      dialogue: null as StoryState['dialogue'],
    }
    switch (step.kind) {
      case 'card':
        set({ ...base, card: { title: step.title, subtitle: step.subtitle, remaining: CARD_SECONDS } })
        return
      case 'dialogue':
        set({ ...base, dialogue: { lines: step.lines, index: 0 } })
        return
      case 'goto': {
        const p = snapLoc(step.at, roads)
        set({
          ...base,
          waypoint: { x: p.x, z: p.z, label: step.label, color: '#ffd166' },
          timer: step.timer ? { remaining: step.timer, total: step.timer } : null,
        })
        return
      }
      case 'talk': {
        const p = snapLoc(step.at, roads)
        set({
          ...base,
          waypoint: { x: p.x, z: p.z, label: step.label, color: '#7cc4ff' },
          talkTarget: { x: p.x, z: p.z, name: step.npc.name, model: step.npc.model },
        })
        return
      }
      case 'collect': {
        const c = snapLoc(step.center, roads)
        const items: CollectItem[] = []
        let seed = chapterIdx * 131 + stepIdx * 17 + 7
        const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
        let guard = 0
        while (items.length < step.count && guard++ < step.count * 12) {
          const ang = rnd() * Math.PI * 2
          const r = 25 + rnd() * (step.radius - 25)
          const raw = { x: c.x + Math.cos(ang) * r, z: c.z + Math.sin(ang) * r }
          const p = snapToRoad(raw.x, raw.z, roads, 60)
          if (items.some((it) => Math.hypot(it.x - p.x, it.z - p.z) < 12)) continue
          items.push({ x: p.x, z: p.z, taken: false })
        }
        set({
          ...base,
          collect: items,
          waypoint: { x: c.x, z: c.z, label: step.label, color: '#06d6a0' },
          timer: { remaining: step.timer, total: step.timer },
        })
        return
      }
      case 'deliver': {
        const first = snapLoc(step.stops[0].at, roads)
        set({
          ...base,
          deliverIdx: 0,
          waypoint: { x: first.x, z: first.z, label: step.stops[0].label, color: '#06d6a0' },
          timer: { remaining: step.timer, total: step.timer },
        })
        return
      }
      case 'effect': {
        const stats = applyDelta(get().stats, step.delta)
        set({ ...base, stats, toast: step.toast ? { text: step.toast, remaining: TOAST_SECONDS } : get().toast })
        enterStep(chapterIdx, stepIdx + 1)
        return
      }
      case 'wanted': {
        const g = useGameStore.getState()
        if (step.level <= 0) g.clearWanted()
        else { g.clearWanted(); g.addWanted(step.level) }
        set(base)
        enterStep(chapterIdx, stepIdx + 1)
        return
      }
      case 'spawnVehicle': {
        const p = snapLoc(step.at, roads)
        const g = useGameStore.getState()
        const pp = g.playerPosition
        // Put the car ~6 m from wherever the player actually is, so it's
        // visible immediately rather than across the block.
        const ang = Math.atan2(p.x - pp[0], p.z - pp[2])
        const x = pp[0] + Math.sin(ang) * 6
        const z = pp[2] + Math.cos(ang) * 6
        window.dispatchEvent(new CustomEvent('cheat-spawn', {
          detail: { id: `story-${chapterIdx}-${stepIdx}-${Date.now()}`, type: step.type, x, z, rotation: ang },
        }))
        set({ ...base, toast: step.toast ? { text: step.toast, remaining: TOAST_SECONDS } : get().toast })
        enterStep(chapterIdx, stepIdx + 1)
        return
      }
      case 'teleport': {
        const p = snapLoc(step.at, roads)
        teleportPlayer(p.x, p.z)
        set(base)
        enterStep(chapterIdx, stepIdx + 1)
        return
      }
    }
  }

  function advance() {
    const { chapter, step } = get()
    enterStep(chapter, step + 1)
  }

  function finishStory() {
    const { stats, flags } = get()
    const ending = computeEnding(stats, flags)
    writeSave({ chapter: 0, stats: INITIAL_STATS, flags: {}, finished: true })
    set({ screen: 'ending', ending, waypoint: null, timer: null, talkTarget: null, collect: null, dialogue: null })
  }

  function ensureStoryMap() {
    const g = useGameStore.getState()
    if (g.currentMapName !== STORY_MAP) {
      g.switchMap(STORY_MAP, [-27.2, 3, 168.4])
    }
    g.clearWanted()
    if (g.activeMission) g.cancelMission()
  }

  return {
    mode: 'free',
    screen: 'title',
    hasSave: !!loadSave() && !loadSave()?.finished,
    chapter: 0,
    step: -1,
    stats: INITIAL_STATS,
    flags: {},
    dialogue: null,
    timer: null,
    card: null,
    toast: null,
    collect: null,
    deliverIdx: 0,
    waypoint: null,
    talkTarget: null,
    nearTalk: false,
    ending: null,
    roadPaths: [],

    openTitle: () => set({ screen: 'title' }),

    startNewStory: () => {
      ensureStoryMap()
      set({ mode: 'story', screen: 'none', stats: INITIAL_STATS, flags: {}, ending: null, toast: null, card: null })
      enterStep(0, 0)
    },

    continueStory: () => {
      const save = loadSave()
      ensureStoryMap()
      if (!save || save.finished) { get().startNewStory(); return }
      set({ mode: 'story', screen: 'none', stats: save.stats, flags: save.flags ?? {}, ending: null, toast: null, card: null })
      enterStep(Math.min(save.chapter, CHAPTERS.length - 1), 0)
    },

    freeRoam: () => {
      useGameStore.getState().clearWanted()
      set({ mode: 'free', screen: 'none', waypoint: null, timer: null, talkTarget: null, collect: null, dialogue: null, card: null })
    },

    setRoadPaths: (paths) => {
      set({ roadPaths: paths })
      // If a step was entered before the road network was known (map switch
      // in flight), re-enter it so waypoints snap properly.
      const { mode, screen, chapter, step } = get()
      if (mode === 'story' && screen === 'none' && step >= 0) enterStep(chapter, step)
    },

    tick: (dt) => {
      const s = get()
      // Cards/toasts are UI pacing — run them on wall-clock time so a slow
      // frame rate doesn't stretch a 3 s card into 10 s. Gameplay timers keep
      // the clamped dt the caller passes.
      const now = performance.now()
      const wall = Math.min(1, (now - lastTick) / 1000)
      lastTick = now
      if (s.card) {
        const remaining = s.card.remaining - wall
        if (remaining <= 0) {
          set({ card: null })
          const step = s.currentStep()
          if (step?.kind === 'card') advance()
        } else {
          set({ card: { ...s.card, remaining } })
        }
      }
      if (s.toast) {
        const remaining = s.toast.remaining - wall
        set({ toast: remaining <= 0 ? null : { ...s.toast, remaining } })
      }
      if (s.timer && !s.isPaused()) {
        const remaining = s.timer.remaining - dt
        if (remaining <= 0) {
          const step = s.currentStep()
          const failText = step && 'failText' in step ? step.failText : undefined
          set({ toast: { text: failText ?? 'Out of time — try again.', remaining: TOAST_SECONDS + 1 } })
          enterStep(s.chapter, s.step)
        } else {
          set({ timer: { ...s.timer, remaining } })
        }
      }
    },

    reachGoto: () => {
      const step = get().currentStep()
      if (step?.kind !== 'goto') return
      set({ waypoint: null, timer: null })
      advance()
    },

    reachDeliverStop: () => {
      const s = get()
      const step = s.currentStep()
      if (step?.kind !== 'deliver') return
      const next = s.deliverIdx + 1
      if (next >= step.stops.length) {
        set({ waypoint: null, timer: null, toast: { text: 'All kits delivered!', remaining: TOAST_SECONDS } })
        advance()
        return
      }
      const p = snapLoc(step.stops[next].at, s.roadPaths)
      set({
        deliverIdx: next,
        waypoint: { x: p.x, z: p.z, label: step.stops[next].label, color: '#06d6a0' },
        toast: { text: `Delivered ${next}/${step.stops.length}`, remaining: 2 },
      })
    },

    takeCollectible: (i) => {
      const s = get()
      if (!s.collect || !s.collect[i] || s.collect[i].taken) return
      const items = s.collect.map((it, k) => (k === i ? { ...it, taken: true } : it))
      const left = items.filter((it) => !it.taken).length
      if (left === 0) {
        set({ collect: null, waypoint: null, timer: null, toast: { text: 'Every invite handed out!', remaining: TOAST_SECONDS } })
        advance()
      } else {
        set({ collect: items, toast: { text: `${left} invites left`, remaining: 1.2 } })
      }
    },

    setNearTalk: (near) => { if (get().nearTalk !== near) set({ nearTalk: near }) },

    beginTalk: () => {
      const s = get()
      const step = s.currentStep()
      if (step?.kind !== 'talk' || s.dialogue) return
      set({ dialogue: { lines: step.lines, index: 0 }, waypoint: null })
    },

    nextLine: () => {
      const s = get()
      if (!s.dialogue) return
      const line = s.dialogue.lines[s.dialogue.index]
      if (line?.choices?.length) return // must pick
      const index = s.dialogue.index + 1
      if (index >= s.dialogue.lines.length) {
        set({ dialogue: null, talkTarget: null, nearTalk: false })
        const step = s.currentStep()
        if (step?.kind === 'dialogue' || step?.kind === 'talk') advance()
      } else {
        set({ dialogue: { ...s.dialogue, index } })
      }
    },

    choose: (i) => {
      const s = get()
      if (!s.dialogue) return
      const line = s.dialogue.lines[s.dialogue.index]
      const choice: Choice | undefined = line?.choices?.[i]
      if (!choice) return
      const stats = choice.effect ? applyDelta(s.stats, choice.effect) : s.stats
      const flags = choice.flag ? { ...s.flags, [choice.flag]: choice.flagValue ?? true } : s.flags
      // Replace the choice line with the chosen answer, then (optionally) the reply.
      const lines = s.dialogue.lines.slice()
      lines[s.dialogue.index] = { speaker: line.speaker, text: choice.label }
      if (choice.reply) {
        lines.splice(s.dialogue.index + 1, 0, { speaker: choice.replySpeaker ?? nextSpeaker(lines, s.dialogue.index), text: choice.reply })
      }
      const index = s.dialogue.index + 1
      if (index >= lines.length) {
        set({ stats, flags, dialogue: null, talkTarget: null, nearTalk: false })
        const step = s.currentStep()
        if (step?.kind === 'dialogue' || step?.kind === 'talk') advance()
      } else {
        set({ stats, flags, dialogue: { lines, index } })
      }
    },

    currentStep: () => {
      const { chapter, step } = get()
      return CHAPTERS[chapter]?.steps[step] ?? null
    },
    currentChapter: () => CHAPTERS[get().chapter] ?? null,
    companyName: () => String(get().flags.company ?? 'the company'),
    isPaused: () => {
      const s = get()
      return !!s.dialogue || !!s.card || s.screen !== 'none' || useGameStore.getState().isLoading
    },
  }
})

// Reply speaker fallback: whoever spoke most recently who isn't "You".
function nextSpeaker(lines: Line[], idx: number): string {
  for (let i = idx - 1; i >= 0; i--) if (lines[i].speaker !== 'You') return lines[i].speaker
  for (let i = idx + 1; i < lines.length; i++) if (lines[i].speaker !== 'You') return lines[i].speaker
  return 'Priya'
}

// Text interpolation for dialogue/objective strings.
export function fmtStory(text: string): string {
  const s = useStoryStore.getState()
  return text
    .replace(/\{company\}/g, s.companyName())
    .replace(/\{cash\}/g, formatMoney(s.stats.cash))
}

// Dev/test hook — lets Playwright (and curious players) poke the campaign.
declare global { interface Window { __story?: typeof useStoryStore } }
if (typeof window !== 'undefined') window.__story = useStoryStore
