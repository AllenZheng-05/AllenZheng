import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScrollGl, type ScrollGl } from './gl'
import { createUnroll, type Unroll } from './unroll'

/* The unroll in jsdom: three.js is mocked (jsdom has no WebGL), the WebGL probe is answered by a
 stubbed getContext, frames run from a hand-driven requestAnimationFrame queue on a controllable
 clock (performance.now), timers are faked, and the mount, the rod, document.fonts and
 ResizeObserver are stubbed. */

vi.mock('./gl', () => ({ createScrollGl: vi.fn() }))
const create = vi.mocked(createScrollGl)

const FULL = 3000
const MOUNT_TOP = 40

let frames: Map<number, FrameRequestCallback>
let nextFrameId: number
let clock: number
let full: number

/** Run the frames waiting now, as if `ms` had passed; `stale`: their timestamp lags that far behind. */
function frame(ms = 16, stale = 0) {
  clock += ms
  const run = [...frames.values()]
  frames.clear()
  for (const f of run) f(clock - stale)
}
/** Run frames for `ms` of page time. */
function frameFor(ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) frame(step)
}
/** Run frames and timers together for `ms` of page time. */
function liveFor(ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) {
    vi.advanceTimersByTime(step)
    frame(step)
  }
}
/** Let promises (the mocked dynamic import, the font wait) settle. */
async function flush() {
  await vi.dynamicImportSettled()
  for (let i = 0; i < 20; i++) await Promise.resolve()
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
  fire() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

function rect(top: number, height: number, left = 100, width = 1000): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

/** The theme's DOM: root, and the hang with rod, mount and roller (the unroll makes canvas.gl itself). `pre` adds gl-wait too, as the theme does. */
function makeRoot(pre: boolean) {
  const root = document.createElement('div')
  root.className = pre ? 'scroll-theme pre gl-wait' : 'scroll-theme'
  root.innerHTML =
    '<div class="hang"><div class="rod"></div><div class="mount"></div><div class="roller"></div></div>'
  document.body.append(root)
  const get = (sel: string) => {
    const el = root.querySelector<HTMLElement>(sel)
    if (!el) throw new Error(sel)
    return el
  }
  const mount = get('.mount')
  const rod = get('.rod')
  const roller = get('.roller')
  Object.defineProperty(mount, 'offsetHeight', { get: () => full, configurable: true })
  mount.getBoundingClientRect = () => rect(MOUNT_TOP, full)
  rod.getBoundingClientRect = () => rect(MOUNT_TOP - 11, 11, 106, 988)
  return { root, mount, roller }
}

function fakeGl() {
  const draws: { full: number; reveal: number }[] = []
  const gl: ScrollGl = {
    draw: vi.fn((s: { full: number; reveal: number }) => {
      draws.push({ full: s.full, reveal: s.reveal })
    }),
    dispose: vi.fn(),
  }
  return { gl, draws }
}

/** The clip the unroll sets with `reveal` px showing (measured from the top). */
const clipAt = (reveal: number) => `inset(0 0 calc(100% - ${reveal}px) 0)`
/** The px showing, read back from the inline clip. */
const revealOf = (clip: string) => Number(/calc\(100% - ([\d.]+)px\)/.exec(clip)?.[1])

/** Whether the WebGL probe finds a context. */
let webgl = true
let probes = 0

let unroll: Unroll | null = null

beforeEach(() => {
  frames = new Map()
  nextFrameId = 1
  clock = 1000
  full = FULL
  webgl = true
  probes = 0
  FakeResizeObserver.all = []
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.set(id, f)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  // the WebGL probe (the 2D canvas is not used here)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
    probes++
    if (!webgl || type !== 'webgl2') return null
    return { getExtension: () => ({ loseContext() {} }) } as unknown as WebGL2RenderingContext
  })
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: () => Promise.resolve([]), ready: Promise.resolve() },
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  create.mockReset()
})
afterEach(() => {
  unroll?.destroy()
  unroll = null
  document.body.innerHTML = ''
  Reflect.deleteProperty(document, 'fonts')
  Reflect.deleteProperty(document, 'hidden')
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Open with animation and bring it to its first animated frame. */
async function startOpen(u: Unroll, onStart?: () => void) {
  const done = u.open(true, onStart)
  await flush()
  frame() // the frame after the font
  await flush()
  frame() // the first frame of the animation
  return { done }
}

describe('unroll', () => {
  it('open(false) leaves the page simply open, without three.js', async () => {
    const { root, mount } = makeRoot(false)
    unroll = createUnroll(root)
    let resolved = false
    void unroll.open(false).then(() => (resolved = true))
    await flush()
    expect(resolved).toBe(true)
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-on')
    expect(mount.style.clipPath).toBe('')
    expect(create).not.toHaveBeenCalled()
  })

  it('unrolls with the 3D rod and roller: reveal rises from 64 to full, pre goes after the first frame', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount, roller } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    const done = unroll.open(true).then(() => (resolved = true))
    await flush()
    // three.js is here: the rolled-up scroll is drawn in 3D at once, still under the stylesheet's clip
    expect(create).toHaveBeenCalledTimes(1)
    expect(root).toHaveClass('gl-on')
    expect(root).toHaveClass('pre')
    expect(root).not.toHaveClass('gl-wait')
    expect(draws.at(-1)).toEqual({ full: FULL, reveal: 64 })
    frame()
    await flush()
    expect(root).toHaveClass('pre')
    frame()
    // the first animated frame: the inline clip takes over
    expect(root).not.toHaveClass('pre')
    expect(mount.style.clipPath).toBe(clipAt(64))
    const first = draws.length - 1
    frameFor(1300)
    expect(resolved).toBe(false)
    frameFor(1400)
    await done
    expect(resolved).toBe(true)
    const reveals = draws.slice(first).map((d) => d.reveal)
    expect(reveals[0]).toBe(64)
    for (let i = 1; i < reveals.length; i++) {
      expect(reveals[i]).toBeGreaterThanOrEqual(reveals[i - 1] ?? 0)
    }
    expect(reveals.at(-1)).toBe(FULL)
    expect(mount.style.clipPath).toBe('')
    expect(roller.style.transform).toBe('')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('takes about 2.6 s, and the unroll stops 140 px below the screen before opening the rest', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    void unroll.open(true).then(() => (resolved = true))
    await flush()
    frame()
    await flush()
    frame()
    frameFor(2560)
    await flush()
    expect(resolved).toBe(false)
    const below = window.innerHeight - MOUNT_TOP + 140
    expect(draws.at(-1)?.reveal).toBeLessThanOrEqual(below)
    expect(draws.at(-1)?.reveal).toBeGreaterThan(below - 5)
    frameFor(64)
    await flush()
    expect(resolved).toBe(true)
  })

  it('lasts 2600 ms from the clock’s start by performance.now(), even when frame timestamps are stale', async () => {
    const { gl } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    let startedAt = -1
    void unroll.open(true, () => (startedAt = clock)).then(() => (resolved = true))
    await flush()
    frame()
    await flush()
    // the first animated frame: rolled up, the clock not yet started
    frame()
    expect(mount.style.clipPath).toBe(clipAt(64))
    expect(startedAt).toBe(-1)
    // the clock starts on a frame that comes after a long task: its timestamp is 500 ms old
    frame(16, 500)
    const clockStart = clock
    expect(mount.style.clipPath).toBe(clipAt(64))
    // the next frame moves the paper: the animation has started
    frame()
    expect(startedAt).toBe(clock)
    // still unrolling until 2600 ms after the clock started
    for (let t = 32; t < 2600; t += 16) {
      frame()
      expect(mount.style.clipPath).toMatch(/calc/)
    }
    await flush()
    expect(resolved).toBe(false)
    frame()
    await flush()
    expect(resolved).toBe(true)
    expect(mount.style.clipPath).toBe('')
    expect(clock - clockStart).toBeGreaterThanOrEqual(2600)
    expect(clock - clockStart).toBeLessThan(2620)
  })

  it('draws the rolled-up scroll in 3D before the clock starts: a slow first render costs no unroll time', async () => {
    const { gl, draws } = fakeGl()
    let first = true
    vi.mocked(gl.draw).mockImplementation((s) => {
      draws.push({ full: s.full, reveal: s.reveal })
      // the first render compiles the shaders: 400 ms
      if (first) clock += 400
      first = false
    })
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    let startedAt = -1
    void unroll.open(true, () => (startedAt = clock)).then(() => (resolved = true))
    await flush()
    frame() // the frame after the font: the rolled-up scroll drawn again, still rolled up
    await flush()
    expect(root).toHaveClass('pre')
    expect(draws.length).toBeGreaterThanOrEqual(2)
    expect(draws.every((d) => d.reveal === 64)).toBe(true)
    // the first animated frame: nothing unrolled yet
    frame()
    expect(root).not.toHaveClass('pre')
    expect(mount.style.clipPath).toBe(clipAt(64))
    expect(draws.at(-1)?.reveal).toBe(64)
    const firstAnimated = clock
    let n = 0
    while (!resolved && n++ < 400) {
      frame()
      await flush()
    }
    expect(resolved).toBe(true)
    // 2600 ms from the first animated frame (and the frame the clock starts on)
    expect(clock - firstAnimated).toBeGreaterThanOrEqual(2600)
    expect(clock - firstAnimated).toBeLessThanOrEqual(2600 + 2 * 16)
    expect(startedAt - firstAnimated).toBeLessThanOrEqual(2 * 16)
  })

  it('does not count a frame held up at the start: the unroll picks up where it was', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    void unroll.open(true).then(() => (resolved = true))
    await flush()
    frame()
    await flush()
    frame() // the first animated frame
    frame() // the clock starts
    const clockStart = clock
    // the GPU holds the next frames up: 380 ms, then 150 ms
    frame(380)
    expect(draws.at(-1)?.reveal).toBeLessThan(64.5)
    frame(150)
    expect(draws.at(-1)?.reveal).toBeLessThan(65)
    let n = 0
    while (!resolved && n++ < 400) {
      frame()
      await flush()
    }
    // the late frames counted as ordinary ones: 2600 ms of unroll after them
    expect(clock - clockStart).toBeGreaterThanOrEqual(2600 + 380 + 150 - 2 * 17)
    expect(clock - clockStart).toBeLessThanOrEqual(2600 + 380 + 150 + 16)
  })

  it('without WebGL the CSS roller rides the paper edge, and is reset when open', async () => {
    create.mockReturnValue(null)
    const { root, mount, roller } = makeRoot(true)
    unroll = createUnroll(root)
    // rolled up from the first frame: the roller sits at the edge of the 64 px showing
    expect(roller.style.transform).toBe(`translateY(-${FULL - 64}px)`)
    const { done } = await startOpen(unroll)
    expect(root).not.toHaveClass('gl-on')
    expect(root).not.toHaveClass('gl-wait')
    expect(root).not.toHaveClass('pre')
    frameFor(1300)
    const left = FULL - revealOf(mount.style.clipPath)
    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThan(FULL - 64)
    expect(roller.style.transform).toBe(`translateY(-${left}px)`)
    frameFor(1400)
    await done
    expect(roller.style.transform).toBe('')
    expect(mount.style.clipPath).toBe('')
  })

  it('clips from the top: the mount growing mid-unroll leaves the clip as it was', async () => {
    create.mockReturnValue(null)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    await startOpen(unroll)
    frameFor(800)
    const clip = mount.style.clipPath
    expect(clip).toMatch(/^inset\(0 0 calc\(100% - [\d.]+px\) 0\)$/)
    // a late font: the mount grows; the animation's own frames go on as they were
    full = 3600
    for (const o of FakeResizeObserver.all) o.fire()
    expect(mount.style.clipPath).toBe(clip)
  })

  it('falls back to the CSS roller when creating the 3D view throws', async () => {
    create.mockImplementation(() => {
      throw new Error('no WebGL')
    })
    const { root, roller } = makeRoot(true)
    unroll = createUnroll(root)
    await startOpen(unroll)
    frameFor(500)
    expect(root).not.toHaveClass('gl-on')
    expect(root).not.toHaveClass('gl-wait')
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
  })

  it('falls back to the CSS roller when drawing throws mid-unroll, and still opens', async () => {
    const { gl } = fakeGl()
    let calls = 0
    vi.mocked(gl.draw).mockImplementation(() => {
      if (++calls > 20) throw new Error('lost')
    })
    create.mockReturnValue(gl)
    const { root, mount, roller } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    const { done } = await startOpen(unroll)
    void done.then(() => (resolved = true))
    expect(root).toHaveClass('gl-on')
    frameFor(800)
    expect(root).not.toHaveClass('gl-on')
    expect(gl.dispose).toHaveBeenCalledTimes(1)
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
    frameFor(2000)
    await flush()
    expect(resolved).toBe(true)
    expect(mount.style.clipPath).toBe('')
    expect(roller.style.transform).toBe('')
  })

  it('a lost WebGL context hands over to the CSS rod and roller for good', async () => {
    const { gl } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount, roller } = makeRoot(true)
    unroll = createUnroll(root)
    const { done } = await startOpen(unroll)
    frameFor(800)
    expect(root).toHaveClass('gl-on')
    const draws = vi.mocked(gl.draw).mock.calls.length
    // the context goes: gl.ts tells the unroll through the onLost it was made with
    create.mock.calls[0]?.[1]?.onLost?.()
    expect(root).not.toHaveClass('gl-on')
    expect(gl.dispose).toHaveBeenCalledTimes(1)
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
    frameFor(2000)
    await done
    expect(vi.mocked(gl.draw).mock.calls.length).toBe(draws)
    expect(mount.style.clipPath).toBe('')
    // a re-roll stays on the CSS roller
    const again = unroll.open(true)
    await flush()
    frame()
    await flush()
    frame()
    frameFor(600)
    expect(create).toHaveBeenCalledTimes(1)
    expect(root).not.toHaveClass('gl-on')
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
    frameFor(2200)
    await again
  })

  it('restarts from rolled up when opened again mid-way; both promises settle', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    const settled: string[] = []
    const { done: first } = await startOpen(unroll)
    void first.then(() => settled.push('first'))
    frameFor(1300)
    expect(draws.at(-1)?.reveal).toBeGreaterThan(200)
    const second = unroll.open(true).then(() => settled.push('second'))
    // rolled up at once, at the top
    expect(mount.style.clipPath).toBe(clipAt(64))
    expect(draws.at(-1)?.reveal).toBe(64)
    await flush()
    frame()
    await flush()
    frame()
    const restart = draws.length - 1
    expect(draws[restart]?.reveal).toBe(64)
    frameFor(2700)
    await second
    await flush()
    expect(settled.sort()).toEqual(['first', 'second'])
    expect(draws.at(-1)?.reveal).toBe(FULL)
    expect(mount.style.clipPath).toBe('')
  })

  it('opens by itself when frames never come (the failsafe)', async () => {
    create.mockReturnValue(null)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    void unroll.open(true).then(() => (resolved = true))
    await flush()
    expect(root).toHaveClass('pre')
    vi.advanceTimersByTime(7000)
    await flush()
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-wait')
    expect(mount.style.clipPath).toBe('')
    expect(resolved).toBe(true)
  })

  it('opens by itself even when no open is ever asked for; gl-wait goes too', () => {
    const { root } = makeRoot(true)
    unroll = createUnroll(root)
    expect(root).toHaveClass('gl-wait')
    vi.advanceTimersByTime(7000)
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-wait')
  })

  it('an unroll that starts late is not cut by the first failsafe; a second one covers the animation', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    void unroll.open(true).then(() => (resolved = true))
    await flush()
    // the page is busy: no frame for 6 s
    vi.advanceTimersByTime(6000)
    frame()
    await flush()
    frame() // the first animated frame, 6 s after the open
    expect(root).not.toHaveClass('pre')
    // past the 7 s after the open: still unrolling
    liveFor(2000)
    await flush()
    expect(resolved).toBe(false)
    expect(mount.style.clipPath).toMatch(/calc/)
    const reveal = draws.at(-1)?.reveal ?? 0
    expect(reveal).toBeGreaterThan(64)
    expect(reveal).toBeLessThan(FULL)
    // the frames stop (a hidden tab): the second failsafe opens it 2600 + 2000 ms after the clock
    // started (on the first of the frames above, 16 ms in)
    vi.advanceTimersByTime(4600 + 16 - 2000 - 1)
    await flush()
    expect(resolved).toBe(false)
    vi.advanceTimersByTime(1)
    await flush()
    expect(resolved).toBe(true)
    expect(mount.style.clipPath).toBe('')
    expect(draws.at(-1)?.reveal).toBe(FULL)
  })

  it('a hidden tab when the unroll would start: it opens at once, without animating', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    let resolved = false
    const onStart = vi.fn()
    void unroll.open(true, onStart).then(() => (resolved = true))
    // a hidden tab runs no animation frames: none is run here
    await flush()
    expect(resolved).toBe(true)
    expect(onStart).not.toHaveBeenCalled()
    expect(root).not.toHaveClass('pre')
    expect(mount.style.clipPath).toBe('')
    expect(draws.map((d) => d.reveal)).toEqual([64, FULL])
    expect(frames.size).toBe(0)
  })

  it('waits at most 3 s for the handwriting', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: () => new Promise(() => {}), ready: new Promise(() => {}) },
    })
    create.mockReturnValue(null)
    const { root } = makeRoot(true)
    unroll = createUnroll(root)
    void unroll.open(true)
    await flush()
    vi.advanceTimersByTime(2999)
    await flush()
    frame()
    await flush()
    frame()
    expect(root).toHaveClass('pre')
    vi.advanceTimersByTime(1)
    await flush()
    frame()
    await flush()
    frame()
    expect(root).not.toHaveClass('pre')
  })

  it('destroy mid-animation leaves the page open and stops everything', async () => {
    const { gl } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount, roller } = makeRoot(true)
    unroll = createUnroll(root)
    let resolved = false
    const { done } = await startOpen(unroll)
    void done.then(() => (resolved = true))
    frameFor(800)
    unroll.destroy()
    await flush()
    expect(resolved).toBe(true)
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-on')
    expect(mount.style.clipPath).toBe('')
    expect(roller.style.transform).toBe('')
    expect(gl.dispose).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
    const calls = vi.mocked(gl.draw).mock.calls.length
    window.dispatchEvent(new Event('scroll'))
    frameFor(3000)
    vi.advanceTimersByTime(10000)
    expect(vi.mocked(gl.draw).mock.calls.length).toBe(calls)
    expect(FakeResizeObserver.all.every((o) => o.disconnected)).toBe(true)
  })

  it('a second unroll made on a root whose classes were taken away (StrictMode) still waits for the renderer', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount, roller } = makeRoot(true)
    // StrictMode's trial mount: made, then destroyed at once, which takes pre and gl-wait away
    createUnroll(root).destroy()
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-wait')
    unroll = createUnroll(root)
    void unroll.open(true)
    // rolled up as asked, with no roller until the renderer is known (no CSS roller first)
    expect(mount.style.clipPath).toBe(clipAt(64))
    expect(root).toHaveClass('gl-wait')
    await flush()
    expect(root).not.toHaveClass('gl-wait')
    expect(root).toHaveClass('gl-on')
    expect(draws.at(-1)).toEqual({ full: FULL, reveal: 64 })
    expect(roller.style.transform).toBe('')
  })

  it('ignores three.js arriving after destroy; destroy takes gl-wait away', async () => {
    const { gl } = fakeGl()
    create.mockReturnValue(gl)
    const { root } = makeRoot(true)
    unroll = createUnroll(root)
    void unroll.open(true)
    expect(root).toHaveClass('gl-wait')
    unroll.destroy()
    expect(root).not.toHaveClass('gl-wait')
    await flush()
    frameFor(100)
    expect(root).not.toHaveClass('gl-on')
    expect(root).not.toHaveClass('pre')
    expect(create).not.toHaveBeenCalled()
    expect(gl.draw).not.toHaveBeenCalled()
  })

  describe('its own canvas.gl', () => {
    const glCanvases = (root: HTMLElement) => root.querySelectorAll('canvas.gl')

    it('exists only while a 3D view does: none before, one while in use, none after destroy', async () => {
      const { gl } = fakeGl()
      create.mockReturnValue(gl)
      const { root } = makeRoot(true)
      unroll = createUnroll(root)
      expect(glCanvases(root)).toHaveLength(0)
      void unroll.open(true)
      expect(glCanvases(root)).toHaveLength(0)
      await flush()
      expect(glCanvases(root)).toHaveLength(1)
      const canvas = glCanvases(root)[0]
      // the one the 3D view was made with, beside .hang (not inside: its filter traps position: fixed)
      expect(create.mock.calls[0]?.[0]).toBe(canvas)
      expect(canvas?.getAttribute('aria-hidden')).toBe('true')
      expect(canvas?.nextElementSibling).toHaveClass('hang')
      unroll.destroy()
      expect(glCanvases(root)).toHaveLength(0)
      expect(gl.dispose).toHaveBeenCalledTimes(1)
    })

    it('is never made when stilled (open without animation)', async () => {
      const { gl } = fakeGl()
      create.mockReturnValue(gl)
      const { root } = makeRoot(false)
      unroll = createUnroll(root)
      await unroll.open(false)
      await flush()
      expect(glCanvases(root)).toHaveLength(0)
      expect(create).not.toHaveBeenCalled()
    })

    it('is taken away when the context is lost, and when the 3D view cannot be made', async () => {
      const { gl } = fakeGl()
      create.mockReturnValue(gl)
      const { root } = makeRoot(true)
      unroll = createUnroll(root)
      await startOpen(unroll)
      expect(glCanvases(root)).toHaveLength(1)
      create.mock.calls[0]?.[1]?.onLost?.()
      expect(glCanvases(root)).toHaveLength(0)
      expect(root).not.toHaveClass('gl-on')

      unroll.destroy()
      create.mockReturnValue(null)
      const other = makeRoot(true)
      unroll = createUnroll(other.root)
      void unroll.open(true)
      await flush()
      expect(create).toHaveBeenCalledTimes(2)
      expect(glCanvases(other.root)).toHaveLength(0)
    })

    it('is taken away when drawing fails', async () => {
      const { gl } = fakeGl()
      vi.mocked(gl.draw).mockImplementation(() => {
        throw new Error('lost')
      })
      create.mockReturnValue(gl)
      const { root } = makeRoot(true)
      unroll = createUnroll(root)
      void unroll.open(true)
      await flush()
      expect(glCanvases(root)).toHaveLength(0)
      expect(root).not.toHaveClass('gl-on')
    })

    it('StrictMode: two create/destroy cycles on one root leave one canvas, then none', async () => {
      const first = fakeGl()
      const second = fakeGl()
      create.mockReturnValueOnce(first.gl).mockReturnValueOnce(second.gl)
      const { root } = makeRoot(true)
      const trial = createUnroll(root)
      void trial.open(true)
      await flush()
      expect(glCanvases(root)).toHaveLength(1)
      trial.destroy()
      expect(glCanvases(root)).toHaveLength(0)
      unroll = createUnroll(root)
      void unroll.open(true)
      await flush()
      expect(glCanvases(root)).toHaveLength(1)
      // a fresh canvas for the second 3D view, never the first one's
      expect(create.mock.calls[1]?.[0]).toBe(glCanvases(root)[0])
      expect(create.mock.calls[1]?.[0]).not.toBe(create.mock.calls[0]?.[0])
      expect(root).toHaveClass('gl-on')
      unroll.destroy()
      unroll = null
      expect(glCanvases(root)).toHaveLength(0)
    })
  })

  it('once open, redraws on scroll and follows the mount when it changes size', async () => {
    const { gl, draws } = fakeGl()
    create.mockReturnValue(gl)
    const { root, mount } = makeRoot(true)
    unroll = createUnroll(root)
    const { done } = await startOpen(unroll)
    frameFor(2700)
    await done
    const n = draws.length
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    frame()
    expect(draws.length).toBe(n + 1)
    expect(draws.at(-1)).toEqual({ full: FULL, reveal: FULL })
    // a house opens: the mount grows, and stays fully open
    full = 3500
    for (const o of FakeResizeObserver.all) o.fire()
    expect(draws.at(-1)).toEqual({ full: 3500, reveal: 3500 })
    expect(mount.style.clipPath).toBe('')
  })
})

/* Each test below loads a fresh copy of unroll.ts (preloadGl's promise is per module) with gl.ts
 mocked as the test needs. */
describe('unroll loading three.js', () => {
  let imports = 0
  type GlModule = { createScrollGl: unknown }
  async function fresh(gl: () => GlModule | Promise<GlModule>) {
    imports = 0
    vi.resetModules()
    vi.doMock('./gl', () => {
      imports++
      return gl()
    })
    return import('./unroll')
  }
  afterEach(() => {
    vi.doUnmock('./gl')
  })

  it('plays with the CSS roller at once when the import fails (no wait)', async () => {
    const { createUnroll: createFresh } = await fresh(() => Promise.reject(new Error('blocked')))
    const { root, mount, roller } = makeRoot(true)
    unroll = createFresh(root)
    const done = unroll.open(true)
    await flush()
    expect(root).not.toHaveClass('gl-wait')
    // no timer advanced: the rejection itself ends the wait
    frame()
    await flush()
    frame()
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-on')
    frameFor(1300)
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
    frameFor(1400)
    await done
    expect(mount.style.clipPath).toBe('')
    expect(roller.style.transform).toBe('')
  })

  it('gives up on an import that never arrives after 2.5 s; gl-wait stays until then', async () => {
    const { createUnroll: createFresh } = await fresh(() => new Promise(() => {}))
    const { root } = makeRoot(true)
    unroll = createFresh(root)
    void unroll.open(true)
    await flush()
    frame()
    await flush()
    frame()
    expect(root).toHaveClass('pre')
    expect(root).toHaveClass('gl-wait')
    vi.advanceTimersByTime(2499)
    await flush()
    expect(root).toHaveClass('gl-wait')
    vi.advanceTimersByTime(1)
    await flush()
    expect(root).not.toHaveClass('gl-wait')
    // the frame after the waits, then the first animated frame
    frame()
    await flush()
    frame()
    expect(root).not.toHaveClass('pre')
    expect(root).not.toHaveClass('gl-on')
  })

  it('preloadGl asks for three.js once; the unroll uses the same promise', async () => {
    const { gl } = fakeGl()
    const made = vi.fn(() => gl)
    const { preloadGl, createUnroll: createFresh } = await fresh(() => ({ createScrollGl: made }))
    const a = preloadGl()
    const b = preloadGl()
    expect(a).toBe(b)
    expect(probes).toBe(1)
    const { root } = makeRoot(true)
    unroll = createFresh(root)
    void unroll.open(true)
    await flush()
    expect(imports).toBe(1)
    expect(probes).toBe(1)
    expect(await a).toBe(made)
    expect(made).toHaveBeenCalledTimes(1)
    expect(root).toHaveClass('gl-on')
  })

  it('takes three.js arriving after the wait gave up: after the unroll, then for every re-roll', async () => {
    const { gl, draws } = fakeGl()
    const made = vi.fn(() => gl)
    let arrive: (m: GlModule) => void = () => {}
    const { createUnroll: createFresh } = await fresh(
      () => new Promise<GlModule>((resolve) => (arrive = resolve)),
    )
    const { root, mount, roller } = makeRoot(true)
    unroll = createFresh(root)
    const done = unroll.open(true)
    await flush()
    vi.advanceTimersByTime(2500)
    await flush()
    // the wait is over: the first unroll runs with the CSS roller
    expect(root).not.toHaveClass('gl-wait')
    frame()
    await flush()
    frame()
    frameFor(1000)
    expect(root).not.toHaveClass('gl-on')
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
    // three.js arrives mid-unroll: not taken yet
    arrive({ createScrollGl: made })
    await flush()
    expect(made).not.toHaveBeenCalled()
    frameFor(1700)
    await done
    // the unroll is over: the 3D view takes over at once
    expect(made).toHaveBeenCalledTimes(1)
    expect(root).toHaveClass('gl-on')
    expect(draws.at(-1)).toEqual({ full: FULL, reveal: FULL })
    expect(mount.style.clipPath).toBe('')
    expect(roller.style.transform).toBe('')
    // a re-roll is drawn in 3D from the start
    const again = unroll.open(true)
    expect(draws.at(-1)).toEqual({ full: FULL, reveal: 64 })
    await flush()
    frame()
    await flush()
    frame()
    frameFor(800)
    const reveal = draws.at(-1)?.reveal ?? 0
    expect(reveal).toBeGreaterThan(64)
    expect(reveal).toBeLessThan(FULL)
    expect(root).toHaveClass('gl-on')
    frameFor(2000)
    await again
    expect(made).toHaveBeenCalledTimes(1)
  })

  it('takes three.js arriving late at once when the scroll is open and still', async () => {
    const { gl } = fakeGl()
    const made = vi.fn(() => gl)
    let arrive: (m: GlModule) => void = () => {}
    const { createUnroll: createFresh } = await fresh(
      () => new Promise<GlModule>((resolve) => (arrive = resolve)),
    )
    const { root } = makeRoot(true)
    unroll = createFresh(root)
    const done = unroll.open(true)
    await flush()
    vi.advanceTimersByTime(2500)
    await flush()
    frame()
    await flush()
    frame()
    frameFor(2700)
    await done
    expect(root).not.toHaveClass('gl-on')
    arrive({ createScrollGl: made })
    await flush()
    expect(made).toHaveBeenCalledTimes(1)
    expect(root).toHaveClass('gl-on')
    expect(gl.draw).toHaveBeenCalled()
  })

  it('does not import three.js when the WebGL probe finds no context', async () => {
    webgl = false
    const { preloadGl, createUnroll: createFresh } = await fresh(() => ({
      createScrollGl: vi.fn(),
    }))
    expect(await preloadGl()).toBeNull()
    const { root, roller } = makeRoot(true)
    unroll = createFresh(root)
    void unroll.open(true)
    await flush()
    expect(root).not.toHaveClass('gl-wait')
    frame()
    await flush()
    frame()
    frameFor(500)
    expect(imports).toBe(0)
    expect(root).not.toHaveClass('gl-on')
    expect(roller.style.transform).toMatch(/^translateY\(-[\d.]+px\)$/)
  })
})
