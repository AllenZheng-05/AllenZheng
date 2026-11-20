import { afterEach, describe, expect, it, vi } from 'vitest'
import fixture from './pen.fixture.json'
import { curve, INK, Pen, rgba } from './pen'
import type { PenOptions } from './pen'
import { rng } from './rng'

type Call = [string, ...unknown[]]

/** A stand-in 2D context that records what is drawn. */
class FakeContext {
  calls: Call[] = []
  globalAlpha = 1
  fillStyle: unknown = '#000'
  filter = 'none'
  globalCompositeOperation = 'source-over'
  canvas: unknown = { width: 1, height: 1 }
  private record(name: string, ...args: unknown[]) {
    this.calls.push([name, ...args])
  }
  beginPath() {
    this.record('beginPath')
  }
  moveTo(x: number, y: number) {
    this.record('moveTo', x, y)
  }
  lineTo(x: number, y: number) {
    this.record('lineTo', x, y)
  }
  closePath() {
    this.record('closePath')
  }
  fill() {
    this.record('fill', this.globalAlpha, this.fillStyle)
  }
  save() {
    this.record('save')
  }
  restore() {
    this.record('restore')
  }
  setTransform(...m: number[]) {
    this.record('setTransform', ...m)
  }
  drawImage(_img: unknown, x: number, y: number) {
    this.record('drawImage', this.filter, this.globalAlpha, x, y)
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.record('fillRect', this.globalCompositeOperation, this.globalAlpha, x, y, w, h)
  }
  createPattern() {
    this.record('createPattern')
    return { pattern: true }
  }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4) }
  }
  putImageData() {
    this.record('putImageData')
  }
  /** The calls that draw, without save/restore bookkeeping. */
  fills() {
    return this.calls.filter((c) => c[0] === 'fill')
  }
}

function asCtx(fake: FakeContext): CanvasRenderingContext2D {
  return fake as unknown as CanvasRenderingContext2D
}

function makePen(over: Partial<PenOptions> = {}) {
  const fake = new FakeContext()
  const pen = new Pen(asCtx(fake), { W: 1200, H: 600, mode: 'zh', dpr: 2, live: false, ...over })
  return { fake, pen }
}

const BOX = { x: 100, y: 100, w: 80, h: 60, W: 6 }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('rng', () => {
  it('matches the mock-up for seeds 23 and 101', () => {
    const a = rng(23)
    expect([a(), a(), a(), a(), a()]).toEqual([
      0.09272266505286098, 0.06831189128570259, 0.6321120406500995, 0.30546968476846814,
      0.32397183775901794,
    ])
    const b = rng(101)
    expect([b(), b(), b(), b(), b()]).toEqual([
      0.1356478596571833, 0.764801949961111, 0.5406083094421774, 0.6430164149496704,
      0.3840809662360698,
    ])
  })
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = rng(7)
    const b = rng(7)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('curve', () => {
  const pts: [number, number][] = [
    [0, 0],
    [40, 30],
    [90, 10],
    [140, 60],
  ]
  it('samples about step apart and ends near the last point', () => {
    const c = curve(pts, 7)
    expect(c.length).toBeGreaterThan(10)
    for (let i = 1; i < c.length; i++) {
      const p = c[i - 1]
      const q = c[i]
      if (!p || !q) throw new Error('missing sample')
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      expect(d).toBeGreaterThan(5)
      // the curve is walked in sub-steps of at most ~2 px, so a sample can overshoot step by one
      expect(d).toBeLessThan(7 + 3)
    }
    const end = c[c.length - 1]
    expect(end && Math.hypot(end.x - 140, end.y - 60)).toBeLessThan(8)
    expect(curve(pts, 7)).toEqual(c)
  })
  it('runs along a horizontal line at angle 0', () => {
    const c = curve(
      [
        [0, 5],
        [100, 5],
      ],
      4,
    )
    expect(c.length).toBeGreaterThan(20)
    for (const q of c) {
      expect(q.ang).toBeCloseTo(0, 9)
      expect(q.y).toBeCloseTo(5, 9)
    }
  })
  it('is empty for no points', () => {
    expect(curve([], 3)).toEqual([])
  })
})

describe('brush', () => {
  const line = [
    [0, 0],
    [60, 0],
  ]
  it('draws a wide stroke as several bristles', () => {
    const { fake, pen } = makePen()
    fake.globalAlpha = 0.8
    pen.brush(line, 6, 'h')
    expect(fake.fills()).toHaveLength(Math.min(7, 2 + Math.floor(6 / 2.4)))
    expect(fake.globalAlpha).toBe(0.8)
  })
  it('draws a thin stroke as one ribbon', () => {
    const { fake, pen } = makePen()
    fake.globalAlpha = 0.5
    pen.brush(line, 2, 'v')
    expect(fake.fills()).toHaveLength(1)
    expect(fake.globalAlpha).toBe(0.5)
  })
  it('caps the bristles at seven', () => {
    const { fake, pen } = makePen()
    pen.brush(line, 40, 'gen')
    expect(fake.fills()).toHaveLength(7)
  })
  it('draws nothing for fewer than two points', () => {
    const { fake, pen } = makePen()
    pen.brush([[5, 5]], 6, 'h')
    pen.brush([], 6, 'h')
    expect(fake.calls).toHaveLength(0)
  })
})

describe('glyph', () => {
  it('writes a flowing character and a skeleton-only one', () => {
    for (const ch of ['山', '門']) {
      const { fake, pen } = makePen()
      pen.glyph(ch, BOX)
      expect(fake.fills().length).toBeGreaterThan(2)
    }
  })
  it('writes nothing for an unknown character and uses no random numbers', () => {
    const { fake, pen } = makePen()
    const ref = rng(23)
    pen.rand()
    ref()
    pen.glyph('☃', BOX)
    expect(fake.calls).toHaveLength(0)
    expect(pen.rand()).toBe(ref())
  })
  it('is deterministic for the same seed', () => {
    const a = makePen({ seed: 9 })
    const b = makePen({ seed: 9 })
    for (const { pen } of [a, b]) {
      pen.glyph('木', BOX)
      pen.glyph('門', { ...BOX, skew: 0.2 })
    }
    expect(a.fake.calls).toEqual(b.fake.calls)
    expect(a.fake.calls.length).toBeGreaterThan(0)
  })
  it('changes with rot and skew', () => {
    const draw = (o: Partial<typeof BOX & { rot: number; skew: number }>) => {
      const { fake, pen } = makePen()
      pen.glyph('門', { ...BOX, ...o })
      return fake.calls
    }
    const plain = draw({})
    expect(draw({ rot: 0.3 })).not.toEqual(plain)
    expect(draw({ skew: 0.3 })).not.toEqual(plain)
  })
})

describe('equivalence with the design mock-up', () => {
  it('records the same paths and alphas as the mock-up for a fixed script', () => {
    const r3 = (v: number) => Math.round(v * 1000) / 1000
    const ops: { a: number; f: unknown; p: (string | number)[] }[] = []
    let cur: (string | number)[] = []
    const fake = new FakeContext()
    fake.beginPath = () => {
      cur = []
    }
    fake.moveTo = (x, y) => {
      cur.push('M', r3(x), r3(y))
    }
    fake.lineTo = (x, y) => {
      cur.push(r3(x), r3(y))
    }
    fake.fill = () => {
      ops.push({ a: Math.round(fake.globalAlpha * 1e6) / 1e6, f: fake.fillStyle, p: cur })
    }
    const pen = new Pen(asCtx(fake), { W: 1200, H: 600, mode: 'zh', dpr: 2, live: false })
    pen.ink(INK, 0.9)
    pen.glyph('山', { x: 100, y: 100, w: 48, h: 36, W: 6, rot: 0.2, bend: 0.3 })
    fake.globalAlpha = 0.7
    pen.glyph('門', { x: 300, y: 100, w: 40, h: 46, W: 5, skew: 0.3 })
    pen.brush(
      [
        [10, 10],
        [30, 14],
        [50, 12],
      ],
      4,
      'dot',
    )
    pen.brush(
      [
        [60, 60],
        [64, 80],
      ],
      2,
      'v',
    )
    pen.glyph('木', { x: 400, y: 120, w: 44, h: 56, W: 7, taper: 0.5, jit: 0.1 })
    expect(ops.length).toBe(fixture.ops.length)
    expect(ops).toEqual(fixture.ops)
    expect(pen.rand()).toBe(fixture.next)
    const c = curve(
      [
        [0, 0],
        [40, 30],
        [90, 10],
        [140, 60],
      ],
      7,
    )
    expect(c.map((q) => [r3(q.x), r3(q.y), r3(q.ang)])).toEqual(fixture.curve)
    expect(fixture.rng23).toEqual(
      (() => {
        const r = rng(23)
        return [r(), r(), r(), r(), r()]
      })(),
    )
  })
})

describe('seeded', () => {
  it('runs on its own sequence and leaves the outer one untouched', () => {
    const { pen } = makePen()
    const outer = rng(23)
    expect(pen.rand()).toBe(outer())
    pen.seeded(101, () => {
      const inner = rng(101)
      for (let i = 0; i < 5; i++) expect(pen.rand()).toBe(inner())
    })
    expect(pen.rand()).toBe(outer())
  })
  it('starts with a fresh ink load and restores the outer one', () => {
    // a dry brush lifts bristles early; a fresh one draws the same as a new pen
    const fresh = makePen({ seed: 4 })
    fresh.pen.glyph('木', BOX)
    const used = makePen()
    for (let i = 0; i < 12; i++) used.pen.glyph('木', BOX)
    used.fake.calls = []
    used.pen.seeded(4, () => used.pen.glyph('木', BOX))
    expect(used.fake.calls).toEqual(fresh.fake.calls)
  })
  it('restores even when fn throws', () => {
    const { pen } = makePen()
    const keep = pen.rand
    expect(() =>
      pen.seeded(3, () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(pen.rand).toBe(keep)
  })
})

describe('withLive', () => {
  it('sets live for the call and restores it, also on throw', () => {
    const { pen } = makePen({ live: true })
    expect(pen.withLive(false, () => pen.live)).toBe(false)
    expect(pen.live).toBe(true)
    expect(() =>
      pen.withLive(false, () => {
        throw new Error('x')
      }),
    ).toThrow('x')
    expect(pen.live).toBe(true)
  })
})

describe('Pen', () => {
  it('derives its measures from the options', () => {
    const wide = makePen({ W: 1200, dpr: 2 }).pen
    expect([wide.wide, wide.u, wide.sd, wide.scene.sd]).toEqual([true, 1.2, 1.25, 1.25])
    const narrow = makePen({ W: 420, dpr: 2, mode: 'ja' }).pen
    expect([narrow.wide, narrow.u, narrow.sd, narrow.ja]).toEqual([false, 1, 1.5, true])
    expect(narrow.ch('鸟', '鳥')).toBe('鳥')
    expect(wide.ch('鸟', '鳥')).toBe('鸟')
    expect(wide.scene).toEqual({
      actors: [],
      sd: 1.25,
      sky: null,
      water: null,
      pond: null,
      road: null,
      kit: null,
    })
  })
  it('tints with a blurred fill and restores the context', () => {
    const { fake, pen } = makePen({ W: 2000 })
    pen.tint(INK, 0.2, 10, () => fake.moveTo(1, 2))
    expect(fake.calls.map((c) => c[0])).toEqual(['save', 'beginPath', 'moveTo', 'fill', 'restore'])
    expect(fake.filter).toBe('blur(20px)')
    expect(fake.fillStyle).toBe(rgba(INK, 0.2))
  })
})

describe('sprite', () => {
  it('throws clearly without a 2D canvas', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { pen } = makePen()
    expect(() => pen.sprite(10, 10, () => {})).toThrow(/2D canvas/)
  })
  it('paints offscreen, bleeds and tooths, and swaps the context back', () => {
    const made: FakeContext[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      const f = new FakeContext()
      made.push(f)
      return asCtx(f)
    })
    const { fake, pen } = makePen({ live: true })
    const outerCtx = pen.ctx
    const spr = pen.one('舟', 20, INK, 0.9)
    expect(pen.ctx).toBe(outerCtx)
    expect(fake.calls).toHaveLength(0)
    expect([spr.width, spr.height]).toEqual([Math.ceil(30 * 1.25), Math.ceil(30 * 1.25)])
    const sctx = made.find((f) => f.calls.some((c) => c[0] === 'fill'))
    if (!sctx) throw new Error('no sprite context')
    expect(sctx.calls[0]).toEqual(['setTransform', 1.25, 0, 0, 1.25, 0, 0])
    expect(sctx.calls).toContainEqual(['drawImage', 'blur(1.4px)', 0.34, 0, 0])
    expect(sctx.calls).toContainEqual(['fillRect', 'destination-out', 0.3, 0, 0, 30, 30])
  })
  it('finish bleeds and tooths the main surface', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
      asCtx(new FakeContext()),
    )
    const { fake, pen } = makePen()
    pen.finish(2, 300, 200)
    expect(fake.calls).toContainEqual(['drawImage', 'blur(2.3px)', 0.34, 0, 0])
    expect(fake.calls).toContainEqual(['fillRect', 'destination-out', 0.3, 0, 0, 300, 200])
  })
})
