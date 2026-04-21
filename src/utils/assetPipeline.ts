import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let modelCache = new Map<string, THREE.Group>()

// ─── GLTF Loader ─────────────────────────────────────────────────────────────
const loader = new GLTFLoader()

async function loadGLTF(url: string): Promise<THREE.Group> {
  if (modelCache.has(url)) return modelCache.get(url)!.clone()

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const group = gltf.scene
        group.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh
            ;(mesh.material as THREE.Material).castShadow = true
            ;(mesh.material as THREE.Material).receiveShadow = true
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                ;(m as any).castShadow = true
                ;(m as any).receiveShadow = true
              })
            } else {
              ;(mesh.material as any).castShadow = true
              ;(mesh.material as any).receiveShadow = true
            }
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

// ─── Model pool with reference counting ──────────────────────────────────────
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
    try {
      const model = await promise
      this.loading.delete(url)
      this.cache.set(url, { group: model, refCount: 1 })
      return model.clone()
    } catch (e) {
      this.loading.delete(url)
      throw e
    }
  }

  release(url: string) {
    const entry = this.cache.get(url)
    if (entry) {
      entry.refCount--
      if (entry.refCount <= 0) {
        entry.group.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh
            mesh.geometry?.dispose()
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
            else mesh.material?.dispose()
          }
        })
        this.cache.delete(url)
      }
    }
  }

  has(url: string): boolean {
    return this.cache.has(url) || this.loading.has(url)
  }
}

export const modelPool = new ModelPool()

// ─── Model URLs (relative to /public/models/) ────────────────────────────────
// Place GLB files in /public/models/ and uncomment the URLs you have.
// The model pool will use these if available, falling back to procedural geometry otherwise.
export const KENNEY_MODEL_URLS = {
  // Vehicles
  car:     '/models/car.glb',
  suv:     '/models/suv.glb',
  truck:   '/models/pickup.glb',
  sports:  '/models/sports_car.glb',
  van:     '/models/van.glb',
  boat:    '/models/speedboat.glb',
  plane:   '/models/small_plane.glb',
  // Characters & props
  character:  '/models/person_standing.glb',
  tree:       '/models/tree_conifer.glb',
  treeOak:    '/models/tree_oak.glb',
  building:   '/models/building_apartment.glb',
  bench:      '/models/park_bench.glb',
  streetLamp: '/models/street_lamp.glb',
  trafficLight: '/models/traffic_light.glb',
  fence:      '/models/fence.glb',
  // Nature
  rock:       '/models/rock.glb',
  bush:       '/models/bush.glb',
}

// ─── Type → model URL mapping ─────────────────────────────────────────────────
export function getVehicleModelURL(type: string): string | null {
  const map: Record<string, string> = {
    cybertruck: KENNEY_MODEL_URLS.truck,
    modelS:     KENNEY_MODEL_URLS.car,
    sports:     KENNEY_MODEL_URLS.sports,
    suv:        KENNEY_MODEL_URLS.suv,
    sedan:      KENNEY_MODEL_URLS.car,
    plane:      KENNEY_MODEL_URLS.plane,
    boat:       KENNEY_MODEL_URLS.boat,
  }
  return map[type] ?? null
}

// ─── Preload assets ───────────────────────────────────────────────────────────
export async function preloadKenneyAssets(): Promise<void> {
  console.log('[AssetPipeline] Checking Kenney models in /public/models/...')

  const urls = Object.values(KENNEY_MODEL_URLS)
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const model = await modelPool.get(url)
        console.log(`[AssetPipeline] ✓ Loaded: ${url}`)
        return model
      } catch {
        console.warn(`[AssetPipeline] ✗ Not found: ${url}`)
        throw new Error(`Not found: ${url}`)
      }
    })
  )

  const loaded = results.filter((r) => r.status === 'fulfilled').length
  console.log(`[AssetPipeline] Loaded ${loaded}/${urls.length} Kenney models`)
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
export function disposeAssetPipeline() {
  modelCache.forEach((g) => g.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const mesh = c as THREE.Mesh
      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
      else mesh.material?.dispose()
    }
  }))
  modelCache.clear()
}