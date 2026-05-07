// GPU-instanced replacements for static world layers.
// Each layer collapses thousands of per-object meshes into 1-4 draw calls
// via InstancedMesh (static geometry, variable transform/color) or a single
// merged BufferGeometry (unique shapes baked into one buffer).
import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { mergeBufferGeometries } from 'three-stdlib'
import { useGameStore } from '../game/store'
import type { BuildingData, TreeData } from '../game/landscape.types'

// Scratch objects — reused across instance loops to avoid GC churn.
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

function compose(
  out: THREE.Matrix4,
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number
) {
  _e.set(rx, ry, rz, 'XYZ')
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(sx, sy, sz)
  out.compose(_p, _q, _s)
  return out
}

// ── Buildings ────────────────────────────────────────────────────────────
// Boxes → one InstancedMesh with per-instance color + scale.
// Footprints → one merged BufferGeometry with per-vertex color.
export function InstancedBuildings({ buildings }: { buildings: BuildingData[] }) {
  const isNight = useGameStore((s) => s.timeOfDay === 'night')

  const { boxes, mergedGeo } = useMemo(() => {
    const boxList: BuildingData[] = []
    const footGeos: THREE.BufferGeometry[] = []
    for (const b of buildings) {
      if (b.footprint && b.footprint.length >= 3) {
        const shape = new THREE.Shape()
        shape.moveTo(b.footprint[0].x, b.footprint[0].z)
        for (let i = 1; i < b.footprint.length; i++) {
          shape.lineTo(b.footprint[i].x, b.footprint[i].z)
        }
        shape.closePath()
        const g = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false })
        g.rotateX(-Math.PI / 2)
        const col = new THREE.Color(b.color || '#1a1a3a')
        const count = g.attributes.position.count
        const carr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          carr[i * 3] = col.r
          carr[i * 3 + 1] = col.g
          carr[i * 3 + 2] = col.b
        }
        g.setAttribute('color', new THREE.BufferAttribute(carr, 3))
        // ExtrudeGeometry has a `uv` attribute with non-matching vertex count
        // after some ops; strip it so merge succeeds.
        footGeos.push(g)
      } else {
        boxList.push(b)
      }
    }
    const merged = footGeos.length > 0 ? mergeBufferGeometries(footGeos, false) : null
    for (const g of footGeos) g.dispose()
    return { boxes: boxList, mergedGeo: merged }
  }, [buildings])

  const instRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = instRef.current
    if (!mesh) return
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      compose(_m, b.x, b.height / 2, b.z, 0, 0, 0, b.width, b.height, b.depth)
      mesh.setMatrixAt(i, _m)
      _c.set(b.color || '#1a1a3a')
      mesh.setColorAt(i, _c)
    }
    mesh.count = boxes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.frustumCulled = false
  }, [boxes])

  const emissive = isNight ? '#222244' : '#000000'
  const emissiveIntensity = isNight ? 0.3 : 0

  return (
    <>
      {boxes.length > 0 && (
        <instancedMesh
          ref={instRef}
          args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, boxes.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.1}
            roughness={0.8}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
      {mergedGeo && (
        <mesh geometry={mergedGeo} frustumCulled={false}>
          <meshStandardMaterial
            vertexColors
            metalness={0.1}
            roughness={0.8}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  )
}

// ── Trees ────────────────────────────────────────────────────────────────
// Each tree has 4 parts (trunk + 3 canopy cones). One InstancedMesh per part.
export function InstancedTrees({ trees }: { trees: TreeData[] }) {
  const n = trees.length
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const c1Ref = useRef<THREE.InstancedMesh>(null)
  const c2Ref = useRef<THREE.InstancedMesh>(null)
  const c3Ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!trunkRef.current || !c1Ref.current || !c2Ref.current || !c3Ref.current) return
    for (let i = 0; i < n; i++) {
      const t = trees[i]
      const heightMod = 0.8 + (i % 7) * 0.08
      const trunkHeight = 2.5 * heightMod
      const canopyRadius = 2.2 * heightMod
      const canopyHeight = 4.0 * heightMod
      // Trunk: cylinderGeometry unit base (r=1,r=1,h=1); scale to actual.
      compose(_m, t.x, trunkHeight / 2, t.z, 0, 0, 0, 1, trunkHeight, 1)
      trunkRef.current.setMatrixAt(i, _m)
      // Canopies (cones) — unit cone (r=1,h=1), scale to radius/height.
      compose(_m, t.x, trunkHeight + canopyHeight * 0.3, t.z, 0, 0, 0, canopyRadius, canopyHeight * 0.6, canopyRadius)
      c1Ref.current.setMatrixAt(i, _m)
      compose(_m, t.x, trunkHeight + canopyHeight * 0.7, t.z, 0, 0, 0, canopyRadius * 0.7, canopyHeight * 0.5, canopyRadius * 0.7)
      c2Ref.current.setMatrixAt(i, _m)
      compose(_m, t.x, trunkHeight + canopyHeight * 0.95, t.z, 0, 0, 0, canopyRadius * 0.4, canopyHeight * 0.3, canopyRadius * 0.4)
      c3Ref.current.setMatrixAt(i, _m)
    }
    for (const r of [trunkRef, c1Ref, c2Ref, c3Ref]) {
      r.current!.count = n
      r.current!.instanceMatrix.needsUpdate = true
      r.current!.frustumCulled = false
    }
  }, [trees, n])

  if (n === 0) return null
  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.25, 0.35, 1, 6]} />
        <meshStandardMaterial color="#4a3520" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={c1Ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#1a4a20" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={c2Ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#1a4a20" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={c3Ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, n]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color="#1a4a20" roughness={0.95} />
      </instancedMesh>
    </>
  )
}
