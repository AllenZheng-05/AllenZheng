import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BandId } from '../layout/types'
import type { MotifKind } from '../model'
import { drawMotif, MOTIF_REST } from '../paint/motif'
import type { Painting } from '../paint/painting'
import type { BandScene, PathPt, Sprite } from '../paint/types'
import { createMotion, type Motion } from './motion'

vi.mock('../paint/motif', async (importOriginal) => {
  const real = await importOriginal<typeof import('../paint/motif')>()
  return { ...real, drawMotif: vi.fn() }
})

/* The motion layer with fakes: 2D contexts that log what is drawn, an IntersectionObserver the test
 triggers, a requestAnimationFrame queue the test runs by hand, and a painting that hands out
 hand-made scenes with one actor of each kind. */

type Op = [string, ...unknown[]]

class FakeContext {
  globalAlpha = 1
  log: Op[] = []
  constructor(readonly canvas: HTMLCanvasElement) {}
  setTransform(...a: unknown[]) {
    this.log.push(['setTransform', ...a])
  }
  clearRect(...a: unknown[]) {
    this.log.push(['clearRect', ...a])
  }
  drawImage(...a: unknown[]) {
    this.log.push(['drawImage', ...a])
  }
  translate(...a: unknown[]) {
    this.log.push(['translate', ...a])
  }
  save() {}
  restore() {}
  rotate() {}
  scale() {}
  transform() {}
}

class FakeIO {
  static all: FakeIO[] = []
  targets = new Set<Element>()
  disconnected = false
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIO.all.push(this)
  }
  observe(target: Element) {
    this.targets.add(target)
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
  disconnect() {
    this.disconnected = true
  }
  takeRecords() {
    return []
  }
  trigger(target: Element, isIntersecting: boolean) {
    const entry = { target, isIntersecting } as unknown as IntersectionObserverEntry
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

let contexts: Map<HTMLCanvasElement, FakeContext>
let frames: Map<number, FrameRequestCallback>
let nextId: number
let now: number
let cancelled: number[]
let bandTop: number
let bandHeight: number

function ctxOf(canvas: HTMLCanvasElement): FakeContext {
  let c = contexts.get(canvas)
  if (!c) {
    c = new FakeContext(canvas)
    contexts.set(canvas, c)
  }
  return c
}

/** Advance the clock to `t` ms and run the frames waiting for it. */
function tick(t: number) {
  now = t
  const run = [...frames.values()]
  frames.clear()
  for (const f of run) f(t)
}

function rect(top: number, height: number): DOMRect {
  return {
    left: 0,
    top,
    width: 1000,
    height,
    right: 1000,
    bottom: top + height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

const sprite = (name: string): Sprite => {
  const c = document.createElement('canvas')
  c.dataset.name = name
  return c
}
const path = (n: number, y: number): PathPt[] =>
  Array.from({ length: n }, (_, i) => ({ x: i * 10, y, ang: 0 }))

interface Sprites {
  cloud: Sprite
  pine: Sprite
  water: Sprite
  wave: Sprite
  lantern: Sprite
  smoke: Sprite
  walker: Sprite
  bird: Sprite
  leaf: Sprite
}

function makeScene(s: Sprites): BandScene {
  return {
    sd: 1,
    sky: { x0: 0, x1: 1000, y0: 10, y1: 60 },
    water: path(20, 300),
    pond: path(20, 400),
    road: { C: path(40, 200), idx: [5, 30] },
    kit: { bird: s.bird, boat: sprite('boat'), fish: sprite('fish'), fall: [s.leaf] },
    actors: [
      // a cloud bank
      {
        k: 'drift',
        spr: s.cloud,
        x: 100,
        y: 100,
        y0: 100,
        w: 200,
        h: 60,
        sp: 10,
        lo: -200,
        hi: 1000,
        fade: false,
      },
      // a pine
      { k: 'sway', spr: s.pine, x: 300, y: 300, y0: 250, ox: -20, oy: -60, w: 40, h: 60 },
      // a river
      {
        k: 'flow',
        path: path(30, 350),
        n: 4,
        sprs: [s.water],
        z0: 20,
        z1: 30,
        zs: 20,
        sw: 20,
        sh: 20,
        y0: 350,
      },
      // a wave
      { k: 'bob', spr: s.wave, x: 400, y: 450, y0: 450, w: 40, h: 30, row: 1, amp: 2 },
      // a lantern
      { k: 'flick', spr: s.lantern, x: 500, y: 200, y0: 200, w: 57, h: 57, i: 0 },
      // the skein of birds
      { k: 'flock', y: 40, y0: 0, n: 9 },
      // smoke from an open house
      { k: 'smoke', x: 600, y: 300, y0: 320, z: 22, sprs: [s.smoke] },
      // the traveller
      { k: 'walker', spr: s.walker, y0: 200 },
    ],
  }
}

function sprites(prefix = ''): Sprites {
  const names = [
    'cloud',
    'pine',
    'water',
    'wave',
    'lantern',
    'smoke',
    'walker',
    'bird',
    'leaf',
  ] as const
  return Object.fromEntries(names.map((n) => [n, sprite(prefix + n)])) as unknown as Sprites
}

class FakePainting implements Painting {
  scenes = new Map<BandId, BandScene>()
  listeners = new Set<(band: BandId) => void>()
  setLive = vi.fn()
  relayout() {}
  repaint() {}
  drawHouseAt() {}
  scene(band: BandId) {
    return this.scenes.get(band) ?? null
  }
  onPainted(listener: (band: BandId) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  hold() {}
  release() {}
  destroy() {}
  paint(band: BandId, scene: BandScene) {
    this.scenes.set(band, scene)
    for (const l of [...this.listeners]) l(band)
  }
}

let root: HTMLElement
let painting: FakePainting
let sp: Sprites
let stopTops: number[]
const motions: Motion[] = []

function build() {
  root = document.createElement('div')
  root.className = 'scroll-theme'
  root.dataset.mode = 'zh'
  root.innerHTML = `
    <div class="band" data-band="top"><canvas class="paint"></canvas><canvas class="paint anim"></canvas></div>
    <section class="band" data-band="works"><canvas class="paint"></canvas><canvas class="paint anim"></canvas>
      <div class="village">
        <div class="house open"><button class="hd"><canvas class="motif" data-m="duel"></canvas></button>
          <div class="win"><canvas class="motif big" data-m="duel"></canvas></div></div>
        <div class="house"><button class="hd"><canvas class="motif" data-m="team"></canvas></button></div>
      </div>
    </section>
    <section class="band" data-band="road"><canvas class="paint"></canvas><canvas class="paint anim"></canvas>
      <ol class="road"><li class="stop"></li><li class="stop"></li></ol></section>
    <div class="tag"></div>`
  document.body.appendChild(root)
}

const band = (id: BandId) =>
  root.querySelector<HTMLElement>(`.band[data-band="${id}"]`) as HTMLElement
const anim = (id: BandId) => ctxOf(band(id).querySelector('canvas.anim') as HTMLCanvasElement)
const io = () => FakeIO.all[0] as FakeIO
const show = (id: BandId) => io().trigger(band(id), true)
const drawn = (c: FakeContext) => c.log.filter((op) => op[0] === 'drawImage').map((op) => op[1])
const clears = (c: FakeContext) => c.log.filter((op) => op[0] === 'clearRect').length

function start(paused = false): Motion {
  const m = createMotion(root, painting, { paused })
  if (!m) throw new Error('no motion')
  motions.push(m)
  return m
}

beforeEach(() => {
  contexts = new Map()
  frames = new Map()
  nextId = 1
  now = 0
  cancelled = []
  bandTop = 0
  bandHeight = 800
  FakeIO.all = []
  stopTops = [100, 1000]
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return ctxOf(this) as unknown as CanvasRenderingContext2D
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('band')) return rect(bandTop, bandHeight)
    if (this.classList.contains('stop')) {
      const i = [...(this.parentElement?.children ?? [])].indexOf(this)
      return rect(stopTops[i] ?? 0, 40)
    }
    return rect(0, 0)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('CanvasRenderingContext2D', class {})
  vi.stubGlobal('IntersectionObserver', FakeIO)
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    const id = nextId++
    frames.set(id, f)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelled.push(id)
    frames.delete(id)
  })
  vi.mocked(drawMotif).mockClear()
  build()
  painting = new FakePainting()
  sp = sprites()
  for (const id of ['top', 'works', 'road'] as const) painting.scenes.set(id, makeScene(sp))
})

afterEach(() => {
  for (const m of motions.splice(0)) m.destroy()
  root.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
})

describe('createMotion', () => {
  it('returns null in plain jsdom without logging', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('IntersectionObserver', undefined)
    const error = vi.spyOn(console, 'error')
    const p = new FakePainting()
    expect(typeof CanvasRenderingContext2D).toBe('undefined')
    expect(createMotion(root, p, { paused: false })).toBeNull()
    expect(p.setLive).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('turns the painting live and observes every band', () => {
    start()
    expect(painting.setLive).toHaveBeenCalledWith(true)
    expect(io().targets.size).toBe(3)
  })

  it('draws nothing for bands that are not on screen', () => {
    start()
    for (let t = 100; t < 1000; t += 100) tick(t)
    expect(anim('top').log).toEqual([])
    expect(anim('road').log).toEqual([])
  })

  it('draws every kind of actor of a visible band, with the leaves', () => {
    start()
    show('top')
    tick(100)
    const imgs = drawn(anim('top'))
    for (const s of [
      sp.cloud,
      sp.pine,
      sp.water,
      sp.wave,
      sp.lantern,
      sp.smoke,
      sp.walker,
      sp.bird,
      sp.leaf,
    ]) {
      expect(imgs).toContain(s)
    }
    // only the band on screen
    expect(anim('road').log).toEqual([])
  })

  it('draws about twelve frames a second', () => {
    start()
    show('top')
    tick(16)
    tick(32)
    expect(clears(anim('top'))).toBe(0)
    tick(96)
    expect(clears(anim('top'))).toBe(1)
    tick(112)
    expect(clears(anim('top'))).toBe(1)
    tick(180)
    expect(clears(anim('top'))).toBe(2)
  })

  it('stilled: draws one frame when something changed, then nothing; the clock stays and the traveller stands at the stop reached', () => {
    const m = start(true)
    show('road')
    tick(100)
    const c = anim('road')
    const walkerAt = () => {
      const i = c.log.findIndex((op) => op[0] === 'drawImage' && op[1] === sp.walker)
      return c.log[i - 1]
    }
    const cloud = () => c.log.find((op) => op[1] === sp.cloud)
    expect(clears(c)).toBe(1)
    // the first stop is reached: path index 5 (x 50), standing 24 px above the path (y 200)
    expect(walkerAt()).toEqual(['translate', 50, 176])
    const cloud0 = cloud()
    tick(200)
    tick(300)
    expect(clears(c)).toBe(1)
    // the visitor scrolls on to the second stop (path index 30): it stands there at once
    stopTops = [100, 200]
    c.log = []
    m.redraw()
    expect(walkerAt()).toEqual(['translate', 300, 176])
    // the clock did not advance: the clouds are where they were
    expect(cloud()).toEqual(cloud0)
    c.log = []
    io().trigger(band('road'), true)
    tick(400)
    expect(walkerAt()).toEqual(['translate', 300, 176])
    expect(cloud()).toEqual(cloud0)
  })

  it('moving: the clock advances and the traveller walks to the stop reached', () => {
    start()
    show('road')
    tick(100)
    const c = anim('road')
    const walkerAt = () => {
      const i = c.log.findIndex((op) => op[0] === 'drawImage' && op[1] === sp.walker)
      return c.log[i - 1]
    }
    const before = walkerAt()
    const cloud0 = c.log.find((op) => op[1] === sp.cloud)
    stopTops = [100, 200]
    c.log = []
    tick(200)
    expect(walkerAt()).not.toEqual(before)
    expect(c.log.find((op) => op[1] === sp.cloud)).not.toEqual(cloud0)
  })

  it('tells its listeners once per change, whoever made it', () => {
    const m = start()
    const listener = vi.fn()
    m.onPausedChange(listener)
    m.setPaused(true)
    m.setPaused(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(true)
    expect(m.paused).toBe(true)
    m.setPaused(false)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith(false)
  })

  it('does nothing while the tab is hidden', () => {
    start()
    show('top')
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    for (let t = 100; t < 1000; t += 100) tick(t)
    expect(anim('top').log).toEqual([])
    expect(frames.size).toBe(0)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    // back on screen: it draws again
    tick(1100)
    expect(clears(anim('top'))).toBe(1)
  })

  it('sets the wind (--gust) on the tags only while moving', () => {
    const tag = root.querySelector<HTMLElement>('.tag') as HTMLElement
    const m = start(true)
    show('works')
    tick(100)
    expect(tag.style.getPropertyValue('--gust')).toBe('')
    m.setPaused(false)
    tick(200)
    expect(tag.style.getPropertyValue('--gust')).toMatch(/^0\.\d{3}$/)
  })

  it('runs the open house motif at full speed, the others slowly, and never the big placeholder', () => {
    start()
    show('works')
    for (let t = 100; t <= 1000; t += 100) tick(t)
    const calls = vi.mocked(drawMotif).mock.calls
    const last = (kind: MotifKind) => calls.filter((c) => c[1] === kind).at(-1)?.[2] ?? NaN
    const open = last('duel') - MOTIF_REST.duel
    const idle = last('team') - MOTIF_REST.team
    expect(open).toBeGreaterThan(0)
    expect(idle).toBeGreaterThan(0)
    expect(open / idle).toBeCloseTo(1 / 0.32, 5)
    const big = root.querySelector('canvas.motif.big')
    expect(calls.some((c) => c[0] === big)).toBe(false)
    // a repaint of the village (which draws the motifs at rest) puts each back at its own moment
    vi.mocked(drawMotif).mockClear()
    painting.paint('works', makeScene(sp))
    const again = vi.mocked(drawMotif).mock.calls
    expect(again.find((c) => c[1] === 'duel')?.[2]).toBe(last('duel'))
    expect(again.some((c) => c[0] === big)).toBe(false)
  })

  it('a repaint draws the band again at once with its new scene, also while stilled', () => {
    start(true)
    show('top')
    show('works')
    tick(100)
    tick(200)
    const fresh = sprites('new-')
    anim('top').log = []
    painting.paint('top', makeScene(fresh))
    expect(drawn(anim('top'))).toContain(fresh.cloud)
    expect(drawn(anim('top'))).not.toContain(sp.cloud)
  })

  it('the governor stills a painting that cannot keep up, and says so', () => {
    const m = start()
    show('top')
    const listener = vi.fn()
    m.onPausedChange(listener)
    for (let t = 200; t < 30000; t += 200) tick(t)
    expect(m.paused).toBe(true)
    expect(listener).toHaveBeenCalledWith(true)
  })

  describe('stilled', () => {
    it('stays complete while scrolling: a scroll draws the new slice, and moving is unaffected', () => {
      const m = start(true)
      bandHeight = 3000
      const tall = makeScene(sp)
      tall.actors.push({
        k: 'bob',
        spr: sp.wave,
        x: 400,
        y: 1500,
        y0: 1500,
        w: 40,
        h: 30,
        row: 1,
        amp: 2,
      })
      painting.scenes.set('top', tall)
      show('top')
      tick(100)
      const c = anim('top')
      const waveYs = () => c.log.filter((op) => op[1] === sp.wave).map((op) => op[3] as number)
      expect(clears(c)).toBe(1)
      // the slice drawn is the screen and 160 px around it: the wave far below is not there yet
      expect(waveYs().some((y) => y > 1400)).toBe(false)
      c.log = []
      bandTop = -1500
      tick(200)
      expect(c.log).toEqual([])
      window.dispatchEvent(new Event('scroll'))
      tick(300)
      expect(clears(c)).toBe(1)
      expect(waveYs().some((y) => y > 1400 && y < 1600)).toBe(true)
      m.setPaused(false)
      // moving: a scroll event does not change the cadence
      tick(400)
      const before = clears(c)
      window.dispatchEvent(new Event('scroll'))
      tick(420)
      tick(440)
      expect(clears(c)).toBe(before)
      tick(500)
      expect(clears(c)).toBe(before + 1)
    })

    it('sleeps when nothing is dirty and wakes for each change', () => {
      const m = start(true)
      show('top')
      tick(100)
      expect(clears(anim('top'))).toBe(1)
      // nothing pending
      expect(frames.size).toBe(0)
      // the observer
      io().trigger(band('top'), true)
      expect(frames.size).toBe(1)
      tick(200)
      expect(clears(anim('top'))).toBe(2)
      expect(frames.size).toBe(0)
      // a repaint
      painting.paint('road', makeScene(sp))
      expect(frames.size).toBe(1)
      tick(300)
      expect(frames.size).toBe(0)
      // a scroll
      window.dispatchEvent(new Event('scroll'))
      expect(frames.size).toBe(1)
      tick(400)
      expect(clears(anim('top'))).toBe(4)
      expect(frames.size).toBe(0)
      // a redraw
      m.redraw()
      expect(frames.size).toBe(1)
      tick(500)
      expect(frames.size).toBe(0)
      // moving again: the loop runs on and on
      m.setPaused(false)
      expect(frames.size).toBe(1)
      tick(600)
      tick(700)
      tick(800)
      expect(frames.size).toBe(1)
      // stilled again: it settles after one more draw
      m.setPaused(true)
      tick(900)
      tick(1000)
      expect(frames.size).toBe(0)
    })

    it('coming back to a hidden tab resumes the loop and does not count the time away', () => {
      const m = start(true)
      show('top')
      tick(100)
      expect(frames.size).toBe(0)
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      window.dispatchEvent(new Event('scroll'))
      tick(200)
      expect(clears(anim('top'))).toBe(1)
      expect(frames.size).toBe(0)
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
      expect(frames.size).toBe(1)
      tick(300)
      expect(clears(anim('top'))).toBe(2)
      expect(m.paused).toBe(true)
    })

    it('destroy leaves no frame pending, whether asleep or running', () => {
      const m = start()
      show('top')
      tick(100)
      expect(frames.size).toBe(1)
      m.destroy()
      expect(frames.size).toBe(0)
      const asleep = start(true)
      show('top')
      tick(100)
      window.dispatchEvent(new Event('scroll'))
      expect(frames.size).toBe(1)
      asleep.destroy()
      expect(frames.size).toBe(0)
    })
  })

  it('destroy stops the loop, disconnects, removes its listeners and turns the painting still', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const removeDoc = vi.spyOn(document, 'removeEventListener')
    const m = start()
    show('top')
    tick(100)
    m.destroy()
    expect(cancelled.length).toBeGreaterThan(0)
    expect(frames.size).toBe(0)
    expect(io().disconnected).toBe(true)
    expect(painting.listeners.size).toBe(0)
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeDoc).toHaveBeenCalledWith('pointerleave', expect.any(Function))
    expect(removeDoc).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(painting.setLive).toHaveBeenLastCalledWith(false)
    const c = anim('top')
    c.log = []
    tick(200)
    expect(c.log).toEqual([])
  })
})
