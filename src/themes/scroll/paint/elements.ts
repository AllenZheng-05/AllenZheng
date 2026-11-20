/* The pieces the scenery is painted from: posts, beams, tiles, trees, stones, clouds, water and
 mountain ridges, each written with the characters that name them. Port of the helpers inside
 the design mock-up's paintScene. Every p.rand() call happens in exactly the
 mock-up's order (the same layout paints the same picture): do not reorder, hoist or skip any. */

import type { Rect } from '../layout/types'
import { BLUE, curve, EARTH, INDIGO, INK, PINE, rgba, SLATE } from './pen'
import type { Pen } from './pen'
import type { PathPt, Rgb } from './types'

/** The item at i; i is always in range where this is used (a random index below the length). */
export function at<T>(list: readonly T[], i: number): T {
  const item = list[i]
  if (item === undefined) throw new Error(`scroll theme: no item ${i} of ${list.length}`)
  return item
}

/** An angle folded into [-π/2, π/2], so writing along a path is never upside down. */
function flat(a: number): number {
  return a > 1.57 ? a - Math.PI : a < -1.57 ? a + Math.PI : a
}

/** A torii written in posts (柱) and beams (梁), standing on by, h tall. fill paints solid bars behind it. */
export function torii(
  p: Pen,
  x: number,
  by: number,
  h: number,
  col: Rgb,
  a: number,
  fill?: string,
): void {
  const pw = h * 0.3
  const g = h * 0.17
  if (fill) {
    const ctx = p.ctx
    ctx.save()
    ctx.globalAlpha = 1
    ctx.fillStyle = fill
    ctx.fillRect(x - pw - g * 0.3, by - h * 0.8, g * 0.6, h * 0.8)
    ctx.fillRect(x + pw - g * 0.3, by - h * 0.8, g * 0.6, h * 0.8)
    ctx.fillRect(x - h * 0.56, by - h * 0.97, h * 1.12, h * 0.1)
    ctx.fillRect(x - h * 0.42, by - h * 0.72, h * 0.84, h * 0.07)
    ctx.restore()
  }
  p.ctx.fillStyle = rgba(col, 1)
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      p.ctx.globalAlpha = a * (0.85 + p.rand() * 0.15)
      p.glyph('柱', {
        x: x + sx * pw,
        y: by - h * 0.8 + (i + 0.5) * h * 0.2,
        w: g * 0.9,
        h: h * 0.2 * 0.97,
        skew: (p.rand() - 0.5) * 0.06,
        W: g * 0.08,
      })
    }
  }
  // the upper lintel, bowed
  for (let i = 0; i < 7; i++) {
    const t = ((i + 0.5) / 7) * 2 - 1
    p.ctx.globalAlpha = a * (0.85 + p.rand() * 0.15)
    p.glyph('梁', {
      x: x + t * h * 0.56,
      y: by - h * 0.92 - t * t * h * 0.05,
      w: ((h * 1.12) / 7) * 0.98,
      h: g * 0.82,
      rot: -t * 0.1,
      W: g * 0.075,
    })
  }
  // the tie beam below it
  for (let i = 0; i < 5; i++) {
    const t = ((i + 0.5) / 5) * 2 - 1
    p.ctx.globalAlpha = a * (0.8 + p.rand() * 0.15)
    p.glyph('梁', {
      x: x + t * h * 0.42,
      y: by - h * 0.685,
      w: ((h * 0.84) / 5) * 0.98,
      h: g * 0.6,
      W: g * 0.06,
    })
  }
}

/**
 * Water: n characters (水 or 波) travelling along path, growing from size z0 to z1.
 * Live, they are four sprites the motion layer moves along the path (a 'flow' actor).
 */
export function stream(
  p: Pen,
  path: PathPt[],
  z0: number,
  z1: number,
  ch: string,
  n: number,
): void {
  const first = path[0]
  const last = path[path.length - 1]
  if (!first || !last) return
  const col = p.ja ? INDIGO : BLUE
  if (!p.live) {
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n
      const q = at(path, Math.min(path.length - 1, (f * path.length) | 0))
      const z = z0 + (z1 - z0) * f
      p.ink(col, 0.6 + p.rand() * 0.3)
      p.glyph(ch, {
        x: q.x,
        y: q.y + (p.rand() - 0.5) * 8,
        w: z * 1.9,
        h: z * 1.05,
        rot: flat(q.ang) * 0.8,
        skew: (p.rand() - 0.5) * 0.5,
        bend: (p.rand() - 0.5) * 0.6,
        W: z * 0.1,
      })
    }
    return
  }
  const zs = Math.max(z0, z1)
  const sprs = [0, 1, 2, 3].map(() =>
    p.sprite(zs * 2.4, zs * 1.6, () => {
      p.ink(col, 0.62 + p.rand() * 0.3)
      p.glyph(ch, {
        x: zs * 1.2,
        y: zs * 0.8,
        w: zs * 1.9,
        h: zs * 1.05,
        skew: (p.rand() - 0.5) * 0.5,
        bend: (p.rand() - 0.5) * 0.6,
        W: zs * 0.1,
      })
    }),
  )
  p.scene.actors.push({
    k: 'flow',
    path,
    n,
    sprs,
    z0,
    z1,
    zs,
    sw: zs * 2.4,
    sh: zs * 1.6,
    y0: Math.min(first.y, last.y),
  })
}

/**
 * A pine h tall standing at (x, y): a stack of 木 widening downwards, 松 on top when top is set.
 * Live, it is painted into a sprite that sways (a 'sway' actor).
 */
export function tree(p: Pen, x: number, y: number, h: number, a: number, top?: boolean): void {
  if (p.live) {
    const bw = h * 0.9
    const bh = h * 1.16
    // the same tree, painted once into its sprite (the mock-up's tree.in flag)
    const spr = p.sprite(bw, bh, () => {
      p.ctx.translate(bw / 2 - x, h * 1.1 - y)
      p.withLive(false, () => tree(p, x, y, h, a, top))
    })
    p.scene.actors.push({
      k: 'sway',
      spr,
      x,
      y,
      y0: y - h * 0.5,
      ox: -bw / 2,
      oy: -h * 1.1,
      w: bw,
      h: bh,
    })
    return
  }
  const n = h > 70 * p.u ? 5 : 3 + ((p.rand() * 2) | 0)
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    const gw = h * (0.2 + 0.36 * f)
    const gh = (h / n) * 1.35
    p.ink(PINE, a * (0.8 + p.rand() * 0.2))
    p.glyph(i === 0 && top ? '松' : '木', {
      x: x + (p.rand() - 0.5) * h * 0.05,
      y: y - h + ((i + 0.5) * h) / n,
      w: gw,
      h: gh,
      rot: (p.rand() - 0.5) * 0.14,
      skew: (p.rand() - 0.5) * 0.2,
      bend: 0.25 + p.rand() * 0.3,
      W: gh * 0.12,
    })
  }
}

/**
 * A tiled roof: rows of 瓦 over an eave at eaveY, half-width HW, tile size s; each row a little
 * narrower and higher, the ends of every row lifted by up to `lift`.
 */
export function tiles(
  p: Pen,
  cx: number,
  eaveY: number,
  HW: number,
  s: number,
  rows: number,
  lift: number,
  a: number,
): void {
  for (let r = 0; r < rows; r++) {
    const hw = HW * (1 - r * 0.12)
    const z = s * (1 - r * 0.05)
    const n = Math.max(3, Math.round((hw * 2) / (z * 1.02)))
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * 2 - 1
      // how far towards the upturned end of the row this tile sits
      const e = Math.max(0, (Math.abs(t) - 0.58) / 0.42)
      p.ink(SLATE, a * (0.78 + p.rand() * 0.22))
      p.glyph('瓦', {
        x: cx + t * hw,
        y: eaveY - r * z * 0.8 - e * e * lift * (1 - r * 0.12),
        w: z * 1.22,
        h: z * 0.98,
        rot: -Math.sign(t) * e * 0.6,
        skew: -t * 0.3,
        bend: -0.35 + (p.rand() - 0.5) * 0.3,
        W: z * 0.1,
      })
    }
  }
}

/** A row of stones (石) along y from x1 to x2, about size s, now and then a big one. */
export function stones(p: Pen, x1: number, x2: number, y: number, s: number, a: number): void {
  for (let x = x1; x < x2;) {
    const big = p.rand() < 0.16
    const z = s * (big ? 1.25 + p.rand() * 0.5 : 0.5 + p.rand() * 0.75)
    p.ink(EARTH, a * (big ? 1 : 0.62 + p.rand() * 0.38))
    p.glyph('石', {
      x: x + z * 0.6,
      y: y + (p.rand() - 0.5) * s * 0.5 - (big ? z * 0.12 : 0),
      w: z * (1.15 + p.rand() * 0.3),
      h: z * (0.85 + p.rand() * 0.2),
      rot: (p.rand() - 0.5) * 0.5,
      skew: (p.rand() - 0.5) * 0.45,
      bend: (p.rand() - 0.5) * 0.6,
      W: z * (0.1 + p.rand() * 0.05),
    })
    x += z * (0.8 + p.rand() * 0.75)
  }
}

/**
 * A bank of k cloud characters (云 / 雲) of size z, starting at (x, y).
 * Live, it is one sprite that drifts (a 'drift' actor): across the band, or, when span is given,
 * to and fro between span.lo and span.hi, fading at the ends. span replaces the mock-up's
 * clouds.lo / clouds.hi function properties.
 */
export function clouds(
  p: Pen,
  x: number,
  y: number,
  k: number,
  z: number,
  a: number,
  span?: { lo: number; hi: number },
): void {
  if (p.live) {
    const bx = x - z * 2.2
    const by = y - z * 1.3
    const bw = k * z * 1.9 + z * 4
    const bh = z * 2.6
    // the same bank, painted once into its sprite (the mock-up's clouds.in flag)
    const spr = p.sprite(bw, bh, () => {
      p.ctx.translate(-bx, -by)
      p.withLive(false, () => clouds(p, x, y, k, z, a, span))
    })
    p.scene.actors.push({
      k: 'drift',
      spr,
      x: bx,
      y: by,
      y0: by,
      w: bw,
      h: bh,
      sp: 5 + z * 0.25,
      lo: span?.lo ?? -bw,
      hi: span ? Math.max(span.lo + 120, span.hi - bw) : p.W,
      fade: span != null,
    })
    return
  }
  const ch = p.ja ? '雲' : '云'
  for (let i = 0; i < k; i++) {
    const s = z * (0.7 + p.rand() * 0.6)
    p.ink(p.ja ? INDIGO : BLUE, a * (0.6 + p.rand() * 0.4))
    p.glyph(ch, {
      x: x + i * z * 1.9 + (p.rand() - 0.5) * z,
      y: y + Math.sin(i * 1.3) * z * 0.35,
      w: s * 2.5,
      h: s * 0.8,
      rot: (p.rand() - 0.5) * 0.08,
      skew: (p.rand() - 0.5) * 0.5,
      bend: (p.rand() - 0.5) * 0.7,
      W: s * 0.06,
    })
  }
}

export interface RangeOpts {
  col: Rgb
  a: number
  /** Size of the ridge characters, in layout units. */
  size: number
  /** How many characters fall down the slope below each ridge character, at most. */
  rows: number
  /** Where (as a fraction of P.h) the slope is lost in mist. */
  fade: number
  /** Characters that ride the ridge. */
  chars: string[]
  /** Characters on the slopes below it. */
  inner: string[]
}

/**
 * A mountain range, written, not washed: bold characters ride the ridge, and more of them fall down
 * the slope, leaning with it, getting smaller and fainter until they are lost in mist. ridge is a
 * list of [x, y] fractions of P, the peaks rectangle (the mock-up's outer variable P).
 */
export function range(p: Pen, P: Rect, ridge: [number, number][], o: RangeOpts): void {
  const pts = ridge.map(([x, y]): [number, number] => [P.x + x * P.w, P.y + y * P.h])
  const C = curve(pts, 2)
  const top = Math.min(...C.map((q) => q.y))
  const fadeY = P.y + o.fade * P.h
  const s = o.size * p.u
  let dist = 0
  let next = 0
  for (let i = 0; i < C.length; i++) {
    dist += 2
    if (dist < next) continue
    dist = 0
    const q = at(C, i)
    const sz = s * (0.64 + p.rand() * 0.92)
    const ang = Math.max(-1.05, Math.min(1.05, q.ang))
    next = sz * (0.7 + p.rand() * 0.22)
    p.ink(o.col, o.a * (0.82 + p.rand() * 0.18))
    p.glyph(at(o.chars, (p.rand() * o.chars.length) | 0), {
      x: q.x,
      y: q.y + sz * 0.3,
      w: sz * 1.3,
      h: sz,
      rot: ang * 0.9 + (p.rand() - 0.5) * 0.2,
      bend: (p.rand() - 0.5) * 0.7,
      skew: (p.rand() - 0.5) * 0.4,
      taper: 0.25,
      W: sz * (0.12 + p.rand() * 0.06),
    })
    // now and then a few dots of moss on the ridge
    if (p.rand() < 0.3) {
      const n2 = 1 + ((p.rand() * 3) | 0)
      for (let m = 0; m < n2; m++) {
        const dx = (p.rand() - 0.5) * sz * 1.6
        const dy = -sz * (0.1 + p.rand() * 0.7)
        const l = sz * (0.16 + p.rand() * 0.2)
        p.ink(INK, o.a * (0.55 + p.rand() * 0.4))
        p.brush(
          [
            [q.x + dx, q.y + dy],
            [q.x + dx + l * 0.5, q.y + dy + l],
          ],
          sz * (0.2 + p.rand() * 0.16),
          'dot',
        )
      }
    }
    // the slope below this ridge character
    const rows = Math.round(o.rows * (0.55 + p.rand() * 0.6))
    for (let k = 1; k <= rows; k++) {
      if (p.rand() < 0.07 + k * 0.02) continue
      const f = k / (o.rows + 1)
      const z = sz * (0.92 - f * 0.35)
      const y = q.y + sz * 0.45 + k * sz * (0.9 + p.rand() * 0.15)
      const x = q.x - Math.tan(ang) * k * sz * 0.22 + (p.rand() - 0.5) * sz * 0.6
      if (y > fadeY) break
      p.ink(
        o.col,
        o.a * Math.pow(1 - f, 1.15) * Math.min(1, ((fadeY - y) / (fadeY - top)) * 1.6 + 0.1),
      )
      p.glyph(at(o.inner, (p.rand() * o.inner.length) | 0), {
        x,
        y,
        w: z * 0.95,
        h: z * 1.35,
        rot: ang * 0.4,
        skew: Math.tan(ang) * 0.75 + (p.rand() - 0.5) * 0.2,
        bend: (p.rand() - 0.5) * 0.4,
        W: z * 0.105,
      })
    }
  }
}

/** A post from y1 down to y2: a column of 柱 in colour col, for a building of grid g. */
export function colPost(
  p: Pen,
  x: number,
  y1: number,
  y2: number,
  g: number,
  col: Rgb,
  a: number,
): void {
  const n = Math.max(1, Math.round((y2 - y1) / (g * 2.1)))
  const chh = (y2 - y1) / n
  for (let i = 0; i < n; i++) {
    p.ink(col, a * (0.85 + p.rand() * 0.15))
    p.glyph('柱', {
      x,
      y: y1 + (i + 0.5) * chh,
      w: g * 0.82,
      h: chh * 0.97,
      rot: 0,
      skew: (p.rand() - 0.5) * 0.06,
      W: g * 0.07,
    })
  }
}

/** A row of cloud banks across the whole band around y: the break between two sections. */
export function cloudRow(p: Pen, y: number, a: number): void {
  const n = p.wide ? 6 : 3
  for (let i = 0; i < n; i++) {
    clouds(
      p,
      (p.W * (i + 0.1 + p.rand() * 0.5)) / n - 20,
      y + (p.rand() - 0.5) * 26 * p.u,
      2 + ((p.rand() * 3) | 0),
      (20 + p.rand() * 9) * p.u,
      a * (0.75 + p.rand() * 0.4),
    )
  }
}

/** Reeds (草) in the wind along y, across the band with gaps. Live, each is a swaying sprite. */
export function reeds(p: Pen, y: number): void {
  const vs = [0, 1, 2, 3].map(() => {
    const z = 26 + p.rand() * 12
    return {
      z,
      spr: p.live
        ? p.sprite(z * 1.6, z * 1.5, () => {
            p.ink(PINE, 0.5 + p.rand() * 0.35)
            p.glyph('草', {
              x: z * 0.8,
              y: z * 0.78,
              w: z * 0.9,
              h: z * 1.25,
              skew: (p.rand() - 0.5) * 0.3,
              bend: (p.rand() - 0.5) * 0.5,
              W: z * 0.07,
            })
          })
        : null,
    }
  })
  for (let x = p.W * 0.04; x < p.W * 0.96;) {
    if (p.rand() < 0.22) {
      x += (40 + p.rand() * 110) * p.u
      continue
    }
    const v = at(vs, (p.rand() * 4) | 0)
    const k = 0.7 + p.rand() * 0.6
    const z = v.z * k
    const by = y + (p.rand() - 0.5) * 8
    if (p.live) {
      if (v.spr) {
        p.scene.actors.push({
          k: 'sway',
          amp: 2.4,
          spr: v.spr,
          x,
          y: by,
          y0: by - z,
          ox: -z * 0.8,
          oy: -z * 1.4,
          w: z * 1.6,
          h: z * 1.5,
        })
      }
    } else {
      p.ink(PINE, 0.5 + p.rand() * 0.35)
      p.glyph('草', {
        x,
        y: by - z * 0.62,
        w: z * 0.9,
        h: z * 1.25,
        skew: (p.rand() - 0.5) * 0.3,
        W: z * 0.07,
      })
    }
    x += z * (0.5 + p.rand() * 0.7)
  }
}

/** A river across the band at y, flowing right to left: two streams of 水. Sets scene.water. */
export function river(p: Pen, y: number): void {
  const { W, u } = p
  const mk = (dy: number) =>
    curve(
      [
        [W + 30, y + dy],
        [W * 0.82, y + dy + 11 * u],
        [W * 0.62, y + dy - 9 * u],
        [W * 0.42, y + dy + 11 * u],
        [W * 0.22, y + dy - 8 * u],
        [-30, y + dy + 4 * u],
      ],
      3,
    )
  const z = p.wide ? 30 : 24
  const p1 = mk(0)
  const p2 = mk(z * 0.95)
  stream(p, p1, z * 0.9, z, '水', Math.round(W / (z * 1.55)))
  stream(p, p2, z * 0.7, z * 0.8, '水', Math.round(W / (z * 1.9)))
  p.scene.water = p1
}
