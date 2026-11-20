/* A governor for the motion layer: if the device cannot keep up, first halve the animation rate,
 then still the painting (the menu turns it back on). Port of the governor block in `frame`
 from the design mock-up. */

/** Nothing is judged in the first five seconds (the page is still settling). */
const GRACE = 5000
/** The average gap (ms) above which frames count as slow: at the full rate, and once halved. */
const SLOW_GAP = 60
const SLOWER_GAP = 95
/** The average gap (ms) under which frames count as fast. */
const FAST_GAP = 30
/** How long (ms) slow frames must last before acting, and fast ones before returning to full rate. */
const SLOW_FOR = 3500
const FAST_FOR = 5000
/** One gap counts at most this much (ms) towards the average (a stall is not a trend). */
const MAX_GAP = 400

export interface Governor {
  /** Feed every animation frame: now (ms) and the gap since the last frame (ms). Returns what to do. */
  frame(now: number, gap: number): 'ok' | 'slow' | 'fast' | 'still'
  readonly slow: boolean
  reset(now: number): void
}

export function createGovernor(startedAt: number): Governor {
  let t0 = startedAt
  let avg = 16
  let slowFor = 0
  let fastFor = 0
  let slow = false
  return {
    frame(now, gap) {
      if (now - t0 <= GRACE) return 'ok'
      avg += (Math.min(MAX_GAP, gap) - avg) * 0.05
      slowFor = avg > (slow ? SLOWER_GAP : SLOW_GAP) ? slowFor + Math.min(MAX_GAP, gap) : 0
      fastFor = avg < FAST_GAP ? fastFor + Math.min(MAX_GAP, gap) : 0
      let out: 'ok' | 'slow' | 'fast' | 'still' = 'ok'
      if (slow && fastFor > FAST_FOR) {
        slow = false
        fastFor = 0
        out = 'fast'
      }
      if (slowFor > SLOW_FOR) {
        slowFor = 0
        if (!slow) {
          slow = true
          out = 'slow'
        } else {
          out = 'still'
        }
      }
      return out
    },
    get slow() {
      return slow
    },
    /** Starts judging afresh (a new grace period, no history); a halved rate stays halved. */
    reset(now) {
      t0 = now
      avg = 16
      slowFor = 0
      fastFor = 0
    },
  }
}
