/**
 * True when the visitor asks for reduced motion. Only the initial value of the theme's `stilled`
 * state: such a visitor starts with the painting still and can let it move from the menu, after
 * which everything moves as for anyone else. Calm behaviour follows `stilled` alone.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Runs `run` on the next frame (or soon, where there are no frames); returns a cancel function. */
export function nextFrame(run: () => void): () => void {
  if (typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(run)
    return () => window.cancelAnimationFrame(id)
  }
  const id = setTimeout(run, 16)
  return () => clearTimeout(id)
}
