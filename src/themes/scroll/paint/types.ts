/* Shared types of the scroll theme's brush engine, its painters and its motion layer. */

/** A colour as red, green, blue (0-255). */
export type Rgb = readonly [number, number, number]

/** A small offscreen canvas painted once and moved about by the motion layer. */
export type Sprite = HTMLCanvasElement

/** A sample along a curve: position and the direction of travel (radians). */
export interface PathPt {
  x: number
  y: number
  ang: number
}

/** Where and how one character is written: centre (x, y), box w×h, brush width W. */
export interface GlyphOpts {
  x: number
  y: number
  w: number
  h: number
  W: number
  /** Rotation in radians. */
  rot?: number
  /** Horizontal lean, proportional to height. */
  skew?: number
  /** Vertical bow, strongest at the sides. */
  bend?: number
  /** Narrowing towards the top. */
  taper?: number
  /** Hand jitter, as a fraction of the box (default .07). */
  jit?: number
}

/**
 * The shape of a stroke, which sets how its width swells and thins:
 * h = horizontal, v = vertical, pie = left-falling, na = right-falling, dot,
 * gen = general, own = hand-drawn with its own recorded pressure.
 */
export type StrokeKind = 'h' | 'v' | 'pie' | 'na' | 'dot' | 'gen' | 'own'

/** Things the motion layer moves. Painters push these while painting in live mode. */
export type Actor =
  | {
      k: 'drift'
      spr: Sprite
      x: number
      y: number
      y0: number
      w: number
      h: number
      sp: number
      lo: number
      hi: number
      fade: boolean
      o?: number
    }
  | {
      k: 'sway'
      spr: Sprite
      x: number
      y: number
      y0: number
      ox: number
      oy: number
      w: number
      h: number
      amp?: number
    }
  | {
      k: 'flow'
      path: PathPt[]
      n: number
      sprs: Sprite[]
      z0: number
      z1: number
      zs: number
      sw: number
      sh: number
      y0: number
    }
  | {
      k: 'bob'
      spr: Sprite
      x: number
      y: number
      y0: number
      w: number
      h: number
      row: number
      amp: number
    }
  | { k: 'flick'; spr: Sprite; x: number; y: number; y0: number; w: number; h: number; i: number }
  | { k: 'flock'; y: number; y0: number; n: number }
  | { k: 'smoke'; x: number; y: number; y0: number; z: number; sprs: Sprite[] }
  | { k: 'walker'; spr: Sprite; y0: number }

/** What one painted band hands to the motion layer. */
export interface BandScene {
  actors: Actor[]
  /** Pixel ratio of the motion layer. */
  sd: number
  sky: { x0: number; x1: number; y0: number; y1: number } | null
  water: PathPt[] | null
  pond: PathPt[] | null
  road: { C: PathPt[]; idx: number[] } | null
  kit: { bird: Sprite; boat: Sprite; fish: Sprite; fall: Sprite[] } | null
}
