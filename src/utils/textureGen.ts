import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return [c, c.getContext('2d')!]
}

function tex(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function sr(seed: number): number {
  return Math.abs(Math.sin(seed * 9999 + 1) % 1) // @simonsaysgivemesmile
}

// ─── Ground ────────────────────────────────────────────────────────────────────
export function makeGrassTexture(seed = 0): THREE.CanvasTexture {
  const key = `grass_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#1e3a1e'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 2000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const lum = 20 + sr(i * 13 + seed) * 25
    ctx.fillStyle = `hsl(${100 + sr(i * 17 + seed) * 30},${30 + sr(i * 19 + seed) * 30}%,${lum}%)`
    ctx.fillRect(x, y, 1 + sr(i * 23 + seed) * 3, 2 + sr(i * 29 + seed) * 6)
  }
  for (let i = 0; i < 30; i++) {
    const x = sr(i * 11 + seed) * 512
    const y = sr(i * 13 + seed) * 512
    const r = 10 + sr(i * 17 + seed) * 30
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(30,${10 + sr(i * 19 + seed) * 20}%,${15 + sr(i * 23 + seed) * 15}%)`
    ctx.fill()
  }
  const t = tex(c, 8)
  cache.set(key, t)
  return t
}

// ─── Brick wall ────────────────────────────────────────────────────────────────
export function makeBrickTexture(seed = 0): THREE.CanvasTexture {
  const key = `brick_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  const bH = 32, bW = 64, m = 4
  ctx.fillStyle = `hsl(30,5%,${45 + sr(seed) * 10}%)`
  ctx.fillRect(0, 0, 512, 512)
  for (let row = 0; row * bH < 512 + bH; row++) {
    const off = row % 2 === 0 ? 0 : bW / 2
    for (let col = -1; col * bW < 512 + bW; col++) {
      const bx = col * bW + off
      const by = row * bH
      const hue = sr(row * 7 + col * 13 + seed) * 15
      const lum = 25 + sr(row * 11 + col * 17 + seed) * 20
      const sat = sr(row * 19 + col * 23 + seed) * 20 + 20
      ctx.fillStyle = `hsl(${hue},${sat}%,${lum}%)`
      ctx.fillRect(bx + m / 2, by + m / 2, bW - m, bH - m)
      const shade = sr(row * 29 + col * 31 + seed) * 0.15
      ctx.fillStyle = `rgba(0,0,0,${shade})`
      ctx.fillRect(bx + m / 2, by + bH - m, bW - m, m)
      ctx.fillStyle = `rgba(255,255,255,${shade * 0.5})`
      ctx.fillRect(bx + m / 2, by + m / 2, bW - m, m / 2)
    }
  }
  for (let i = 0; i < 3000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const v = sr(i * 13 + seed) * 30 - 15
    ctx.fillStyle = `rgba(${128 + v},${128 + v},${128 + v},0.15)`
    ctx.fillRect(x, y, 2, 2)
  }
  const t = tex(c, 2)
  cache.set(key, t)
  return t
}

// ─── Asphalt road ──────────────────────────────────────────────────────────────
export function makeAsphaltTexture(seed = 0): THREE.CanvasTexture {
  const key = `asphalt_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 12000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const v = sr(i * 13 + seed) * 40
    const sz = sr(i * 17 + seed) < 0.7 ? 1 : 2
    ctx.fillStyle = `hsl(0,0%,${v}%)`
    ctx.fillRect(x, y, sz, sz)
  }
  for (let p = 0; p < 5; p++) {
    const px = sr(p * 13 + seed) * 512
    const py = sr(p * 17 + seed) * 512
    const pr = 20 + sr(p * 23 + seed) * 60
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr)
    g.addColorStop(0, 'rgba(40,60,80,0.3)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }
  const t = tex(c, 4)
  cache.set(key, t)
  return t
}

// ─── Bark / tree trunk ─────────────────────────────────────────────────────────
export function makeBarkTexture(seed = 0): THREE.CanvasTexture {
  const key = `bark_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#2a1810'
  ctx.fillRect(0, 0, 256, 256)
  for (let g = 0; g < 20; g++) {
    const gx = sr(g * 7 + seed) * 256
    const w = 1 + sr(g * 13 + seed) * 4
    const lum = 15 + sr(g * 17 + seed) * 20
    ctx.fillStyle = `rgba(${60 + lum},${40 + lum * 0.5},${20 + lum * 0.3},0.6)`
    ctx.fillRect(gx, 0, w, 256)
  }
  for (let k = 0; k < 5; k++) {
    const kx = sr(k * 11 + seed) * 256
    const ky = sr(k * 13 + seed) * 256
    ctx.beginPath()
    ctx.ellipse(kx, ky, 4 + sr(k * 17 + seed) * 8, 6 + sr(k * 19 + seed) * 10, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(10,5,0,${0.4 + sr(k * 23 + seed) * 0.3})`
    ctx.fill()
  }
  for (let i = 0; i < 2000; i++) {
    const x = sr(i * 3 + seed) * 256
    const y = sr(i * 7 + seed) * 256
    const v = sr(i * 13 + seed) * 30
    ctx.fillStyle = `rgba(${40 + v},${25 + v},${10 + v},0.3)`
    ctx.fillRect(x, y, 2, 2)
  }
  const t = tex(c, 1)
  t.repeat.set(1, 4)
  cache.set(key, t)
  return t
}

// ─── Foliage / tree leaves ─────────────────────────────────────────────────────
export function makeFoliageTexture(seed = 0): THREE.CanvasTexture {
  const key = `foliage_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#0a3a1a'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 3000; i++) {
    const x = sr(i * 3 + seed) * 256
    const y = sr(i * 7 + seed) * 256
    const lum = 15 + sr(i * 13 + seed) * 30
    ctx.fillStyle = `hsl(${100 + sr(i * 17 + seed) * 40},${40 + sr(i * 19 + seed) * 30}%,${lum}%)`
    ctx.fillRect(x, y, 2 + sr(i * 23 + seed) * 6, 2 + sr(i * 29 + seed) * 6)
  }
  for (let i = 0; i < 500; i++) {
    const x = sr(i * 11 + seed) * 256
    const y = sr(i * 13 + seed) * 256
    ctx.fillStyle = `rgba(180,220,100,${sr(i * 17 + seed) * 0.4})`
    ctx.fillRect(x, y, 3, 3)
  }
  const t = tex(c, 2)
  cache.set(key, t)
  return t
}

// ─── Vehicle paint ─────────────────────────────────────────────────────────────
export function makeVehiclePaintTexture(baseColor: string, seed = 0): THREE.CanvasTexture {
  const key = `vehicle_${baseColor}_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(256)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 500; i++) {
    const x = sr(i * 3 + seed) * 256
    const y = sr(i * 7 + seed) * 256
    ctx.fillStyle = `rgba(255,255,255,${sr(i * 13 + seed) * 0.08})`
    ctx.fillRect(x, y, 2, 2)
  }
  for (let s = 0; s < 3; s++) {
    ctx.beginPath()
    ctx.arc(sr(s * 17 + seed) * 256, sr(s * 19 + seed) * 256, 20 + sr(s * 23 + seed) * 60, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  const t = tex(c, 1)
  cache.set(key, t)
  return t
}

// ─── Clothing fabric ───────────────────────────────────────────────────────────
export function makeClothingTexture(baseColor: string, seed = 0): THREE.CanvasTexture {
  const key = `clothing_${baseColor}_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(128)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.03)'
    ctx.fillRect(0, y, 128, 1)
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(0, y + 1, 128, 1)
  }
  for (let x = 0; x < 128; x += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.03)'
    ctx.fillRect(x, 0, 1, 128)
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fillRect(x + 1, 0, 1, 128)
  }
  const t = tex(c, 1)
  cache.set(key, t)
  return t
}

// ─── Water ─────────────────────────────────────────────────────────────────────
export function makeWaterTexture(seed = 0): THREE.CanvasTexture {
  const key = `water_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  const hue = 200 + sr(seed) * 30
  ctx.fillStyle = `hsl(${hue},60%,15%)`
  ctx.fillRect(0, 0, 512, 512)
  for (let w = 0; w < 30; w++) {
    const wy = sr(w * 7 + seed) * 512
    ctx.beginPath()
    ctx.moveTo(0, wy)
    for (let x = 0; x <= 512; x += 20) {
      ctx.lineTo(x, wy + Math.sin(x * 0.05 + w + sr(w * 11 + seed)) * 4)
    }
    ctx.strokeStyle = `hsla(${hue},70%,${30 + sr(w * 13 + seed) * 20}%,${0.2 + sr(w * 17 + seed) * 0.3})`
    ctx.lineWidth = 1 + sr(w * 19 + seed) * 2
    ctx.stroke()
  }
  const t = tex(c, 4)
  cache.set(key, t)
  return t
}

// ─── Concrete / sidewalk ───────────────────────────────────────────────────────
export function makeConcreteTexture(seed = 0): THREE.CanvasTexture {
  const key = `concrete_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  ctx.fillStyle = `hsl(0,0%,${35 + sr(seed) * 15}%)`
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 8000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const v = sr(i * 13 + seed) * 40 - 20
    const lum = 35 + sr(seed) * 15 + v
    ctx.fillStyle = `hsl(0,0%,${Math.max(0, Math.min(100, lum))}%)`
    ctx.fillRect(x, y, 2, 2)
  }
  for (let c2 = 0; c2 < 4; c2++) {
    ctx.beginPath()
    let cx = sr(c2 * 11 + seed) * 512
    let cy = sr(c2 * 17 + seed) * 512
    ctx.moveTo(cx, cy)
    for (let s = 0; s < 6; s++) {
      cx += sr(c2 * 23 + s + seed) * 80 - 40
      cy += sr(c2 * 31 + s + seed) * 80 - 40
      ctx.lineTo(cx, cy)
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.15 + sr(c2 * 41 + seed) * 0.2})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
  const t = tex(c, 4)
  cache.set(key, t)
  return t
}

// ─── Building facade ───────────────────────────────────────────────────────────
// One tile = 4 window bays × 4 floors. UVs on extruded footprints are in
// metres, so callers set repeat = 1 / FACADE_TILE_M to get 3.5 m bays/floors.
export const FACADE_TILE_M = 14
const FACADE_PX = 512
const BAY = FACADE_PX / 4

function facadeCells(seed: number, fn: (x: number, y: number, w: number, h: number, i: number) => void) {
  let i = 0
  for (let fy = 0; fy < 4; fy++) {
    for (let bx = 0; bx < 4; bx++) {
      const x = bx * BAY + 24
      const y = fy * BAY + 34
      fn(x, y, BAY - 48, BAY - 60, i + seed)
      i++
    }
  }
}

export function makeFacadeTexture(seed = 0): THREE.CanvasTexture {
  const key = `facade_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(FACADE_PX)
  // Wall — warm light stone with fine noise.
  ctx.fillStyle = '#d6d0c4'
  ctx.fillRect(0, 0, FACADE_PX, FACADE_PX)
  for (let i = 0; i < 9000; i++) {
    const x = sr(i * 3 + seed) * FACADE_PX
    const y = sr(i * 7 + seed) * FACADE_PX
    const v = sr(i * 13 + seed) * 36 - 18
    ctx.fillStyle = `rgba(${200 + v},${194 + v},${182 + v},0.5)`
    ctx.fillRect(x, y, 2, 2)
  }
  // Floor slabs / spandrels.
  for (let fy = 0; fy < 4; fy++) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.fillRect(0, fy * BAY, FACADE_PX, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(0, fy * BAY + 10, FACADE_PX, 3)
  }
  // Windows.
  facadeCells(seed, (x, y, w, h, i) => {
    // frame
    ctx.fillStyle = '#5c5a56'
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8)
    // glass — vertical gradient, slight per-window variance
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    const l = 0.85 + sr(i * 17) * 0.3
    g.addColorStop(0, `rgb(${Math.round(88 * l)},${Math.round(108 * l)},${Math.round(128 * l)})`)
    g.addColorStop(1, `rgb(${Math.round(42 * l)},${Math.round(54 * l)},${Math.round(68 * l)})`)
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    // mullions
    ctx.fillStyle = 'rgba(40,40,44,0.9)'
    ctx.fillRect(x + w / 2 - 1.5, y, 3, h)
    ctx.fillRect(x, y + h * 0.42, w, 3)
    // sky reflection highlight
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ctx.fillRect(x + 4, y + 3, w * 0.38, h * 0.3)
  })
  const t = tex(c, 1)
  t.repeat.set(1 / FACADE_TILE_M, 1 / FACADE_TILE_M)
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

// Lit windows for night — black except a random ~40% of windows glowing warm.
export function makeFacadeEmissiveTexture(seed = 0): THREE.CanvasTexture {
  const key = `facade_emissive_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(FACADE_PX)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, FACADE_PX, FACADE_PX)
  facadeCells(seed, (x, y, w, h, i) => {
    const r = sr(i * 29 + 3)
    if (r > 0.42) return
    const warm = sr(i * 31) > 0.3
    const a = 0.55 + sr(i * 37) * 0.45
    ctx.fillStyle = warm ? `rgba(255,214,150,${a})` : `rgba(190,215,255,${a})`
    ctx.fillRect(x, y, w, h)
    // some windows half-lit (blinds)
    if (sr(i * 41) > 0.6) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x, y, w, h * 0.5)
    }
  })
  const t = tex(c, 1)
  t.repeat.set(1 / FACADE_TILE_M, 1 / FACADE_TILE_M)
  cache.set(key, t)
  return t
}

// ─── Roof ──────────────────────────────────────────────────────────────────────
export const ROOF_TILE_M = 12
export function makeRoofTexture(seed = 0): THREE.CanvasTexture {
  const key = `roof_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#6f6e69'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 5000; i++) {
    const x = sr(i * 3 + seed) * 256
    const y = sr(i * 7 + seed) * 256
    const v = sr(i * 13 + seed) * 40 - 20
    ctx.fillStyle = `rgba(${110 + v},${110 + v},${104 + v},0.6)`
    ctx.fillRect(x, y, 2, 2)
  }
  // rooftop units + skylights
  for (let k = 0; k < 4; k++) {
    const x = 30 + sr(k * 11 + seed) * 170
    const y = 30 + sr(k * 17 + seed) * 170
    const w = 18 + sr(k * 19 + seed) * 30
    const h = 14 + sr(k * 23 + seed) * 24
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x + 3, y + 3, w, h)
    ctx.fillStyle = k % 2 ? '#8b8b86' : '#4f5d66'
    ctx.fillRect(x, y, w, h)
  }
  const t = tex(c, 1)
  t.repeat.set(1 / ROOF_TILE_M, 1 / ROOF_TILE_M)
  cache.set(key, t)
  return t
}

// ─── Road surface (metre-space UVs) ────────────────────────────────────────────
export function makeRoadTexture(seed = 0): THREE.CanvasTexture {
  const key = `road_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#3a3b40'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 16000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const v = 40 + sr(i * 13 + seed) * 50
    ctx.fillStyle = `rgba(${v},${v},${v + 4},0.55)`
    ctx.fillRect(x, y, sr(i * 17 + seed) < 0.75 ? 1 : 2, 1)
  }
  // oil / wear patches
  for (let p = 0; p < 6; p++) {
    const px = sr(p * 13 + seed) * 512
    const py = sr(p * 17 + seed) * 512
    const pr = 30 + sr(p * 23 + seed) * 90
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr)
    g.addColorStop(0, 'rgba(0,0,0,0.28)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }
  const t = tex(c, 1)
  t.repeat.set(1 / 10, 1 / 10)
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

// ─── City ground (between blocks) ──────────────────────────────────────────────
export function makeGroundTexture(seed = 0): THREE.CanvasTexture {
  const key = `ground_${seed}`
  if (cache.has(key)) return cache.get(key)!
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#8d8c85'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 14000; i++) {
    const x = sr(i * 3 + seed) * 512
    const y = sr(i * 7 + seed) * 512
    const v = sr(i * 13 + seed) * 50 - 25
    ctx.fillStyle = `rgba(${140 + v},${139 + v},${132 + v},0.6)`
    ctx.fillRect(x, y, 2, 2)
  }
  // paving joints
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 2
  for (let k = 0; k <= 512; k += 128) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(512, k); ctx.stroke()
  }
  const t = tex(c, 1)
  t.repeat.set(1 / 8, 1 / 8)
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

// ─── Clear cache ───────────────────────────────────────────────────────────────
export function disposeTextureGen(): void {
  cache.forEach((t) => t.dispose())
  cache.clear()
}