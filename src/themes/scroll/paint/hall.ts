/* The halls: the experience gate at the top of the scroll and the contact pavilion at its end, and
 the ground in front of the pavilion. Port of hall() and ground() in paintScene
 the design mock-up. p.rand() is called in exactly the mock-up's order. */

import type { HallLayout, Rect } from '../layout/types'
import { curve, INK, RED, SLATE } from './pen'
import type { Pen } from './pen'
import { at, stones, stream, tiles, tree } from './elements'

/**
 * The experience gate (or tower when narrow) and the contact pavilion. Port of hall(root).
 * Its bays are the content's entries, so the building is laid out by the content. More than three
 * roles add storeys (layout.floors, top storey first); when wide and a storey has several bays, each
 * bay gets its own roof, the middle one of three a step higher, like a ceremonial gate.
 */
export function hall(p: Pen, layout: HallLayout): void {
  const floors = layout.floors
  const T = floors[0]?.r
  const G0 = floors[floors.length - 1]?.r
  if (!T || !G0) return
  const { wide, ja, u } = p
  const B = layout.bays
  const g = wide ? 44 : 30
  const cx = B.x + B.w / 2
  const eaveY = T.y - g * 1.55
  const HW = T.w / 2 + g * (wide ? 2.4 : 1.1)
  const s = g * (wide ? 0.66 : 0.72)
  const rows = wide ? 6 : 5
  const gate = wide && at(floors, 0).bays.length > 1
  if (!gate) {
    p.tint(SLATE, 0.12, 10, () => {
      p.ctx.moveTo(cx - HW, eaveY + s)
      p.ctx.lineTo(cx - HW * 0.55, eaveY - rows * s * 0.8)
      p.ctx.lineTo(cx + HW * 0.55, eaveY - rows * s * 0.8)
      p.ctx.lineTo(cx + HW, eaveY + s)
    })
  }
  // pines on either side of the ground floor
  const pines: [number, number][] = [
    [G0.x - g * 2.2, 120],
    [G0.x - g * 0.9, 150],
    [G0.x + G0.w + g * 1.2, 135],
    [G0.x + G0.w + g * 2.5, 100],
  ]
  for (const [tx, h] of pines) if (wide) tree(p, tx, G0.y + G0.h * 0.55, h * u, 0.75)
  if (!gate) tiles(p, cx, eaveY, HW, s, rows, g * (wide ? 2.1 : 1.3) * (ja ? 0.35 : 1), 0.92)

  /** A beam of 梁 from x1 to x2 at y, hh high. */
  const beam = (x1: number, x2: number, y: number, hh: number) => {
    const n = Math.max(2, Math.round((x2 - x1) / (hh * 2.3)))
    const cw = (x2 - x1) / n
    for (let i = 0; i < n; i++) {
      p.ink(ja ? INK : RED, (ja ? 0.68 : 0.8) + p.rand() * 0.15)
      p.glyph('梁', {
        x: x1 + (i + 0.5) * cw,
        y,
        w: cw * 0.96,
        h: hh,
        rot: 0,
        skew: (p.rand() - 0.5) * 0.15,
        bend: (p.rand() - 0.5) * 0.15,
        W: hh * 0.075,
      })
    }
  }
  /** A post of 柱 at x from y1 down to y2. */
  const post = (x: number, y1: number, y2: number) => {
    const n = Math.max(1, Math.round((y2 - y1) / (g * 2.1)))
    const chh = (y2 - y1) / n
    for (let i = 0; i < n; i++) {
      p.ink(ja ? INK : RED, (ja ? 0.7 : 0.82) + p.rand() * 0.15)
      p.glyph('柱', {
        x,
        y: y1 + (i + 0.5) * chh,
        w: g * 0.82,
        h: chh * 0.97,
        rot: 0,
        skew: (p.rand() - 0.5) * 0.06,
        bend: 0,
        W: g * 0.07,
      })
    }
  }

  floors.forEach((F, i) => {
    const r = F.r
    const bs = [...F.bays].sort((a, b) => a.x - b.x)
    const mid = wide && bs.length === 3 ? 1 : -1
    const up = g * 1.5
    if (wide && bs.length > 1) {
      // side roofs first; the middle roof sits a step higher and overlaps them, like a ceremonial gate
      const order = bs.map((_, j) => j).sort((a, b) => Number(a === mid) - Number(b === mid))
      for (const k of order) {
        const b = at(bs, k)
        const m = k === mid
        const ey = r.y - g * 1.5 - (m ? up : 0)
        const bx = b.x + b.w / 2
        const hw = b.w / 2 + g * (m ? 1.5 : 1.1)
        const s2 = s * (m ? 0.92 : 0.8)
        const rw = m ? 6 : 5
        p.tint(SLATE, 0.1, 8, () => {
          p.ctx.moveTo(bx - hw, ey + s2)
          p.ctx.lineTo(bx - hw * 0.5, ey - rw * s2 * 0.8)
          p.ctx.lineTo(bx + hw * 0.5, ey - rw * s2 * 0.8)
          p.ctx.lineTo(bx + hw, ey + s2)
        })
        tiles(p, bx, ey, hw, s2, rw, g * (m ? 1.8 : 1.35) * (ja ? 0.35 : 1), 0.92)
        if (m) beam(b.x - g * 0.4, b.x + b.w + g * 0.4, ey + g * 0.92, g * 0.8)
      }
    } else if (i) {
      // an upper storey under one roof: an eave between it and the storey above
      tiles(p, cx, r.y - g * 1.45, r.w / 2 + g * 1.9, s * 0.92, 3, g * 1.5 * (ja ? 0.35 : 1), 0.9)
    }
    beam(r.x, r.x + r.w, r.y - g * 0.62, g * 0.86)
    if (wide) {
      // a post between every two bays and at both ends; under the raised middle roof they start higher
      const xs = bs.map((b) => b.x - g / 2)
      const last = bs[bs.length - 1]
      if (last) xs.push(last.x + last.w + g / 2)
      xs.forEach((x, j) =>
        post(x, r.y - (mid > 0 && (j === mid || j === mid + 1) ? up * 0.92 : 0), r.y + r.h),
      )
    } else {
      post(B.x + g / 2, B.y, B.y + B.h)
      post(B.x + B.w - g / 2, B.y, B.y + B.h)
      // on a narrow screen the hall becomes a tower: an eave between every storey
      F.bays.slice(1).forEach((b) => {
        tiles(p, cx, b.y - g * 1.2, B.w / 2 + g * 0.7, s * 0.9, 2, g * 0.9, 0.9)
      })
    }
  })
  stones(p, G0.x - g * 1.2, G0.x + G0.w + g * 0.4, B.y + B.h + g * 0.42, g * 0.8, 0.9)
  stones(p, G0.x - g * 2.6, G0.x + G0.w + g * 1.6, B.y + B.h + g * 1.25, g * 1.0, 0.7)
}

/** The ground in front of the pavilion: rocks, a stream and tall pines. Port of ground(G). Sets scene.pond (and scene.water if unset). */
export function ground(p: Pen, G: Rect): void {
  const { ja, u } = p
  const course = curve(
    (
      [
        [0.02, 0.5],
        [0.14, 0.42],
        [0.26, 0.56],
        [0.38, 0.5],
        [0.5, 0.68],
        [0.6, 0.62],
      ] as const
    ).map(([fx, fy]): [number, number] => [G.x + fx * G.w, G.y + fy * G.h]),
    3,
  )
  stream(p, course, 26 * u, 50 * u, ja ? '波' : '水', ja ? 10 : 15)
  p.scene.pond = course
  if (!p.scene.water) p.scene.water = course
  stones(p, G.x - 10, G.x + G.w * 0.34, G.y + G.h * 0.78, 34 * u, 0.92)
  stones(p, G.x + G.w * 0.1, G.x + G.w * 0.62, G.y + G.h * 0.95, 28 * u, 0.7)
  stones(p, G.x + G.w * 0.62, G.x + G.w + 10, G.y + G.h * 0.86, 40 * u, 0.95)
  const pines: [number, number, number][] = [
    [0.7, 0.8, 150],
    [0.8, 0.84, 215],
    [0.9, 0.8, 170],
    [0.97, 0.86, 120],
  ]
  for (const [fx, fy, h] of pines) tree(p, G.x + fx * G.w, G.y + fy * G.h, h * u, 0.95, true)
}
