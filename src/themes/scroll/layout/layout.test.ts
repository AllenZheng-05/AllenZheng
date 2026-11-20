import { describe, expect, it } from 'vitest'
import { roadLayout, roadPlan } from './road'
import { gateStoreys } from './storeys'

describe('gateStoreys', () => {
  it('puts the short row on top', () => {
    expect(gateStoreys(0)).toEqual([])
    expect(gateStoreys(1)).toEqual([1])
    expect(gateStoreys(3)).toEqual([3])
    expect(gateStoreys(4)).toEqual([1, 3])
    expect(gateStoreys(5)).toEqual([2, 3])
    expect(gateStoreys(6)).toEqual([3, 3])
    expect(gateStoreys(7)).toEqual([1, 3, 3])
  })
})

describe('roadPlan', () => {
  it('lays out wide rows', () => {
    const plan = roadPlan(1000, 8, true)
    expect(plan.per).toBe(4)
    expect(plan.rows).toBe(2)
    expect(plan.rowH).toBe(334)
    expect(plan.step).toBe(180)
    expect(plan.height).toBe(334 + 150 + 96)
  })

  it('clamps stops per row', () => {
    expect(roadPlan(500, 8, true).per).toBe(2)
    expect(roadPlan(3000, 8, true).per).toBe(5)
  })

  it('uses one stop per row when narrow', () => {
    const plan = roadPlan(360, 5, false)
    expect(plan.per).toBe(1)
    expect(plan.rows).toBe(5)
    expect(plan.height).toBe(4 * 180 + 150 + 50)
  })
})

describe('roadLayout', () => {
  it('snakes back and forth when wide', () => {
    const w = 1000
    const layout = roadLayout(w, Array<number>(8).fill(150), 150)
    const { per, rowH } = layout.plan
    expect(layout.wide).toBe(true)
    expect(layout.pts).toHaveLength(8)
    expect(layout.stops).toHaveLength(8)
    expect(layout.pts[0]?.[0]).toBeGreaterThan(w / 2)
    const row0 = layout.pts.slice(0, per).map((p) => p[0])
    const row1 = layout.pts.slice(per).map((p) => p[0])
    expect([...row0].sort((a, b) => b - a)).toEqual(row0)
    expect([...row1].sort((a, b) => a - b)).toEqual(row1)
    expect(layout.pts[per]?.[1]).toBe(56 + rowH)
    expect(layout.line[0]).toEqual([w + 20, 22])
    expect(layout.stops[0]).toEqual({
      left: layout.pts[0]?.[0],
      top: (layout.pts[0]?.[1] ?? 0) + 30,
      centred: true,
    })
    expect(layout.height).toBe(layout.plan.height)
    // path: start, 8 stops, 3 turn points, tail
    expect(layout.line).toHaveLength(1 + 8 + 3 + 1)
  })

  it('stacks stops when narrow', () => {
    const heights = [100, 120, 140]
    const layout = roadLayout(360, heights, 140)
    expect(layout.wide).toBe(false)
    expect(layout.pts.map((p) => p[1])).toEqual([34, 34 + 136, 34 + 136 + 156])
    expect(layout.pts.every((p) => p[0] === 336)).toBe(true)
    expect(layout.height).toBe(30 + 136 + 156 + 176)
    expect(layout.line[0]).toEqual([336, -10])
    expect(layout.line.at(-1)).toEqual([336, layout.height])
    expect(layout.stops[1]).toEqual({ left: 0, top: 34 + 136 - 20, centred: false })
  })

  it('does not throw for none or one stop', () => {
    for (const w of [360, 1000]) {
      const none = roadLayout(w, [], 150)
      expect(none.pts).toEqual([])
      expect(none.line).toEqual([])
      expect(none.stops).toEqual([])
      const one = roadLayout(w, [150], 150)
      expect(one.pts).toHaveLength(1)
      expect(one.stops).toHaveLength(1)
      expect(one.line.length).toBeGreaterThanOrEqual(3)
    }
  })
})
