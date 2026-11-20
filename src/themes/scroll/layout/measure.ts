/* The page measured into the layouts the painters take (paint/bands.ts). Every rectangle is in CSS px
 relative to the band element's top-left corner, as the design mock-up's rel() measured them.
 The class names are the mock-up's. */

import { roadLayoutOf } from './dom'
import { roadLayout } from './road'
import type {
  EndLayout,
  HallLayout,
  HouseBox,
  Rect,
  RoadBandLayout,
  TopLayout,
  WorksLayout,
} from './types'

/** el's box relative to band's top-left corner. */
function relRect(el: Element, band: Element): Rect {
  const r = el.getBoundingClientRect()
  const o = band.getBoundingClientRect()
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }
}

/** The pen's rule: a band wider than 700 px is painted wide. */
function isWide(band: Element): boolean {
  return band.getBoundingClientRect().width > 700
}

/**
 * A hall element (.hall) → its bays box and floors: the .storey boxes with their .bay boxes when
 * `wide`; otherwise, or when it has no storeys, one floor = the .bays box holding every .bay.
 */
export function measureHall(hall: HTMLElement, band: HTMLElement, wide: boolean): HallLayout {
  const baysEl = hall.querySelector('.bays')
  const bays = relRect(baysEl ?? hall, band)
  let floors = wide
    ? [...hall.querySelectorAll('.storey')].map((st) => ({
        r: relRect(st, band),
        bays: [...st.querySelectorAll('.bay')].map((b) => relRect(b, band)),
      }))
    : []
  if (!floors.length) {
    floors = [{ r: bays, bays: [...hall.querySelectorAll('.bay')].map((b) => relRect(b, band)) }]
  }
  return { bays, floors }
}

/** .hall's margin-top (scroll.css) follows the viewport: the phone layout's applies up to 760 px. */
function hallMargin(): number {
  const phone =
    typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches
  return phone ? 244 : 358
}

/** The top band: the peaks box and the experience hall. Null when there is no .peaks box. */
export function measureTop(band: HTMLElement): TopLayout | null {
  const peaks = band.querySelector('.peaks')
  if (!peaks) return null
  const hallEl = band.querySelector<HTMLElement>('section.hall')
  if (hallEl) {
    return {
      peaks: relRect(peaks, band),
      hallTop: relRect(hallEl, band).y,
      hall: measureHall(hallEl, band, isWide(band)),
    }
  }
  // no experience: no hall is painted (empty floors), and the cloud row keys off where the hall's
  // top would be: the bottom of the inscription's block plus .hall's margin-top
  const upper = band.querySelector('.upper')
  const below = upper ? relRect(upper, band) : relRect(peaks, band)
  const hallTop = below.y + below.h + hallMargin()
  return {
    peaks: relRect(peaks, band),
    hallTop,
    hall: { bays: { x: 0, y: hallTop, w: 0, h: 0 }, floors: [] },
  }
}

/** The village: one box per .house in DOM order. */
export function measureWorks(band: HTMLElement): WorksLayout {
  const houses = [...band.querySelectorAll<HTMLElement>('.house')].map((el): HouseBox => {
    const open = el.classList.contains('open')
    const win = open ? el.querySelector('.win') : null
    return {
      r: relRect(el, band),
      padTop: parseFloat(getComputedStyle(el).paddingTop) || 0,
      open,
      win: win ? relRect(win, band) : null,
    }
  })
  return { houses }
}

/**
 * The hackathon road: its box and the same roadLayout call sizeRoad (layout/dom.ts) makes, so the
 * painted stones and the placed stops agree. Run after sizeRoad. Null when there is no road.
 */
export function measureRoad(band: HTMLElement): RoadBandLayout | null {
  const road = band.querySelector<HTMLElement>('ol.road')
  if (!road) return null
  const sized = roadLayoutOf(road)
  if (sized) return { road: relRect(road, band), layout: sized.layout, tall: sized.tall }
  const heights = [...road.querySelectorAll<HTMLElement>(':scope > .stop')].map(
    (el) => el.offsetHeight,
  )
  const tall = Number(road.dataset.tall) || 150
  return { road: relRect(road, band), layout: roadLayout(road.clientWidth, heights, tall), tall }
}

/** The end band: the contact pavilion and the ground in front of it. */
export function measureEnd(band: HTMLElement): EndLayout | null {
  const pavilion = band.querySelector<HTMLElement>('.pavilion')
  const ground = band.querySelector('.ground')
  if (!pavilion || !ground) return null
  return { hall: measureHall(pavilion, band, isWide(band)), ground: relRect(ground, band) }
}
