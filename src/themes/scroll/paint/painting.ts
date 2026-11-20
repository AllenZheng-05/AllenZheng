/* The painting controller: measures the page into layouts, sizes the canvases, runs the painters and
 keeps the picture up to date as the page changes size. Port of the glue in the design mock-up's
 paintScene and page code. The house open/close animation (motion/flip.ts) draws through it (drawHouseAt, hold,
 release), and the motion layer (motion/motion.ts) reads what each band painted (scene, onPainted)
 and turns the painting live (setLive). */

import { fitAll, fitInscription, fitPending } from '../layout/dom'
import { measureEnd, measureRoad, measureTop, measureWorks } from '../layout/measure'
import { isBandId, type BandId, type Rect, type WorksLayout } from '../layout/types'
import type { ArtMode, MotifKind } from '../model'
import { makeKit, paintEnd, paintRoad, paintTop, paintWorks } from './bands'
import { drawHouse, houseSeed } from './house'
import { drawMotif, MOTIF_REST, MOTIF_SIZE } from './motif'
import { Pen } from './pen'
import type { BandScene } from './types'

export interface Painting {
  /** fitNames, sizeRoad, fitInscription forced past its cache (layout/dom.ts), then repaint everything. */
  relayout(): void
  /** Measure and paint one band (or all): its static canvas, and for 'works' also the house canvases and motifs. */
  repaint(only?: BandId): void
  /** For the open/close animation: paint house number `index` (DOM order) into another context at pixel ratio k, at any rectangle (band coordinates), padding-top and openness t (0..1). Port of the mock-up's scene._house. */
  drawHouseAt(
    ctx: CanvasRenderingContext2D,
    k: number,
    index: number,
    r: Rect,
    padTop: number,
    t: number,
  ): void
  /** What the last paint of this band produced (actors, sky, water…), or null if not painted. */
  scene(band: BandId): BandScene | null
  onPainted(listener: (band: BandId) => void): () => void
  /** false (the default, and without a motion layer): everything is painted into the static canvas. true (set by the motion layer): moving things become actors, left out of it and drawn by the motion layer. Changing it repaints. */
  setLive(live: boolean): void
  /** While held (during the house open/close animation) size changes are ignored; explicit repaints still work. */
  hold(): void
  /** Ends the hold: fits the page again, and repaints the bands whose size changed meanwhile. */
  release(): void
  destroy(): void
}

const isMotifKind = (v: string | undefined): v is MotifKind =>
  v !== undefined && Object.hasOwn(MOTIF_REST, v)

/** Wait this long after the last size change before repainting. */
const REPAINT_DELAY = 150
/** Room round a house's own canvas for its roof, posts and stones. */
const HOUSE_PAD_T = 34
const HOUSE_PAD_B = 40

/** Pixel ratio of the painted canvases: the screen's, capped at 2. */
function pixelRatio(): number {
  return Math.min(2, window.devicePixelRatio || 1)
}

/** Returns null where a 2D canvas is unavailable (jsdom). */
export function createPainting(root: HTMLElement, getMode: () => ArtMode): Painting | null {
  // check the global first: asking jsdom for a context logs "not implemented"
  if (typeof CanvasRenderingContext2D === 'undefined') return null
  if (typeof ResizeObserver === 'undefined') return null
  if (!document.createElement('canvas').getContext('2d')) return null

  let live = false
  let destroyed = false
  let held = false
  const scenes = new Map<BandId, BandScene>()
  const listeners = new Set<(band: BandId) => void>()
  /** Each house's last painted key and the canvas it was painted on. */
  const houseKeys = new WeakMap<HTMLElement, { key: string; canvas: HTMLCanvasElement }>()
  /** Size of the works band at its last paint: drawHouseAt paints with the same W/H (so the same wide and u). */
  let worksSize: { W: number; H: number } | null = null
  /** The size each band was painted at, as "WxH" rounded px. */
  const painted = new Map<BandId, string>()
  const sizeKey = (W: number, H: number): string => `${Math.round(W)}x${Math.round(H)}`
  /** True when the band's current size differs from the size it was painted at (or it was never painted). */
  const stale = (id: BandId, band: HTMLElement): boolean => {
    const r = band.getBoundingClientRect()
    return painted.get(id) !== sizeKey(r.width, r.height)
  }

  const bands = (): [BandId, HTMLElement][] =>
    [...root.querySelectorAll<HTMLElement>('.band[data-band]')].flatMap((el) => {
      const id = el.dataset.band
      return isBandId(id) ? [[id, el] as [BandId, HTMLElement]] : []
    })

  /** The band's own painters, on a fresh pen over its static canvas. */
  function paintBand(pen: Pen, id: BandId, band: HTMLElement, works: WorksLayout | null): void {
    if (id === 'top') {
      const l = measureTop(band)
      if (l) paintTop(pen, l)
    } else if (id === 'works') {
      paintWorks(pen, works ?? measureWorks(band))
    } else if (id === 'road') {
      const l = measureRoad(band)
      if (l) paintRoad(pen, l)
    } else {
      const l = measureEnd(band)
      if (l) paintEnd(pen, l)
    }
  }

  /**
   * Every house's building on the house's own canvas, so it moves with the house when one opens or
   * closes. Repainted only when its key (open, size, art, capture) changes. Port of the mock-up's house sprite.
   */
  function paintHouses(
    band: HTMLElement,
    works: WorksLayout,
    W: number,
    H: number,
    dpr: number,
    mode: ArtMode,
  ): void {
    const wide = W > 700
    const padX = wide ? 70 : 24
    const els = [...band.querySelectorAll<HTMLElement>('.house')]
    const { houses } = works
    els.forEach((el, index) => {
      try {
        const h = houses[index]
        const canvas = el.querySelector<HTMLCanvasElement>(':scope > canvas.bld')
        if (!h || !canvas) return
        const hasImage = !!el.querySelector('.win img')
        const key = [h.open, Math.round(h.r.w), Math.round(h.r.h), mode, hasImage, dpr, wide].join(
          ':',
        )
        const last = houseKeys.get(el)
        if (last && last.key === key && last.canvas === canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const bw = h.r.w + padX * 2
        const bh = h.r.h + HOUSE_PAD_T + HOUSE_PAD_B
        const bx = h.r.x - padX
        const by = h.r.y - HOUSE_PAD_T
        canvas.width = Math.max(1, Math.ceil(bw * dpr))
        canvas.height = Math.max(1, Math.ceil(bh * dpr))
        canvas.style.left = `${-padX}px`
        canvas.style.top = `${-HOUSE_PAD_T}px`
        canvas.style.width = `${bw}px`
        canvas.style.height = `${bh}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, bw, bh)
        // the band's W/H, so wide and u are the band's, as when the mock-up painted houses with the band's pen
        const pen = new Pen(ctx, { W, H, mode, dpr, live: false })
        ctx.save()
        try {
          // Mirrors the mock-up on purpose: it drew the house in band coordinates
          // under translate(-bx, -by) and finished the sprite with that translate still active.
          // The bleed uses the identity transform; the paper-tooth rectangle (0, 0, bw, bh) lands
          // offset by (-bx, -by), which is why the mock-up's houses carry almost no paper tooth.
          ctx.translate(-bx, -by)
          pen.seeded(houseSeed(index), () =>
            drawHouse(pen, { r: h.r, padTop: h.padTop, t: h.open ? 1 : 0, win: h.win }),
          )
          pen.finish(dpr, bw, bh)
        } finally {
          ctx.restore()
        }
        houseKeys.set(el, { key, canvas })
      } catch (error) {
        console.error('scroll theme: painting failed', `house ${index}`, error)
      }
    })
  }

  /** Every project motif under the band, at its resting moment. */
  function paintMotifs(band: HTMLElement): void {
    for (const c of band.querySelectorAll<HTMLCanvasElement>('canvas.motif')) {
      const kind = c.dataset.m
      if (!isMotifKind(kind)) continue
      let scale = 1
      if (c.classList.contains('big')) {
        // the placeholder in a window without a capture: as sharp as its own CSS box
        scale = Math.max(1, c.getBoundingClientRect().width / MOTIF_SIZE.W)
      }
      drawMotif(c, kind, MOTIF_REST[kind], scale)
    }
  }

  function paintOne(id: BandId, band: HTMLElement): void {
    try {
      const canvas = band.querySelector<HTMLCanvasElement>(':scope > canvas.paint:not(.anim)')
      if (!canvas) return
      const R = band.getBoundingClientRect()
      const W = R.width
      const H = R.height
      if (!W || !H) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      painted.set(id, sizeKey(W, H))
      const dpr = pixelRatio()
      const mode = getMode()
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const pen = new Pen(ctx, { W, H, mode, dpr, live })
      const works = id === 'works' ? measureWorks(band) : null
      paintBand(pen, id, band, works)
      pen.finish(dpr, W, H)
      if (live) makeKit(pen)
      scenes.set(id, pen.scene)
      if (works) {
        worksSize = { W, H }
        paintHouses(band, works, W, H, dpr, mode)
        paintMotifs(band)
      }
      for (const listener of [...listeners]) listener(id)
    } catch (error) {
      console.error('scroll theme: painting failed', id, error)
    }
  }

  function repaint(only?: BandId): void {
    if (destroyed) return
    for (const [id, band] of bands()) if (!only || id === only) paintOne(id, band)
  }

  /** The measure-and-set helpers: names fitted to their houses, stops placed, the inscription fitted. */
  function fit(): void {
    fitAll(root)
  }

  // on mount, when the font arrives and when the art changes: what the inscription's cache cannot
  // see has changed, so it is measured again
  function relayout(): void {
    if (destroyed) return
    fitAll(root, { force: true })
    repaint()
  }

  // Resizing: when a band's size differs from the size it was painted at, fit the
  // page again at once and repaint the changed bands a little later. Sizes are border boxes, as paintOne uses.
  const pending = new Set<BandId>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const observer = new ResizeObserver((entries) => {
    if (destroyed || held) return
    let changed = false
    for (const e of entries) {
      if (!(e.target instanceof HTMLElement)) continue
      const id = e.target.dataset.band
      if (!isBandId(id)) continue
      if (stale(id, e.target)) {
        changed = true
        pending.add(id)
      }
    }
    if (!changed) return
    fit()
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      const ids = [...pending]
      pending.clear()
      if (held) return
      const all = bands()
      for (const id of ids) {
        const band = all.find(([bid]) => bid === id)?.[1]
        if (band && stale(id, band)) repaint(id)
      }
    }, REPAINT_DELAY)
  })
  for (const [, band] of bands()) observer.observe(band)

  // a change of height alone (a phone's toolbar, a shorter window) only refits the inscription;
  // if that changes the top band's size, the observer repaints it
  const onResize = () => {
    if (!destroyed && !held) fitInscription(root)
  }
  window.addEventListener('resize', onResize)

  // a refit deferred while the visitor was below the inscription (a height change) is done once its
  // row is back in view; fitInscription keeps the scroll position, so only the inscription's own
  // change moves what follows it
  const onScroll = () => {
    if (destroyed || held || !fitPending(root)) return
    const upper = root.querySelector<HTMLElement>('.upper')
    if (!upper || upper.getBoundingClientRect().bottom <= 0) return
    fitInscription(root)
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  // the hand font changes every measurement once it arrives
  void document.fonts?.ready.then(() => relayout())

  return {
    relayout,
    repaint,
    drawHouseAt(ctx, k, index, r, padTop, t) {
      if (destroyed) return
      let size = worksSize
      if (!size) {
        const works = bands().find(([id]) => id === 'works')?.[1]
        const box = works?.getBoundingClientRect()
        size = { W: box?.width ?? 0, H: box?.height ?? 0 }
      }
      ctx.save()
      ctx.setTransform(k, 0, 0, k, 0, 0)
      try {
        const pen = new Pen(ctx, { W: size.W, H: size.H, mode: getMode(), dpr: k, live: false })
        pen.seeded(houseSeed(index), () => drawHouse(pen, { r, padTop, t }))
      } finally {
        ctx.restore()
      }
    },
    scene(band) {
      return scenes.get(band) ?? null
    },
    onPainted(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setLive(next) {
      if (destroyed || next === live) return
      live = next
      repaint()
    },
    hold() {
      held = true
    },
    release() {
      if (!held) return
      held = false
      if (destroyed) return
      // the page is fitted again whatever happened to the sizes; only the changed bands repaint
      clearTimeout(timer)
      timer = undefined
      pending.clear()
      fit()
      const changed = bands().filter(([id, band]) => stale(id, band))
      for (const [id] of changed) repaint(id)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      observer.disconnect()
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      listeners.clear()
      scenes.clear()
    },
  }
}
