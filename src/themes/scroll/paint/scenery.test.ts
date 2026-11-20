import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { roadLayout } from '../layout/road'
import type { HallLayout, HouseBox, Rect } from '../layout/types'
import fixture from './scenery.fixture.json'
import { makeKit, paintEnd, paintRoad, paintTop, paintWorks } from './bands'
import { drawHouse, houseSeed } from './house'
import { Pen } from './pen'
import type { BandScene, PathPt } from './types'

/* The scenery must paint exactly what the design mock-up paints for
 the same layout. scenery.fixture.json holds the scenarios (hand-written rectangles resembling the
 real page) and digests produced by running the mock-up's own paintScene on a fake
 DOM with the same recording context as below. */

// ---------- the scenarios, as stored in the fixture ----------
interface HallSpec {
  box: Rect
  bays: Rect
  /** Bays sit directly in .bays, without storeys. */
  flat: boolean
  storeys: { r: Rect; bays: Rect[] }[]
}
interface BaseSpec {
  name: string
  W: number
  H: number
}
type Spec = BaseSpec &
  (
    | { band: 'top'; peaks: Rect; hall: HallSpec }
    | { band: 'works'; houses: HouseBox[] }
    | { band: 'road'; road: Rect; heights: number[]; tall: number }
    | { band: 'end'; hall: HallSpec; ground: Rect }
  )
interface GroupDigest {
  fills: number
  pts: number
  hash: number
  sizes: number[][]
  perCanvas: number[]
}
interface Digest {
  band: GroupDigest
  houses: GroupDigest[]
  actors: { n: number; kinds: Record<string, number>; hash: number }
  sky: unknown
  water: unknown
  pond: unknown
  road: unknown
  kit: unknown
}
interface Fixture {
  scenarios: Spec[]
  digests: Record<string, Digest>
}
const fx = fixture as unknown as Fixture

// ---------- a recording 2D context shared by the band and all its sprites ----------
interface CanvasRec {
  w: number
  h: number
  tooth: boolean
  house: number
}
type Ev =
  | { c: number; t: 'F'; a: number; f: string; filter: string; pts: number[] }
  | { c: number; t: 'T'; x: number; y: number }
let canvases: CanvasRec[] = []
let events: Ev[] = []

class FakeContext {
  readonly id: number
  globalAlpha = 1
  fillStyle: unknown = '#000'
  filter = 'none'
  globalCompositeOperation = 'source-over'
  private stack: [number, unknown, string, string][] = []
  private cur: number[] = []
  constructor(readonly canvas: { width: number; height: number }) {
    this.id = canvases.length
    canvases.push({ w: canvas.width, h: canvas.height, tooth: false, house: -1 })
  }
  save() {
    this.stack.push([this.globalAlpha, this.fillStyle, this.filter, this.globalCompositeOperation])
  }
  restore() {
    const s = this.stack.pop()
    if (s) [this.globalAlpha, this.fillStyle, this.filter, this.globalCompositeOperation] = s
  }
  beginPath() {
    this.cur = []
  }
  moveTo(x: number, y: number) {
    this.cur.push(x, y)
  }
  lineTo(x: number, y: number) {
    this.cur.push(x, y)
  }
  closePath() {}
  fill() {
    events.push({
      c: this.id,
      t: 'F',
      a: this.globalAlpha,
      f: String(this.fillStyle),
      filter: this.filter,
      pts: this.cur,
    })
  }
  translate(x: number, y: number) {
    events.push({ c: this.id, t: 'T', x, y })
  }
  setTransform() {}
  clearRect() {}
  fillRect() {}
  drawImage() {}
  createPattern() {
    return { pattern: true }
  }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4) }
  }
  putImageData() {
    const rec = canvases[this.id]
    if (rec) rec.tooth = true
  }
}
const asCtx = (f: FakeContext) => f as unknown as CanvasRenderingContext2D

const spriteIds = new WeakMap<HTMLCanvasElement, number>()
beforeEach(() => {
  canvases = []
  events = []
  const made = new WeakMap<HTMLCanvasElement, FakeContext>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    let f = made.get(this)
    if (!f) {
      f = new FakeContext(this)
      made.set(this, f)
      spriteIds.set(this, f.id)
    }
    return asCtx(f)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ---------- digests (the same as the generator's) ----------
const r2 = (v: number) => Math.round(v * 100) / 100
const r3 = (v: number) => Math.round(v * 1000) / 1000
const r4 = (v: number) => Math.round(v * 10000) / 10000
function fnv() {
  let h = 0x811c9dc5
  const step = (c: number) => {
    h ^= c
    h = Math.imul(h, 16777619) >>> 0
  }
  return {
    add(s: string) {
      for (let i = 0; i < s.length; i++) step(s.charCodeAt(i))
      step(124)
    },
    get: () => h >>> 0,
  }
}
function groupDigest(ids: number[]): GroupDigest {
  const index = new Map(ids.map((id, i) => [id, i]))
  const hash = fnv()
  let fills = 0
  let pts = 0
  const perCanvas = ids.map(() => 0)
  for (const e of events) {
    const i = index.get(e.c)
    if (i === undefined) continue
    if (e.t === 'F') {
      fills++
      pts += e.pts.length / 2
      perCanvas[i] = (perCanvas[i] ?? 0) + 1
      hash.add('F' + i)
      hash.add(String(r4(e.a)))
      hash.add(e.f)
      hash.add(e.filter)
      hash.add(e.pts.map(r2).join(','))
    } else {
      hash.add('T' + i)
      hash.add(r2(e.x) + ',' + r2(e.y))
    }
  }
  const sizes = ids.map((id) => {
    const c = canvases[id]
    return c ? [c.w, c.h] : []
  })
  return { fills, pts, hash: hash.get(), sizes, perCanvas }
}
function canon(v: unknown): unknown {
  if (typeof v === 'number') return r3(v)
  if (v instanceof HTMLCanvasElement) return [v.width, v.height]
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') {
    const src = v as Record<string, unknown>
    const o: Record<string, unknown> = {}
    for (const k of Object.keys(src).sort()) o[k] = canon(src[k])
    return o
  }
  return v === undefined ? null : v
}
const pathSum = (p: PathPt[] | null) =>
  p ? { n: p.length, first: canon(p[0]), last: canon(p[p.length - 1]) } : null
function digest(scene: BandScene, houses: number): Digest {
  const idsWhere = (keep: (c: CanvasRec) => boolean) =>
    canvases.flatMap((c, id) => (keep(c) ? [id] : []))
  const actors = scene.actors
  const h = fnv()
  for (const a of actors) h.add(JSON.stringify(canon(a)))
  const kinds: Record<string, number> = {}
  for (const a of actors) kinds[a.k] = (kinds[a.k] ?? 0) + 1
  return {
    band: groupDigest(idsWhere((c) => !c.tooth && c.house < 0)),
    houses: Array.from({ length: houses }, (_, i) => groupDigest(idsWhere((c) => c.house === i))),
    actors: { n: actors.length, kinds, hash: h.get() },
    sky: canon(scene.sky),
    water: pathSum(scene.water),
    pond: pathSum(scene.pond),
    road: scene.road ? { C: pathSum(scene.road.C), idx: scene.road.idx.slice() } : null,
    kit: scene.kit ? canon(scene.kit) : null,
  }
}

// ---------- the scenarios as layout objects, the way the page measures them ----------
function hallLayout(h: HallSpec, wide: boolean): HallLayout {
  // storeys when wide, otherwise (or when there are none) one floor holding all bays
  const floors =
    wide && !h.flat && h.storeys.length
      ? h.storeys
      : [{ r: h.bays, bays: h.storeys.flatMap((s) => s.bays) }]
  return { bays: h.bays, floors }
}

function paint(s: Spec, mode: 'zh' | 'ja', live: boolean): Digest {
  const main = new FakeContext({ width: 0, height: 0 })
  const p = new Pen(asCtx(main), { W: s.W, H: s.H, mode, dpr: 2, live })
  let houses = 0
  if (s.band === 'top') {
    paintTop(p, { peaks: s.peaks, hallTop: s.hall.box.y, hall: hallLayout(s.hall, p.wide) })
  } else if (s.band === 'works') {
    paintWorks(p, { houses: s.houses })
    houses = s.houses.length
    // each house on its own canvas, as the mock-up paints it on first paint
    s.houses.forEach((h, i) => {
      const padX = p.wide ? 70 : 24
      const padT = 34
      const padB = 40
      const bw = h.r.w + padX * 2
      const bh = h.r.h + padT + padB
      const bx = h.r.x - padX
      const by = h.r.y - padT
      const geom = { r: h.r, padTop: h.padTop, t: h.open ? 1 : 0, win: h.win }
      const cv = p.withLive(false, () =>
        p.sprite(
          bw,
          bh,
          () => {
            p.ctx.translate(-bx, -by)
            p.seeded(houseSeed(i), () => drawHouse(p, geom))
          },
          p.dpr,
        ),
      )
      const rec = canvases[spriteIds.get(cv) ?? -1]
      if (rec) rec.house = i
    })
  } else if (s.band === 'road') {
    paintRoad(p, { road: s.road, layout: roadLayout(s.road.w, s.heights, s.tall), tall: s.tall })
  } else {
    paintEnd(p, { hall: hallLayout(s.hall, p.wide), ground: s.ground })
  }
  if (live) makeKit(p)
  return digest(p.scene, houses)
}

describe('equivalence with the design mock-up', () => {
  const cases = fx.scenarios.flatMap((s) =>
    (['zh', 'ja'] as const).flatMap((mode) => [false, true].map((live) => ({ s, mode, live }))),
  )
  it.each(cases.map((c) => [`${c.s.name}-${c.mode}-${c.live ? 'live' : 'still'}`, c] as const))(
    '%s paints what the mock-up paints',
    (key, { s, mode, live }) => {
      const want = fx.digests[key]
      expect(want).toBeDefined()
      expect(paint(s, mode, live)).toEqual(want)
    },
  )
  it('covers every band in both modes, both sizes, still and live', () => {
    expect(Object.keys(fx.digests)).toHaveLength(48)
  })
})

// ---------- without the fixture ----------
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
function pen(over: { W?: number; mode?: 'zh' | 'ja'; live?: boolean } = {}) {
  const main = new FakeContext({ width: 0, height: 0 })
  const p = new Pen(asCtx(main), {
    W: over.W ?? 1050,
    H: 1200,
    mode: over.mode ?? 'zh',
    dpr: 2,
    live: over.live ?? false,
  })
  return p
}
const house = (x: number, y: number, open: boolean): HouseBox => ({
  r: R(x, y, 300, 360),
  padTop: 90,
  open,
  win: open ? R(x + 20, y + 120, 200, 120) : null,
})

describe('edge cases', () => {
  it('paints zero houses, zero stops, a single bay and a single stop without throwing', () => {
    for (const W of [1050, 340]) {
      for (const live of [false, true]) {
        for (const mode of ['zh', 'ja'] as const) {
          const p = pen({ W, live, mode })
          expect(() => paintWorks(p, { houses: [] })).not.toThrow()
          const road0 = {
            road: R(20, 200, W - 40, 0),
            layout: roadLayout(W - 40, [], 150),
            tall: 150,
          }
          expect(() => paintRoad(p, road0)).not.toThrow()
          expect(p.scene.sky).toEqual({ x0: 0, x1: W, y0: 10 * p.u, y1: 56 * p.u })
          const road1 = {
            road: R(20, 200, W - 40, 220),
            layout: roadLayout(W - 40, [140], 150),
            tall: 150,
          }
          expect(() => paintRoad(p, road1)).not.toThrow()
          const one = R(300, 400, 300, 280)
          const hl: HallLayout = { bays: one, floors: [{ r: one, bays: [one] }] }
          expect(() =>
            paintTop(p, { peaks: R(10, 20, W - 20, 300), hallTop: 380, hall: hl }),
          ).not.toThrow()
          expect(() => paintEnd(p, { hall: hl, ground: R(0, 800, W, 300) })).not.toThrow()
          expect(() =>
            paintEnd(p, { hall: { bays: one, floors: [] }, ground: R(0, 800, W, 300) }),
          ).not.toThrow()
          if (live) expect(() => makeKit(p)).not.toThrow()
        }
      }
    }
  })
  it('paints only the reeds and the sky for a road without stops', () => {
    const p = pen({ live: true })
    paintRoad(p, { road: R(45, 260, 960, 0), layout: roadLayout(960, [], 150), tall: 150 })
    expect(p.scene.actors.every((a) => a.k === 'sway')).toBe(true)
    expect(p.scene.road).toBeNull()
    expect(p.scene.sky).not.toBeNull()
  })
})

describe('paintWorks', () => {
  const houses = [
    house(30, 200, false),
    house(375, 200, true),
    house(720, 200, false),
    house(30, 640, true),
  ]
  it('pushes one smoke actor per open house, only when live', () => {
    const live = pen({ live: true })
    paintWorks(live, { houses })
    const smoke = live.scene.actors.filter((a) => a.k === 'smoke')
    expect(smoke).toHaveLength(2)
    for (const a of smoke) if (a.k === 'smoke') expect(a.sprs).toHaveLength(3)
    expect(live.scene.actors.filter((a) => a.k === 'flock')).toHaveLength(1)
    const still = pen()
    paintWorks(still, { houses })
    expect(still.scene.actors).toHaveLength(0)
  })
  it('does not paint the houses themselves', () => {
    const p = pen()
    const glyph = vi.spyOn(p, 'glyph')
    paintWorks(p, { houses: [house(30, 200, true), house(375, 200, true)] })
    expect(glyph).not.toHaveBeenCalled()
  })
})

describe('paintRoad', () => {
  const heights = [140, 150, 130]
  const band = { road: R(45, 260, 960, 0), layout: roadLayout(960, heights, 160), tall: 160 }
  it('in Japanese and live, pushes one flickering lantern per stop', () => {
    const p = pen({ mode: 'ja', live: true })
    paintRoad(p, band)
    const flicks = p.scene.actors.flatMap((a) => (a.k === 'flick' ? [a.i] : []))
    expect(flicks).toEqual([0, 1, 2])
    expect(p.scene.actors.filter((a) => a.k === 'walker')).toHaveLength(1)
    expect(p.scene.road?.idx).toHaveLength(3)
  })
  it('in Chinese, writes a marker stone at every stop', () => {
    const p = pen()
    const glyph = vi.spyOn(p, 'glyph')
    paintRoad(p, band)
    const markers = glyph.mock.calls.filter(([ch, o]) => ch === '石' && o.w === 40 && o.h === 32)
    expect(markers.map(([, o]) => [o.x, o.y])).toEqual(
      band.layout.pts.map((q) => [45 + q[0], 260 + q[1]]),
    )
    expect(p.scene.actors.filter((a) => a.k === 'flick')).toHaveLength(0)
  })
})

describe('houses', () => {
  it('seeds every house by its index', () => {
    expect(houseSeed(3)).toBe(104)
    expect(houseSeed(0)).toBe(101)
  })
  it('paints the same house the same way from its seed, and frames the window only when open', () => {
    const draw = (t: number) => {
      const p = pen()
      const glyph = vi.spyOn(p, 'glyph')
      p.seeded(houseSeed(2), () =>
        drawHouse(p, { r: R(30, 200, 300, 360), padTop: 90, t, win: R(60, 300, 200, 120) }),
      )
      return glyph.mock.calls.map(([ch, o]) => [ch, r3(o.x), r3(o.y)])
    }
    expect(draw(1)).toEqual(draw(1))
    const open = draw(1)
    const closed = draw(0)
    // the window's two posts (柱 half a wide grid of 22 outside its sides) exist only when open
    const atWin = (calls: unknown[][]) =>
      calls.filter(([ch, x]) => ch === '柱' && (x === 60 - 11 || x === 260 + 11))
    expect(atWin(open).length).toBeGreaterThan(0)
    expect(atWin(closed)).toHaveLength(0)
  })
})
