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

// ─── Clear cache ───────────────────────────────────────────────────────────────
export function disposeTextureGen(): void {
  cache.forEach((t) => t.dispose())
  cache.clear()
}