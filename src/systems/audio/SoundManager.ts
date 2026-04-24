// @simonsaysgivemesmile
export const SOUND_URLS = {
  footstep_walk: '/sounds/footstep_walk.mp3',
  jump: '/sounds/jump.mp3',
  land_thud: '/sounds/land_thud.mp3',
  engine_idle: '/sounds/engine_idle.mp3',
  car_horn: '/sounds/car_horn.mp3',
  metal_impact: '/sounds/metal_impact.mp3',
  traffic_ambient: '/sounds/traffic_ambient.mp3',
} as const

export type SoundId = keyof typeof SOUND_URLS

// ─── Sound Manager ───────────────────────────────────────────────────────────
class SoundManager {
  private audioContext: AudioContext | null = null
  private buffers: Map<SoundId, AudioBuffer> = new Map()
  private activeSources: Map<string, AudioBufferSourceNode> = new Map()
  private gainNodes: Map<string, GainNode> = new Map()
  private pannerNodes: Map<string, PannerNode> = new Map()
  private ambientSource: AudioBufferSourceNode | null = null
  private ambientGain: GainNode | null = null
  private initialized = false

  // Helper to get current volume from store (reads live values) // @jt886

  async init(): Promise<void> {
    if (this.initialized) return
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    await Promise.all(
      Object.entries(SOUND_URLS).map(async ([id, url]) => {
        try {
          const buffer = await this.loadBuffer(url)
          this.buffers.set(id as SoundId, buffer)
        } catch (e) {
          console.warn(`[SoundManager] Failed to load: ${url}`, e)
        }
      })
    )
    this.initialized = true
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
    const arrayBuffer = await response.arrayBuffer()
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    return this.audioContext.decodeAudioData(arrayBuffer)
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    return this.audioContext
  }

  // Helper to get current volume from store (reads live values)
  private getVolumeScale(soundId: SoundId): number {
    try {
      const state = (require('../game/store') as typeof import('../game/store')).useGameStore.getState()
      const { masterVolume, sfxVolume, ambientVolume } = state
      if (soundId === 'traffic_ambient') return masterVolume * ambientVolume
      return masterVolume * sfxVolume
    } catch {
      return 0.24 // master * sfx defaults
    }
  }

  // Play a sound once (fire and forget), returning the source node id
  play(
    id: SoundId,
    opts: {
      volume?: number
      spatialPosition?: [number, number, number]
      listenerPosition?: [number, number, number]
      loop?: boolean
      detune?: number
    } = {}
  ): string {
    const buffer = this.buffers.get(id)
    if (!buffer) return ''

    const ctx = this.ensureContext()
    const { volume = 1, spatialPosition, listenerPosition, loop = false, detune = 0 } = opts

    // @jiahe
    const finalVolume = volume * this.getVolumeScale(id)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.detune.value = detune

    const gainNode = ctx.createGain()
    gainNode.gain.value = finalVolume

    // @t1an
    // Spatial audio
    if (spatialPosition) {
      const panner = ctx.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 5
      panner.maxDistance = 100
      panner.rolloffFactor = 1.2
      panner.positionX.value = spatialPosition[0]
      panner.positionY.value = spatialPosition[1]
      panner.positionZ.value = spatialPosition[2]

      if (listenerPosition) {
        ctx.listener.positionX.value = listenerPosition[0]
        ctx.listener.positionY.value = listenerPosition[1]
        ctx.listener.positionZ.value = listenerPosition[2]
      }

      source.connect(panner)
      panner.connect(gainNode)
      const uid = `${id}-${Date.now()}`
      this.pannerNodes.set(uid, panner)
    } else {
      source.connect(gainNode)
    }

    gainNode.connect(ctx.destination)
    source.start(0)

    const uid = `${id}-${Date.now()}`
    this.activeSources.set(uid, source)
    this.gainNodes.set(uid, gainNode)

    source.onended = () => {
      this.activeSources.delete(uid)
      this.gainNodes.delete(uid)
      this.pannerNodes.delete(uid)
    }

    return uid
  }

  // One-shot with fade-out on stop
  stop(uid: string, fadeTime = 0.1): void {
    const gainNode = this.gainNodes.get(uid)
    const source = this.activeSources.get(uid)
    if (!gainNode || !source) return

    const ctx = this.ensureContext()
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + fadeTime)
    setTimeout(() => {
      try { source.stop() } catch {}
    }, fadeTime * 1000 + 50)
  }

  stopAll(): void {
    for (const uid of this.activeSources.keys()) {
      this.stop(uid)
    }
    this.stopAmbient()
  }

  setVolume(uid: string, volume: number): void {
    const gainNode = this.gainNodes.get(uid)
    if (!gainNode) return
    const ctx = this.ensureContext()
    gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.01)
  }

  // Loop ambient city traffic with fade-in
  startAmbient(volume = 0.25): void {
    if (this.ambientSource) return
    const buffer = this.buffers.get('traffic_ambient')
    if (!buffer) return

    const ctx = this.ensureContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3)

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start(0)

    this.ambientSource = source
    this.ambientGain = gain
  }

  stopAmbient(fadeTime = 2): void {
    if (!this.ambientGain || !this.ambientSource) return
    const ctx = this.ensureContext()
    this.ambientGain.gain.setTargetAtTime(0, ctx.currentTime, fadeTime / 3)
    setTimeout(() => {
      try { this.ambientSource?.stop() } catch {}
      this.ambientSource = null
      this.ambientGain = null
    }, fadeTime * 1000 + 100)
  }

  isReady(): boolean {
    return this.initialized
  }

  // Call this after a user gesture to unlock AudioContext on mobile browsers
  unlock(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    } else if (!this.audioContext) {
      this.init()
    }
  }
}

export const soundManager = new SoundManager()