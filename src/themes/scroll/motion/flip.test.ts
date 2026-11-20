import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rect } from '../layout/types'
import type { Painting } from '../paint/painting'
import { bringIn, FLIP_DURATION, flipHouse } from './flip'

/* jsdom has no layout, no Web Animations and no canvas: the page here is a small fake village whose
 boxes follow which house is open, with animate, requestAnimationFrame and the 2D context faked. */

const IDS = ['a', 'b', 'c']

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    left: x,
    top: y,
    width: w,
    height: h,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  }
}

/** Closed houses sit in a row; the open one spans the row below them, and the next band moves down. */
function boxOf(el: Element): DOMRect {
  const root = el.closest('.scroll-theme')
  const anyOpen = !!root?.querySelector('.house.open')
  if (el.classList.contains('band')) {
    return el.getAttribute('data-band') === 'works'
      ? rect(0, 0, 1000, anyOpen ? 1300 : 900)
      : rect(0, anyOpen ? 1300 : 900, 1000, 600)
  }
  if (el.classList.contains('house')) {
    const j = IDS.indexOf(el.getAttribute('data-id') ?? '')
    if (el.classList.contains('open')) return rect(70, 500, 860, 520)
    return rect(70 + j * 300, 200, 260, 240)
  }
  return rect(0, 0, 0, 0)
}

/** Builds the theme's bones; apply() opens `next` the way React would (same house elements). */
function village() {
  const root = document.createElement('div')
  root.className = 'scroll-theme'
  const band = document.createElement('section')
  band.className = 'band'
  band.dataset.band = 'works'
  band.innerHTML =
    '<canvas class="paint"></canvas><canvas class="paint anim"></canvas><div class="village"></div>'
  const road = document.createElement('section')
  road.className = 'band'
  road.dataset.band = 'road'
  const v = band.querySelector('.village')
  for (const id of IDS) {
    const h = document.createElement('div')
    h.className = 'house'
    h.dataset.id = id
    h.style.paddingTop = '114px'
    h.innerHTML =
      '<canvas class="bld"></canvas><button class="hd"></button><div class="detail"></div>'
    v?.appendChild(h)
  }
  root.append(band, road)
  document.body.appendChild(root)
  const open = (next: string | null) => {
    for (const h of root.querySelectorAll<HTMLElement>('.house')) {
      const isOpen = h.dataset.id === next
      h.classList.toggle('open', isOpen)
      h.style.paddingTop = isOpen ? '198px' : '114px'
      const detail = h.querySelector('.detail')
      if (detail)
        detail.innerHTML = isOpen ? '<div class="dt"></div><figure class="winfig"></figure>' : ''
    }
  }
  return { root, band, open }
}

interface Draw {
  index: number
  r: Rect
  padTop: number
  t: number
  flipc: boolean
}

let log: string[]
let draws: Draw[]
let frames: FrameRequestCallback[]
let clock: number
let animations: { el: Element; fill: string | undefined; cancel: ReturnType<typeof vi.fn> }[]

function fakePainting(): Painting {
  return {
    relayout: vi.fn(),
    repaint: vi.fn(),
    drawHouseAt: vi.fn(
      (
        _ctx: CanvasRenderingContext2D,
        _k: number,
        index: number,
        r: Rect,
        padTop: number,
        t: number,
      ) => {
        draws.push({ index, r, padTop, t, flipc: !!document.querySelector('.flipc') })
      },
    ),
    scene: vi.fn(() => null),
    onPainted: vi.fn(() => () => {}),
    setLive: vi.fn(),
    hold: vi.fn(() => {
      log.push('hold')
    }),
    release: vi.fn(() => {
      log.push('release')
    }),
    destroy: vi.fn(),
  }
}

/** Runs queued animation frames (16 ms apart) until the promise settles. */
async function finish(p: Promise<void>): Promise<void> {
  let done = false
  void p.then(() => {
    done = true
  })
  for (let n = 0; n < 2000 && !done; n++) {
    const cb = frames.shift()
    if (cb) {
      clock += 16
      cb(clock)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  await p
}

describe('bringIn', () => {
  let scrollBy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 800)
    scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the top of something taller than the room at 70', () => {
    bringIn(300, 300 + 800, true)
    expect(scrollBy).toHaveBeenCalledWith({ top: 230, behavior: 'smooth' })
  })
  it('scrolls a bottom below the screen up to 16 px above its edge', () => {
    bringIn(400, 900, false)
    expect(scrollBy).toHaveBeenCalledWith({ top: 900 - 800 + 16, behavior: 'auto' })
  })
  it('scrolls up to a top above 70', () => {
    bringIn(20, 300, true)
    expect(scrollBy).toHaveBeenCalledWith({ top: -50, behavior: 'smooth' })
  })
  it('leaves something already on screen, or nearly so, alone', () => {
    bringIn(100, 700, true)
    bringIn(67, 500, true)
    bringIn(300, 787, true)
    expect(scrollBy).not.toHaveBeenCalled()
  })
})

describe('flipHouse', () => {
  beforeEach(() => {
    log = []
    draws = []
    frames = []
    clock = 1000
    animations = []
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      return boxOf(this)
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ setTransform() {}, clearRect() {} }) as unknown as CanvasRenderingContext2D,
    )
    vi.stubGlobal('scrollBy', vi.fn())
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(Element.prototype, 'animate')
    document.body.innerHTML = ''
  })

  /** Web Animations, faked: every animation has already finished. */
  function fakeAnimate() {
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: function (this: Element, _keyframes: unknown, options?: KeyframeAnimationOptions) {
        const cancel = vi.fn()
        animations.push({ el: this, fill: options?.fill, cancel })
        return { finished: Promise.resolve(), cancel } as unknown as Animation
      },
    })
  }

  describe('instant', () => {
    it('applies once, without a flip canvas or a hold', async () => {
      fakeAnimate()
      const { root, open } = village()
      const painting = fakePainting()
      const apply = vi.fn(() => open('a'))
      const seen: boolean[] = []
      const observer = new MutationObserver(() => seen.push(!!root.querySelector('.flipc')))
      observer.observe(root, { childList: true, subtree: true })
      await flipHouse({ root, next: 'a', painting, instant: true, apply })
      observer.disconnect()
      expect(apply).toHaveBeenCalledTimes(1)
      expect(painting.hold).not.toHaveBeenCalled()
      expect(seen.every((has) => !has)).toBe(true)
      expect(root.querySelector('.flipc')).toBeNull()
    })

    it('works without a painting, and without Web Animations', async () => {
      const { root, open } = village()
      const apply = vi.fn(() => open('b'))
      await flipHouse({ root, next: 'b', painting: null, instant: false, apply })
      expect(apply).toHaveBeenCalledTimes(1)
      expect(root.querySelector('.house.open')?.getAttribute('data-id')).toBe('b')
      expect(root.querySelector('.flipc')).toBeNull()
    })
  })

  describe('animated', () => {
    beforeEach(fakeAnimate)

    function expectClean(root: HTMLElement) {
      expect(root.querySelector('.flipc')).toBeNull()
      expect(root.querySelector('.flipping')).toBeNull()
      // every fade-out (they hold their end state with fill: forwards) was cancelled, so the band's
      // painting and the houses' words are visible again
      const fadeOuts = animations.filter((a) => a.fill === 'forwards')
      expect(fadeOuts.length).toBeGreaterThan(0)
      expect(fadeOuts.some((a) => a.el.matches('canvas.paint'))).toBe(true)
      expect(fadeOuts.some((a) => a.el.matches('.hd'))).toBe(true)
      for (const a of fadeOuts) {
        expect(a.el.matches('canvas.paint, .hd, .dt, .winfig')).toBe(true)
        expect(a.cancel).toHaveBeenCalled()
      }
    }

    it('grows the opening house from closed to open, holding the painting meanwhile', async () => {
      const { root, open } = village()
      const painting = fakePainting()
      const apply = vi.fn(() => {
        log.push('apply')
        open('b')
      })
      await finish(flipHouse({ root, next: 'b', painting, instant: false, apply }))

      expect(apply).toHaveBeenCalledTimes(1)
      expect(log).toEqual(['hold', 'apply', 'release'])
      expect(draws.length).toBeGreaterThan(10)
      expect(draws.every((d) => d.index === 1 && d.flipc)).toBe(true)
      const ts = draws.map((d) => d.t)
      expect(ts[0]).toBe(0)
      expect(ts.at(-1)).toBe(1)
      for (let n = 1; n < ts.length; n++) expect(ts[n]).toBeGreaterThanOrEqual(ts[n - 1] ?? 0)
      // from the closed box to the open one (band coordinates)
      expect(draws[0]?.r).toEqual({ x: 370, y: 200, w: 260, h: 240 })
      expect(draws[0]?.padTop).toBe(114)
      expect(draws.at(-1)?.r).toEqual({ x: 70, y: 500, w: 860, h: 520 })
      expect(draws.at(-1)?.padTop).toBe(198)
      const mid = draws[Math.floor(draws.length / 2)]
      expect(mid?.r.w).toBeGreaterThan(260)
      expect(mid?.r.w).toBeLessThan(860)

      expectClean(root)
      // the next band glided down to its new place
      const road = root.querySelector('.band[data-band="road"]')
      expect(animations.some((a) => a.el === road)).toBe(true)
      expect(root.querySelector('.house.open')?.getAttribute('data-id')).toBe('b')
    })

    it('shrinks the open house while the other grows', async () => {
      const { root, open } = village()
      open('a')
      const painting = fakePainting()
      const apply = vi.fn(() => open('c'))
      await finish(flipHouse({ root, next: 'c', painting, instant: false, apply }))

      const closing = draws.filter((d) => d.index === 0)
      const opening = draws.filter((d) => d.index === 2)
      expect(closing.length).toBeGreaterThan(10)
      expect(opening).toHaveLength(closing.length)
      expect(closing[0]?.t).toBe(1)
      expect(closing.at(-1)?.t).toBe(0)
      expect(opening[0]?.t).toBe(0)
      expect(opening.at(-1)?.t).toBe(1)
      expect(closing[0]?.r).toEqual({ x: 70, y: 500, w: 860, h: 520 })
      expect(closing.at(-1)?.r).toEqual({ x: 70, y: 200, w: 260, h: 240 })
      expect(draws.every((d) => d.index !== 1)).toBe(true)
      expectClean(root)
    })

    it('closes the open house', async () => {
      const { root, open } = village()
      open('b')
      const painting = fakePainting()
      const apply = vi.fn(() => open(null))
      await finish(flipHouse({ root, next: null, painting, instant: false, apply }))
      expect(apply).toHaveBeenCalledTimes(1)
      expect(draws[0]).toMatchObject({ index: 1, t: 1 })
      expect(draws.at(-1)).toMatchObject({ index: 1, t: 0 })
      expect(root.querySelector('.house.open')).toBeNull()
      expectClean(root)
    })

    it('does nothing for a house that does not exist', async () => {
      const { root, open } = village()
      open('a')
      const painting = fakePainting()
      const apply = vi.fn()
      await flipHouse({ root, next: 'nope', painting, instant: false, apply })
      await flipHouse({ root, next: 'nope', painting, instant: true, apply })
      expect(apply).not.toHaveBeenCalled()
      expect(painting.hold).not.toHaveBeenCalled()
      expect(root.querySelector('.house.open')?.getAttribute('data-id')).toBe('a')
    })

    it('takes about the animation’s length', async () => {
      const { root, open } = village()
      const start = clock
      await finish(
        flipHouse({
          root,
          next: 'a',
          painting: fakePainting(),
          instant: false,
          apply: () => open('a'),
        }),
      )
      expect(clock - start).toBeGreaterThanOrEqual(FLIP_DURATION)
      expect(clock - start).toBeLessThan(FLIP_DURATION + 100)
    })

    it('ignores a toggle while one is running', async () => {
      const { root, open } = village()
      const painting = fakePainting()
      const first = flipHouse({ root, next: 'a', painting, instant: false, apply: () => open('a') })
      const apply = vi.fn()
      await flipHouse({ root, next: 'b', painting, instant: false, apply })
      expect(apply).not.toHaveBeenCalled()
      await finish(first)
      expect(root.querySelector('.house.open')?.getAttribute('data-id')).toBe('a')
      // and once it has finished, the next one runs
      const again = vi.fn(() => open('b'))
      await finish(flipHouse({ root, next: 'b', painting, instant: false, apply: again }))
      expect(again).toHaveBeenCalledTimes(1)
    })

    it('cleans up and releases when painting a frame fails', async () => {
      const { root, open } = village()
      const painting = fakePainting()
      let calls = 0
      vi.mocked(painting.drawHouseAt).mockImplementation(() => {
        calls += 1
        if (calls === 5) throw new Error('boom')
      })
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      await finish(flipHouse({ root, next: 'a', painting, instant: false, apply: () => open('a') }))
      expect(error).toHaveBeenCalled()
      expect(painting.release).toHaveBeenCalledTimes(1)
      expect(root.querySelector('.house.open')?.getAttribute('data-id')).toBe('a')
      expectClean(root)
      // not stuck: the next toggle runs
      const apply = vi.fn(() => open(null))
      vi.mocked(painting.drawHouseAt).mockImplementation(() => {})
      await finish(flipHouse({ root, next: null, painting, instant: false, apply }))
      expect(apply).toHaveBeenCalledTimes(1)
    })

    it('stops and cleans up when the theme goes away mid-way', async () => {
      const { root, open } = village()
      const painting = fakePainting()
      const p = flipHouse({ root, next: 'a', painting, instant: false, apply: () => open('a') })
      // let it reach the frame loop, run a few frames, then unmount
      for (let n = 0; n < 50 && !frames.length; n++) await new Promise((r) => setTimeout(r, 0))
      for (let n = 0; n < 5; n++) {
        clock += 16
        frames.shift()?.(clock)
      }
      root.remove()
      await finish(p)
      expect(painting.release).toHaveBeenCalledTimes(1)
      expect(frames).toHaveLength(0)
      expectClean(root)
    })
  })
})
