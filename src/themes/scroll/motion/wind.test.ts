import { describe, expect, it } from 'vitest'
import type { PathPt } from '../paint/types'
import { along, clamp, hash, wind } from './wind'

describe('clamp', () => {
  it('keeps a value within its bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('hash', () => {
  it('is in [0, 1) and the same every time', () => {
    for (let i = -50; i < 200; i++) {
      const v = hash(i)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(hash(i)).toBe(v)
    }
    expect(hash(1)).not.toBe(hash(2))
  })
})

describe('wind', () => {
  it('stays within 0..1 and is deterministic', () => {
    for (let t = 0; t < 600; t += 0.37) {
      const v = wind(t, (t * 13) % 1400)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      expect(wind(t, (t * 13) % 1400)).toBe(v)
    }
  })

  it('travels left to right: a gust reaches x = 700 one second after x = 0', () => {
    for (const t of [1, 7.5, 33, 120]) expect(wind(t, 700)).toBe(wind(t - 1, 0))
    expect(wind(3)).toBe(wind(3, 0))
  })

  it('changes over time', () => {
    const values = new Set([0, 5, 10, 20, 40].map((t) => wind(t)))
    expect(values.size).toBeGreaterThan(1)
  })
})

describe('along', () => {
  const path: PathPt[] = [
    { x: 0, y: 0, ang: 0.1 },
    { x: 10, y: 20, ang: 0.2 },
    { x: 30, y: 20, ang: 0.3 },
  ]

  it('starts at the first point and ends at the last', () => {
    expect(along(path, 0)).toEqual({ x: 0, y: 0, ang: 0.1 })
    expect(along(path, 1)).toEqual({ x: 30, y: 20, ang: 0.2 })
  })

  it('interpolates between samples', () => {
    expect(along(path, 0.25)).toEqual({ x: 5, y: 10, ang: 0.1 })
    expect(along(path, 0.5)).toEqual({ x: 10, y: 20, ang: 0.2 })
    expect(along(path, 0.75)).toEqual({ x: 20, y: 20, ang: 0.2 })
  })

  it('clamps outside 0..1', () => {
    expect(along(path, -2)).toEqual(along(path, 0))
    expect(along(path, 3)).toEqual(along(path, 1))
  })
})
