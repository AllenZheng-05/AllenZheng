import { roadLayout, roadPlan, type RoadLayout } from './road'

/** Measure-and-set helpers. They take the theme root and do nothing when layout is unavailable. */

/** The first element matching `selector` under `scope` whose data-id is `id` (compared, never put in a selector). */
export function byDataId(scope: ParentNode, selector: string, id: string): HTMLElement | null {
  for (const el of scope.querySelectorAll<HTMLElement>(selector)) {
    if (el.dataset.id === id) return el
  }
  return null
}

/**
 * Shrink house names and bylines (the closed houses' and the open hall's) one pixel at a time until
 * they fit, never below 12px. The CSS never breaks a word inside them, so a word that is too long
 * shows as overflow, which is what is measured here.
 */
export function fitNames(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('.house b, .house small')) {
    el.style.fontSize = ''
    const cs = getComputedStyle(el)
    const padRight = parseFloat(cs.paddingRight)
    let size = parseFloat(cs.fontSize)
    if (Number.isFinite(padRight) && Number.isFinite(size)) {
      while (el.scrollWidth > el.clientWidth - padRight && size > 12) {
        size -= 1
        el.style.fontSize = `${size}px`
      }
    }
  }
}

/** What sizeRoad last computed for a road, kept so the painter lays its stones out the same way. */
const roads = new WeakMap<HTMLElement, { layout: RoadLayout; tall: number }>()

/** The layout sizeRoad last applied to this ol.road, or undefined if it has not sized it. */
export function roadLayoutOf(road: HTMLElement): { layout: RoadLayout; tall: number } | undefined {
  return roads.get(road)
}

/** Place the hackathon stops along the road and set the road's height. */
export function sizeRoad(root: HTMLElement): void {
  const road = root.querySelector<HTMLElement>('.road')
  if (!road) return
  const w = road.clientWidth
  if (!w) return
  const stops = [...road.querySelectorAll<HTMLElement>(':scope > .stop')]
  if (stops.length === 0) {
    road.style.height = '0px'
    roads.set(road, { layout: roadLayout(w, [], 150), tall: 150 })
    return
  }

  const wide = w >= 500
  const { per } = roadPlan(w, stops.length, wide)
  for (const el of stops) {
    el.style.width = wide ? `${Math.min(250, w / per - 12)}px` : 'auto'
    el.style.textAlign = wide ? 'center' : 'left'
    const door = el.querySelector<HTMLElement>('.door')
    if (door) door.style.justifyContent = wide ? 'center' : 'flex-start'
    // a narrow stop is absolutely placed with width:auto, so its height depends on left and right:
    // set them before measuring, as the design mock-up does
    if (wide) el.style.right = ''
    else {
      el.style.left = '0'
      el.style.right = '56px'
      el.style.transform = 'none'
    }
  }

  const heights = stops.map((el) => el.offsetHeight)
  const tall = Math.max(...heights)
  road.dataset.tall = String(tall)
  const layout = roadLayout(w, heights, tall)
  roads.set(road, { layout, tall })
  road.style.height = `${layout.height}px`
  stops.forEach((el, i) => {
    const at = layout.stops[i]
    if (!at) return
    el.style.left = `${at.left}px`
    el.style.top = `${at.top}px`
    el.style.right = at.centred ? '' : '56px'
    el.style.transform = at.centred ? 'translateX(-50%)' : 'none'
  })
}

/** The --fit fitInscription last applied to an inscription, and what it depended on. */
const fits = new WeakMap<HTMLElement, { fit: string; width: number; height: number }>()
/** Inscriptions whose refit was deferred while the visitor was below them. */
const deferred = new WeakSet<HTMLElement>()

export interface FitOptions {
  /**
   * Measure again whatever the cache says, and fit now even while the visitor is below the
   * inscription: for changes the cache cannot see (the handwriting arriving, the art changing).
   */
  force?: boolean
}

/** Whether a refit of the inscription was deferred (the visitor was below it) and is still to be done. */
export function fitPending(root: HTMLElement): boolean {
  const inscr = root.querySelector<HTMLElement>('.inscr')
  return inscr !== null && deferred.has(inscr)
}

/**
 * Scale the inscription down until all of it fits the first screen. Measured again only when the
 * inscription's width or the window's height has changed since the last fit (or when forced), and
 * without moving the page: the scroll position is kept. A change of the window's height alone (a
 * phone's toolbar, a shorter window) that would move what follows the inscription waits while the
 * visitor is below it, so what they are reading stays where it is: it is then pending (fitPending)
 * and is done by a later call made while the inscription's row is in view.
 */
export function fitInscription(root: HTMLElement, options: FitOptions = {}): void {
  const inscr = root.querySelector<HTMLElement>('.inscr')
  if (!inscr) return
  const force = options.force === true
  const height = window.innerHeight
  const last = fits.get(inscr)
  const current = inscr.style.getPropertyValue('--fit')
  if (
    !force &&
    last &&
    last.width === inscr.clientWidth &&
    last.height === height &&
    current === last.fit
  ) {
    // the fit already matches this size (e.g. a phone's toolbar came back): nothing is pending
    deferred.delete(inscr)
    return
  }
  const limit = height - 12
  if (limit <= 0) return
  const saved = window.scrollY
  // what follows the inscription starts at the bottom of its row (.upper)
  const row = inscr.parentElement ?? inscr
  const rowBottom = () => row.getBoundingClientRect().bottom + window.scrollY
  const before = rowBottom()
  let fit = 1
  inscr.style.setProperty('--fit', '1')
  const bottom = () => inscr.getBoundingClientRect().bottom + window.scrollY
  while (bottom() > limit && fit > 0.6) {
    fit = Math.max(0.6, Math.round((fit - 0.04) * 100) / 100)
    inscr.style.setProperty('--fit', String(fit))
  }
  const heightOnly = last !== undefined && last.width === inscr.clientWidth
  if (!force && heightOnly && saved >= before && Math.abs(rowBottom() - before) > 0.5) {
    // the visitor is below the inscription: put it back as it was (nothing has been painted), and
    // fit it once they are back at it
    if (current) inscr.style.setProperty('--fit', current)
    else inscr.style.removeProperty('--fit')
    deferred.add(inscr)
  } else {
    fits.set(inscr, { fit: String(fit), width: inscr.clientWidth, height })
    deferred.delete(inscr)
  }
  if (window.scrollY !== saved) window.scrollTo(0, saved)
}

/** The measure-and-set helpers in order: names fitted, stops placed, inscription fitted. */
export function fitAll(root: HTMLElement, options: FitOptions = {}): void {
  fitNames(root)
  sizeRoad(root)
  fitInscription(root, options)
}
