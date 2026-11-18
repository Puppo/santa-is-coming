/**
 * Detects mobile or coarse-pointer GPUs so textures, lighting, shadow maps, and
 * render passes stay well inside iOS Safari's WebGL memory and shader budget.
 */
export function isMobileGpuDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}
