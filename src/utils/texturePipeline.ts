// @t1an
import * as THREE from 'three'

let polyHavenCache = new Map<string, THREE.Texture>()

// ─── Poly Haven CDN ──────────────────────────────────────────────────────────
// These URLs fetch textures directly from Poly Haven's CDN.
// Poly Haven textures are CC0 — free for any use.
const POLY_HAVEN_BASE = 'https://dl.polyhaven.org/file/ph-assets/Textures/png/2k'

// ─── Texture loader with caching ──────────────────────────────────────────────
async function loadTexture(url: string): Promise<THREE.Texture> {
  if (polyHavenCache.has(url)) return polyHavenCache.get(url)!
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        polyHavenCache.set(url, tex)
        resolve(tex)
      },
      undefined,
      reject
    )
  })
}

// ─── Individual texture getters ────────────────────────────────────────────────
// Usage: const tex = await getConcreteTexture(); useTexture(tex)

export async function getConcreteTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/concrete/abstract/concrete_abstract_1k_diffusion.png`)
}

export async function getAsphaltTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/road/abstract/road_abstract_1k_diffusion.png`)
}

export async function getBrickTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/brick/abstract/brick_abstract_1k_diffusion.png`)
}

export async function getGrassTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/grass/abstract/grass_abstract_1k_diffusion.png`)
}

export async function getWoodTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/wood/abstract/wood_abstract_1k_diffusion.png`)
}

export async function getMetalTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/metal/scratched/metal_scratched_1k_diffusion.png`)
}

export async function getWaterTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_BASE}/water/sea_water/sea_water_1k_diffusion.png`)
}

// ─── Full PBR texture set ─────────────────────────────────────────────────────
export interface PBRSet {
  diffuse: THREE.Texture
  roughness?: THREE.Texture
  normal?: THREE.Texture
  ao?: THREE.Texture
  height?: THREE.Texture
}

export async function loadPBRSset(
  category: string,
  variant: string,
  resolution: '1k' | '2k' = '1k'
): Promise<PBRSet> {
  const base = `https://dl.polyhaven.org/file/ph-assets/Textures/png/${resolution}/${category}`

  const diffuse = await loadTexture(`${base}/${variant}_${resolution}_diffusion.png`)

  let roughness: THREE.Texture | undefined
  let normal: THREE.Texture | undefined
  let ao: THREE.Texture | undefined
  let height: THREE.Texture | undefined

  await Promise.allSettled([
    loadTexture(`${base}/${variant}_${resolution}_rough.png`).then((t) => { roughness = t }),
    loadTexture(`${base}/${variant}_${resolution}_nor_gl.png`).then((t) => { normal = t }),
    loadTexture(`${base}/${variant}_${resolution}_ao.png`).then((t) => { ao = t }),
    loadTexture(`${base}/${variant}_${resolution}_height.png`).then((t) => { height = t }),
  ])

  return { diffuse, roughness, normal, ao, height }
}

// ─── Preloader ────────────────────────────────────────────────────────────────
export function preloadPolyHavenTextures(): void {
  const urls = [
    `${POLY_HAVEN_BASE}/concrete/abstract/concrete_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_BASE}/road/abstract/road_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_BASE}/brick/abstract/brick_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_BASE}/grass/abstract/grass_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_BASE}/wood/abstract/wood_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_BASE}/water/sea_water/sea_water_1k_diffusion.png`,
  ]
  console.log(`[TexturePipeline] Preloading ${urls.length} Poly Haven textures...`)
  urls.forEach((url) => loadTexture(url).catch(() => { /* silent */ }))
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
export function disposeTexturePipeline(): void {
  polyHavenCache.forEach((t) => t.dispose())
  polyHavenCache.clear()
}