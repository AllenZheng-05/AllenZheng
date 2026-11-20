/* The small pictures on the project houses: a motif written in characters, one per kind of project.
 Port of motif(c, kind, t) in the design mock-up. Every frame starts its
 own run of the brush (rng(11), ink load off), so one (kind, t) always paints the same picture;
 the numbers and the order of the random calls are the mock-up's. */

import type { MotifKind } from '../model'
import { EARTH, INK, Pen, PINE, RED, SLATE } from './pen'
import type { GlyphOpts, Rgb } from './types'

/** The motif's drawing space, in CSS px. */
export const MOTIF_SIZE = { W: 150, H: 96 } as const

/** The moment of each motif's loop that is shown while the painting is still. */
export const MOTIF_REST: Readonly<Record<MotifKind, number>> = {
  duel: 0.02,
  sport: 0.4,
  team: 3.4,
  grades: 3.6,
  branch: 4.2,
  lamp: 0,
}

/** Ease out (cubic), clamped to 0..1. */
const ease = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : 1 - Math.pow(1 - v, 3))

/**
 * Draw one frame of a project motif at time t (seconds). `scale` (default 1) multiplies the canvas's
 * backing size, for the large placeholder in a window without a capture: the same picture, larger.
 */
export function drawMotif(canvas: HTMLCanvasElement, kind: MotifKind, t: number, scale = 1): void {
  const { W: MW, H: MH } = MOTIF_SIZE
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const k = dpr * scale
  const bw = Math.round(MW * k)
  const bh = Math.round(MH * k)
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  const x = canvas.getContext('2d')
  if (!x) return
  x.setTransform(k, 0, 0, k, 0, 0)
  x.clearRect(0, 0, MW, MH)
  const pen = new Pen(x, { W: MW, H: MH, mode: 'zh', dpr, live: false, seed: 11, inkLoad: false })
  const ink = (col: Rgb, a: number) => pen.ink(col, a)
  /** A character centred at (px, py) in a w×h box; the brush width follows the height. */
  const G = (ch: string, px: number, py: number, w: number, h: number, o?: Partial<GlyphOpts>) =>
    pen.glyph(ch, { x: px, y: py, w, h, W: Math.abs(h) * 0.13, ...o })

  if (kind === 'lamp') {
    // a lantern, swinging a little
    ink(RED, 0.9)
    G('灯', 75 + Math.sin(t * 1.4) * 3, 46, 58, 62, { rot: Math.sin(t * 1.4) * 0.08 })
  } else if (kind === 'duel') {
    // two swords striking in turn to a beat of four; the second sword is mirrored (negative width)
    const bt = t * 1.8
    const ph = bt % 1
    const n = Math.floor(bt) % 4
    const hit = Math.exp(-ph * 6)
    const a = n % 2 === 0
    ink(INK, 0.92)
    G('刀', 48 + (a ? hit * 14 : -hit * 3), 42, 52, 60, {
      rot: -0.6 + (a ? hit * 0.8 : -hit * 0.15),
    })
    ink(RED, 0.9)
    G('刀', 102 - (a ? -hit * 3 : hit * 14), 42, -52, 60, {
      rot: 0.6 - (a ? -hit * 0.15 : hit * 0.8),
    })
    for (let i = 0; i < 4; i++) {
      ink(i === n ? RED : EARTH, i === n ? 0.95 : 0.4)
      G('一', 45 + i * 20, 89, 15, 10, { W: 2.4 + (i === n ? hit * 1.8 : 0) })
    }
  } else if (kind === 'sport') {
    // a ball bouncing from side to side over a player who leans after it
    const ph = (t / 1.5) % 1
    const dir = Math.floor(t / 1.5) % 2
    const f = dir ? 1 - ph : ph
    const bx = 22 + f * 106
    const by = 62 - Math.abs(Math.sin(Math.PI * ph * 2)) * 42 * (ph < 0.5 ? 1 : 0.7)
    ink(EARTH, 0.5)
    G('一', 75, 91, 130, 8, { W: 1.8 })
    ink(INK, 0.92)
    G('人', 75 + (bx - 75) * 0.12, 54, 48, 62, {
      rot: ((bx - 75) / 75) * 0.32,
      skew: ((bx - 75) / 75) * 0.25,
    })
    ink(RED, 0.92)
    G('玉', bx, by, 25, 25, { rot: f * 5, W: 2.5 })
  } else if (kind === 'team') {
    // six gems dropping into a team of two rows of three, one after another
    const cyc = t % 4.6
    const step = Math.min(6, cyc / 0.42)
    for (let i = 0; i < 6; i++) {
      const v = ease(step - i)
      if (v <= 0) continue
      const fresh = step - i < 1
      ink(fresh ? RED : SLATE, 0.35 + v * 0.57)
      G(
        '玉',
        33 + (i % 3) * 42,
        27 + Math.floor(i / 3) * 43 + (1 - v) * -8,
        32 * (0.6 + 0.4 * v),
        32 * (0.6 + 0.4 * v),
        { W: 3 },
      )
    }
  } else if (kind === 'grades') {
    // a bar chart of bamboo stalks growing, swaying a little
    const hs = [0.42, 0.78, 1, 0.62, 0.32]
    const cyc = t % 5.2
    ink(EARTH, 0.5)
    G('一', 75, 91, 134, 8, { W: 1.8 })
    hs.forEach((h, i) => {
      const v = ease((cyc - i * 0.22) / 0.9)
      const full = h * 80
      const hh = full * v
      const n = Math.max(1, Math.round(full / 19))
      const sw = Math.sin(t * 1.3 + i) * 0.1
      for (let j = 0; j < n; j++) {
        const y0 = 86 - ((j + 1) * full) / n
        // joints above the grown height are not there yet
        if (86 - hh > y0 + (full / n) * 0.7) continue
        ink(PINE, 0.55 + (0.4 * (j + 1)) / n)
        G('竹', 23 + i * 26 + sw * (j + 1) * 3, y0 + full / n / 2, 23, (full / n) * 1.02, {
          skew: sw,
          W: 2.3,
        })
      }
    })
  } else if (kind === 'branch') {
    // a tree of versions branching out, node by node
    const cyc = t % 5.4
    const step = cyc / 0.5
    const nodes: [number, number, number, number][] = [
      [75, 76, 36, 0],
      [50, 50, 28, -0.4],
      [100, 50, 28, 0.4],
      [30, 22, 21, -0.55],
      [61, 19, 21, -0.15],
      [89, 19, 21, 0.15],
      [120, 22, 21, 0.55],
    ]
    nodes.forEach(([px, py, z, rot], i) => {
      const v = ease(step - i)
      if (v <= 0) return
      const fresh = step - i < 1.4 && i > 0
      ink(fresh ? RED : PINE, 0.3 + v * 0.62)
      G('木', px, py + (1 - v) * 8, z * 1.15 * v, z * 1.25 * v, { rot, bend: 0.3, W: z * 0.12 })
    })
  }
}
