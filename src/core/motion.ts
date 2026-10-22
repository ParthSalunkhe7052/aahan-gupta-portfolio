/** Shared motion helpers. */

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReducedMotion(): boolean {
  return query?.matches ?? false;
}

export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  if (!query) return () => {};
  const handler = (e: MediaQueryListEvent) => cb(e.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}

/** True when WebGL2 can be created (checked once). */
let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!c.getContext('webgl2');
  } catch {
    webgl = false;
  }
  return webgl;
}
