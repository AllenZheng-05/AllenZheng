/* The brush engine: characters written stroke by stroke with a bristle brush that runs dry.
 Port of the engine in the design mock-up. Every rand() call happens in exactly the
 mock-up's order, so the same seed paints the same picture; do not reorder, skip or add any. */

import type { ArtMode } from '../model'
import { FLOW } from './flow'
import { PARSED } from './glyphs'
import { rng } from './rng'
import type { BandScene, GlyphOpts, PathPt, Rgb, Sprite, StrokeKind } from './types'

export const INK: Rgb = [28, 24, 20]
export const SLATE: Rgb = [38, 46, 54]
export const BLUE: Rgb = [58, 88, 112]
export const PINE: Rgb = [26, 40, 32]
export const EARTH: Rgb = [70, 58, 44]
export const RED: Rgb = [168, 62, 40]
export const INDIGO: Rgb = [36, 58, 92]
export const LEAF: Rgb = [150, 84, 36]

export function rgba(c: Rgb, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

/**
 * How the width of a stroke swells and thins along it, t from 0 (start) to 1 (end).
 * 'own' strokes follow their recorded pressure instead and have no entry here.
 */
const PROFILE: Readonly<Record<Exclude<StrokeKind, 'own'>, (t: number) => number>> = {
  /** horizontal: firm start, thinner middle, a press at the end */
  h: (t) => 0.98 - 0.36 * Math.sin(Math.PI * t) + (t > 0.86 ? 0.14 : 0),
  /** vertical: thins steadily downwards */
  v: (t) => 1.02 - 0.34 * t,
  /** left-falling: heavy start, sweeps out to a point */
  pie: (t) => 1.12 - 1.02 * t,
  /** right-falling: grows to a broad foot, then lifts off */
  na: (t) => (t < 0.72 ? 0.42 + 1.05 * t : 1.18 * (1 - (t - 0.72) / 0.3)),
  /** dot: swells in the middle */
  dot: (t) => 0.38 + 1.0 * Math.sin(Math.PI * Math.min(1, t * 0.8 + 0.1)),
  /** general: an even line, a little thinner mid-way */
  gen: (t) => 0.95 - 0.22 * Math.sin(Math.PI * t),
}

/** Brush points are resampled about this many px apart. */
const BRUSH_SPACING = 2.5
/** Strokes wider than this are drawn as several bristles. */
const BRISTLE_MIN_WIDTH = 3.4
const MAX_BRISTLES = 7
/** Every character leans a little, as a right-handed writer's does. */
const HAND_LEAN = -0.035
/** Size of the paper-tooth noise tile, in px. */
const TOOTH_SIZE = 160

/** A point as [x, y] or [x, y, pressure]. Missing numbers read as NaN, as in the mock-up. */
type Pt = readonly number[]

function px(p: Pt | undefined): number {
  return p?.[0] ?? NaN
}
function py(p: Pt | undefined): number {
  return p?.[1] ?? NaN
}
/** Pressure of a point; 1 when it has none. */
function pressure(p: Pt | undefined): number {
  return p?.[2] ?? 1
}

/** Smooth curve (Catmull-Rom) through points, sampled every `step` px. Port of `curve`. */
export function curve(pts: [number, number][], step: number): PathPt[] {
  const out: PathPt[] = []
  const first = pts[0]
  if (!first) return out
  const last = pts.length - 1
  const at = (i: number): [number, number] => pts[i] ?? first
  let carry = 0
  let prev: [number, number] = first
  for (let i = 0; i < last; i++) {
    const p0 = at(Math.max(0, i - 1))
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(Math.min(last, i + 2))
    const m = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2)
    for (let j = 1; j <= m; j++) {
      const u = j / m
      const u2 = u * u
      const u3 = u2 * u
      const spline = (k: 0 | 1): number =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * u +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3)
      const q: [number, number] = [spline(0), spline(1)]
      carry += Math.hypot(q[0] - prev[0], q[1] - prev[1])
      if (carry >= step) {
        out.push({ x: q[0], y: q[1], ang: Math.atan2(q[1] - prev[1], q[0] - prev[0]) })
        carry = 0
      }
      prev = q
    }
  }
  return out
}

/** The noise tile the paper tooth is cut with; built once, on first use. */
let toothTile: HTMLCanvasElement | null = null

function canvas2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('scroll theme: 2D canvas is not available')
  return ctx
}

function getToothTile(): HTMLCanvasElement {
  if (toothTile) return toothTile
  const tile = document.createElement('canvas')
  tile.width = tile.height = TOOTH_SIZE
  const nx = canvas2d(tile)
  const im = nx.createImageData(TOOTH_SIZE, TOOTH_SIZE)
  const r2 = rng(5)
  for (let i = 0; i < im.data.length; i += 4) im.data[i + 3] = r2() < 0.5 ? 0 : r2() * 150
  nx.putImageData(im, 0, 0)
  toothTile = tile
  return tile
}

export interface PenOptions {
  W: number
  H: number
  mode: ArtMode
  dpr: number
  live: boolean
  /** Defaults to 23. */
  seed?: number
  /**
   * Whether the brush starts with the ink load on (default true, as while a scene is painted).
   * The project motifs are drawn outside a scene, where the mock-up's ink load is off.
   */
  inkLoad?: boolean
}

/** One run of the brush over one painted surface (a scene). */
export class Pen {
  /** Where the brush writes; swapped while a sprite is drawn. */
  ctx: CanvasRenderingContext2D
  /** The scene's random numbers; swapped by seeded(). */
  rand: () => number
  /** Whether moving things are painted as sprites for the motion layer. */
  live: boolean
  readonly mode: ArtMode
  readonly ja: boolean
  readonly W: number
  readonly H: number
  readonly wide: boolean
  /** Layout unit: a thousandth of a wide band, or a 420th of a narrow one. */
  readonly u: number
  readonly dpr: number
  /** Pixel ratio of sprites and the motion layer. */
  readonly sd: number
  readonly scene: BandScene

  /** Ink load: while on, the brush starts wet (v = 1), dries over the strokes and is dipped again. */
  #inkOn = true
  #inkV = 1

  constructor(ctx: CanvasRenderingContext2D, options: PenOptions) {
    this.ctx = ctx
    this.rand = rng(options.seed ?? 23)
    this.live = options.live
    this.#inkOn = options.inkLoad ?? true
    this.mode = options.mode
    this.ja = options.mode === 'ja'
    this.W = options.W
    this.H = options.H
    this.wide = options.W > 700
    this.u = this.wide ? options.W / 1000 : options.W / 420
    this.dpr = options.dpr
    this.sd = this.wide ? Math.min(options.dpr, 1.25) : Math.min(options.dpr, 1.5)
    this.scene = {
      actors: [],
      sd: this.sd,
      sky: null,
      water: null,
      pond: null,
      road: null,
      kit: null,
    }
  }

  /** The Chinese or the Japanese character, by art mode. Port of CH(). */
  ch(zh: string, ja: string): string {
    return this.ja ? ja : zh
  }

  /** Set fill colour and alpha. */
  ink(c: Rgb, a: number): void {
    this.ctx.fillStyle = rgba(c, 1)
    this.ctx.globalAlpha = a
  }

  /** One brush stroke: a ribbon of bristles. pts are [x, y] or [x, y, pressure]. Port of brush(). */
  brush(pts: number[][], W: number, kind: StrokeKind): void {
    const ctx = this.ctx
    const rand = this.rand
    // resample the polyline about every BRUSH_SPACING px, interpolating the pressure
    const P: [number, number, number][] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const pa = pts[i]
      const pb = pts[i + 1]
      const x1 = px(pa)
      const y1 = py(pa)
      const x2 = px(pb)
      const y2 = py(pb)
      const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / BRUSH_SPACING))
      const w1 = pressure(pa)
      const w2 = pressure(pb)
      for (let j = i ? 1 : 0; j <= n; j++) {
        P.push([x1 + ((x2 - x1) * j) / n, y1 + ((y2 - y1) * j) / n, w1 + ((w2 - w1) * j) / n])
      }
    }
    const n = P.length
    if (n < 2) return
    const prof = kind === 'own' ? PROFILE.gen : PROFILE[kind]
    const wob = rand() * 6.28
    // unit normal and half-width at every sample
    const N: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)]
      const b = P[Math.min(n - 1, i + 1)]
      const here = P[i]
      if (!a || !b || !here) continue
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const d = Math.hypot(dx, dy) || 1
      N.push([
        -dy / d,
        dx / d,
        kind === 'own'
          ? Math.max(0.1, here[2]) * W
          : Math.max(0.12, prof(i / (n - 1))) * W * (1 + 0.12 * Math.sin(wob + i * 0.7)),
      ])
    }
    const hairs = W > BRISTLE_MIN_WIDTH ? Math.min(MAX_BRISTLES, 2 + ((W / 2.4) | 0)) : 1
    const base = ctx.globalAlpha
    for (let b = 0; b < hairs; b++) {
      // f: offset of this bristle across the ribbon; hw: its half-width
      const f = hairs === 1 ? 0 : (b + 0.5) / hairs - 0.5
      const hw = hairs === 1 ? 0.5 : 0.8 / hairs
      const dry = this.#inkOn ? 1 - this.#inkV : 0
      // a dry brush lets some bristles start late or lift early
      const from = hairs > 1 && rand() < 0.3 + dry * 0.5 ? rand() * (0.35 + dry * 0.2) : 0
      const to = hairs > 1 && rand() < 0.4 + dry * 0.5 ? 1 - rand() * (0.4 + dry * 0.2) : 1
      ctx.globalAlpha = base * (hairs === 1 ? 1 : 0.5 + rand() * 0.5)
      ctx.beginPath()
      let started = false
      const i0 = (from * (n - 1)) | 0
      const i1 = Math.max(i0 + 1, (to * (n - 1)) | 0)
      for (let i = i0; i <= i1; i++) {
        const p = P[i]
        const q = N[i]
        if (!p || !q) continue
        const x = p[0] + q[0] * q[2] * (f + hw)
        const y = p[1] + q[1] * q[2] * (f + hw)
        if (started) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
        started = true
      }
      for (let i = i1; i >= i0; i--) {
        const p = P[i]
        const q = N[i]
        if (!p || !q) continue
        ctx.lineTo(p[0] + q[0] * q[2] * (f - hw), p[1] + q[1] * q[2] * (f - hw))
      }
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = base
  }

  /** One character written for its place. Port of glyph(). */
  glyph(ch: string, o: GlyphOpts): void {
    const rand = this.rand
    const vs = FLOW[ch]
    const g: readonly (readonly Pt[])[] | undefined =
      vs && vs.length ? vs[(rand() * vs.length) | 0] : PARSED[ch]
    if (!g) return
    const rot = (o.rot || 0) + HAND_LEAN
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const jit = o.jit ?? 0.07
    const bend = o.bend || 0
    const skew = o.skew || 0
    for (const st of g) {
      const a = st[0]
      const b = st[st.length - 1]
      if (!a || !b) continue
      const dx = px(b) - px(a)
      const dy = py(b) - py(a)
      const len = Math.hypot(dx, dy)
      let kind: StrokeKind = 'gen'
      let src: readonly Pt[] = st
      if (a.length > 2) kind = 'own'
      else if (st.length === 2) {
        kind =
          len < 20
            ? 'dot'
            : Math.abs(dy) < Math.abs(dx) * 0.35
              ? 'h'
              : Math.abs(dx) < Math.abs(dy) * 0.35
                ? 'v'
                : dy > 0 && dx < 0
                  ? 'pie'
                  : dy > 0
                    ? 'na'
                    : 'pie'
        // falling strokes bow a little: left-falling one way, right-falling the other
        if (kind === 'pie' || kind === 'na') {
          const k = kind === 'pie' ? -0.1 : 0.09
          src = [a, [(px(a) + px(b)) / 2 - dy * k, (py(a) + py(b)) / 2 + dx * k], b]
        }
      }
      const own = kind === 'own'
      const ju = own ? (rand() - 0.5) * jit : 0
      const jv = own ? (rand() - 0.5) * jit : 0
      const sway = own ? (rand() - 0.5) * 0.12 : 0
      const pts = src.map((p, pi) => {
        let u =
          px(p) / 100 -
          0.5 +
          (own
            ? ju + sway * Math.sin((pi / (src.length - 1 || 1)) * Math.PI)
            : (rand() - 0.5) * jit)
        let v = py(p) / 100 - 0.5 + (own ? jv : (rand() - 0.5) * jit)
        v += bend * (u * u - 0.08)
        u *= 1 - (o.taper || 0) * (0.5 - v)
        u += skew * v
        const X = u * o.w
        const Y = v * o.h
        const out = [o.x + X * c - Y * s, o.y + X * s + Y * c]
        const pr = p[2]
        if (pr !== undefined) out.push(pr)
        return out
      })
      if (this.#inkOn) {
        // the brush runs drier with every stroke and is dipped again when nearly dry
        const ld = this.#inkV
        const ga = this.ctx.globalAlpha
        this.#inkV -= 0.02 + rand() * 0.012
        if (this.#inkV < 0.36) this.#inkV = 0.86 + rand() * 0.14
        this.ctx.globalAlpha = ga * (0.48 + 0.52 * ld)
        this.brush(pts, o.W * (own ? 1.25 : 0.8 + rand() * 0.45) * (0.84 + 0.56 * ld), kind)
        this.ctx.globalAlpha = ga
      } else this.brush(pts, o.W * (own ? 1.25 : 0.8 + rand() * 0.45), kind)
    }
  }

  /** A blurred wash of colour behind the writing. Port of tint(): `draw` adds path segments to this.ctx between beginPath and fill. */
  tint(c: Rgb, a: number, blur: number, draw: () => void): void {
    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = 1
    ctx.filter = `blur(${blur * this.u}px)`
    ctx.fillStyle = rgba(c, a)
    ctx.beginPath()
    draw()
    ctx.fill()
    ctx.restore()
  }

  /** Paint into a small offscreen canvas of w×h CSS px at pixel ratio k (default this.sd), then bleed and tooth it. Port of sprite(). */
  sprite(w: number, h: number, fn: () => void, k: number = this.sd): Sprite {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.ceil(w * k))
    c.height = Math.max(1, Math.ceil(h * k))
    const sctx = canvas2d(c)
    const keep = this.ctx
    this.ctx = sctx
    try {
      sctx.setTransform(k, 0, 0, k, 0, 0)
      fn()
      this.#bleed(k)
      this.#tooth(w, h)
    } finally {
      this.ctx = keep
    }
    return c
  }

  /** A sprite holding a single character of size z. Port of one(). */
  one(ch: string, z: number, col: Rgb, a: number, o?: Partial<GlyphOpts>): Sprite {
    return this.sprite(z * 1.5, z * 1.5, () => {
      this.ink(col, a)
      this.glyph(ch, { x: z * 0.75, y: z * 0.75, w: z, h: z, W: z * 0.1, ...o })
    })
  }

  /** Run fn with its own run of the brush: rand = rng(seed), ink load fresh and on; everything restored after. Port of seeded(). */
  seeded(seed: number, fn: () => void): void {
    const kr = this.rand
    const kv = this.#inkV
    const ko = this.#inkOn
    this.rand = rng(seed)
    this.#inkV = 1
    this.#inkOn = true
    try {
      fn()
    } finally {
      this.rand = kr
      this.#inkV = kv
      this.#inkOn = ko
    }
  }

  /** Run fn with `live` temporarily set; restores it after (also if fn throws). Replaces LIVE_SWAP. */
  withLive<T>(live: boolean, fn: () => T): T {
    const keep = this.live
    this.live = live
    try {
      return fn()
    } finally {
      this.live = keep
    }
  }

  /** Finish a painted surface on this.ctx: bleed(k) then paper tooth over w×h CSS px. (paintScene ends with bleed(ctx, dpr); tooth(ctx, W, H).) */
  finish(k: number, w: number, h: number): void {
    this.#bleed(k)
    this.#tooth(w, h)
  }

  /** Ink spreads into the paper: a faint blurred copy of the surface over itself. */
  #bleed(k: number): void {
    const c = this.ctx
    if (!('filter' in c)) return
    c.save()
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.filter = `blur(${(1.15 * k).toFixed(1)}px)`
    c.globalAlpha = 0.34
    c.drawImage(c.canvas, 0, 0)
    c.restore()
  }

  /** Paper tooth: lift specks of ink so the strokes look dry in places. */
  #tooth(w: number, h: number): void {
    const c = this.ctx
    const pattern = c.createPattern(getToothTile(), 'repeat')
    c.save()
    c.globalCompositeOperation = 'destination-out'
    c.globalAlpha = 0.3
    if (pattern) {
      c.fillStyle = pattern
      c.fillRect(0, 0, w, h)
    }
    c.restore()
  }
}
