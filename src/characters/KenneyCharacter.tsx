// Rigged, animated low-poly character (Kenney "Mini Characters", CC0).
// Each GLB ships one skinned mesh pair + a shared clip set: idle, walk,
// sprint, jump, fall, crouch, sit, drive, die, pick-up, emote-yes, emote-no.
// We clone per instance with SkeletonUtils so many NPCs can share one
// decoded asset, and scale so the model stands `height` metres tall with
// its feet on y=0.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF, useAnimations, useTexture } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

export const CHARACTER_MODELS = [
  'character-male-a', 'character-male-b', 'character-male-c', 'character-male-d',
  'character-male-e', 'character-male-f', 'character-male-g',
  'character-female-a', 'character-female-b', 'character-female-c', 'character-female-d',
  'character-female-e', 'character-female-f',
  'character-worker',
] as const
export type CharacterModel = (typeof CHARACTER_MODELS)[number] | string

export type CharacterAnim =
  | 'idle' | 'walk' | 'sprint' | 'jump' | 'fall' | 'crouch' | 'sit' | 'drive'
  | 'die' | 'pick-up' | 'emote-yes' | 'emote-no' | 'static'

export const characterUrl = (model: string) => `/models/kenney/chars/${model}.glb`

// Kenney characters are authored facing +Z, which matches this game's
// "forward = (sin θ, cos θ)" convention, so no yaw correction is needed.
const MODEL_YAW = 0

interface Props {
  model: CharacterModel
  anim: CharacterAnim
  height?: number
  /** Playback speed multiplier for the current clip. */
  timeScale?: number
  /** Optional body tint (multiplies the colormap). */
  tint?: string
}

const PALETTE_URL = '/models/kenney/chars/Textures/colormap.png'

export default function KenneyCharacter({ model, anim, height = 1.83, timeScale = 1, tint }: Props) {
  const gltf = useGLTF(characterUrl(model))
  const group = useRef<THREE.Group>(null)
  // Shared palette, assigned explicitly (see GLBVehicle for why).
  const palette = useTexture(PALETTE_URL)
  useMemo(() => {
    palette.flipY = false
    palette.colorSpace = THREE.SRGBColorSpace
    palette.needsUpdate = true
  }, [palette])

  const { scene, scale, yOffset } = useMemo(() => {
    const scene = SkeletonUtils.clone(gltf.scene) as THREE.Group
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = false
        m.receiveShadow = false
        m.frustumCulled = false // skinned bounds are unreliable; cheap to skip
        const base = m.material as THREE.MeshStandardMaterial
        if (base.isMeshStandardMaterial && base.map !== palette) {
          base.map = palette
          base.needsUpdate = true
        }
        if (tint) {
          const mat = base.clone()
          mat.color = new THREE.Color(tint)
          m.material = mat
        }
      }
    })
    // Measure the rest pose (before any animation) for scale + grounding.
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const h = Math.max(0.01, box.max.y - box.min.y)
    const scale = height / h
    return { scene, scale, yOffset: -box.min.y }
  }, [gltf.scene, height, tint, palette])

  const { actions, mixer } = useAnimations(gltf.animations, group)

  const current = useRef<THREE.AnimationAction | null>(null)
  useEffect(() => {
    const next = actions[anim] ?? actions['idle'] ?? null
    if (!next) return
    if (current.current === next) return
    if (anim === 'jump' || anim === 'die' || anim === 'pick-up') {
      next.setLoop(THREE.LoopOnce, 1)
      // eslint-disable-next-line react-hooks/immutability -- AnimationAction is a three.js object, configured in place by design
      next.clampWhenFinished = true
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity)
    }
    next.reset().fadeIn(0.18).play()
    if (current.current) current.current.fadeOut(0.18)
    current.current = next
  }, [actions, anim])

  useEffect(() => {
    if (current.current) current.current.timeScale = timeScale
  }, [timeScale, anim])

  useEffect(() => () => { mixer.stopAllAction() }, [mixer])

  return (
    <group ref={group} scale={scale} rotation={[0, MODEL_YAW, 0]}>
      <primitive object={scene} position={[0, yOffset, 0]} />
    </group>
  )
}

// Warm the cache for the models we spawn most.
for (const m of CHARACTER_MODELS) useGLTF.preload(characterUrl(m))
