import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fitAll, fitInscription, fitPending } from '../layout/dom'
import type * as Dom from '../layout/dom'
import { measureEnd, measureHall, measureRoad, measureTop, measureWorks } from '../layout/measure'
import { roadLayout } from '../layout/road'
import type { BandId } from '../layout/types'
import { drawHouse, houseSeed } from './house'
import { Pen } from './pen'
import { createPainting, type Painting } from './painting'
import { paintRoad } from './bands'
import type * as Bands from './bands'

// every painter is the real one; a test can make one throw once
vi.mock('./bands', async (importOriginal) => {
  const real = await importOriginal<typeof Bands>()
  return { ...real, paintRoad: vi.fn(real.paintRoad) }
})
// the real measure-and-set helpers, watched
vi.mock('../layout/dom', async (importOriginal) => {
  const real = await importOriginal<typeof Dom>()
  return {
    ...real,
    fitAll: vi.fn(real.fitAll),
    fitInscription: vi.fn(real.fitInscription),
    fitPending: vi.fn(real.fitPending),
  }
})

/* The glue between the page and the painters: measuring the DOM into layouts, and the painting
 controller that sizes the canvases, paints them and keeps them up to date. jsdom has no layout and
 no canvas, so boxes are stubbed per element and canvases get a recording fake context. */

// ---------- element boxes ----------
function place(el: Element, x: number, y: number, w: number, h: number): void {
  el.getBoundingClientRect = () =>
    ({
      left: x,
      top: y,
      width: w,
      height: h,
      right: x + w,
      bottom: y + h,
      x,
      y,
      toJSON: () => ({}),
    }) as DOMRect
}
function setNumber(el: Element, prop: 'offsetHeight' | 'clientWidth', value: number): void {
  Object.defineProperty(el, prop, { configurable: true, value })
}
function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent: Element,
  box?: [number, number, number, number],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  parent.appendChild(el)
  if (box) place(el, ...box)
  return el
}

// ---------- a recording 2D context ----------
interface Fill {
  canvas: HTMLCanvasElement
  a: number
  f: string
  pts: number[]
}
let fills: Fill[] = []
/** A fillRect or drawImage, with the translate in effect when it was issued. */
interface Op {
  canvas: HTMLCanvasElement
  kind: 'fillRect' | 'drawImage'
  args: number[]
  tx: number
  ty: number
}
let ops: Op[] = []

class FakeContext {
  globalAlpha = 1
  fillStyle: unknown = '#000'
  filter = 'none'
  globalCompositeOperation = 'source-over'
  private cur: number[] = []
  private tx = 0
  private ty = 0
  private stack: [number, number][] = []
  constructor(readonly canvas: HTMLCanvasElement) {}
  save() {
    this.stack.push([this.tx, this.ty])
  }
  restore() {
    const top = this.stack.pop()
    if (top) [this.tx, this.ty] = top
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
    fills.push({
      canvas: this.canvas,
      a: this.globalAlpha,
      f: String(this.fillStyle),
      pts: this.cur,
    })
  }
  translate(x: number, y: number) {
    this.tx += x
    this.ty += y
  }
  setTransform(_a: number, _b: number, _c: number, _d: number, e: number, f: number) {
    this.tx = e
    this.ty = f
  }
  clearRect() {}
  fillRect(x: number, y: number, w: number, h: number) {
    ops.push({
      canvas: this.canvas,
      kind: 'fillRect',
      args: [x, y, w, h],
      tx: this.tx,
      ty: this.ty,
    })
  }
  drawImage(_image: unknown, x: number, y: number) {
    ops.push({ canvas: this.canvas, kind: 'drawImage', args: [x, y], tx: this.tx, ty: this.ty })
  }
  createPattern() {
    return {}
  }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4) }
  }
  putImageData() {}
}
const asCtx = (f: FakeContext) => f as unknown as CanvasRenderingContext2D
const fillsOn = (c: Element | null) => fills.filter((f) => f.canvas === c)
const opsOn = (c: Element | null, kind: Op['kind']) =>
  ops.filter((o) => o.canvas === c && o.kind === kind)

// ---------- a fake ResizeObserver ----------
class FakeObserver {
  static all: FakeObserver[] = []
  observed: Element[] = []
  disconnected = false
  constructor(readonly callback: ResizeObserverCallback) {
    FakeObserver.all.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
    this.observed = []
  }
  /** Report these elements at these sizes. */
  fire(sizes: [Element, number, number][]) {
    const entries = sizes.map(
      ([target, width, height]) =>
        ({ target, contentRect: { width, height } }) as ResizeObserverEntry,
    )
    this.callback(entries, this as unknown as ResizeObserver)
  }
}

function withCanvas() {
  const made = new WeakMap<HTMLCanvasElement, FakeContext>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    let f = made.get(this)
    if (!f) {
      f = new FakeContext(this)
      made.set(this, f)
    }
    return asCtx(f)
  })
  vi.stubGlobal('CanvasRenderingContext2D', class {})
  vi.stubGlobal('ResizeObserver', FakeObserver)
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
}

beforeEach(() => {
  fills = []
  ops = []
  FakeObserver.all = []
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

// ---------- a small page ----------
const W = 1000

function hallInto(
  parent: Element,
  cls: string,
  box: [number, number, number, number],
  rows: number[][][],
) {
  const hall = make('section', cls, parent, box)
  const bays = make('div', 'bays', hall, [box[0], box[1] + 40, box[2], box[3] - 40])
  let y = box[1] + 40
  for (const row of rows) {
    const st = make('div', 'storey', bays, [box[0], y, box[2], 200])
    for (const [x, w] of row) make('article', 'bay', st, [x ?? 0, y, w ?? 0, 200])
    y += 220
  }
  return hall
}

function bandEl(root: Element, id: BandId, y: number, h: number) {
  const band = make('section', 'band', root, [0, y, W, h])
  band.dataset.band = id
  make('canvas', 'paint', band)
  make('canvas', 'paint anim', band)
  return band
}

function page() {
  const root = make('div', 'scroll-theme', document.body, [0, 0, W, 4000])
  const top = bandEl(root, 'top', 0, 1200)
  const upper = make('div', 'upper', top, [55, 0, 890, 500])
  make('div', 'peaks', upper, [55, 40, 500, 420])
  hallInto(
    top,
    'hall',
    [55, 700, 890, 300],
    [
      [
        [90, 250],
        [375, 250],
        [660, 250],
      ],
    ],
  )
  const works = bandEl(root, 'works', 1200, 900)
  const village = make('div', 'village', works)
  const houses = [0, 1, 2].map((i) => {
    const house = make('div', 'house', village, [55 + i * 300, 1400, 280, 300])
    house.style.paddingTop = '114px'
    make('canvas', 'bld', house)
    const hd = make('button', 'hd', house)
    const motif = make('canvas', 'motif', hd)
    motif.dataset.m = (['duel', 'sport', 'lamp'] as const)[i]
    return house
  })
  const road = bandEl(root, 'road', 2100, 900)
  const ol = make('ol', 'road', road, [55, 2300, 890, 600])
  setNumber(ol, 'clientWidth', 890)
  for (let i = 0; i < 3; i++) setNumber(make('li', 'stop', ol), 'offsetHeight', 140 + i * 10)
  const end = bandEl(root, 'end', 3000, 1000)
  hallInto(end, 'pavilion hall', [200, 3300, 600, 340], [[[234, 532]]])
  make('div', 'ground', end, [55, 3700, 890, 236])
  return { root, top, works, road, end, houses }
}
const paintCanvas = (band: Element) => band.querySelector(':scope > canvas.paint:not(.anim)')

// ---------- measure ----------
describe('measure', () => {
  it('takes the storeys as floors when wide, and one floor of all bays when narrow', () => {
    const band = make('div', 'band', document.body, [100, 50, 1000, 1000])
    const hall = hallInto(
      band,
      'hall',
      [150, 550, 900, 500],
      [
        [
          [250, 250],
          [600, 250],
        ],
        [
          [150, 250],
          [450, 250],
          [800, 250],
        ],
      ],
    )
    const wide = measureHall(hall, band, true)
    expect(wide.bays).toEqual({ x: 50, y: 540, w: 900, h: 460 })
    expect(wide.floors).toHaveLength(2)
    expect(wide.floors[0]?.r).toEqual({ x: 50, y: 540, w: 900, h: 200 })
    expect(wide.floors[0]?.bays.map((b) => b.x)).toEqual([150, 500])
    expect(wide.floors[1]?.bays).toHaveLength(3)
    const narrow = measureHall(hall, band, false)
    expect(narrow.floors).toHaveLength(1)
    expect(narrow.floors[0]?.r).toEqual(narrow.bays)
    expect(narrow.floors[0]?.bays).toHaveLength(5)
  })

  it('measures a pavilion without storeys as one floor', () => {
    const band = make('div', 'band', document.body, [0, 0, 1000, 800])
    const pv = make('div', 'pavilion hall', band, [200, 100, 600, 300])
    const bays = make('div', 'bays', pv, [200, 120, 600, 280])
    make('div', 'bay', bays, [234, 120, 532, 280])
    const l = measureHall(pv, band, true)
    expect(l.floors).toEqual([{ r: l.bays, bays: [{ x: 234, y: 120, w: 532, h: 280 }] }])
  })

  it('measures the top band, and without experience keeps the peaks and paints no hall', () => {
    const { top } = page()
    const l = measureTop(top)
    expect(l?.peaks).toEqual({ x: 55, y: 40, w: 500, h: 420 })
    expect(l?.hallTop).toBe(700)
    expect(l?.hall.floors[0]?.bays).toHaveLength(3)
    top.querySelector('section.hall')?.remove()
    const bare = measureTop(top)
    expect(bare?.peaks).toEqual({ x: 55, y: 40, w: 500, h: 420 })
    expect(bare?.hall.floors).toEqual([])
    // the bottom of .upper (500) plus .hall's margin-top: 358 on a wide viewport...
    expect(bare?.hallTop).toBe(858)
    // ...and 244 up to 760 px of viewport, whatever the band's own width
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 760px)' }))
    try {
      expect(measureTop(top)?.hallTop).toBe(744)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('measures the houses, open and closed, with the window of the open one', () => {
    const { works, houses } = page()
    const open = houses[1]
    if (!open) throw new Error('no house')
    open.classList.add('open')
    make('div', 'win blank', open, [400, 1600, 220, 124])
    const l = measureWorks(works)
    expect(l.houses.map((h) => h.open)).toEqual([false, true, false])
    expect(l.houses[0]).toEqual({
      r: { x: 55, y: 200, w: 280, h: 300 },
      padTop: 114,
      open: false,
      win: null,
    })
    expect(l.houses[1]?.win).toEqual({ x: 400, y: 400, w: 220, h: 124 })
  })

  it('lays the road out from data-tall and the stops’ heights, as sizeRoad does', () => {
    const { road } = page()
    const ol = road.querySelector<HTMLElement>('ol.road')
    if (!ol) throw new Error('no road')
    expect(measureRoad(road)?.tall).toBe(150)
    ol.dataset.tall = '170'
    const l = measureRoad(road)
    expect(l?.road).toEqual({ x: 55, y: 200, w: 890, h: 600 })
    expect(l?.tall).toBe(170)
    expect(l?.layout).toEqual(roadLayout(890, [140, 150, 160], 170))
    ol.remove()
    expect(measureRoad(road)).toBeNull()
  })

  it('measures the end band', () => {
    const { end } = page()
    const l = measureEnd(end)
    expect(l?.ground).toEqual({ x: 55, y: 700, w: 890, h: 236 })
    expect(l?.hall.floors[0]?.bays).toEqual([{ x: 234, y: 340, w: 532, h: 200 }])
  })
})

// ---------- the controller ----------
describe('createPainting', () => {
  it('returns null in plain jsdom, without logging', () => {
    const error = vi.spyOn(console, 'error')
    const { root } = page()
    expect(createPainting(root, () => 'zh')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  function ready(): { painting: Painting } & ReturnType<typeof page> {
    withCanvas()
    const p = page()
    const painting = createPainting(p.root, () => 'zh')
    if (!painting) throw new Error('no painting')
    return { painting, ...p }
  }

  it('sizes every band canvas to its box at the pixel ratio and keeps each band’s scene', () => {
    const { painting, root } = ready()
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    expect(painting.scene('top')).toBeNull()
    painting.repaint()
    expect(painted).toEqual(['top', 'works', 'road', 'end'])
    for (const band of root.querySelectorAll<HTMLElement>('.band')) {
      const c = paintCanvas(band) as HTMLCanvasElement
      const box = band.getBoundingClientRect()
      expect([c.width, c.height]).toEqual([box.width * 2, box.height * 2])
      expect(fillsOn(c).length).toBeGreaterThan(0)
      // the motion layer's canvas is left alone
      expect(fillsOn(band.querySelector('canvas.anim'))).toHaveLength(0)
    }
    expect(painting.scene('top')?.sky).not.toBeNull()
    expect(painting.scene('road')?.actors).toEqual([])
    painting.destroy()
  })

  it('repaints only the band asked for', () => {
    const { painting, top, works } = ready()
    painting.repaint()
    const before = fillsOn(paintCanvas(top)).length
    const worksBefore = fillsOn(paintCanvas(works)).length
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    painting.repaint('works')
    expect(painted).toEqual(['works'])
    expect(fillsOn(paintCanvas(top))).toHaveLength(before)
    expect(fillsOn(paintCanvas(works)).length).toBeGreaterThan(worksBefore)
  })

  it('paints each house on its own canvas, again only when its key changes', () => {
    const { painting, houses } = ready()
    const bld = houses.map((h) => h.querySelector<HTMLCanvasElement>('canvas.bld'))
    painting.repaint()
    const counts = () => bld.map((c) => fillsOn(c).length)
    const first = counts()
    expect(first.every((n) => n > 0)).toBe(true)
    // wide band: 70 px each side, 34 above, 40 below, at pixel ratio 2
    expect(bld[0]?.style.left).toBe('-70px')
    expect(bld[0]?.style.top).toBe('-34px')
    expect(bld[0]?.style.width).toBe('420px')
    expect([bld[0]?.width, bld[0]?.height]).toEqual([840, 748])
    painting.repaint()
    expect(counts()).toEqual(first)
    houses[0]?.classList.add('open')
    painting.repaint('works')
    const second = counts()
    expect(second[0]).toBeGreaterThan(first[0] ?? 0)
    expect(second.slice(1)).toEqual(first.slice(1))
  })

  it('paints a house the way the mock-up does through the band’s pen', () => {
    const { painting, houses } = ready()
    painting.repaint()
    const i = 2
    const mine = fillsOn(houses[i]?.querySelector('canvas.bld') ?? null)
    // the mock-up: a sprite of the band's pen, translated to the house, seeded by the house
    const ref = document.createElement('canvas')
    const p = new Pen(ref.getContext('2d') as CanvasRenderingContext2D, {
      W,
      H: 900,
      mode: 'zh',
      dpr: 2,
      live: false,
    })
    const sprite = p.sprite(
      420,
      374,
      () =>
        p.seeded(houseSeed(i), () =>
          drawHouse(p, { r: { x: 655, y: 200, w: 280, h: 300 }, padTop: 114, t: 0, win: null }),
        ),
      2,
    )
    const want = fillsOn(sprite)
    expect(mine).toHaveLength(want.length)
    // like the mock-up, the house is drawn in band coordinates under a translate of the house canvas
    mine.forEach((f, k) => {
      const w = want[k]
      expect(f.a).toBeCloseTo(w?.a ?? NaN, 9)
      expect(f.f).toBe(w?.f)
      f.pts.forEach((v, j) => expect(v).toBeCloseTo(w?.pts[j] ?? NaN, 6))
    })
  })

  it('finishes a house canvas as the mock-up did: tooth under the translate, bleed under none', () => {
    const { painting, houses } = ready()
    painting.repaint()
    const bld = houses[0]?.querySelector('canvas.bld') ?? null
    // house 0 is at (55, 200) in the band, 280 x 300: bx = 55 - 70, by = 200 - 34
    expect(opsOn(bld, 'fillRect')).toEqual([
      { canvas: bld, kind: 'fillRect', args: [0, 0, 420, 374], tx: 15, ty: -166 },
    ])
    const bleed = opsOn(bld, 'drawImage')
    expect(bleed).toHaveLength(1)
    expect([bleed[0]?.tx, bleed[0]?.ty]).toEqual([0, 0])
  })

  it('draws a house at any rectangle the same way every time, and each house differently', () => {
    const { painting } = ready()
    painting.repaint()
    const draw = (index: number) => {
      const c = document.createElement('canvas')
      painting.drawHouseAt(
        c.getContext('2d') as CanvasRenderingContext2D,
        1.25,
        index,
        { x: 40, y: 100, w: 400, h: 420 },
        114,
        0.5,
      )
      return fillsOn(c).map((f) => [f.a, f.f, f.pts])
    }
    const a = draw(1)
    expect(a.length).toBeGreaterThan(0)
    expect(draw(1)).toEqual(a)
    expect(draw(0)).not.toEqual(a)
  })

  it('draws the motifs at rest, and the big one in a window larger', () => {
    const { painting, houses } = ready()
    const open = houses[1]
    if (!open) throw new Error('no house')
    open.classList.add('open')
    const win = make('div', 'win blank', open, [400, 1600, 400, 225])
    const big = make('canvas', 'motif big', win, [420, 1620, 216, 138])
    big.dataset.m = 'sport'
    painting.repaint('works')
    for (const c of document.querySelectorAll('canvas.motif')) {
      expect(fillsOn(c).length).toBeGreaterThan(0)
    }
    const small = houses[0]?.querySelector<HTMLCanvasElement>('canvas.motif')
    expect([small?.width, small?.height]).toEqual([300, 192])
    // the canvas's own CSS box: 216 / 150 = 1.44 times the motif
    expect(big.width).toBe(Math.round(150 * 2 * 1.44))
  })

  it('follows a band that changes size, a little later, and only that band', () => {
    vi.useFakeTimers()
    const { painting, works, top } = ready()
    painting.repaint()
    const ro = FakeObserver.all[0]
    expect(ro?.observed).toHaveLength(4)
    // the sizes it was painted at: nothing to do
    ro?.fire([
      [top, 890, 1200],
      [works, 890, 900],
    ])
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    vi.advanceTimersByTime(500)
    expect(painted).toEqual([])
    place(works, 0, 1200, W, 1300)
    ro?.fire([[works, 890, 1300]])
    vi.advanceTimersByTime(100)
    expect(painted).toEqual([])
    vi.advanceTimersByTime(100)
    expect(painted).toEqual(['works'])
    painting.destroy()
  })

  it('queues a band that was never painted', () => {
    vi.useFakeTimers()
    const { painting, works } = ready()
    const ro = FakeObserver.all[0]
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    ro?.fire([[works, 890, 900]])
    vi.advanceTimersByTime(200)
    expect(painted).toEqual(['works'])
    painting.destroy()
  })

  it('does not repaint a second time for a size an explicit repaint already painted', () => {
    vi.useFakeTimers()
    const { painting, works } = ready()
    painting.repaint()
    const ro = FakeObserver.all[0]
    place(works, 0, 1200, W, 1300)
    painting.repaint('works')
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    ro?.fire([[works, 890, 1300]])
    vi.advanceTimersByTime(500)
    expect(painted).toEqual([])
    painting.destroy()
  })

  it('ignores size changes while held, and repaints the changed bands on release', () => {
    vi.useFakeTimers()
    const { painting, works } = ready()
    painting.repaint()
    const ro = FakeObserver.all[0]
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    painting.hold()
    place(works, 0, 1200, W, 1300)
    ro?.fire([[works, 890, 1300]])
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(500)
    expect(painted).toEqual([])
    // explicit repaints still work while held
    painting.repaint('top')
    expect(painted).toEqual(['top'])
    painted.length = 0
    painting.release()
    expect(painted).toEqual(['works'])
    // nothing more is queued, and a release with nothing changed paints nothing
    vi.advanceTimersByTime(500)
    painting.hold()
    painting.release()
    expect(painted).toEqual(['works'])
    // but the page is fitted again on every release (the road is sized again)
    const road = document.querySelector<HTMLElement>('ol.road')
    if (!road) throw new Error('no road')
    road.style.height = ''
    painting.hold()
    painting.release()
    expect(road.style.height).not.toBe('')
    expect(painted).toEqual(['works'])
    painting.destroy()
  })

  it('logs a band whose painter throws and still paints the others', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { painting } = ready()
    const boom = new Error('boom')
    vi.mocked(paintRoad).mockImplementationOnce(() => {
      throw boom
    })
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    painting.repaint()
    expect(error).toHaveBeenCalledWith('scroll theme: painting failed', 'road', boom)
    expect(painted).toEqual(['top', 'works', 'end'])
    painting.destroy()
  })

  it('paints a page with only the top and end bands (no projects, no hackathons)', () => {
    const error = vi.spyOn(console, 'error')
    const { painting, works, road } = ready()
    works.remove()
    road.remove()
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    expect(() => painting.repaint()).not.toThrow()
    expect(() => painting.relayout()).not.toThrow()
    expect(() => painting.setLive(true)).not.toThrow()
    expect(painted.filter((b) => b === 'works' || b === 'road')).toEqual([])
    expect(painted).toContain('top')
    expect(painted).toContain('end')
    expect(error).not.toHaveBeenCalled()
    painting.destroy()
  })

  it('repaints when live changes', () => {
    const { painting } = ready()
    const painted: BandId[] = []
    painting.onPainted((band) => painted.push(band))
    painting.setLive(false)
    expect(painted).toEqual([])
    painting.setLive(true)
    expect(painted).toEqual(['top', 'works', 'road', 'end'])
    expect(painting.scene('road')?.kit).not.toBeNull()
    expect(painting.scene('road')?.actors.length).toBeGreaterThan(0)
    painting.destroy()
  })

  it('does a deferred inscription refit on scroll once its row is back in view, and nothing otherwise', () => {
    const { painting, root } = ready()
    const upper = root.querySelector('.upper')
    if (!upper) throw new Error('no upper')
    const pending = vi.mocked(fitPending)
    // paintings made by earlier tests may still listen: only this root's fits are counted
    const fit = vi.mocked(fitInscription)
    const fits = () => fit.mock.calls.filter(([r]) => r === root)
    fit.mockClear()
    // nothing pending: a scroll does nothing
    pending.mockReturnValue(false)
    window.dispatchEvent(new Event('scroll'))
    expect(fits()).toHaveLength(0)
    // pending, but the visitor is still below the inscription's row
    pending.mockReturnValue(true)
    place(upper, 55, -2500, 890, 500)
    window.dispatchEvent(new Event('scroll'))
    expect(fits()).toHaveLength(0)
    // pending while held (a house opening or closing): nothing
    place(upper, 55, -300, 890, 500)
    painting.hold()
    window.dispatchEvent(new Event('scroll'))
    expect(fits()).toHaveLength(0)
    painting.release()
    fit.mockClear()
    // pending, and the row is in view: fitted, unforced (it measures since the height changed)
    window.dispatchEvent(new Event('scroll'))
    expect(fits()).toEqual([[root]])
    // after destroy the listener is gone
    painting.destroy()
    window.dispatchEvent(new Event('scroll'))
    expect(fits()).toHaveLength(1)
    pending.mockReset()
  })

  it('relayout fits the inscription past its cache (the font, the art), resizing does not', () => {
    vi.useFakeTimers()
    const { painting, root } = ready()
    const all = vi.mocked(fitAll)
    const fit = vi.mocked(fitInscription)
    all.mockClear()
    painting.relayout()
    expect(all).toHaveBeenCalledWith(root, { force: true })
    fit.mockClear()
    window.dispatchEvent(new Event('resize'))
    expect(fit).toHaveBeenCalledWith(root)
    painting.destroy()
  })

  it('paints nothing after destroy and lets go of the observer', () => {
    vi.useFakeTimers()
    const { painting, works } = ready()
    painting.repaint()
    const ro = FakeObserver.all[0]
    ro?.fire([[works, 890, 900]])
    place(works, 0, 1200, W, 1300)
    ro?.fire([[works, 890, 1300]])
    painting.destroy()
    expect(ro?.disconnected).toBe(true)
    const n = fills.length
    painting.repaint()
    painting.relayout()
    painting.setLive(true)
    painting.drawHouseAt(
      document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D,
      1,
      0,
      { x: 0, y: 0, w: 200, h: 200 },
      90,
      1,
    )
    vi.advanceTimersByTime(1000)
    expect(fills).toHaveLength(n)
  })
})
