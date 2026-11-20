/* The living painting: everything that moves, drawn at about twelve frames a second on each band's
 second canvas (canvas.paint.anim) from the sprites the painters left in the band's scene. Only bands
 on screen are drawn, and nothing runs while the tab is hidden. One wind moves clouds, pines, reeds
 and the tags (through the --gust custom property). Port of
 the design mock-up (frame, draw, the events, the governor, stilling and the pointer)
 and of the motif loop, without the rejected writing-in. */

import { isBandId, type BandId } from '../layout/types'
import type { MotifKind } from '../model'
import { drawMotif, MOTIF_REST } from '../paint/motif'
import type { Painting } from '../paint/painting'
import { drawActors, type ActorFrame, type WalkerState } from './actors'
import { createEvents, drawLeaves, type EventBand } from './events'
import { createGovernor } from './governor'
import { wind } from './wind'

export interface Motion {
  readonly paused: boolean
  /** Still the painting where it is, or let it move again. */
  setPaused(paused: boolean): void
  /** The governor can still the painting by itself; the UI listens here (called for every change, whoever caused it). */
  onPausedChange(listener: (paused: boolean) => void): () => void
  /** Draw one frame of every visible band now (used after a house opens, a repaint, a mode switch). */
  redraw(): void
  destroy(): void
}

/** Draw a frame when at least this long (ms) has passed: about twelve a second, six when slow. */
const FRAME_MS = 80
const SLOW_FRAME_MS = 165
/** Bands this close to the screen (px) count as on screen. */
const NEAR = '120px 0px'
/** Actors are drawn this far (px) above and below the screen. */
const SLICE_MARGIN = 160
/** An idle motif runs at this fraction of full speed; the hovered or open house's at full speed. */
const IDLE_MOTIF = 0.32

const isMotifKind = (v: string | undefined): v is MotifKind =>
  v !== undefined && Object.hasOwn(MOTIF_REST, v)

interface Band {
  id: BandId
  el: HTMLElement
  /** The moving layer: the band's second canvas. */
  canvas: HTMLCanvasElement | null
  /** The band rows (y0, y1) drawn on the last frame, cleared on the next. */
  slice: [number, number] | null
  walker: WalkerState
}

/** Returns null where canvas, IntersectionObserver or requestAnimationFrame is unavailable (jsdom). */
export function createMotion(
  root: HTMLElement,
  painting: Painting,
  options: { paused: boolean },
): Motion | null {
  // check the global first: asking jsdom for a context logs "not implemented"
  if (typeof CanvasRenderingContext2D === 'undefined') return null
  if (typeof IntersectionObserver === 'undefined') return null
  if (typeof window.requestAnimationFrame !== 'function') return null

  const started = performance.now()
  /** The clock (the mock-up's ANIM): time, drift and flow advance only while the painting moves. */
  const clock = {
    t: 0,
    d: 0,
    f: 0,
    dirty: true,
    paused: options.paused,
    /** The mouse in client coordinates, or null when away. */
    px: null as number | null,
    py: null as number | null,
  }
  const governor = createGovernor(started)
  const events = createEvents(started)
  const listeners = new Set<(paused: boolean) => void>()
  /** Each motif canvas's own time (s). */
  const motifTime = new WeakMap<HTMLCanvasElement, number>()
  let mode = root.dataset.mode
  let destroyed = false

  const bands: Band[] = [...root.querySelectorAll<HTMLElement>('.band[data-band]')].flatMap(
    (el) => {
      const id = el.dataset.band
      if (!isBandId(id)) return []
      const canvas = el.querySelector<HTMLCanvasElement>(':scope > canvas.paint.anim')
      return [{ id, el, canvas, slice: null, walker: { wi: null } }]
    },
  )
  const visible = new Set<Band>()

  /** Draw one frame of one band. Port of the mock-up's `draw`. */
  function draw(b: Band): void {
    const scene = painting.scene(b.id)
    const c = b.canvas
    if (!scene || !c) return
    const R = b.el.getBoundingClientRect()
    const W = R.width
    const H = R.height
    const sd = scene.sd
    const cw = Math.round(W * sd)
    const ch = Math.round(H * sd)
    if (c.width !== cw || c.height !== ch) {
      c.width = cw
      c.height = ch
      b.slice = null
    }
    const x = c.getContext('2d')
    if (!x) return
    x.setTransform(sd, 0, 0, sd, 0, 0)
    // clear what was drawn last time and what is drawn now: the rows near the screen
    const vh = window.innerHeight
    const v0 = Math.max(0, -R.top - SLICE_MARGIN)
    const v1 = Math.min(H, vh - R.top + SLICE_MARGIN)
    const pv = b.slice ?? [0, H]
    const c0 = Math.min(pv[0], v0)
    x.clearRect(0, c0, W, Math.max(pv[1], v1) - c0)
    b.slice = [v0, v1]
    if (v1 <= v0) return
    const { px, py } = clock
    const ptr =
      px !== null && py !== null && py > R.top && py < R.bottom
        ? { x: px - R.left, y: py - R.top }
        : null
    const fr: ActorFrame = {
      t: clock.t,
      d: clock.d,
      f: clock.f,
      paused: clock.paused,
      W,
      H,
      top: R.top,
      vh,
      ptr,
    }
    drawActors(x, scene, fr, b.el, b.walker, v0, v1)
    drawLeaves(x, scene, W, H, clock.t, clock.d, v0, v1)
    events.draw(x, b.el, scene, clock.t)
    x.globalAlpha = 1
  }

  function drawSafely(b: Band): void {
    try {
      draw(b)
    } catch (error) {
      console.error('scroll theme: motion failed', b.id, error)
    }
  }

  /** The motif canvases of the village with their kind and house, found again when the village is repainted. */
  interface MotifRef {
    canvas: HTMLCanvasElement
    kind: MotifKind
    house: Element | null
  }
  const findMotifs = (): MotifRef[] =>
    [...root.querySelectorAll<HTMLCanvasElement>('.village canvas.motif:not(.big)')].flatMap(
      (canvas) => {
        const kind = canvas.dataset.m
        return isMotifKind(kind) ? [{ canvas, kind, house: canvas.closest('.house') }] : []
      },
    )
  let motifs = findMotifs()

  /** Motifs idle slowly and run at full speed on the hovered or open house. */
  function moveMotifs(dt: number): void {
    const works = bands.find((b) => b.id === 'works')
    if (!works || !visible.has(works)) return
    for (const { canvas: c, kind, house } of motifs) {
      const full =
        !!house && (house.matches(':hover, :focus-within') || house.classList.contains('open'))
      if (governor.slow && !full) continue
      const t = (motifTime.get(c) ?? MOTIF_REST[kind]) + dt * (full ? 1 : IDLE_MOTIF)
      motifTime.set(c, t)
      drawMotif(c, kind, t)
    }
  }

  /** A repaint of the village draws the motifs at rest: put each back at its own moment at once. */
  function restoreMotifs(): void {
    for (const { canvas: c, kind } of motifs) {
      const t = motifTime.get(c)
      if (t !== undefined) drawMotif(c, kind, t)
    }
  }

  // a band's new scene (a repaint, a house opening, a mode switch, a resize) is drawn at once
  const unsubscribe = painting.onPainted((id) => {
    clock.dirty = true
    wake()
    if (root.dataset.mode !== mode) {
      // a new art: the traveller starts again
      mode = root.dataset.mode
      for (const b of bands) b.walker.wi = null
    }
    const b = bands.find((band) => band.id === id)
    if (!b) return
    b.slice = null
    try {
      if (id === 'works') {
        motifs = findMotifs()
        restoreMotifs()
      }
    } catch (error) {
      console.error('scroll theme: motion failed', 'motifs', error)
    }
    if (visible.has(b)) drawSafely(b)
  })

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const b = bands.find((band) => band.el === e.target)
        if (!b) continue
        if (e.isIntersecting) visible.add(b)
        else visible.delete(b)
      }
      clock.dirty = true
      wake()
    },
    { rootMargin: NEAR },
  )
  for (const b of bands) io.observe(b.el)

  // the mouse alone moves water and parts clouds
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    clock.px = e.clientX
    clock.py = e.clientY
  }
  const onLeave = () => {
    clock.px = null
    clock.py = null
  }
  const onOut = (e: PointerEvent) => {
    if (e.relatedTarget === null) onLeave()
  }
  // stilled, a band is drawn only when something changed: scrolling brings new rows near the screen
  const onScroll = () => {
    if (!clock.paused) return
    clock.dirty = true
    wake()
  }
  const onVisibility = () => {
    if (document.hidden) return
    // the time away is not a slow frame
    const at = performance.now()
    governor.reset(at)
    last = at
    acc = 0
    wake()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave, { passive: true })
  document.addEventListener('pointerout', onOut, { passive: true })

  const tag = () => root.querySelector<HTMLElement>('.tag')

  function setPaused(next: boolean): void {
    if (destroyed || next === clock.paused) return
    clock.paused = next
    clock.dirty = true
    if (!next) {
      const at = performance.now()
      governor.reset(at)
      last = at
      acc = 0
    }
    wake()
    for (const listener of [...listeners]) listener(next)
  }

  // The frame loop. While stilled with nothing to draw it sleeps: no frame is
  // requested until something sets `dirty` and calls wake().
  let last = performance.now()
  let acc = 0
  /** The pending animation frame request, or 0. */
  let raf = 0
  function wake(): void {
    if (destroyed || raf !== 0) return
    raf = window.requestAnimationFrame(frame)
  }
  function frame(now: number): void {
    raf = 0
    if (destroyed) return
    if (document.hidden) {
      // nothing is drawn; visibilitychange wakes the loop
      last = now
      return
    }
    step(now)
    if (!clock.paused || clock.dirty) wake()
  }
  function step(now: number): void {
    const gap = now - last
    if (!clock.paused) {
      // the device cannot keep up: halve the rate, then still the painting
      if (governor.frame(now, gap) === 'still') setPaused(true)
    }
    acc += gap
    last = now
    if (acc < (governor.slow ? SLOW_FRAME_MS : FRAME_MS)) return
    const dt = Math.min(0.25, acc / 1000)
    acc = 0
    if (clock.paused) {
      if (!clock.dirty) return
    } else {
      clock.t += dt
      clock.d += dt * (0.5 + wind(clock.t) * 1.6)
      clock.f += dt
      const on: EventBand[] = []
      for (const b of visible) {
        const scene = painting.scene(b.id)
        if (scene) on.push({ el: b.el, scene })
      }
      events.tick(now, clock.t, on)
    }
    clock.dirty = false
    for (const b of visible) drawSafely(b)
    if (clock.paused) return
    tag()?.style.setProperty('--gust', wind(clock.t, 1100).toFixed(3))
    try {
      moveMotifs(dt)
    } catch (error) {
      console.error('scroll theme: motion failed', 'motifs', error)
    }
  }

  // from now on moving things are actors, left out of the still picture
  painting.setLive(true)
  wake()

  return {
    get paused() {
      return clock.paused
    },
    setPaused,
    onPausedChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    redraw() {
      if (destroyed) return
      for (const b of visible) drawSafely(b)
      wake()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      if (raf !== 0) window.cancelAnimationFrame(raf)
      raf = 0
      io.disconnect()
      unsubscribe()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerout', onOut)
      listeners.clear()
      for (const b of bands) {
        const c = b.canvas
        const x = c?.getContext('2d')
        if (!c || !x) continue
        x.setTransform(1, 0, 0, 1, 0, 0)
        x.clearRect(0, 0, c.width, c.height)
      }
      // a painting destroyed already ignores this; otherwise it paints everything still again
      painting.setLive(false)
    },
  }
}
