// Keyboard taps shorter than one frame are invisible to per-frame polling
// (drei's getKeys()), and at low frame rates a normal tap often is. Latch the
// keydown here; consumers treat it as "pressed" for 400 ms or until one of
// them acts on it.
let pressedAt = -Infinity
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyF' || e.code === 'KeyE') && !e.repeat) pressedAt = performance.now()
  })
}
export function interactLatched(): boolean {
  return performance.now() - pressedAt < 400
}
export function consumeInteract(): void {
  pressedAt = -Infinity
}
