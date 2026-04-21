import * as THREE from 'three'

let polyHavenCache = new Map<string, THREE.Texture>()

const POLY_HAVEN_2K = 'https://dl.polyhaven.org/file/ph-assets/Textures/png/2k'

// Load a texture from Poly Haven (or any direct PNG URL)
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

// ─── Poly Haven Textures ──────────────────────────────────────────────────────

// Concrete surfaces (sidewalks, plazas)
export async function getConcreteTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/concrete/abstract/concrete_abstract_1k_diffusion.png`)
}

// Cobblestone / paving
export async function getCobblestoneTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/coast_sand_and_rock/rough_rock_coast_1k/rough_rock_coast_1k_diffusion.png`)
}

// Asphalt (roads) — use a dark road texture
export async function getAsphaltTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/road/abstract/road_abstract_1k_diffusion.png`)
}

// Red brick wall
export async function getBrickTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/brick/abstract/brick_abstract_1k_diffusion.png`)
}

// Grass ground
export async function getGrassTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/grass/abstract/grass_abstract_1k_diffusion.png`)
}

// Wood planks (for park benches, fences)
export async function getWoodTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/wood/abstract/wood_abstract_1k_diffusion.png`)
}

// Metal / steel (for antennas, lamp posts)
export async function getMetalTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/metal/scratched/metal_scratched_1k_diffusion.png`)
}

// Water
export async function getWaterTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/water/sea_water/sea_water_1k_diffusion.png`)
}

// Window glass
export async function getWindowTexture(): Promise<THREE.Texture> {
  return loadTexture(`${POLY_HAVEN_2K}/glass/rough/glass_rough_1k_diffusion.png`)
}

// ─── Preloaded texture set ────────────────────────────────────────────────────
export interface TextureSet {
  diffuse: THREE.Texture
  roughness?: THREE.Texture
  normal?: THREE.Texture
  ao?: THREE.Texture
}

export async function loadPolyHavenTextureSet(
  category: string,
  variant: string,
  resolution: '1k' | '2k' = '1k'
): Promise<TextureSet> {
  const base = `https://dl.polyhaven.org/file/ph-assets/Textures/png/${resolution}/${category}`
  const url = `${base}/${variant}_${resolution}_diffusion.png`

  const diffuse = await loadTexture(url)

  // Try to load additional maps
  let roughness: THREE.Texture | undefined
  let normal: THREE.Texture | undefined
  let ao: THREE.Texture | undefined

  try {
    roughness = await loadTexture(`${base}/${variant}_${resolution}_rough.png`)
    normal = await loadTexture(`${base}/${variant}_${resolution}_nor_gl.png`)
    ao = await loadTexture(`${base}/${variant}_${resolution}_ao.png`)
  } catch {
    // Additional maps optional
  }

  return { diffuse, roughness, normal, ao }
}

// ─── Preload multiple textures ────────────────────────────────────────────────
const preloadPromises: Promise<THREE.Texture>[] = []

export function preloadPolyHavenTextures() {
  const urls = [
    `${POLY_HAVEN_2K}/concrete/abstract/concrete_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/road/abstract/road_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/brick/abstract/brick_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/grass/abstract/grass_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/wood/abstract/wood_abstract_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/water/sea_water/sea_water_1k_diffusion.png`,
    `${POLY_HAVEN_2K}/metal/scratched/metal_scratched_1k_diffusion.png`,
  ]
  for (const url of urls) {
    preloadPromises.push(loadTexture(url))
  }
  console.log(`[TexturePipeline] Preloading ${urls.length} Poly Haven textures...`)
}

export function clearPolyHavenCache() {
  polyHavenCache.forEach(t => t.dispose())
  polyHavenCache.clear()
}