import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { portfolio } from '../../data'
import { ThemeProvider } from '../../shell/ThemeProvider'
import ScrollTheme from './ScrollTheme'

/* The motion layer wired into the theme: a faked 2D canvas (counting every drawing call), a stub
 IntersectionObserver, the fake ResizeObserver and a requestAnimationFrame queue the test runs by hand. */

// the unroll runs here (with the CSS roller): never import the real three.js into jsdom
vi.mock('./unroll/gl', () => ({ createScrollGl: vi.fn(() => null) }))

let drawCalls = 0

class FakeContext {
  globalAlpha = 1
  fillStyle: unknown = '#000'
  filter = 'none'
  globalCompositeOperation = 'source-over'
  constructor(readonly canvas: HTMLCanvasElement) {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  fill() {
    drawCalls++
  }
  translate() {}
  rotate() {}
  scale() {}
  transform() {}
  setTransform() {
    drawCalls++
  }
  clearRect() {
    drawCalls++
  }
  fillRect() {
    drawCalls++
  }
  drawImage() {
    drawCalls++
  }
  createPattern() {
    return {}
  }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4) }
  }
  putImageData() {
    drawCalls++
  }
}

class FakeResizeObserver {
  static all: FakeResizeObserver[] = []
  disconnected = false
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.all.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
}

class FakeIntersectionObserver {
  static all: FakeIntersectionObserver[] = []
  targets = new Set<Element>()
  disconnected = false
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.all.push(this)
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
  /** Report every target of this observer as on screen. */
  intersectAll() {
    const entries = [...this.targets].map(
      (target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry,
    )
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

let frames: Map<number, FrameRequestCallback>
let nextFrameId: number
let clock: number

/** Run the frames waiting now, as if `ms` had passed. */
function tick(ms = 100) {
  clock += ms
  const run = [...frames.values()]
  frames.clear()
  for (const f of run) f(clock)
}

function box(height: number): DOMRect {
  return {
    left: 0,
    top: 0,
    width: 1000,
    height,
    right: 1000,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
}

beforeEach(() => {
  drawCalls = 0
  frames = new Map()
  nextFrameId = 1
  clock = 0
  FakeResizeObserver.all = []
  FakeIntersectionObserver.all = []
  const made = new WeakMap<HTMLCanvasElement, FakeContext>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    let f = made.get(this)
    if (!f) {
      f = new FakeContext(this)
      made.set(this, f)
    }
    return f as unknown as CanvasRenderingContext2D
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('band') ? box(900) : box(0)
  })
  vi.stubGlobal('CanvasRenderingContext2D', class {})
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.set(id, f)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderStrict() {
  return render(
    <StrictMode>
      <ThemeProvider>
        <ScrollTheme data={portfolio} />
      </ThemeProvider>
    </StrictMode>,
  )
}

const menuTag = () => screen.getByRole('button', { name: /^Menu\. You are at / })
const slip = () => screen.getByRole('dialog', { name: 'Jump to' })

describe('scroll theme motion wiring', () => {
  it('the menu stills the painting (class calm) and lets it move again', async () => {
    const user = userEvent.setup()
    const { container } = renderStrict()
    const root = container.querySelector('.scroll-theme')
    expect(root).not.toHaveClass('calm')
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Still the painting' }))
    expect(root).toHaveClass('calm')
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Let the painting move' }))
    expect(root).not.toHaveClass('calm')
    await user.click(menuTag())
    expect(within(slip()).getByRole('button', { name: 'Still the painting' })).toBeInTheDocument()
  })

  it('starts rolled up where the page is laid out: pre from the first render, tags and top seal waiting', () => {
    // the first render's classes, so without StrictMode (whose trial unmount destroys the unroll,
    // which removes `pre`: the second mount's own roll-up is tested in the unroll wiring below)
    const { container, unmount } = render(
      <ThemeProvider>
        <ScrollTheme data={portfolio} />
      </ThemeProvider>,
    )
    const root = container.querySelector('.scroll-theme')
    expect(root).toHaveClass('pre')
    // the 3D view's canvas is the unroll's own, made only with a 3D view (none yet)
    expect(container.querySelector('canvas.gl')).toBeNull()
    expect(container.querySelector('.tag')).not.toHaveClass('on')
    expect(container.querySelector('.inscr .seal')).toHaveClass('wait')
    // the content is only clipped: still in the DOM, but out of reach until the tags come out
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(root?.closest('[inert], [aria-hidden="true"]')).toBeNull()
    expect(container.querySelector('.hang')).toHaveAttribute('inert')
    unmount()
  })

  it('starts open for a visitor who asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }))
    const { container } = renderStrict()
    expect(container.querySelector('.scroll-theme')).not.toHaveClass('pre')
    expect(container.querySelector('.tag')).toHaveClass('on')
    expect(container.querySelector('.inscr .seal')).not.toHaveClass('wait')
    // never rolled up, so never out of reach
    expect(container.querySelector('.hang')).not.toHaveAttribute('inert')
  })

  it('draws nothing after unmount and disconnects every observer', () => {
    const { unmount } = renderStrict()
    // the motion layer is live: show the bands and run some frames
    act(() => {
      for (const io of FakeIntersectionObserver.all) if (!io.disconnected) io.intersectAll()
      tick()
      tick()
      tick()
    })
    expect(FakeIntersectionObserver.all.length).toBeGreaterThan(1)
    expect(FakeResizeObserver.all.length).toBeGreaterThan(0)
    expect(drawCalls).toBeGreaterThan(0)
    unmount()
    const after = drawCalls
    vi.useFakeTimers()
    act(() => {
      tick()
      tick()
      vi.advanceTimersByTime(5000)
    })
    expect(frames.size).toBe(0)
    expect(drawCalls).toBe(after)
    expect(FakeIntersectionObserver.all.every((o) => o.disconnected)).toBe(true)
    expect(FakeResizeObserver.all.every((o) => o.disconnected)).toBe(true)
  })
})

/* The unroll wired into the theme: timers are faked, performance.now follows the frame clock, the
 mount is 3000 px tall and the font is there at once. */
describe('scroll theme unroll wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('mount') ? 3000 : 0
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: () => Promise.resolve([]), ready: Promise.resolve() },
    })
  })
  afterEach(() => {
    Reflect.deleteProperty(document, 'fonts')
  })

  /** Let the unroll's promises settle (inside act, so React's updates are applied). */
  async function settle() {
    await act(async () => {
      for (let i = 0; i < 30; i++) await Promise.resolve()
    })
  }
  /** Bring an unroll that was just asked for to its start: the first frame in which the paper moves. */
  async function toFirstFrame() {
    await settle()
    act(() => tick(16)) // the frame after the font
    await settle()
    act(() => tick(16)) // the first animated frame
    act(() => tick(16)) // the clock starts
    act(() => tick(16)) // the paper moves: the unroll has started
    await settle()
  }
  /** Frames and timers together, for `ms` of page time. */
  function live(ms: number) {
    act(() => {
      for (let t = 0; t < ms; t += 16) {
        vi.advanceTimersByTime(16)
        tick(16)
      }
    })
  }
  const tags = (container: HTMLElement) => {
    const el = container.querySelector<HTMLElement>('.tag')
    if (!el) throw new Error('no tags')
    return el
  }
  const hang = (container: HTMLElement) => container.querySelector<HTMLElement>('.hang')
  const mount = (container: HTMLElement) => container.querySelector<HTMLElement>('.mount')
  const artTag = () => screen.getByRole('button', { name: /^Art: / })
  const ctrlK = () => fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
  const slipShown = () => screen.queryByRole('dialog', { name: 'Jump to' }) !== null

  it('rolls up again on the StrictMode second mount, with no roller until the renderer is known', async () => {
    const { container } = renderStrict()
    const root = container.querySelector('.scroll-theme')
    // the trial unmount took `pre` and `gl-wait` away: the second unroll rolls up as asked and
    // waits for the renderer again (no CSS roller that the 3D one would then replace)
    expect(root).not.toHaveClass('pre')
    expect(root).toHaveClass('gl-wait')
    expect(mount(container)?.style.clipPath).toBe('inset(0 0 calc(100% - 64px) 0)')
    await settle()
    // three.js is mocked to give no 3D view here: the CSS roller shows from now on
    expect(root).not.toHaveClass('gl-wait')
    expect(root).not.toHaveClass('gl-on')
  })

  it('keeps the tags inert and hidden until 2800 ms after the unroll starts; Ctrl+K waits for them', async () => {
    const { container } = renderStrict()
    expect(tags(container)).not.toHaveClass('on')
    expect(tags(container)).toHaveAttribute('inert')
    // the scroll, clipped while it unrolls, is out of reach for exactly as long
    expect(hang(container)).toHaveAttribute('inert')
    await toFirstFrame()
    // unrolling: the CSS clip has been handed to the inline one
    expect(mount(container)?.style.clipPath).toMatch(/calc\(100% - [\d.]+px\)/)
    live(2784)
    expect(tags(container)).not.toHaveClass('on')
    expect(tags(container)).toHaveAttribute('inert')
    expect(hang(container)).toHaveAttribute('inert')
    ctrlK()
    expect(slipShown()).toBe(false)
    live(32)
    expect(tags(container)).toHaveClass('on')
    expect(tags(container)).not.toHaveAttribute('inert')
    expect(hang(container)).not.toHaveAttribute('inert')
    expect(mount(container)?.style.clipPath).toBe('')
    ctrlK()
    expect(slipShown()).toBe(true)
  })

  it('an art switch re-rolls the scroll, hides the tags meanwhile and gives the art tag its focus back', async () => {
    const { container } = renderStrict()
    await toFirstFrame()
    live(2900)
    expect(tags(container)).toHaveClass('on')
    vi.mocked(window.scrollTo).mockClear()

    const art = artTag()
    art.focus()
    fireEvent.click(art)
    // rolled up at once, at the top; the tags go
    expect(container.querySelector('.scroll-theme')).toHaveAttribute('data-mode', 'ja')
    expect(mount(container)?.style.clipPath).toBe('inset(0 0 calc(100% - 64px) 0)')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(tags(container)).not.toHaveClass('on')
    expect(tags(container)).toHaveAttribute('inert')
    expect(hang(container)).toHaveAttribute('inert')
    // a browser takes focus out of an inert subtree (jsdom does not)
    art.blur()
    expect(document.activeElement).toBe(document.body)

    await toFirstFrame()
    live(2700)
    expect(tags(container)).not.toHaveClass('on')
    expect(hang(container)).toHaveAttribute('inert')
    live(200)
    expect(tags(container)).toHaveClass('on')
    expect(tags(container)).not.toHaveAttribute('inert')
    expect(hang(container)).not.toHaveAttribute('inert')
    expect(artTag()).toHaveFocus()
  })

  it('a slip closed during a re-roll gives the menu tag its focus once the tags are back', async () => {
    const { container } = renderStrict()
    await toFirstFrame()
    live(2900)
    // the slip stays open while the art tag is pressed
    fireEvent.click(menuTag())
    fireEvent.click(artTag())
    expect(tags(container)).toHaveAttribute('inert')
    const input = within(slip()).getByRole('textbox')
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(slipShown()).toBe(false)
    // the menu tag is inert: it is not focused now (a browser drops focus from the hidden slip)
    expect(menuTag()).not.toHaveFocus()
    input.blur()
    await toFirstFrame()
    live(2900)
    expect(tags(container)).not.toHaveAttribute('inert')
    expect(menuTag()).toHaveFocus()
  })

  it('stilling the painting mid-unroll opens the scroll at once, tags and top seal shown', async () => {
    const { container } = renderStrict()
    await toFirstFrame()
    live(2900)
    // the slip stays open while the art tag is pressed; the motion item stills the painting
    fireEvent.click(menuTag())
    fireEvent.click(artTag())
    await toFirstFrame()
    live(500)
    expect(tags(container)).not.toHaveClass('on')
    expect(mount(container)?.style.clipPath).toMatch(/calc/)
    expect(hang(container)).toHaveAttribute('inert')
    fireEvent.click(within(slip()).getByRole('button', { name: 'Still the painting' }))
    await settle()
    expect(container.querySelector('.scroll-theme')).toHaveClass('calm')
    expect(mount(container)?.style.clipPath).toBe('')
    expect(tags(container)).toHaveClass('on')
    expect(tags(container)).not.toHaveAttribute('inert')
    expect(hang(container)).not.toHaveAttribute('inert')
    expect(container.querySelector('.inscr .seal')).not.toHaveClass('wait')
  })

  it('a forced open (the failsafe) leaves the tags shown and the top seal visible', async () => {
    const { container } = renderStrict()
    // no frame ever comes
    await settle()
    expect(container.querySelector('.inscr .seal')).toHaveClass('wait')
    act(() => vi.advanceTimersByTime(7000))
    await settle()
    expect(container.querySelector('.scroll-theme')).not.toHaveClass('pre')
    expect(container.querySelector('.scroll-theme')).not.toHaveClass('gl-wait')
    expect(mount(container)?.style.clipPath).toBe('')
    expect(tags(container)).toHaveClass('on')
    expect(tags(container)).not.toHaveAttribute('inert')
    expect(hang(container)).not.toHaveAttribute('inert')
    expect(container.querySelector('.inscr .seal')).not.toHaveClass('wait')
  })
})
