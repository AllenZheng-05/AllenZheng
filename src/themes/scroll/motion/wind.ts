/* The pure helpers of the motion layer: one wind for the whole scroll, a stable hash for per-thing
 variety, a walk along a sampled path, and the easing of the house animation and the unroll. Port of
 the design mock-up. */

import type { PathPt } from '../paint/types'

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/** The mock-up's cubic in-out easing, t in 0..1. */
export const ease = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** A stable pseudo-random number in [0, 1) for the integer (or any number) i. */
export function hash(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * The wind at time t (s) at x (CSS px, default 0), 0..1: a slow breath with a gust now and then.
 * Gusts travel left to right at 700 px a second, so further right the wind lags behind.
 */
export function wind(t: number, x = 0): number {
  const s = t - x / 700
  return clamp(
    0.36 +
      0.2 * Math.sin(s * 0.37) +
      0.18 * Math.sin(s * 0.13 + 2) +
      0.3 * Math.pow(Math.max(0, Math.sin(s * 0.21 + 1)), 4),
    0,
    1,
  )
}

/** The point a fraction p (clamped to 0..1) of the way along a sampled path, interpolated. */
export function along(path: readonly PathPt[], p: number): PathPt {
  const first = path[0]
  if (!first) return { x: 0, y: 0, ang: 0 }
  if (path.length < 2) return { x: first.x, y: first.y, ang: first.ang }
  const f = clamp(p, 0, 1) * (path.length - 1)
  const i = Math.min(path.length - 2, Math.floor(f))
  const a = path[i] ?? first
  const b = path[i + 1] ?? a
  const k = f - i
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: a.ang || 0 }
}
