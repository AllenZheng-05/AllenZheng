/* Houses open and close in place. The house that closes shrinks and the one that opens grows, at the
 same time, and at every step each is repainted at its in-between size with as many tiles, posts and
 stones as fit. Their words step aside while the buildings change; the other houses and everything
 below glide to their new places. Port of flipProject, bringIn and bringHouse from the design
 mock-up. */

import { byDataId } from '../layout/dom'
import type { Rect } from '../layout/types'
import type { Painting } from '../paint/painting'
import { ease } from './wind'

export interface FlipOptions {
  root: HTMLElement // the theme root (.scroll-theme)
  /** Project id (the house's data-id) to open, or null to close the open one. */
  next: string | null
  painting: Painting | null
  /** True when the painting is stilled: no animation, instant scroll. */
  instant: boolean
  /** Commit the new open house to the DOM synchronously. After it returns, the DOM, the fitted names and the painted house canvases must reflect the new state. */
  apply(): void
}

/** How long the buildings take to change, in ms. */
export const FLIP_DURATION = 1050
/** The gliding houses' easing: the CSS twin of `ease` (wind.ts). */
const GLIDE_EASING = 'cubic-bezier(.65,0,.35,1)'
/** The words step aside this fast, and come back this slowly. */
const PARTS_OUT = 170
const PARTS_IN = 420
/** The band's painted layers fade out and back in. */
const LAYERS_OUT = 200
const LAYERS_IN = 600
/** Repaint the growing houses at most this often, in ms. */
const FRAME_GAP = 14
/** The words of a house: they fade while its building changes. */
const PARTS = '.hd, .dt, .winfig'

const lerp = (a: number, b: number, e: number): number => a + (b - a) * e
const lerpRect = (a: Rect, b: Rect, e: number): Rect => ({
  x: lerp(a.x, b.x, e),
  y: lerp(a.y, b.y, e),
  w: lerp(a.w, b.w, e),
  h: lerp(a.h, b.h, e),
})

/** Theme roots with an animation running: calls for them meanwhile are ignored. */
const busy = new WeakSet<HTMLElement>()

/**
 * After something opens, scroll just enough that all of it is on screen (or its top, when it is
 * taller than the screen). Port of the mock-up's `bringIn`.
 */
export function bringIn(top: number, bottom: number, smooth: boolean): void {
  const room = window.innerHeight - 76
  const dy =
    bottom - top > room
      ? top - 70
      : bottom > window.innerHeight - 16
        ? bottom - window.innerHeight + 16
        : top < 70
          ? top - 70
          : 0
  if (Math.abs(dy) <= 4 || typeof window.scrollBy !== 'function') return
  try {
    window.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' })
  } catch {
    // no scrolling here (a test environment): nothing to bring in
  }
}

/** Bring an opened house, with its roof and stones, on screen. */
function bringHouse(house: HTMLElement | undefined, smooth: boolean): void {
  if (!house) return
  const r = house.getBoundingClientRect()
  // no layout (jsdom): nothing to scroll to
  if (!r.width || !r.height) return
  bringIn(r.top - 60, r.bottom + 44, smooth)
}

const housesOf = (band: ParentNode): HTMLElement[] => [
  ...band.querySelectorAll<HTMLElement>('.house'),
]
const houseById = (root: ParentNode, id: string | null): HTMLElement | undefined =>
  (id === null ? null : byDataId(root, '.house', id)) ?? undefined

/** An animation's end, whether it finished or was cancelled. */
const settled = (a: Animation): Promise<unknown> => a.finished.catch(() => undefined)

/** A house's box in band coordinates and its padding-top: what the house painter takes. */
function houseBox(house: HTMLElement, band: HTMLElement): { r: Rect; padTop: number } {
  const h = house.getBoundingClientRect()
  const o = band.getBoundingClientRect()
  return {
    r: { x: h.left - o.left, y: h.top - o.top, w: h.width, h: h.height },
    padTop: parseFloat(getComputedStyle(house).paddingTop) || 0,
  }
}

/** Opens/closes with the grow-and-shrink animation. Resolves when finished. Calls made while one is running, or for a house that does not exist, are ignored (resolve at once, without calling apply). */
export async function flipHouse(options: FlipOptions): Promise<void> {
  const { root, next, painting, instant, apply } = options
  if (busy.has(root)) return
  // an unknown house: nothing to open, so nothing changes
  if (next !== null && !byDataId(root, '.house', next)) return

  const band = root.querySelector<HTMLElement>('.band[data-band="works"]')
  const canAnimate = typeof Element.prototype.animate === 'function'
  if (instant || !painting || !band || !canAnimate) {
    // the painting is stilled, or there is no animation support: switch at once, scroll at once
    apply()
    bringHouse(houseById(root, next), false)
    return
  }

  // which houses change: the open one (cur) shrinks and the chosen one (target) grows
  const houses = housesOf(band)
  const cur = houses.findIndex((h) => h.classList.contains('open'))
  const target = next === null ? -1 : houses.findIndex((h) => h.dataset.id === next)
  if (target === cur) {
    // nothing to grow or shrink (the open one asked to open again)
    apply()
    bringHouse(houseById(root, next), true)
    return
  }

  busy.add(root)
  painting.hold()
  /** Everything started here, so it can all be undone however the animation ends. */
  const layers = [...band.querySelectorAll<HTMLCanvasElement>(':scope > canvas.paint')]
  const layerFades: Animation[] = []
  const partFades: Animation[] = []
  const glides: Animation[] = []
  /** Indexes (DOM order, which never changes) and elements of the houses that change. */
  const grow = [cur, target].filter((j) => j >= 0)
  const growing = grow.flatMap((j) => {
    const h = houses[j]
    return h ? [h] : []
  })
  let flipCanvas: HTMLCanvasElement | null = null
  let applied = false
  let finished = false

  try {
    // 1. The band's painting (with the pines between the closed houses) and the words of both
    //    houses fade out; the buildings stay.
    for (const c of layers) {
      layerFades.push(
        c.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: LAYERS_OUT,
          easing: 'ease',
          fill: 'forwards',
        }),
      )
    }
    for (const h of growing) {
      for (const el of h.querySelectorAll(PARTS)) {
        partFades.push(
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PARTS_OUT, fill: 'forwards' }),
        )
      }
    }
    await Promise.all(partFades.map(settled))
    if (!root.isConnected) return

    // 2. First: where every house and every band below is now, and the changing houses' boxes.
    const after: HTMLElement[] = []
    for (let n = band.nextElementSibling; n; n = n.nextElementSibling) {
      if (n instanceof HTMLElement) after.push(n)
    }
    const movers = [...houses, ...after]
    const B0 = band.getBoundingClientRect()
    const first = movers.map((el) => el.getBoundingClientRect())
    const from = growing.map((h) => houseBox(h, band))

    // 3. Commit the new state: React re-renders the houses (same elements, by key), fits the names
    //    and repaints the works band and the house canvases at the new layout.
    applied = true
    apply()

    // 4. Last: where everything is after the change. A house React replaced (it should not) or
    //    removed cannot be animated: then the new state simply stands.
    if (!root.isConnected || growing.some((h) => !h.isConnected) || !band.isConnected) return
    const B1 = band.getBoundingClientRect()
    const last = movers.map((el) => el.getBoundingClientRect())
    const to = growing.map((h) => houseBox(h, band))

    // the buildings of the changing houses are now painted on the flip canvas instead, and their
    // new words (the opened house's text and window) stay hidden until the end
    for (const h of growing) h.classList.add('flipping')
    bringHouse(houses[target], true)

    // 5. The flip canvas over the band, as tall as the taller of the two layouts.
    const k = Math.min(window.devicePixelRatio || 1, B0.width > 700 ? 1.25 : 1.5)
    const height = Math.max(B0.height, B1.height) + 60
    const cv = document.createElement('canvas')
    flipCanvas = cv
    cv.className = 'flipc'
    cv.width = Math.round(B0.width * k)
    cv.height = Math.round(height * k)
    cv.style.width = `${B0.width}px`
    cv.style.height = `${height}px`
    cv.setAttribute('aria-hidden', 'true')
    band.appendChild(cv)
    const ctx = cv.getContext('2d')
    if (!ctx) return

    // 6. The other houses and the bands below glide from their old places to their new ones.
    movers.forEach((el, j) => {
      if (growing.includes(el) || !el.isConnected) return
      const a = first[j]
      const b = last[j]
      if (!a || !b) return
      const dx = a.left - b.left
      const dy = a.top - b.top
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        glides.push(
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: FLIP_DURATION,
            easing: GLIDE_EASING,
          }),
        )
      }
    })

    // 7. Every frame, both buildings repainted at their in-between boxes: the opening one from
    //    closed (t 0) to open (t 1), the closing one the other way.
    const frame = (e: number): void => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      grow.forEach((j, n) => {
        const a = from[n]
        const b = to[n]
        if (!a || !b) return
        const t = j === target ? e : 1 - e
        painting.drawHouseAt(ctx, k, j, lerpRect(a.r, b.r, e), lerp(a.padTop, b.padTop, e), t)
      })
    }
    frame(0)
    await new Promise<void>((resolve, reject) => {
      let t0: number | null = null
      let lastFrame = -Infinity
      const step = (now: number): void => {
        try {
          // the theme went away: stop here, the cleanup below still runs
          if (!root.isConnected) return resolve()
          if (t0 === null) t0 = now
          const v = Math.min(1, Math.max(0, (now - t0) / FLIP_DURATION))
          if (now - lastFrame > FRAME_GAP || v === 1) {
            lastFrame = now
            frame(ease(v))
          }
          if (v < 1) requestAnimationFrame(step)
          else resolve()
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
      requestAnimationFrame(step)
    })
    finished = true
  } catch (error) {
    // a failed animation must not cost the visitor the click: the new state still stands
    console.error('scroll theme: house animation failed', error)
  } finally {
    // 8. However it ended: the real buildings back, the flip canvas gone, the words and the band's
    //    painting fading back in, and the painting free to follow size changes again.
    for (const h of growing) h.classList.remove('flipping')
    flipCanvas?.remove()
    if (!finished) for (const a of glides) a.cancel()
    for (const a of partFades) a.cancel()
    for (const a of layerFades) a.cancel()
    if (root.isConnected) {
      if (!applied) {
        // it failed before the switch: switch now, without the animation
        try {
          apply()
          bringHouse(houseById(root, next), false)
        } catch (error) {
          console.error('scroll theme: house switch failed', error)
        }
      }
      for (const h of growing) {
        if (!h.isConnected) continue
        for (const el of h.querySelectorAll(PARTS)) {
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: PARTS_IN, easing: 'ease' })
        }
      }
      for (const c of layers) {
        if (c.isConnected) {
          c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LAYERS_IN, easing: 'ease' })
        }
      }
    }
    try {
      painting.release()
    } finally {
      busy.delete(root)
    }
  }
}
