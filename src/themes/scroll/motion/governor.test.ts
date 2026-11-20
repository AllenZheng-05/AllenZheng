import { describe, expect, it } from 'vitest'
import { createGovernor, type Governor } from './governor'

type Verdict = ReturnType<Governor['frame']>

/** Feed frames `gap` ms apart from `from` for `ms`; returns every verdict that was not 'ok' and the time reached. */
function run(g: Governor, from: number, ms: number, gap: number): { out: Verdict[]; now: number } {
  const out: Verdict[] = []
  let now = from
  while (now < from + ms) {
    now += gap
    const v = g.frame(now, gap)
    if (v !== 'ok') out.push(v)
  }
  return { out, now }
}

describe('governor', () => {
  it('does nothing in the first five seconds, however slow', () => {
    const g = createGovernor(0)
    expect(run(g, 0, 4900, 300).out).toEqual([])
    expect(g.slow).toBe(false)
  })

  it('halves the rate once after gaps of 70 ms for 3.5 s, then stills after 100 ms gaps', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    expect(r.out).toEqual([])
    r = run(g, r.now, 8000, 70)
    expect(r.out).toEqual(['slow'])
    expect(g.slow).toBe(true)
    r = run(g, r.now, 8000, 100)
    expect(r.out).toContain('still')
    expect(r.out).not.toContain('slow')
  })

  it('does not still at 70 ms gaps once halved (the threshold is then 95 ms)', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    r = run(g, r.now, 8000, 70)
    expect(g.slow).toBe(true)
    r = run(g, r.now, 20000, 70)
    expect(r.out).toEqual([])
  })

  it('returns to the full rate after 5 s of fast frames', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    r = run(g, r.now, 8000, 70)
    expect(g.slow).toBe(true)
    r = run(g, r.now, 4000, 16)
    expect(r.out).toEqual([])
    r = run(g, r.now, 4000, 16)
    expect(r.out).toEqual(['fast'])
    expect(g.slow).toBe(false)
  })

  it('is not moved by a single long gap', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 6000, 16)
    expect(g.frame(r.now + 2000, 2000)).toBe('ok')
    r = run(g, r.now + 2000, 3000, 16)
    expect(r.out).toEqual([])
    expect(g.slow).toBe(false)
  })

  it('a long gap after steady frames (a hidden tab, a stall) does not make it slow', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    r = run(g, r.now, 20000, 50)
    expect(r.out).toEqual([])
    expect(g.frame(r.now + 60000, 60000)).not.toBe('slow')
    r = run(g, r.now + 60000, 8000, 50)
    expect(r.out).toEqual([])
    expect(g.slow).toBe(false)
  })

  it('sustained slowness still halves the rate', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    r = run(g, r.now, 10000, 70)
    expect(r.out).toEqual(['slow'])
  })

  it('reset starts a new grace period and forgets the slow frames', () => {
    const g = createGovernor(0)
    let r = run(g, 0, 5000, 16)
    r = run(g, r.now, 3000, 70)
    expect(r.out).toEqual([])
    g.reset(r.now)
    // within the new grace period nothing counts
    r = run(g, r.now, 4900, 300)
    expect(r.out).toEqual([])
    expect(g.slow).toBe(false)
  })
})
