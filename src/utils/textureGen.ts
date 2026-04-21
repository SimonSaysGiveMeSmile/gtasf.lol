import * as THREE from 'three'

let textureCache = new Map<string, THREE.CanvasTexture>()

// ─── Canvas texture factories ─────────────────────────────────────────────────

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return [canvas, canvas.getContext('2d')!]
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ─── Concrete / asphalt base ──────────────────────────────────────────────────
export function makeConcreteTexture(seed = 0): THREE.CanvasTexture {
  const key = `concrete_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  const base = `hsl(0, 0%, ${35 + seededRand(seed) * 15}%)`
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 512)

  // Pixel noise
  for (let i = 0; i < 8000; i++) {
    const x = seededRand(i * 3 + seed) * 512
    const y = seededRand(i * 7 + seed) * 512
    const v = seededRand(i * 13 + seed) * 40 - 20
    const lum = parseInt(base.match(/\d+/)?.[0] || '35', 10) + v
    ctx.fillStyle = `hsl(0, 0%, ${Math.max(0, Math.min(100, lum))}%)`
    ctx.fillRect(x, y, 2, 2)
  }

  // Cracks
  for (let c = 0; c < 4; c++) {
    ctx.beginPath()
    let cx = seededRand(c * 11 + seed) * 512
    let cy = seededRand(c * 17 + seed) * 512
    ctx.moveTo(cx, cy)
    for (let s = 0; s < 6; s++) {
      cx += seededRand(c * 23 + s + seed) * 80 - 40
      cy += seededRand(c * 31 + s + seed) * 80 - 40
      ctx.lineTo(cx, cy)
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.15 + seededRand(c * 41 + seed) * 0.2})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const tex = makeTexture(canvas)
  textureCache.set(key, tex)
  return tex
}

// ─── Brick wall ───────────────────────────────────────────────────────────────
export function makeBrickTexture(seed = 0): THREE.CanvasTexture {
  const key = `brick_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  const brickH = 32, brickW = 64, mortar = 4

  // Mortar base
  ctx.fillStyle = `hsl(30, 5%, ${45 + seededRand(seed) * 10}%)`
  ctx.fillRect(0, 0, 512, 512)

  // Bricks — seeded variation
  for (let row = 0; row * brickH < 512 + brickH; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2
    for (let col = -1; col * brickW < 512 + brickW; col++) {
      const bx = col * brickW + offset
      const by = row * brickH
      const hue = seededRand(row * 7 + col * 13 + seed) * 15
      const lum = 25 + seededRand(row * 11 + col * 17 + seed) * 20
      const sat = seededRand(row * 19 + col * 23 + seed) * 20 + 20
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`
      ctx.fillRect(bx + mortar / 2, by + mortar / 2, brickW - mortar, brickH - mortar)

      // Subtle shadow on bottom edge
      const shade = seededRand(row * 29 + col * 31 + seed) * 0.15
      ctx.fillStyle = `rgba(0,0,0,${shade})`
      ctx.fillRect(bx + mortar / 2, by + brickH - mortar, brickW - mortar, mortar)

      // Top highlight
      ctx.fillStyle = `rgba(255,255,255,${shade * 0.5})`
      ctx.fillRect(bx + mortar / 2, by + mortar / 2, brickW - mortar, mortar / 2)
    }
  }

  // Noise overlay
  for (let i = 0; i < 3000; i++) {
    const x = seededRand(i * 3 + seed) * 512
    const y = seededRand(i * 7 + seed) * 512
    const v = seededRand(i * 13 + seed) * 30 - 15
    ctx.fillStyle = `rgba(${128 + v},${128 + v},${128 + v},0.15)`
    ctx.fillRect(x, y, 2, 2)
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(2, 2)
  textureCache.set(key, tex)
  return tex
}

// ─── Asphalt road ─────────────────────────────────────────────────────────────
export function makeAsphaltTexture(seed = 0): THREE.CanvasTexture {
  const key = `asphalt_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, 512, 512)

  // Aggregate noise
  for (let i = 0; i < 12000; i++) {
    const x = seededRand(i * 3 + seed) * 512
    const y = seededRand(i * 7 + seed) * 512
    const v = seededRand(i * 13 + seed) * 40
    const size = seededRand(i * 17 + seed) < 0.7 ? 1 : 2
    ctx.fillStyle = `hsl(0, 0%, ${v}%)`
    ctx.fillRect(x, y, size, size)
  }

  // Subtle puddles / wet spots
  for (let p = 0; p < 5; p++) {
    const px = seededRand(p * 13 + seed) * 512
    const py = seededRand(p * 17 + seed) * 512
    const pr = 20 + seededRand(p * 23 + seed) * 60
    const grad = ctx.createRadialGradient(px, py, 0, px, py, pr)
    grad.addColorStop(0, 'rgba(40,60,80,0.3)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(4, 4)
  textureCache.set(key, tex)
  return tex
}

// ─── Grass / ground ───────────────────────────────────────────────────────────
export function makeGrassTexture(seed = 0): THREE.CanvasTexture {
  const key = `grass_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  ctx.fillStyle = '#1e3a1e'
  ctx.fillRect(0, 0, 512, 512)

  // Grass blades / patches
  for (let i = 0; i < 2000; i++) {
    const x = seededRand(i * 3 + seed) * 512
    const y = seededRand(i * 7 + seed) * 512
    const lum = 20 + seededRand(i * 13 + seed) * 25
    ctx.fillStyle = `hsl(${100 + seededRand(i * 17 + seed) * 30}, ${30 + seededRand(i * 19 + seed) * 30}%, ${lum}%)`
    const w = 1 + seededRand(i * 23 + seed) * 3
    const h = 2 + seededRand(i * 29 + seed) * 6
    ctx.fillRect(x, y, w, h)
  }

  // Dirt patches
  for (let i = 0; i < 30; i++) {
    const x = seededRand(i * 11 + seed) * 512
    const y = seededRand(i * 13 + seed) * 512
    const r = 10 + seededRand(i * 17 + seed) * 30
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(30, ${10 + seededRand(i * 19 + seed) * 20}%, ${15 + seededRand(i * 23 + seed) * 15}%)`
    ctx.fill()
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(8, 8)
  textureCache.set(key, tex)
  return tex
}

// ─── Bark / tree trunk ────────────────────────────────────────────────────────
export function makeBarkTexture(seed = 0): THREE.CanvasTexture {
  const key = `bark_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(256)
  ctx.fillStyle = '#2a1810'
  ctx.fillRect(0, 0, 256, 256)

  // Vertical grain lines
  for (let g = 0; g < 20; g++) {
    const gx = seededRand(g * 7 + seed) * 256
    const width = 1 + seededRand(g * 13 + seed) * 4
    const lum = 15 + seededRand(g * 17 + seed) * 20
    ctx.fillStyle = `rgba(${60 + lum}, ${40 + lum * 0.5}, ${20 + lum * 0.3}, 0.6)`
    ctx.fillRect(gx, 0, width, 256)
  }

  // Knots
  for (let k = 0; k < 5; k++) {
    const kx = seededRand(k * 11 + seed) * 256
    const ky = seededRand(k * 13 + seed) * 256
    ctx.beginPath()
    ctx.ellipse(kx, ky, 4 + seededRand(k * 17 + seed) * 8, 6 + seededRand(k * 19 + seed) * 10, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(10,5,0,${0.4 + seededRand(k * 23 + seed) * 0.3})`
    ctx.fill()
  }

  // Noise
  for (let i = 0; i < 2000; i++) {
    const x = seededRand(i * 3 + seed) * 256
    const y = seededRand(i * 7 + seed) * 256
    const v = seededRand(i * 13 + seed) * 30
    ctx.fillStyle = `rgba(${40 + v}, ${25 + v}, ${10 + v}, 0.3)`
    ctx.fillRect(x, y, 2, 2)
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(1, 4)
  textureCache.set(key, tex)
  return tex
}

// ─── Foliage / tree leaves ────────────────────────────────────────────────────
export function makeFoliageTexture(seed = 0): THREE.CanvasTexture {
  const key = `foliage_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(256)
  ctx.fillStyle = '#0a3a1a'
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 3000; i++) {
    const x = seededRand(i * 3 + seed) * 256
    const y = seededRand(i * 7 + seed) * 256
    const lum = 15 + seededRand(i * 13 + seed) * 30
    ctx.fillStyle = `hsl(${100 + seededRand(i * 17 + seed) * 40}, ${40 + seededRand(i * 19 + seed) * 30}%, ${lum}%)`
    const size = 2 + seededRand(i * 23 + seed) * 6
    ctx.fillRect(x, y, size, size)
  }

  // Lighter highlights
  for (let i = 0; i < 500; i++) {
    const x = seededRand(i * 11 + seed) * 256
    const y = seededRand(i * 13 + seed) * 256
    ctx.fillStyle = `rgba(180, 220, 100, ${seededRand(i * 17 + seed) * 0.4})`
    ctx.fillRect(x, y, 3, 3)
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(2, 2)
  textureCache.set(key, tex)
  return tex
}

// ─── Window glass (building) ──────────────────────────────────────────────────
export function makeWindowTexture(seed = 0, isLit = true): THREE.CanvasTexture {
  const key = `window_${seed}_${isLit}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(128)
  const baseHue = seededRand(seed * 7) * 60 + 180 // cyan to amber range
  const baseLum = isLit ? 40 + seededRand(seed) * 20 : 5
  const baseSat = isLit ? 50 + seededRand(seed * 3) * 30 : 10

  ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLum}%)`
  ctx.fillRect(0, 0, 128, 128)

  // Window frame
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, 124, 124)

  // Cross pane divider
  ctx.beginPath()
  ctx.moveTo(64, 2)
  ctx.lineTo(64, 126)
  ctx.moveTo(2, 64)
  ctx.lineTo(126, 64)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.stroke()

  // Reflection / glare
  if (isLit) {
    const grad = ctx.createLinearGradient(0, 0, 128, 128)
    grad.addColorStop(0, 'rgba(255,255,255,0.15)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  }

  const tex = makeTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  textureCache.set(key, tex)
  return tex
}

// ─── Vehicle paint / metal ────────────────────────────────────────────────────
export function makeVehiclePaintTexture(baseColor: string, seed = 0): THREE.CanvasTexture {
  const key = `vehicle_${baseColor}_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(256)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 256, 256)

  // Clear coat shimmer
  for (let i = 0; i < 500; i++) {
    const x = seededRand(i * 3 + seed) * 256
    const y = seededRand(i * 7 + seed) * 256
    ctx.fillStyle = `rgba(255,255,255,${seededRand(i * 13 + seed) * 0.08})`
    ctx.fillRect(x, y, 2, 2)
  }

  // Subtle swirl marks
  for (let s = 0; s < 3; s++) {
    ctx.beginPath()
    ctx.arc(
      seededRand(s * 17 + seed) * 256,
      seededRand(s * 19 + seed) * 256,
      20 + seededRand(s * 23 + seed) * 60,
      0, Math.PI * 2
    )
    ctx.strokeStyle = `rgba(255,255,255,0.02)`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const tex = makeTexture(canvas)
  textureCache.set(key, tex)
  return tex
}

// ─── Lane marking ─────────────────────────────────────────────────────────────
export function makeLaneMarkingTexture(seed = 0): THREE.CanvasTexture {
  const key = `lane_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  ctx.fillStyle = '#ffdd00'
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 2000; i++) {
    const x = seededRand(i * 3 + seed) * 512
    const y = seededRand(i * 7 + seed) * 512
    const v = seededRand(i * 13 + seed) * 20 - 10
    ctx.fillStyle = `rgba(${200 + v}, ${170 + v}, 0, 0.15)`
    ctx.fillRect(x, y, 2, 2)
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(8, 1)
  textureCache.set(key, tex)
  return tex
}

// ─── Water ────────────────────────────────────────────────────────────────────
export function makeWaterTexture(seed = 0): THREE.CanvasTexture {
  const key = `water_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(512)
  const baseHue = 200 + seededRand(seed) * 30
  ctx.fillStyle = `hsl(${baseHue}, 60%, 15%)`
  ctx.fillRect(0, 0, 512, 512)

  // Wave lines
  for (let w = 0; w < 30; w++) {
    const wy = seededRand(w * 7 + seed) * 512
    ctx.beginPath()
    ctx.moveTo(0, wy)
    for (let x = 0; x <= 512; x += 20) {
      const y = wy + Math.sin(x * 0.05 + w + seededRand(w * 11 + seed)) * 4
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `hsla(${baseHue}, 70%, ${30 + seededRand(w * 13 + seed) * 20}%, ${0.2 + seededRand(w * 17 + seed) * 0.3})`
    ctx.lineWidth = 1 + seededRand(w * 19 + seed) * 2
    ctx.stroke()
  }

  const tex = makeTexture(canvas)
  tex.repeat.set(4, 4)
  textureCache.set(key, tex)
  return tex
}

// ─── NPC clothing ─────────────────────────────────────────────────────────────
export function makeClothingTexture(baseColor: string, seed = 0): THREE.CanvasTexture {
  const key = `clothing_${baseColor}_${seed}`
  if (textureCache.has(key)) return textureCache.get(key)!

  const [canvas, ctx] = createCanvas(128)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 128, 128)

  // Fabric weave
  for (let y = 0; y < 128; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,0.03)`
    ctx.fillRect(0, y, 128, 1)
    ctx.fillStyle = `rgba(255,255,255,0.02)`
    ctx.fillRect(0, y + 1, 128, 1)
  }

  for (let x = 0; x < 128; x += 3) {
    ctx.fillStyle = `rgba(0,0,0,0.03)`
    ctx.fillRect(x, 0, 1, 128)
    ctx.fillStyle = `rgba(255,255,255,0.02)`
    ctx.fillRect(x + 1, 0, 1, 128)
  }

  const tex = makeTexture(canvas)
  textureCache.set(key, tex)
  return tex
}

// ─── Clear all cached textures ────────────────────────────────────────────────
export function clearTextureCache() {
  textureCache.forEach(t => t.dispose())
  textureCache.clear()
}