import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MotifKind } from '../model'
import fixture from './motif.fixture.json'
import { drawMotif, MOTIF_REST } from './motif'

/* The project motifs must paint exactly what the design mock-up's motif() paints. motif.fixture.json
 holds digests produced by running the mock-up's own painting code on the same inputs: every kind
 at its resting moment and at t = 1.234, on a fake canvas with the same recording context as below
 (at pixel ratio 2). */

interface Fill {
  a: number
  f: string
  pts: number[]
}
let fills: Fill[] = []

class FakeContext {
  globalAlpha = 1
  fillStyle: unknown = '#000'
  private cur: number[] = []
  save() {}
  restore() {}
  setTransform() {}
  clearRect() {}
  closePath() {}
  beginPath() {
    this.cur = []
  }
  moveTo(x: number, y: number) {
    this.cur.push(x, y)
  }
  lineTo(x: number, y: number) {
    this.cur.push(x, y)
  }
  fill() {
    fills.push({ a: this.globalAlpha, f: String(this.fillStyle), pts: this.cur })
  }
}

beforeEach(() => {
  fills = []
  const ctx = new FakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ctx as unknown as CanvasRenderingContext2D,
  )
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
})
afterEach(() => {
  vi.restoreAllMocks()
})

const r2 = (v: number) => Math.round(v * 100) / 100
const r4 = (v: number) => Math.round(v * 10000) / 10000
function digest() {
  let h = 0x811c9dc5
  const add = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    h ^= 124
    h = Math.imul(h, 16777619) >>> 0
  }
  let pts = 0
  for (const e of fills) {
    pts += e.pts.length / 2
    add(String(r4(e.a)))
    add(e.f)
    add(e.pts.map(r2).join(','))
  }
  return { fills: fills.length, pts, hash: h >>> 0 }
}

const KINDS = Object.keys(MOTIF_REST) as MotifKind[]
const paint = (kind: MotifKind, t: number, scale?: number) => {
  fills = []
  const c = document.createElement('canvas')
  drawMotif(c, kind, t, scale)
  return c
}

describe('drawMotif', () => {
  const want = fixture as Record<string, { fills: number; pts: number; hash: number }>
  it.each(KINDS.flatMap((kind) => [MOTIF_REST[kind], 1.234].map((t) => [kind, t] as const)))(
    '%s at %s paints what the mock-up paints',
    (kind, t) => {
      paint(kind, t)
      expect(digest()).toEqual(want[`${kind}@${t}`])
    },
  )

  it('draws every kind at its rest time, the same each time', () => {
    for (const kind of KINDS) {
      paint(kind, MOTIF_REST[kind])
      const once = fills
      expect(once.length).toBeGreaterThan(0)
      paint(kind, MOTIF_REST[kind])
      expect(fills).toEqual(once)
    }
  })

  it('sizes the canvas by the pixel ratio, and by the scale for the large placeholder', () => {
    const c = paint('team', 3.4)
    expect([c.width, c.height]).toEqual([300, 192])
    const one = fills
    const big = paint('team', 3.4, 2)
    expect([big.width, big.height]).toEqual([600, 384])
    // the same picture, only larger
    expect(fills).toEqual(one)
  })
})
