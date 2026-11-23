// Procedural sound effects — every sound here is synthesised with WebAudio
// at play time (noise bursts, filtered oscillators, envelopes). No samples,
// so nothing is borrowed from anywhere and nothing needs downloading.
//
// Public surface: `sfx.<one-shot>()` for fire-and-forget sounds, plus three
// continuous voices (engine, siren, screech) with start/update/stop.
import { useGameStore } from '../../game/store'

type Vec2 = [number, number]

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

class Synth {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private unlocked = false

  // ── context ──────────────────────────────────────────────────────────
  private get(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      // Gentle limiter so stacked gunshots don't clip.
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -12
      comp.knee.value = 20
      comp.ratio.value = 6
      comp.attack.value = 0.002
      comp.release.value = 0.15
      this.master.connect(comp)
      comp.connect(this.ctx.destination)
      // 2 s of white noise, reused by every noise voice.
      const len = this.ctx.sampleRate * 2
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended' && this.unlocked) void this.ctx.resume()
    return this.ctx
  }

  /** Call from a user gesture (click / key / touch) to allow playback. */
  unlock() {
    this.unlocked = true
    const ctx = this.get()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  private sfxGain(): number {
    const s = useGameStore.getState()
    return s.masterVolume * s.sfxVolume
  }

  // Distance + stereo placement relative to the player / camera.
  private spatial(at?: Vec2): { gain: number; pan: number } {
    if (!at) return { gain: 1, pan: 0 }
    const s = useGameStore.getState()
    const px = s.playerPosition[0], pz = s.playerPosition[2]
    const dx = at[0] - px, dz = at[1] - pz
    const d = Math.hypot(dx, dz)
    const gain = 1 / (1 + (d / 18) * (d / 18))
    // Camera forward is (sin θ, cos θ); right is (−cos θ, sin θ).
    const th = s.playerRotation
    const rx = -Math.cos(th), rz = Math.sin(th)
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0
    return { gain, pan }
  }

  // Output chain for a one-shot: gain → (pan) → master. Returns the node to connect into.
  private out(volume: number, at?: Vec2): { node: AudioNode; g: GainNode } | null {
    const ctx = this.get()
    if (!ctx || !this.master) return null
    const sp = this.spatial(at)
    const v = volume * this.sfxGain() * sp.gain
    if (v < 0.003) return null
    const g = ctx.createGain()
    g.gain.value = v
    if (at && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner()
      p.pan.value = sp.pan
      g.connect(p)
      p.connect(this.master)
    } else {
      g.connect(this.master)
    }
    return { node: g, g }
  }

  private noise(ctx: AudioContext): AudioBufferSourceNode {
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    src.loopStart = Math.random() * 1.5
    src.loopEnd = src.loopStart + 0.5
    return src
  }

  // Noise burst through a (sweeping) filter with an exponential decay.
  private burst(opts: {
    volume: number; at?: Vec2; dur: number; type: BiquadFilterType
    f0: number; f1: number; q?: number; attack?: number
  }) {
    const ctx = this.get()
    const o = this.out(opts.volume, opts.at)
    if (!ctx || !o) return
    const t = ctx.currentTime
    const n = this.noise(ctx)
    const f = ctx.createBiquadFilter()
    f.type = opts.type
    f.Q.value = opts.q ?? 0.8
    f.frequency.setValueAtTime(opts.f0, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t + opts.dur)
    const env = ctx.createGain()
    const a = opts.attack ?? 0.002
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(1, t + a)
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)
    n.connect(f); f.connect(env); env.connect(o.node)
    n.start(t); n.stop(t + opts.dur + 0.05)
  }

  // Pitched tone with a frequency sweep and exponential decay.
  private tone(opts: {
    volume: number; at?: Vec2; dur: number; type: OscillatorType
    f0: number; f1: number; attack?: number; detune?: number
  }) {
    const ctx = this.get()
    const o = this.out(opts.volume, opts.at)
    if (!ctx || !o) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = opts.type
    osc.detune.value = opts.detune ?? 0
    osc.frequency.setValueAtTime(opts.f0, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t + opts.dur)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(1, t + (opts.attack ?? 0.003))
    env.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)
    osc.connect(env); env.connect(o.node)
    osc.start(t); osc.stop(t + opts.dur + 0.05)
  }

  // ── one-shots ────────────────────────────────────────────────────────
  footstep(run: boolean, at?: Vec2) {
    const f = 380 + Math.random() * 300
    this.burst({ volume: run ? 0.5 : 0.3, at, dur: run ? 0.07 : 0.055, type: 'bandpass', f0: f, f1: f * 0.6, q: 1.2 })
  }

  jump() {
    this.burst({ volume: 0.35, dur: 0.18, type: 'bandpass', f0: 500, f1: 1800, q: 1.5, attack: 0.04 })
  }

  land(fallDist: number) {
    const hard = fallDist > 4
    this.tone({ volume: hard ? 0.9 : 0.45, dur: hard ? 0.18 : 0.11, type: 'sine', f0: hard ? 110 : 90, f1: 35 })
    this.burst({ volume: hard ? 0.7 : 0.3, dur: hard ? 0.14 : 0.06, type: 'lowpass', f0: 1200, f1: 200 })
    if (hard) this.burst({ volume: 0.4, dur: 0.25, type: 'bandpass', f0: 2500, f1: 800, q: 2 })
  }

  punch(hit: boolean, at?: Vec2) {
    this.burst({ volume: hit ? 0.7 : 0.25, at, dur: hit ? 0.09 : 0.12, type: hit ? 'lowpass' : 'bandpass', f0: hit ? 900 : 1200, f1: hit ? 150 : 2500, q: 1 })
    if (hit) this.tone({ volume: 0.5, at, dur: 0.08, type: 'sine', f0: 140, f1: 50 })
  }

  /** Vehicle collision. severity 0..1. */
  impact(severity: number, at?: Vec2) {
    const s = clamp01(severity)
    this.tone({ volume: 0.5 + s * 0.6, at, dur: 0.12 + s * 0.15, type: 'sine', f0: 120, f1: 30 })
    this.burst({ volume: 0.4 + s * 0.6, at, dur: 0.15 + s * 0.3, type: 'lowpass', f0: 2500, f1: 120 })
    if (s > 0.25) {
      // metallic ring
      this.tone({ volume: s * 0.25, at, dur: 0.35 + s * 0.4, type: 'triangle', f0: 1900, f1: 1500, attack: 0.001 })
      this.tone({ volume: s * 0.2, at, dur: 0.3 + s * 0.4, type: 'triangle', f0: 2400, f1: 2100, attack: 0.001, detune: 7 })
    }
    if (s > 0.6) this.burst({ volume: 0.5, at, dur: 0.5, type: 'highpass', f0: 3000, f1: 6000, q: 0.5, attack: 0.01 })
  }

  horn(at?: Vec2, dur = 0.45) {
    const ctx = this.get()
    const o = this.out(0.55, at)
    if (!ctx || !o) return
    const t = ctx.currentTime
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = 1600; f.Q.value = 2
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(1, t + 0.02)
    env.gain.setValueAtTime(1, t + dur - 0.05)
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    f.connect(env); env.connect(o.node)
    for (const freq of [415, 495]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.connect(f)
      osc.start(t); osc.stop(t + dur + 0.05)
    }
  }

  shot(weapon: 'pistol' | 'smg' | 'shotgun' | 'rifle', at?: Vec2) {
    switch (weapon) {
      case 'pistol':
        this.burst({ volume: 0.9, at, dur: 0.16, type: 'lowpass', f0: 3500, f1: 250 })
        this.tone({ volume: 0.6, at, dur: 0.1, type: 'sine', f0: 180, f1: 45 })
        this.burst({ volume: 0.35, at, dur: 0.05, type: 'highpass', f0: 4000, f1: 8000 })
        break
      case 'smg':
        this.burst({ volume: 0.6, at, dur: 0.09, type: 'lowpass', f0: 3000, f1: 300 })
        this.tone({ volume: 0.4, at, dur: 0.06, type: 'sine', f0: 200, f1: 60 })
        break
      case 'shotgun':
        this.burst({ volume: 1.0, at, dur: 0.32, type: 'lowpass', f0: 2500, f1: 120, attack: 0.004 })
        this.tone({ volume: 0.9, at, dur: 0.2, type: 'sine', f0: 140, f1: 30 })
        this.burst({ volume: 0.3, at, dur: 0.4, type: 'bandpass', f0: 1200, f1: 400, q: 1, attack: 0.03 })
        break
      case 'rifle':
        this.burst({ volume: 0.85, at, dur: 0.2, type: 'lowpass', f0: 4500, f1: 300 })
        this.tone({ volume: 0.5, at, dur: 0.12, type: 'sine', f0: 220, f1: 50 })
        this.burst({ volume: 0.5, at, dur: 0.08, type: 'highpass', f0: 3000, f1: 9000 })
        break
    }
  }

  /** Bullet hitting a surface near `at`; occasionally whines off. */
  ricochet(at?: Vec2) {
    this.burst({ volume: 0.35, at, dur: 0.06, type: 'highpass', f0: 2500, f1: 5000 })
    if (Math.random() < 0.35) this.tone({ volume: 0.18, at, dur: 0.22, type: 'sine', f0: 2600, f1: 700, attack: 0.005 })
  }

  bodyHit(at?: Vec2) {
    this.burst({ volume: 0.5, at, dur: 0.08, type: 'lowpass', f0: 700, f1: 120 })
  }

  hitmarker() {
    this.tone({ volume: 0.18, dur: 0.05, type: 'square', f0: 1800, f1: 1400 })
  }

  pickup() {
    this.tone({ volume: 0.3, dur: 0.08, type: 'sine', f0: 880, f1: 880 })
    setTimeout(() => this.tone({ volume: 0.3, dur: 0.12, type: 'sine', f0: 1320, f1: 1320 }), 70)
  }

  weaponSwitch() {
    this.burst({ volume: 0.25, dur: 0.04, type: 'bandpass', f0: 1500, f1: 900, q: 3 })
    setTimeout(() => this.burst({ volume: 0.2, dur: 0.03, type: 'bandpass', f0: 2200, f1: 1500, q: 3 }), 60)
  }

  reload() {
    this.burst({ volume: 0.3, dur: 0.05, type: 'bandpass', f0: 1100, f1: 700, q: 2 })
    setTimeout(() => this.burst({ volume: 0.35, dur: 0.06, type: 'bandpass', f0: 1600, f1: 900, q: 2 }), 220)
  }

  wantedUp() {
    this.tone({ volume: 0.25, dur: 0.07, type: 'square', f0: 1200, f1: 1200 })
    setTimeout(() => this.tone({ volume: 0.25, dur: 0.1, type: 'square', f0: 1600, f1: 1600 }), 90)
  }

  explosion(at?: Vec2) {
    this.tone({ volume: 1.0, at, dur: 1.1, type: 'sine', f0: 70, f1: 22, attack: 0.01 })
    this.burst({ volume: 1.0, at, dur: 1.3, type: 'lowpass', f0: 1800, f1: 60, attack: 0.01 })
    this.burst({ volume: 0.5, at, dur: 0.5, type: 'bandpass', f0: 3000, f1: 500, q: 0.7, attack: 0.02 })
  }

  /** Wasted / Busted stinger: a descending minor chord. */
  stinger(kind: 'wasted' | 'busted') {
    const ctx = this.get()
    const o = this.out(0.5)
    if (!ctx || !o) return
    const t = ctx.currentTime
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(200, t + 1.4)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(1, t + 0.05)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
    f.connect(env); env.connect(o.node)
    const chord = kind === 'wasted' ? [110, 130.8, 164.8] : [98, 116.5, 146.8]
    for (const freq of chord) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.84, t + 1.4)
      osc.connect(f)
      osc.start(t); osc.stop(t + 1.6)
    }
  }

  // ── continuous voices ─────────────────────────────────────────────────
  readonly engine = new EngineVoice(() => this.get(), () => this.master, () => this.sfxGain(), () => this.noiseBuf)
  readonly siren = new SirenVoice(() => this.get(), () => this.master, () => this.sfxGain())
  readonly screech = new ScreechVoice(() => this.get(), () => this.master, () => this.sfxGain(), () => this.noiseBuf)
}

type Getters = {
  ctx: () => AudioContext | null
  master: () => GainNode | null
  vol: () => number
}

/** Car engine: saw + square fundamentals, exhaust noise, throttle-driven filter. */
class EngineVoice {
  private g: GainNode | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private filt: BiquadFilterNode | null = null
  private noiseG: GainNode | null = null
  private noiseSrc: AudioBufferSourceNode | null = null
  private kind: 'car' | 'sport' | 'truck' | 'scooter' = 'car'
  private ctx: Getters['ctx']
  private master: Getters['master']
  private vol: Getters['vol']
  private noise: () => AudioBuffer | null
  constructor(ctx: Getters['ctx'], master: Getters['master'], vol: Getters['vol'], noise: () => AudioBuffer | null) {
    this.ctx = ctx; this.master = master; this.vol = vol; this.noise = noise
  }

  get running() { return !!this.g }

  start(kind: 'car' | 'sport' | 'truck' | 'scooter' = 'car') {
    if (this.g) this.stop(0)
    const ctx = this.ctx(); const master = this.master(); const nb = this.noise()
    if (!ctx || !master || !nb) return
    this.kind = kind
    const t = ctx.currentTime
    this.g = ctx.createGain()
    this.g.gain.setValueAtTime(0.0001, t)
    this.g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.22 * this.vol()), t + 0.4)
    this.filt = ctx.createBiquadFilter()
    this.filt.type = 'lowpass'
    this.filt.frequency.value = 500
    this.filt.Q.value = 1.2
    this.filt.connect(this.g)
    this.g.connect(master)
    this.osc1 = ctx.createOscillator()
    this.osc1.type = 'sawtooth'
    this.osc2 = ctx.createOscillator()
    this.osc2.type = kind === 'scooter' ? 'square' : 'triangle'
    const g2 = ctx.createGain(); g2.gain.value = kind === 'truck' ? 0.6 : 0.35
    this.osc1.connect(this.filt)
    this.osc2.connect(g2); g2.connect(this.filt)
    this.noiseSrc = ctx.createBufferSource()
    this.noiseSrc.buffer = nb; this.noiseSrc.loop = true
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = kind === 'scooter' ? 2200 : 900; nf.Q.value = 0.7
    this.noiseG = ctx.createGain(); this.noiseG.gain.value = 0.05
    this.noiseSrc.connect(nf); nf.connect(this.noiseG); this.noiseG.connect(this.g)
    this.osc1.start(t); this.osc2.start(t); this.noiseSrc.start(t)
    this.update(0, 0)
  }

  /** rpm01: 0 idle → 1 redline; throttle01: pedal. */
  update(rpm01: number, throttle01: number) {
    const ctx = this.ctx()
    if (!ctx || !this.g || !this.osc1 || !this.osc2 || !this.filt || !this.noiseG) return
    const r = clamp01(rpm01), th = clamp01(throttle01)
    const t = ctx.currentTime
    const base = this.kind === 'scooter' ? 90 : this.kind === 'truck' ? 32 : this.kind === 'sport' ? 48 : 42
    const span = this.kind === 'scooter' ? 260 : this.kind === 'sport' ? 190 : 150
    const f = base + r * span
    this.osc1.frequency.setTargetAtTime(f, t, 0.06)
    this.osc2.frequency.setTargetAtTime(f * (this.kind === 'truck' ? 1.5 : 2.01), t, 0.06)
    this.filt.frequency.setTargetAtTime(350 + r * 1400 + th * 1200, t, 0.08)
    this.noiseG.gain.setTargetAtTime(0.03 + th * 0.18 + r * 0.08, t, 0.1)
    const v = (0.16 + r * 0.22 + th * 0.14) * this.vol()
    this.g.gain.setTargetAtTime(Math.max(0.0001, v), t, 0.1)
  }

  stop(fade = 0.35) {
    const ctx = this.ctx()
    const { g, osc1, osc2, noiseSrc } = this
    this.g = null; this.osc1 = null; this.osc2 = null; this.noiseSrc = null; this.filt = null; this.noiseG = null
    if (!ctx || !g) return
    const t = ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, fade))
    const stopAt = t + Math.max(0.02, fade) + 0.05
    try { osc1?.stop(stopAt); osc2?.stop(stopAt); noiseSrc?.stop(stopAt) } catch { /* already stopped */ }
  }
}

/** Police wail: two detuned oscillators swept by a slow LFO. */
class SirenVoice {
  private g: GainNode | null = null
  private nodes: AudioScheduledSourceNode[] = []
  private ctx: Getters['ctx']
  private master: Getters['master']
  private vol: Getters['vol']
  constructor(ctx: Getters['ctx'], master: Getters['master'], vol: Getters['vol']) {
    this.ctx = ctx; this.master = master; this.vol = vol
  }
  get running() { return !!this.g }

  start() {
    if (this.g) return
    const ctx = this.ctx(); const master = this.master()
    if (!ctx || !master) return
    const t = ctx.currentTime
    this.g = ctx.createGain()
    this.g.gain.setValueAtTime(0.0001, t)
    this.g.connect(master)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; f.connect(this.g)
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.55
    const lfoG = ctx.createGain(); lfoG.gain.value = 330
    lfo.connect(lfoG)
    for (const [type, det] of [['sawtooth', 0], ['square', 6]] as const) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = 980; o.detune.value = det
      lfoG.connect(o.frequency)
      const og = ctx.createGain(); og.gain.value = type === 'square' ? 0.25 : 0.6
      o.connect(og); og.connect(f)
      o.start(t); this.nodes.push(o)
    }
    lfo.start(t); this.nodes.push(lfo)
  }

  /** level 0..1 (nearest cruiser proximity). */
  update(level: number) {
    const ctx = this.ctx()
    if (!ctx || !this.g) return
    this.g.gain.setTargetAtTime(Math.max(0.0001, clamp01(level) * 0.35 * this.vol()), ctx.currentTime, 0.15)
  }

  stop() {
    const ctx = this.ctx(); const g = this.g; const nodes = this.nodes
    this.g = null; this.nodes = []
    if (!ctx || !g) return
    const t = ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    for (const n of nodes) { try { n.stop(t + 0.7) } catch { /* noop */ } }
  }
}

/** Tyre squeal: resonant bandpass noise with a wobbling centre frequency. */
class ScreechVoice {
  private g: GainNode | null = null
  private src: AudioBufferSourceNode | null = null
  private f: BiquadFilterNode | null = null
  private ctx: Getters['ctx']
  private master: Getters['master']
  private vol: Getters['vol']
  private noise: () => AudioBuffer | null
  constructor(ctx: Getters['ctx'], master: Getters['master'], vol: Getters['vol'], noise: () => AudioBuffer | null) {
    this.ctx = ctx; this.master = master; this.vol = vol; this.noise = noise
  }

  /** level 0 silences (and tears down after a while); 0..1 slip intensity. */
  set(level: number) {
    const ctx = this.ctx(); const master = this.master(); const nb = this.noise()
    if (!ctx || !master || !nb) return
    const l = clamp01(level)
    if (l <= 0.01) {
      if (this.g) {
        const g = this.g, src = this.src
        this.g = null; this.src = null; this.f = null
        const t = ctx.currentTime
        g.gain.cancelScheduledValues(t)
        g.gain.setTargetAtTime(0.0001, t, 0.08)
        try { src?.stop(t + 0.5) } catch { /* noop */ }
      }
      return
    }
    if (!this.g) {
      const t = ctx.currentTime
      this.g = ctx.createGain(); this.g.gain.setValueAtTime(0.0001, t); this.g.connect(master)
      this.f = ctx.createBiquadFilter(); this.f.type = 'bandpass'; this.f.Q.value = 9; this.f.frequency.value = 1900
      this.f.connect(this.g)
      this.src = ctx.createBufferSource(); this.src.buffer = nb; this.src.loop = true
      this.src.connect(this.f); this.src.start(t)
    }
    const t = ctx.currentTime
    this.f!.frequency.setTargetAtTime(1500 + l * 900 + Math.sin(t * 23) * 120, t, 0.03)
    this.g.gain.setTargetAtTime(Math.max(0.0001, l * 0.3 * this.vol()), t, 0.05)
  }
}

export const sfx = new Synth()

/** Virtual gearbox: map speed (km/h) → rpm 0..1 with gear-change dips. */
export function rpmFromSpeed(kmh: number, topKmh: number): number {
  const v = Math.abs(kmh)
  const gears = [0.1, 0.22, 0.38, 0.58, 0.82, 1.0].map((g) => g * Math.max(60, topKmh))
  let lo = 0
  for (const hi of gears) {
    if (v < hi || hi === gears[gears.length - 1]) {
      const t = Math.min(1, (v - lo) / Math.max(1, hi - lo))
      return 0.18 + t * 0.75
    }
    lo = hi
  }
  return 0.9
}
