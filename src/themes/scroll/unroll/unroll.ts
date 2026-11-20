/* The unroll: on load the scroll is rolled up (only the top of the mount shows below the rod) and
 unrolls downward over about 2.6 s; it rolls up and unrolls again when the art changes. The paper is
 clipped from below (clip-path on .mount), so it stays ordinary HTML, in the DOM and focusable,
 the whole time. The rod and the roller are drawn in 3D by three.js (gl.ts, imported lazily: see
 preloadGl) or, where that is unavailable or slow to arrive, are the CSS ones, the roller riding
 the paper's edge (three.js arriving late takes over once no unroll is running). While it is not
 yet known which (class `gl-wait` on the root) no roller shows at all. Port of
 the design mock-up's unroll3d (open, the draw loop and `later`). */

import { ease } from '../motion/wind'
import type { ScrollGl, ScrollGlOptions } from './gl'

type CreateGl = (canvas: HTMLCanvasElement, options?: ScrollGlOptions) => ScrollGl | null

/** Whether this browser can give a WebGL 2 context (what gl.ts needs): a probe, given back at once. */
function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    if (!context) return false
    try {
      context.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // the probe goes with its canvas
    }
    return true
  } catch {
    return false
  }
}

let glModule: Promise<CreateGl | null> | null = null

/**
 * Ask for three.js (gl.ts) now, once: resolves with its factory, or null when WebGL is unavailable
 * (then three.js is never downloaded) or the import fails. Called as soon as it is known that the
 * scroll will unroll; every unroll uses the same promise.
 */
export function preloadGl(): Promise<CreateGl | null> {
  glModule ??= webglAvailable()
    ? import('./gl').then(
        (m): CreateGl => m.createScrollGl,
        () => null,
      )
    : Promise.resolve(null)
  return glModule
}

export interface Unroll {
  /**
   * Roll up and unroll from the top. Resolves when fully open. With animate=false the scroll is
   * simply open (used when stilled). Calling it again while one runs restarts from rolled-up.
   * `onStart` is called when the animation actually starts (after the font and three.js have
   * arrived); it is not called for a run that is superseded or forced open before it starts, nor
   * when the tab is hidden by then (the scroll then simply opens).
   */
  open(animate: boolean, onStart?: () => void): Promise<void>
  destroy(): void
}

/** px of the mount showing while rolled up (the `.pre .mount` rule in scroll.css shows the same). */
const ROLLED = 64
/** The unroll's length (ms). */
const DURATION = 2600
/** The unroll stops this far (px) below the bottom of the screen; the rest opens at once. */
const BELOW = 140
/** Give up waiting for the handwriting after this long (ms). */
const FONT_WAIT = 3000
/** Give up on three.js after this long (ms): the CSS rod and roller stand in. */
const GL_WAIT = 2500
/** Whatever happens, the scroll is fully open this long (ms) after it was asked to open, if the unroll has not started by then. */
const FAILSAFE = 7000
/** Once the unroll has started, it is fully open at the latest this long (ms) after its end. */
const FAILSAFE_AFTER = 2000
/** One frame (ms) at 60 Hz. */
const FRAME = 1000 / 60
/** A frame that comes this long (ms) after the one before it is late. */
const LATE_FRAME = 100
/** Late frames in the unroll's first this many ms are not counted. */
const CATCH_UP = 600

/** Resolves with the promise's value, or with `fallback` after `ms` or on a rejection. */
function settle<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

/** The handwriting has arrived (or will not): the font itself, then every font still loading. */
async function fontArrived(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fonts) return
  await fonts.load('20px "Allen Hand"')
  await fonts.ready
}

/** root: the theme root (.scroll-theme). The scroll starts in whatever state the DOM is in (class `pre` on the root = rolled up, clipped by CSS). */
export function createUnroll(root: HTMLElement): Unroll {
  const mount = root.querySelector<HTMLElement>('.mount')
  const rodEl = root.querySelector<HTMLElement>('.rod')
  const roller = root.querySelector<HTMLElement>('.roller')
  /**
   * The 3D view's own canvas (canvas.gl): made with the 3D view and taken out of the page with it,
   * so no canvas outlives the renderer it was made for (a canvas whose context was given up cannot
   * draw again).
   */
  let canvas: HTMLCanvasElement | null = null

  /**
   * rolled: rolled up (reveal is ROLLED); animating: unrolling (reveal set by the animation, full
   * fixed at its start); open: fully open (reveal = full). Outside the animation `full` follows the
   * mount's height, so a house opening or the font arriving keeps the state right.
   */
  let phase: 'rolled' | 'animating' | 'open' = root.classList.contains('pre') ? 'rolled' : 'open'
  let full = 0
  let reveal = 0
  let destroyed = false

  /** The 3D rod and roller once three.js has arrived; null meanwhile and when it is unavailable. */
  let gl: ScrollGl | null = null
  /** The one wait for three.js (made on the first animated open; preloadGl has usually asked already). */
  let glLoad: Promise<void> | null = null
  /** The wait for three.js is over: the renderer (3D, or the CSS roller for now) is known. */
  let glKnown = false
  /** The 3D view has been tried (made, or failed): it is never made again, so a lost one stays lost. */
  let glTried = false
  /** three.js arrived after the wait gave up: the 3D view is made from it once the scroll is not unrolling. */
  let lateGl: CreateGl | null = null
  /** The wait for the handwriting (made once). */
  let fontLoad: Promise<void> | null = null

  /** The current run (each open bumps it; a run that sees another number has been superseded). */
  let run = 0
  /** Everyone waiting for the scroll to be fully open. */
  let waiting: (() => void)[] = []
  /** Frames asked for by the waits and the animation (all cancelled together). */
  const frames = new Set<number>()
  let later = 0
  let failsafe: ReturnType<typeof setTimeout> | undefined

  /** Put the current state on screen: the clip, the CSS roller or the 3D rod and roller. */
  function render(): void {
    if (!mount) return
    if (phase !== 'animating') full = mount.offsetHeight
    if (phase === 'open') reveal = full
    else if (phase === 'rolled') reveal = Math.min(ROLLED, full)
    const left = Math.max(0, full - reveal)
    // while the root has `pre` the stylesheet clips the mount (and knows its height better than a
    // measurement taken before the page has settled)
    // measured from the top (as the stylesheet does), so the paper never shows below the roll
    // when the mount grows during the animation
    if (!root.classList.contains('pre')) {
      mount.style.clipPath = left > 0.5 ? `inset(0 0 calc(100% - ${reveal}px) 0)` : ''
    }
    if (gl && rodEl) {
      try {
        // first: the stylesheet shows canvas.gl only with gl-on, and gl.ts sizes it from its box
        root.classList.add('gl-on')
        gl.draw({
          mount: mount.getBoundingClientRect(),
          rod: rodEl.getBoundingClientRect(),
          full,
          reveal,
        })
        if (roller) roller.style.transform = ''
        return
      } catch {
        // the 3D view failed: the CSS rod and roller from now on
        dropGl()
      }
    }
    if (roller) roller.style.transform = left > 0.5 ? `translateY(${-left}px)` : ''
  }

  function dropGl(): void {
    root.classList.remove('gl-on')
    const old = gl
    gl = null
    try {
      old?.dispose()
    } catch {
      // nothing more to give back
    }
    removeCanvas()
  }

  function removeCanvas(): void {
    canvas?.remove()
    canvas = null
  }

  /** Render, and if even that fails leave the page fully open and usable. */
  function safeRender(): void {
    try {
      render()
    } catch {
      forceOpen()
    }
  }

  /** Fully open now: no `pre`, no clip, no running animation; everyone waiting is told. */
  function finish(): void {
    cancelFrames()
    clearTimeout(failsafe)
    failsafe = undefined
    phase = 'open'
    root.classList.remove('pre', 'gl-wait')
    safeRender()
    takeLateGl()
    const done = waiting
    waiting = []
    for (const resolve of done) resolve()
  }

  /** The way out of any trouble: the page fully open and usable, the CSS rod and roller if need be. */
  function forceOpen(): void {
    run++
    cancelFrames()
    clearTimeout(failsafe)
    failsafe = undefined
    phase = 'open'
    root.classList.remove('pre', 'gl-wait')
    if (mount) mount.style.clipPath = ''
    if (roller) roller.style.transform = ''
    try {
      render()
    } catch {
      dropGl()
      if (mount) mount.style.clipPath = ''
      if (roller) roller.style.transform = ''
    }
    takeLateGl()
    const done = waiting
    waiting = []
    for (const resolve of done) resolve()
  }

  /** The WebGL context was lost: the CSS rod and roller for the rest of the visit. */
  function onGlLost(): void {
    dropGl()
    if (!destroyed) safeRender()
  }

  /** Make the 3D view, once; it shows at once, rolled up or open (with `gl-on`). */
  function makeGl(create: CreateGl | null): void {
    if (destroyed || glTried || !create) return
    glTried = true
    // a sibling of .hang, not inside it: its filter would trap position: fixed
    const made = document.createElement('canvas')
    made.className = 'gl'
    made.setAttribute('aria-hidden', 'true')
    const hang = root.querySelector(':scope > .hang')
    if (hang) hang.before(made)
    else root.append(made)
    canvas = made
    try {
      gl = create(made, { onLost: onGlLost })
    } catch {
      gl = null
    }
    if (gl) safeRender()
    else removeCanvas()
  }

  /** three.js arrived late: switch to the 3D view now, unless an unroll is running (then at its end). */
  function takeLateGl(): void {
    const create = lateGl
    if (!create || phase === 'animating') return
    lateGl = null
    makeGl(create)
  }

  /**
   * Try three.js: the CSS rod and roller stand in when it cannot be had in time. If it arrives
   * after that (a slow connection), it is still used: from then on the 3D rod and roller draw.
   */
  function loadGl(): Promise<void> {
    if (glLoad) return glLoad
    const load = preloadGl()
    glLoad = settle(load, GL_WAIT, null).then((create) => {
      glKnown = true
      makeGl(create)
      // the renderer is chosen: the 3D roll or the CSS roller (already at the paper's edge) shows
      root.classList.remove('gl-wait')
    })
    void load.then((create) => {
      // in time, it was taken above; only an arrival after the wait gave up is taken here
      if (!glKnown || glTried || !create) return
      lateGl = create
      takeLateGl()
    })
    return glLoad
  }

  function loadFont(): Promise<void> {
    fontLoad ??= settle(fontArrived(), FONT_WAIT, undefined)
    return fontLoad
  }

  /** Run `fn` on the next frame, unless the frames are cancelled first. */
  function onFrame(fn: (now: number) => void): void {
    const id = requestAnimationFrame((now) => {
      frames.delete(id)
      fn(now)
    })
    frames.add(id)
  }
  function cancelFrames(): void {
    for (const id of frames) cancelAnimationFrame(id)
    frames.clear()
  }
  /** The next frame of run `id`; never comes for a run that is over. */
  const nextFrame = (id: number): Promise<void> =>
    new Promise((resolve) => {
      if (!destroyed && id === run) onFrame(() => resolve())
    })

  async function animate(id: number, onStart?: () => void): Promise<void> {
    // wait for the handwriting and for three.js
    await Promise.all([loadFont(), loadGl()])
    if (destroyed || id !== run || !mount) return
    // the tab is in the background: no unroll nobody sees; the visitor comes back to an open page
    // (checked before asking for a frame: a hidden tab gets none)
    if (document.hidden) {
      finish()
      return
    }
    // a frame, so the page has been fitted to the handwriting
    await nextFrame(id)
    if (destroyed || id !== run) return
    window.scrollTo(0, 0)
    // The 3D view's first render is slow (its shaders are compiled): it is done here, while the
    // scroll is still rolled up, and the clock starts on the next frame.
    if (gl) safeRender()
    full = mount.offsetHeight
    const from = Math.min(ROLLED, full)
    const to = Math.min(full, window.innerHeight - mount.getBoundingClientRect().top + BELOW)
    let shown = false
    let started = false
    /** When the clock started (moved on by late frames at the start), and the last frame's time. */
    let t0 = -1
    let last = -1
    /** From now on the failsafe covers only what is left of the animation. */
    const armFailsafe = (now: number) => {
      clearTimeout(failsafe)
      failsafe = setTimeout(forceOpen, Math.max(0, DURATION - (now - t0)) + FAILSAFE_AFTER)
    }
    // the time is read in each frame, not taken from the frame's timestamp: the first one can be
    // stale by hundreds of ms after a long task (three.js starting), which would shorten the unroll
    const step = () => {
      if (destroyed || id !== run) return
      try {
        const now = performance.now()
        if (!shown) {
          // the first frame: the inline clip takes over from the stylesheet's, still rolled up
          shown = true
          phase = 'animating'
          reveal = from
          root.classList.remove('pre')
          render()
          onFrame(step)
          return
        }
        if (t0 < 0) t0 = now
        else if (last - t0 < CATCH_UP && now - last > LATE_FRAME) {
          // On a first visit a frame or two after the paper first shows can be held up for a few
          // hundred ms (the GPU readying the painting, the 3D view's shaders): such a late frame at
          // the start does not count, so the unroll never jumps past its beginning.
          t0 += now - last - FRAME
          if (started) armFailsafe(now)
        }
        last = now
        const t = Math.min(1, Math.max(0, (now - t0) / DURATION))
        if (!started && t > 0) {
          // the paper moves: the animation has really started (onStart times the tags and the seal)
          started = true
          armFailsafe(now)
          onStart?.()
        }
        reveal = from + (Math.max(from, to) - from) * ease(t)
        if (t < 1) {
          render()
          onFrame(step)
        } else finish()
      } catch {
        forceOpen()
      }
    }
    onFrame(step)
  }

  /** Redraw where things are now (scrolling, resizing, the mount changing size), once a frame. */
  const onChange = () => {
    if (later || destroyed) return
    later = requestAnimationFrame(() => {
      later = 0
      // during the animation its own frames draw
      if (phase !== 'animating') safeRender()
    })
  }
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  // the mount changed size (a house opening, the font arriving): redraw at once, since observers
  // are told after layout and before paint, the roller never lags a frame behind the paper's edge
  const onResize = () => {
    if (!destroyed && phase !== 'animating') safeRender()
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
  if (mount) observer?.observe(mount)

  // the first painted frame: rolled up as the stylesheet has it, the CSS roller at the paper's edge
  safeRender()
  // if no open comes (or none gets anywhere), the page opens by itself
  if (phase === 'rolled') failsafe = setTimeout(forceOpen, FAILSAFE)

  return {
    open(animateIt, onStart) {
      if (destroyed) return Promise.resolve()
      const done = new Promise<void>((resolve) => waiting.push(resolve))
      const id = ++run
      cancelFrames()
      clearTimeout(failsafe)
      if (!animateIt || !mount) {
        finish()
        return done
      }
      // roll up at once (a re-roll: the new painting must not show unrolled), at the top. Rolled up
      // because it was asked for, whatever the root's classes say (StrictMode's second mount finds
      // them taken away by the first one's destroy); no roller until the renderer is known.
      window.scrollTo(0, 0)
      phase = 'rolled'
      if (!glKnown) root.classList.add('gl-wait')
      safeRender()
      failsafe = setTimeout(forceOpen, FAILSAFE)
      animate(id, onStart).catch(forceOpen)
      return done
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      run++
      cancelFrames()
      cancelAnimationFrame(later)
      clearTimeout(failsafe)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      observer?.disconnect()
      root.classList.remove('pre', 'gl-on', 'gl-wait')
      if (mount) mount.style.clipPath = ''
      if (roller) roller.style.transform = ''
      dropGl()
      const done = waiting
      waiting = []
      for (const resolve of done) resolve()
    },
  }
}
