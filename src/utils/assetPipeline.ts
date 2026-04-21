import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let modelCache = new Map<string, THREE.Group>()

const KENNEY_BASE = 'https://cdn.jsdelivr.net/gh/kenneyNL/3d-models@main'
const loader = new GLTFLoader()

async function loadGLTF(url: string): Promise<THREE.Group> {
  if (modelCache.has(url)) {
    const clone = modelCache.get(url)!.clone()
    clone.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh as any
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m: any) => { m.castShadow = true; m.receiveShadow = true })
        }
      }
    })
    return clone
  }

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const group = gltf.scene
        group.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh
            mesh.castShadow = true
            mesh.receiveShadow = true
          }
        })
        modelCache.set(url, group)
        resolve(group.clone())
      },
      undefined,
      reject
    )
  })
}

// ─── Kenney Asset URLs ────────────────────────────────────────────────────────

// Vehicles
export async function loadKenneyCar(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/city/car.glb`)
}

export async function loadKenneySUV(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/city/suv.glb`)
}

export async function loadKenneyTruck(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/city/pickup.glb`)
}

export async function loadKenneySportsCar(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/city/sports_car.glb`)
}

export async function loadKenneyVan(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/city/van.glb`)
}

export async function loadKenneyBoat(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/boat/speedboat.glb`)
}

export async function loadKenneyPlane(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/vehicles/kit/airplane/small_plane.glb`)
}

// Characters & NPCs
export async function loadKenneyCharacter(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/people/kit/person_standing.glb`)
}

// Props
export async function loadKenneyTree(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/nature/kit/tree_conifer.glb`)
}

export async function loadKenneyBuilding(): Promise<THREE.Group> {
  return loadGLTF(`${KENNEY_BASE}/architecture/kit/building_apartment.glb`)
}

// ─── Model pool for efficient reuse ──────────────────────────────────────────
class ModelPool {
  private cache = new Map<string, { group: THREE.Group; refCount: number }>()
  private loading = new Map<string, Promise<THREE.Group>>()

  async get(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) {
      this.cache.get(url)!.refCount++
      return this.cache.get(url)!.group.clone()
    }
    if (this.loading.has(url)) {
      const model = await this.loading.get(url)!
      this.cache.get(url)!.refCount++
      return model.clone()
    }

    const promise = loadGLTF(url)
    this.loading.set(url, promise)
    const model = await promise
    this.loading.delete(url)
    this.cache.set(url, { group: model, refCount: 1 })
    return model.clone()
  }

  release(url: string) {
    if (this.cache.has(url)) {
      this.cache.get(url)!.refCount--
    }
  }
}

export const modelPool = new ModelPool()

// ─── Preload assets ───────────────────────────────────────────────────────────
export async function preloadKenneyAssets() {
  console.log('[AssetPipeline] Downloading Kenney 3D models...')
  try {
    await Promise.allSettled([
      loadKenneyCar(),
      loadKenneySUV(),
      loadKenneyTruck(),
      loadKenneySportsCar(),
      loadKenneyVan(),
      loadKenneyBoat(),
      loadKenneyPlane(),
      loadKenneyCharacter(),
      loadKenneyTree(),
    ])
    console.log('[AssetPipeline] Kenney models ready.')
  } catch (e) {
    console.warn('[AssetPipeline] Some Kenney models failed to load (may need VPN):', e)
  }
}

export function clearModelCache() {
  modelCache.forEach(g => g.traverse(c => {
    if ((c as THREE.Mesh).isMesh) {
      const mesh = c as THREE.Mesh
      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose())
      else mesh.material?.dispose()
    }
  }))
  modelCache.clear()
}