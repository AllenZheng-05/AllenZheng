import { afterEach, describe, expect, it, vi } from 'vitest'
import { fitAll, fitInscription, fitNames, fitPending, roadLayoutOf, sizeRoad } from './dom'
import { measureRoad } from './measure'
import { roadLayout, roadPlan } from './road'

/* sizeRoad in jsdom: there is no layout, so clientWidth and offsetHeight are defined per element. */

afterEach(() => {
  document.body.innerHTML = ''
})

interface Built {
  root: HTMLElement
  band: HTMLElement
  road: HTMLElement
  stops: HTMLElement[]
  /** The right/left a stop had when its height was read. */
  seen: { left: string; right: string; transform: string }[]
}

function build(width: number, heights: number[]): Built {
  const root = document.createElement('div')
  const band = document.createElement('section')
  band.className = 'band'
  band.dataset.band = 'road'
  const road = document.createElement('ol')
  road.className = 'road'
  Object.defineProperty(road, 'clientWidth', { configurable: true, value: width })
  const seen: Built['seen'] = []
  const stops = heights.map((h) => {
    const li = document.createElement('li')
    li.className = 'stop'
    Object.defineProperty(li, 'offsetHeight', {
      configurable: true,
      get: () => {
        seen.push({ left: li.style.left, right: li.style.right, transform: li.style.transform })
        return h
      },
    })
    road.appendChild(li)
    return li
  })
  band.appendChild(road)
  root.appendChild(band)
  document.body.appendChild(root)
  return { root, band, road, stops, seen }
}

describe('sizeRoad', () => {
  it('pins narrow stops to left 0 and right 56px before measuring them, then places them', () => {
    const heights = [100, 120, 90]
    const { root, road, stops, seen } = build(400, heights)
    sizeRoad(root)
    // every height was read with left/right/transform already set
    expect(seen.length).toBeGreaterThan(0)
    expect(seen[0]).toEqual({ left: '0px', right: '56px', transform: 'none' })
    const layout = roadLayout(400, heights, 120)
    expect(road.style.height).toBe(`${layout.height}px`)
    expect(road.dataset.tall).toBe('120')
    stops.forEach((el, i) => {
      expect(el.style.left).toBe('0px')
      expect(el.style.top).toBe(`${layout.stops[i]?.top}px`)
      expect(el.style.right).toBe('56px')
      expect(el.style.transform).toBe('none')
      expect(el.style.width).toBe('auto')
    })
  })

  it('centres wide stops at min(250, w/per - 12) and clears right', () => {
    const heights = [100, 120, 90]
    const { root, road, stops } = build(500, heights)
    for (const el of stops) el.style.right = '56px'
    sizeRoad(root)
    const { per } = roadPlan(500, 3, true)
    const layout = roadLayout(500, heights, 120)
    expect(road.style.height).toBe(`${layout.height}px`)
    stops.forEach((el, i) => {
      expect(el.style.width).toBe(`${Math.min(250, 500 / per - 12)}px`)
      expect(el.style.transform).toBe('translateX(-50%)')
      expect(el.style.right).toBe('')
      expect(el.style.left).toBe(`${layout.stops[i]?.left}px`)
      expect(el.style.top).toBe(`${layout.stops[i]?.top}px`)
    })
  })

  it('gives a road with no stops a height of 0px', () => {
    const { root, road } = build(400, [])
    sizeRoad(root)
    expect(road.style.height).toBe('0px')
    expect(roadLayoutOf(road)).toEqual({ layout: roadLayout(400, [], 150), tall: 150 })
  })

  it('does nothing without a width or a road', () => {
    const { root, road } = build(0, [100])
    sizeRoad(root)
    expect(road.style.height).toBe('')
    expect(roadLayoutOf(road)).toBeUndefined()
    expect(() => sizeRoad(document.createElement('div'))).not.toThrow()
  })

  it('keeps what it applied, and measureRoad returns that same layout', () => {
    const heights = [100, 120]
    const { root, band, road } = build(400, heights)
    expect(roadLayoutOf(road)).toBeUndefined()
    sizeRoad(root)
    const kept = roadLayoutOf(road)
    expect(kept?.tall).toBe(120)
    expect(kept?.layout).toEqual(roadLayout(400, heights, 120))
    const measured = measureRoad(band)
    expect(measured?.layout).toBe(kept?.layout)
    expect(measured?.tall).toBe(120)
  })

  it('is run by fitAll between the names and the inscription', () => {
    const { root, road } = build(400, [100])
    fitAll(root)
    expect(roadLayoutOf(road)?.tall).toBe(100)
  })
})

/* fitNames in jsdom: a stylesheet gives the names their font size, and each name's scrollWidth
 follows its current font size (its width at `base` px times size / base). */
describe('fitNames', () => {
  function village(open: boolean): HTMLElement {
    const root = document.createElement('div')
    const style = document.createElement('style')
    style.textContent =
      '.house b { font-size: 24px; padding-right: 0px } .house small { font-size: 15px; padding-right: 0px } .house.open .hd b { font-size: 36px }'
    document.head.appendChild(style)
    root.innerHTML = `<div class="village"><div class="${open ? 'house open' : 'house'}"><button class="hd"><b>DocBranch</b><small>Builder</small></button></div></div>`
    document.body.appendChild(root)
    return root
  }
  /** Give `el` a box `client` px wide and text `natural` px wide at `base` px. */
  function sized(el: Element | null, client: number, natural: number, base: number): HTMLElement {
    if (!(el instanceof HTMLElement)) throw new Error('no element')
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: client })
    Object.defineProperty(el, 'scrollWidth', {
      configurable: true,
      get: () => (natural * parseFloat(el.style.fontSize || String(base))) / base,
    })
    return el
  }

  afterEach(() => {
    document.head.innerHTML = ''
  })

  it('shrinks a name that overflows by exactly 1 px', () => {
    const root = village(false)
    const name = sized(root.querySelector('.house b'), 100, 101, 24)
    sized(root.querySelector('.house small'), 100, 60, 15)
    fitNames(root)
    expect(name.style.fontSize).toBe('23px')
  })

  it('stops shrinking at 12 px', () => {
    const root = village(false)
    const name = sized(root.querySelector('.house b'), 100, 500, 24)
    fitNames(root)
    expect(name.style.fontSize).toBe('12px')
  })

  it('keeps the size of a name that fits', () => {
    const root = village(false)
    const name = sized(root.querySelector('.house b'), 100, 100, 24)
    const byline = sized(root.querySelector('.house small'), 100, 40, 15)
    fitNames(root)
    expect(name.style.fontSize).toBe('')
    expect(byline.style.fontSize).toBe('')
  })

  it('fits the open hall’s title and byline too', () => {
    const root = village(true)
    const name = sized(root.querySelector('.house.open .hd b'), 200, 240, 36)
    const byline = sized(root.querySelector('.house.open .hd small'), 200, 210, 15)
    fitNames(root)
    // 240 * 30 / 36 = 200: the first size at which it fits
    expect(name.style.fontSize).toBe('30px')
    expect(byline.style.fontSize).toBe('14px')
  })
})

describe('fitInscription', () => {
  it('measures again only when the inscription’s width or the window’s height changed', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div class="upper"><header class="inscr"></header></div>'
    document.body.appendChild(root)
    const inscr = root.querySelector<HTMLElement>('.inscr')
    if (!inscr) throw new Error('no inscription')
    let width = 500
    Object.defineProperty(inscr, 'clientWidth', { configurable: true, get: () => width })
    let reads = 0
    // as tall as the --fit it has: 1000 px at 1, so it shrinks to fit a 768 px window
    inscr.getBoundingClientRect = () => {
      reads++
      const fit = Number(inscr.style.getPropertyValue('--fit') || '1')
      return {
        top: 0,
        bottom: 1000 * fit,
        left: 0,
        right: 0,
        width: 0,
        height: 1000 * fit,
      } as DOMRect
    }
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    fitAll(root)
    const fit = inscr.style.getPropertyValue('--fit')
    expect(Number(fit)).toBeLessThan(1)
    expect(1000 * Number(fit)).toBeLessThanOrEqual(756)
    reads = 0
    fitAll(root)
    expect(reads).toBe(0)
    expect(inscr.style.getPropertyValue('--fit')).toBe(fit)
    // a shorter window: measured again
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 })
    fitAll(root)
    expect(reads).toBeGreaterThan(0)
    expect(Number(inscr.style.getPropertyValue('--fit'))).toBeLessThan(Number(fit))
    // a new width alone: measured again
    reads = 0
    width = 400
    fitAll(root)
    expect(reads).toBeGreaterThan(0)
  })

  it('leaves the page as it is when only the height changes while the visitor is below it', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div class="upper"><header class="inscr"></header></div>'
    document.body.appendChild(root)
    const inscr = root.querySelector<HTMLElement>('.inscr')
    const upper = root.querySelector<HTMLElement>('.upper')
    if (!inscr || !upper) throw new Error('no inscription')
    Object.defineProperty(inscr, 'clientWidth', { configurable: true, value: 500 })
    let scrollY = 0
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
    // the row is as tall as the inscription (a phone: what follows moves with it)
    const tall = () => 1000 * Number(inscr.style.getPropertyValue('--fit') || '1')
    const rect = () =>
      ({ top: -scrollY, bottom: tall() - scrollY, left: 0, right: 0, width: 0 }) as DOMRect
    inscr.getBoundingClientRect = rect
    upper.getBoundingClientRect = rect
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
      fitAll(root)
      const fit = inscr.style.getPropertyValue('--fit')
      // scrolled far below; the toolbar shows: the inscription keeps its size
      scrollY = 3000
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 760 })
      fitAll(root)
      expect(inscr.style.getPropertyValue('--fit')).toBe(fit)
      // back at the top: fitted to the window as it is now
      scrollY = 0
      fitAll(root)
      expect(Number(inscr.style.getPropertyValue('--fit'))).toBeLessThan(Number(fit))
    } finally {
      Reflect.deleteProperty(window, 'scrollY')
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    }
  })

  /** An inscription `natural` px tall at --fit 1 (as tall as its --fit), in a row as tall as it. */
  function tallInscription(natural: () => number) {
    const root = document.createElement('div')
    root.innerHTML = '<div class="upper"><header class="inscr"></header></div>'
    document.body.appendChild(root)
    const inscr = root.querySelector<HTMLElement>('.inscr')
    const upper = root.querySelector<HTMLElement>('.upper')
    if (!inscr || !upper) throw new Error('no inscription')
    Object.defineProperty(inscr, 'clientWidth', { configurable: true, value: 500 })
    const state = { scrollY: 0 }
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => state.scrollY })
    const tall = () => natural() * Number(inscr.style.getPropertyValue('--fit') || '1')
    const rect = () =>
      ({ top: -state.scrollY, bottom: tall() - state.scrollY, left: 0, right: 0 }) as DOMRect
    inscr.getBoundingClientRect = rect
    upper.getBoundingClientRect = rect
    return { root, inscr, state }
  }

  it('measures again when forced (the font arrived), not when only asked', () => {
    let natural = 1000
    const { root, inscr } = tallInscription(() => natural)
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
      fitInscription(root)
      const before = inscr.style.getPropertyValue('--fit')
      expect(1000 * Number(before)).toBeLessThanOrEqual(756)
      // the handwriting arrives: the inscription is shorter, same width, same window
      natural = 900
      fitInscription(root)
      expect(inscr.style.getPropertyValue('--fit')).toBe(before)
      fitAll(root)
      expect(inscr.style.getPropertyValue('--fit')).toBe(before)
      fitAll(root, { force: true })
      const after = Number(inscr.style.getPropertyValue('--fit'))
      expect(after).toBeGreaterThan(Number(before))
      expect(900 * after).toBeLessThanOrEqual(756)
    } finally {
      Reflect.deleteProperty(window, 'scrollY')
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    }
  })

  it('a refit deferred below the inscription is pending until a call made with its row in view', () => {
    const { root, inscr, state } = tallInscription(() => 1000)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
      fitInscription(root)
      const tall = inscr.style.getPropertyValue('--fit')
      expect(fitPending(root)).toBe(false)
      // far below it, the window gets shorter: deferred, and pending
      state.scrollY = 3000
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })
      fitInscription(root)
      expect(inscr.style.getPropertyValue('--fit')).toBe(tall)
      expect(fitPending(root)).toBe(true)
      // still below: still pending
      state.scrollY = 1500
      fitInscription(root)
      expect(fitPending(root)).toBe(true)
      expect(inscr.style.getPropertyValue('--fit')).toBe(tall)
      // the row's bottom comes into view: fitted for 600, no longer pending
      state.scrollY = 400
      fitInscription(root)
      const short = Number(inscr.style.getPropertyValue('--fit'))
      expect(short).toBeLessThan(Number(tall))
      expect(fitPending(root)).toBe(false)
      // the scroll position is the one the visitor had (none of the calls moved it)
      expect(scrollTo).not.toHaveBeenCalled()
      // a forced fit is never deferred
      state.scrollY = 3000
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
      fitInscription(root, { force: true })
      expect(fitPending(root)).toBe(false)
      expect(inscr.style.getPropertyValue('--fit')).toBe(tall)
    } finally {
      Reflect.deleteProperty(window, 'scrollY')
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    }
  })

  it('puts the scroll position back when measuring moved it', () => {
    const { root, state } = tallInscription(() => 1000)
    // the browser moves the page while --fit steps down (scroll anchoring, a shorter page)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation((x, y) => {
      if (typeof x === 'number' && typeof y === 'number') state.scrollY = y
    })
    const set = CSSStyleDeclaration.prototype.setProperty
    vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (
      this: CSSStyleDeclaration,
      ...args: Parameters<CSSStyleDeclaration['setProperty']>
    ) {
      state.scrollY = 120
      set.apply(this, args)
    })
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
      state.scrollY = 300
      fitInscription(root)
      expect(scrollTo).toHaveBeenLastCalledWith(0, 300)
      expect(window.scrollY).toBe(300)
    } finally {
      vi.restoreAllMocks()
      Reflect.deleteProperty(window, 'scrollY')
    }
  })
})
