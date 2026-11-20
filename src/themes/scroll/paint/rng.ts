/**
 * Seeded random numbers in [0, 1). Port of the mock-up's `rng`, bit for bit (mulberry32).
 * The same seed always gives the same sequence, so the painting looks the same on every load.
 */
export function rng(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
