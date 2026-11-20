/* The four painted bands of the scroll: the peaks over the experience gate, the village of
 projects, the hackathon road and the closing pavilion by the river. Port of BAND in paintScene
 the design mock-up. The caller measures the page into the layout objects (CSS px
 relative to the band's top-left corner); nothing here touches the DOM. p.rand() is called in
 exactly the mock-up's order. */

import type { EndLayout, Rect, RoadBandLayout, TopLayout, WorksLayout } from '../layout/types'
import { BLUE, curve, EARTH, INDIGO, INK, LEAF, RED, SLATE } from './pen'
import type { Pen } from './pen'
import { at, cloudRow, clouds, range, reeds, river, stream, torii, tree } from './elements'
import { ground, hall } from './hall'

/** Japanese art at the top of the scroll: one peak over a sea of waves, a torii standing in the water. */
function jaTop(p: Pen, P: Rect, span: { lo: number; hi: number }): void {
  const { wide, u } = p
  const k = wide ? 1 : 1.25
  const tx = P.x + P.w * 0.84
  const th = P.h * 0.3
  const base = P.y + P.h * (wide ? 1.04 : 0.93)
  p.tint(INDIGO, 0.14, 34, () => {
    p.ctx.moveTo(P.x, P.y + P.h * 0.78)
    p.ctx.lineTo(P.x + P.w * 0.4, P.y + P.h * 0.06)
    p.ctx.lineTo(P.x + P.w * 0.8, P.y + P.h * 0.78)
  })
  range(
    p,
    P,
    [
      [-0.04, 0.8],
      [0.08, 0.68],
      [0.2, 0.46],
      [0.29, 0.25],
      [0.36, 0.1],
      [0.4, 0.07],
      [0.44, 0.1],
      [0.51, 0.25],
      [0.6, 0.46],
      [0.72, 0.68],
      [0.84, 0.8],
    ],
    {
      col: INDIGO,
      a: 0.84,
      size: 17,
      rows: 9,
      fade: 0.8,
      chars: ['山'],
      inner: ['山', '山', '石'],
    },
  )
  clouds(p, P.x + P.w * 0, P.y + P.h * 0.58, wide ? 4 : 2, 24 * u, 0.5, span)
  clouds(p, P.x + P.w * 0.62, P.y + P.h * 0.45, wide ? 4 : 2, 20 * u, 0.42, span)
  // rows of waves (波), bigger and darker towards the front; live, each wave is a bobbing sprite
  const y0 = P.y + P.h * (wide ? 0.83 : 0.79)
  for (let r = 0; r < (wide ? 5 : 2); r++) {
    const y = y0 + r * P.h * 0.062 + 6 * u
    const z = (17 + r * 6) * u * k
    const vs = p.live
      ? [0, 1, 2].map(() =>
          p.sprite(z * 2.2, z * 1.6, () => {
            p.ink(INDIGO, 0.3 + r * 0.13)
            p.glyph('波', {
              x: z * 1.1,
              y: z * 0.8,
              w: z * 1.7,
              h: z * 1.05,
              skew: (p.rand() - 0.5) * 0.4,
              bend: 0.2 + p.rand() * 0.4,
              W: z * 0.1,
            })
          }),
        )
      : null
    if (r === 1) {
      p.scene.water = [
        { x: P.x + 10, y: y - z * 0.9, ang: 0 },
        { x: tx - th * 0.7, y: y - z * 0.9, ang: 0 },
      ]
    }
    for (let x = P.x - z * 0.4 + (r % 2) * z * 0.9; x < P.x + P.w * 1.02; x += z * 1.75) {
      // leave the water clear round the torii
      if (Math.abs(x - tx) < th * 0.5) continue
      if (p.live) {
        if (vs) {
          p.scene.actors.push({
            k: 'bob',
            spr: at(vs, (p.rand() * 3) | 0),
            x: x + (p.rand() - 0.5) * z * 0.3 - z * 1.1,
            y: y - z * 0.8,
            y0: y,
            w: z * 2.2,
            h: z * 1.6,
            row: r,
            amp: 1.6 + r * 1.1,
          })
        }
        continue
      }
      p.ink(INDIGO, 0.3 + r * 0.13)
      p.glyph('波', {
        x: x + (p.rand() - 0.5) * z * 0.3,
        y: y + Math.sin(x / (z * 2.2) + r) * z * 0.22,
        w: z * 1.7,
        h: z * 1.05,
        rot: Math.cos(x / (z * 2.2) + r) * 0.16,
        skew: (p.rand() - 0.5) * 0.4,
        bend: 0.2 + p.rand() * 0.4,
        W: z * 0.1,
      })
    }
  }
  torii(p, tx, base, th, RED, 0.92)
}

/** Chinese art at the top of the scroll: blue far ranges, a cloud bank, dark near hills. */
function zhTop(p: Pen, P: Rect, span: { lo: number; hi: number }): void {
  p.tint(BLUE, 0.14, 34, () => {
    p.ctx.moveTo(P.x, P.y + P.h * 0.8)
    p.ctx.lineTo(P.x + P.w * 0.38, P.y + P.h * 0.08)
    p.ctx.lineTo(P.x + P.w, P.y + P.h * 0.8)
  })
  range(
    p,
    P,
    [
      [0, 0.62],
      [0.1, 0.5],
      [0.18, 0.54],
      [0.28, 0.3],
      [0.36, 0.1],
      [0.43, 0.22],
      [0.5, 0.16],
      [0.58, 0.34],
      [0.68, 0.46],
      [0.8, 0.5],
      [0.92, 0.6],
      [1, 0.66],
    ],
    { col: BLUE, a: 0.78, size: 17, rows: 9, fade: 0.86, chars: ['山'], inner: ['山', '山', '石'] },
  )
  range(
    p,
    P,
    [
      [0.24, 0.52],
      [0.31, 0.38],
      [0.37, 0.44],
      [0.44, 0.35],
      [0.5, 0.47],
    ],
    { col: BLUE, a: 0.8, size: 14, rows: 5, fade: 0.8, chars: ['山'], inner: ['山', '石'] },
  )
  clouds(p, P.x + P.w * 0.5, P.y + P.h * 0.68, p.wide ? 5 : 3, 26 * p.u, 0.5, span)
  range(
    p,
    P,
    [
      [-0.05, 0.9],
      [0.05, 0.76],
      [0.14, 0.8],
      [0.24, 0.62],
      [0.33, 0.68],
      [0.42, 0.6],
      [0.5, 0.72],
      [0.6, 0.78],
      [0.7, 0.74],
      [0.82, 0.83],
      [0.95, 0.87],
      [1.05, 0.93],
    ],
    {
      col: INK,
      a: 0.9,
      size: 22,
      rows: 7,
      fade: 1.2,
      chars: ['山', '山', '石'],
      inner: ['石', '山', '木'],
    },
  )
  range(
    p,
    P,
    [
      [0.1, 0.96],
      [0.18, 0.85],
      [0.26, 0.89],
      [0.34, 0.8],
      [0.4, 0.92],
    ],
    { col: INK, a: 0.88, size: 18, rows: 4, fade: 1.16, chars: ['山', '石'], inner: ['石', '山'] },
  )
}

/** The top band: mountains in the peaks box, a row of clouds, then the experience gate. Sets scene.sky. */
export function paintTop(p: Pen, l: TopLayout): void {
  const P = l.peaks
  p.scene.sky = { x0: P.x, x1: P.x + P.w * 0.92, y0: P.y + P.h * 0.03, y1: P.y + P.h * 0.3 }
  // clouds among the peaks drift to and fro within them (the mock-up's clouds.lo / clouds.hi)
  const span = { lo: P.x - 30, hi: P.x + P.w * 1.04 }
  if (p.ja) jaTop(p, P, span)
  else zhTop(p, P, span)
  cloudRow(p, l.hallTop - (p.wide ? 322 : 232), 0.5)
  hall(p, l.hall)
}

/**
 * The village of projects, without the houses themselves (each house is painted on its own canvas
 * by drawHouse): a flock of birds (live), pines in the gaps between closed houses, and smoke over
 * every open house (live).
 */
export function paintWorks(p: Pen, l: WorksLayout): void {
  const { wide, u } = p
  // a flock of birds keeps crossing above the village
  if (p.live) p.scene.actors.push({ k: 'flock', y: wide ? 40 : 30, y0: 0, n: wide ? 9 : 6 })
  const hs = l.houses
  // pines stand in the gaps between the closed houses, behind them
  const cl = hs.filter((h) => !h.open)
  const xs = [...new Set(cl.map((h) => Math.round(h.r.y)))].flatMap((y) => {
    const row = cl.filter((h) => Math.round(h.r.y) === y).sort((a, b) => a.r.x - b.r.x)
    return row.slice(1).map((h, i): [number, number] => {
      const left = at(row, i)
      return [(left.r.x + left.r.w + h.r.x) / 2, h.r.y + h.padTop + 30]
    })
  })
  for (const [x, y] of xs) tree(p, x, y, (112 + p.rand() * 36) * (wide ? u : 0.74), 0.5)
  // smoke rises from the chimney of every open house
  if (!p.live) return
  for (const h of hs) {
    if (!h.open) continue
    const s2 = wide ? 27 : 19
    const rows = wide ? 6 : 5
    const eave = h.r.y + h.padTop - s2 * 1.95
    p.scene.actors.push({
      k: 'smoke',
      x: h.r.x + h.r.w * 0.8,
      y: eave - rows * s2 * 0.7,
      y0: eave,
      z: 22,
      sprs: [0, 1, 2].map(() => p.one(p.ch('烟', '煙'), 22, SLATE, 0.75)),
    })
  }
}

/**
 * The hackathon road: reeds, a stream with little trees between each two rows of stops, a path of
 * stones through the stops and a marker at every stop (a stone; a lantern in Japanese mode, which
 * flickers live). Live, also the walker and scene.road. Sets scene.sky (and scene.water when wide).
 */
export function paintRoad(p: Pen, l: RoadBandLayout): void {
  const { wide, u, W } = p
  reeds(p, wide ? 58 : 48)
  const Q = l.road
  const { pts, line, plan } = l.layout
  const rw = l.layout.wide
  const per = plan.per
  const rowH = plan.rowH
  const tall = l.tall
  const n = pts.length
  const y0 = 56
  const sky = { x0: 0, x1: W, y0: 10 * u, y1: 56 * u }
  if (n === 0) {
    p.scene.sky = sky
    return
  }
  // a stream crosses between each pair of rows
  if (rw) {
    for (let r = 0; r < plan.rows - 1; r++) {
      const sy = Q.y + y0 + r * rowH + tall + 104
      const sc = curve(
        [
          [Q.x + Q.w - 24, sy - 8],
          [Q.x + 0.8 * Q.w, sy + 8],
          [Q.x + 0.6 * Q.w, sy - 10],
          [Q.x + 0.4 * Q.w, sy + 8],
          [Q.x + 0.2 * Q.w, sy - 8],
          [Q.x + 0.09 * Q.w, sy + 6],
        ],
        2,
      )
      stream(p, sc, 28 * u, 32 * u, '水', Math.round((sc.length * 2) / (30 * u * 1.5)))
      p.scene.water = sc
      for (let k = 1; k < per; k++) {
        tree(
          p,
          Q.x + (k / per) * Q.w + (p.rand() - 0.5) * 16,
          sy - 8,
          (50 + p.rand() * 16) * u,
          0.7,
        )
      }
    }
  }
  // the path of stones
  const C = curve(
    line.map((q): [number, number] => [Q.x + q[0], Q.y + q[1]]),
    2,
  )
  let d = 0
  let nx = 0
  for (const q of C) {
    d += 2
    if (d < nx) continue
    d = 0
    const z = 15 + p.rand() * 9
    nx = z * 1.5
    p.ink(EARTH, 0.72 + p.rand() * 0.2)
    p.glyph('石', {
      x: q.x + (p.rand() - 0.5) * 8,
      y: q.y + (p.rand() - 0.5) * 8,
      w: z * 1.3,
      h: z,
      rot: (p.rand() - 0.5) * 0.4,
      bend: (p.rand() - 0.5) * 0.3,
      W: z * 0.1,
    })
  }
  p.scene.sky = sky
  if (p.live) {
    // for the walker: the index into C nearest each stop (checking every third sample)
    const idx = pts.map((q) => {
      let bi = 0
      let bd = 1e9
      for (let i = 0; i < C.length; i += 3) {
        const c = at(C, i)
        const dd = Math.hypot(c.x - Q.x - q[0], c.y - Q.y - q[1])
        if (dd < bd) {
          bd = dd
          bi = i
        }
      }
      return bi
    })
    p.scene.road = { C, idx }
    p.scene.actors.push({ k: 'walker', spr: p.one('人', 30, INK, 0.95), y0: Q.y })
  }
  // a marker at every stop
  for (const [qi, q] of pts.entries()) {
    if (p.ja && p.live) {
      p.scene.actors.push({
        k: 'flick',
        spr: p.one('灯', 38, RED, 0.92),
        x: Q.x + q[0] - 28.5,
        y: Q.y + q[1] - 32.5,
        y0: Q.y + q[1],
        w: 57,
        h: 57,
        i: qi,
      })
    } else if (p.ja) {
      p.ink(RED, 0.92)
      p.glyph('灯', {
        x: Q.x + q[0],
        y: Q.y + q[1] - 4,
        w: 36,
        h: 38,
        rot: (p.rand() - 0.5) * 0.14,
        W: 3.6,
      })
    } else {
      p.ink(INK, 0.92)
      p.glyph('石', {
        x: Q.x + q[0],
        y: Q.y + q[1],
        w: 40,
        h: 32,
        rot: (p.rand() - 0.5) * 0.2,
        W: 3.4,
      })
    }
  }
}

/** The end band: a river, the contact pavilion (with a 茶 sign in Japanese mode) and the ground in front. */
export function paintEnd(p: Pen, l: EndLayout): void {
  const { wide } = p
  river(p, wide ? 44 : 34)
  hall(p, l.hall)
  if (p.ja) {
    const r = l.hall.bays
    const z = wide ? 54 : 40
    p.ink(RED, 0.9)
    p.glyph('茶', {
      x: r.x + r.w + z * (wide ? 1.15 : 0.1),
      y: r.y + (wide ? z * 0.8 : -z * 2.9),
      w: z,
      h: z,
      rot: 0.05,
      W: z * 0.1,
    })
  }
  ground(p, l.ground)
}

/**
 * After a band is painted in live mode: the sprites the motion layer needs (bird, boat, fish,
 * falling leaves). Port of the mock-up's `scene._kit = …` line.
 */
export function makeKit(p: Pen): void {
  p.scene.kit = {
    bird: p.one(p.ch('鸟', '鳥'), 17, INK, 0.85),
    boat: p.one('舟', 28, INK, 0.88),
    fish: p.one(p.ch('鱼', '魚'), 22, INK, 0.85),
    fall: [0, 1, 2].map(() =>
      p.one(p.ch('叶', '葉'), 15, LEAF, 0.85, { rot: (p.rand() - 0.5) * 0.6 }),
    ),
  }
}
