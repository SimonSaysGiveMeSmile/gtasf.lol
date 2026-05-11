// @t1an
// Global camera-shake pulse. Any gameplay system can call `pulseCameraShake`
// with an intensity 0–1; the active camera rig reads and decays `shakeIntensity`
// each frame and applies a small positional/rotational jitter on top of its
// own lerp. Kept outside Zustand because it fires many times per second and
// doesn't need re-renders.
let shakeIntensity = 0

export function pulseCameraShake(intensity: number) {
  shakeIntensity = Math.max(shakeIntensity, Math.min(1, intensity))
}

// Apply shake to a THREE.Camera. Call once per frame, after the camera's
// normal follow-lerp has run. Decays in place.
export function applyCameraShake(camera: { position: { x: number; y: number; z: number }; rotation: { z: number } }, dt: number) {
  if (shakeIntensity <= 0.001) {
    shakeIntensity = 0
    return
  }
  const amp = shakeIntensity * 0.35
  camera.position.x += (Math.random() - 0.5) * amp
  camera.position.y += (Math.random() - 0.5) * amp * 0.6
  camera.position.z += (Math.random() - 0.5) * amp
  camera.rotation.z += (Math.random() - 0.5) * shakeIntensity * 0.04
  shakeIntensity = Math.max(0, shakeIntensity - dt * 3.5)
}

export function getCameraShakeIntensity() {
  return shakeIntensity
}
