/* One project building of the village, at any size and openness. Port of drawHouse in paintScene
 the design mock-up. p.rand() is called in exactly the mock-up's
 order; every house paints from its own seed (houseSeed), so it looks the same at any size. */

import type { Rect } from '../layout/types'
import { EARTH, INK, RED, SLATE } from './pen'
import type { Pen } from './pen'
import { colPost, stones, tiles } from './elements'
import type { Rgb } from './types'

export interface HouseGeom {
  /** The house's box. */
  r: Rect
  /** Its CSS padding-top (the mock-up's h.top). */
  padTop: number
  /** 0 = small closed pavilion … 1 = open hall. */
  t: number
  /** The capture window's box, same coordinate space as r; framed only when t === 1. */
  win?: Rect | null
}

/**
 * One project building at any size and openness: a tiled roof, a beam of 梁, two posts and a row
 * of stones in front; open (t = 1) it also gets a wash behind the roof and a little roofed frame
 * round its window. Between closed and open it has as many tiles, posts and stones as fit its size,
 * and its timber turns from ink to vermilion (ink in Japanese mode). Uses p.wide and p.ja.
 * The caller runs it inside p.seeded(houseSeed(index), …) with live painting off.
 */
export function drawHouse(p: Pen, h: HouseGeom): void {
  const { wide, ja } = p
  const g = wide ? 30 : 22
  const s = wide ? 19 : 15
  const t = h.t
  const r = h.r
  /** From the closed value to the open one. */
  const L = (a: number, b: number) => a + (b - a) * t
  const mix = (c1: Rgb, c2: Rgb): Rgb => [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
  const tim = ja ? INK : RED
  const cx = r.x + r.w / 2
  const s2 = L(s, wide ? 27 : 19)
  const rows = Math.round(L(4, wide ? 6 : 5))
  const top = r.y + h.padTop
  const eave = top - s2 * 1.95
  const hw = r.w / 2 + g * L(0.75, wide ? 1.7 : 0.7)
  const col = mix(INK, tim)
  const a = L(0.62, 0.9)
  if (t === 1) {
    p.tint(SLATE, 0.1, 10, () => {
      p.ctx.moveTo(cx - hw, eave + s2)
      p.ctx.lineTo(cx - hw * 0.55, eave - rows * s2 * 0.8)
      p.ctx.lineTo(cx + hw * 0.55, eave - rows * s2 * 0.8)
      p.ctx.lineTo(cx + hw, eave + s2)
    })
  }
  tiles(p, cx, eave, hw, s2, rows, s2 * (ja ? 0.6 : L(1.9, wide ? 3 : 2)), L(0.74, 0.96))
  // the beam under the eave
  const bw = r.w - g * 0.3
  const n = Math.max(2, Math.round(bw / (s2 * 2.5)))
  const cw = bw / n
  const bc = mix(EARTH, tim)
  for (let k = 0; k < n; k++) {
    p.ink(bc, L(0.58, 0.8) + p.rand() * 0.14)
    p.glyph('梁', {
      x: r.x + g * 0.15 + (k + 0.5) * cw,
      y: top - s2 * 0.86,
      w: cw * 0.96,
      h: s2 * 0.82,
      rot: 0,
      skew: (p.rand() - 0.5) * 0.15,
      bend: (p.rand() - 0.5) * 0.15,
      W: s2 * 0.072,
    })
  }
  colPost(p, r.x + g * 0.4, top - s2 * 0.3, r.y + r.h, g, col, a)
  colPost(p, r.x + r.w - g * 0.4, top - s2 * 0.3, r.y + r.h, g, col, a)
  stones(p, r.x - 4, r.x + r.w - 6, r.y + r.h + g * 0.5, g * L(0.62, 0.8), L(0.6, 0.9))
  const win = h.win
  if (t === 1 && win) {
    // the window of the open house is framed like a little shrine: a short roof and two posts
    const g2 = wide ? 22 : 18
    tiles(
      p,
      win.x + win.w / 2,
      win.y - g2 * 0.55,
      win.w / 2 + g2 * 0.9,
      g2 * 0.62,
      2,
      g2 * 0.7,
      0.8,
    )
    colPost(p, win.x - g2 * 0.5, win.y, win.y + win.h, g2, EARTH, 0.7)
    colPost(p, win.x + win.w + g2 * 0.5, win.y, win.y + win.h, g2, EARTH, 0.7)
  }
}

/** The seed every house paints from, so it looks the same at any size: 101 + index. */
export function houseSeed(index: number): number {
  return 101 + index
}
