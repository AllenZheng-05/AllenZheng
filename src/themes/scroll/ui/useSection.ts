/* The scroll spy: which section of the painting the visitor is in. Port of SECTIONS, yOf and spy
 from the design mock-up. */

import { useEffect, useState, type RefObject } from 'react'
import { SECTION_LABEL } from '../content'
import type { SectionId } from '../model'

interface SectionDef {
  id: SectionId
  label: string
  /** The element that starts the section, under the theme root. */
  find(root: HTMLElement): HTMLElement | null
  /** How far above the element the section starts, in px. */
  offset: number
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'top', label: SECTION_LABEL.top, find: (root) => root.querySelector('.hang'), offset: 0 },
  {
    id: 'experience',
    label: SECTION_LABEL.experience,
    // the experience hall in the top band (the pavilion at the end is a .hall too)
    find: (root) => root.querySelector('.band[data-band="top"] .hall'),
    offset: 330,
  },
  {
    id: 'projects',
    label: SECTION_LABEL.projects,
    find: (root) => root.querySelector('#proj-t'),
    offset: 50,
  },
  {
    id: 'hackathons',
    label: SECTION_LABEL.hackathons,
    find: (root) => root.querySelector('#hack-t'),
    offset: 50,
  },
  {
    id: 'contact',
    label: SECTION_LABEL.contact,
    find: (root) => root.querySelector('.pavilion'),
    offset: 330,
  },
]

// every section has a name
SECTION_LABEL satisfies Readonly<Record<SectionId, string>>

/** Where on the page a section starts (page y), or null when it is missing or has no layout (jsdom). */
export function yOf(root: HTMLElement, id: SectionId): number | null {
  if (id === 'top') return 0
  const def = SECTIONS.find((s) => s.id === id)
  const el = def?.find(root)
  if (!def || !el) return null
  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) return null
  return Math.max(0, r.top + window.scrollY - def.offset)
}

/** The current section: the last whose start is at or above 30% down the screen. */
function spy(root: HTMLElement): SectionId {
  let current: SectionId = 'top'
  for (const { id } of SECTIONS.slice(1)) {
    const y = yOf(root, id)
    if (y !== null && y <= window.scrollY + window.innerHeight * 0.3) current = id
  }
  return current
}

/** Follows the visitor's place on the page: recomputed on scroll (once per frame) and on resize. */
export function useSection(rootRef: RefObject<HTMLElement | null>): SectionId {
  const [section, setSection] = useState<SectionId>('top')
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const update = () => setSection(spy(root))
    const hasFrames = typeof window.requestAnimationFrame === 'function'
    let queued = 0
    const onScroll = () => {
      if (!hasFrames) return update()
      if (queued) return
      queued = window.requestAnimationFrame(() => {
        queued = 0
        update()
      })
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (queued) window.cancelAnimationFrame(queued)
    }
  }, [rootRef])
  return section
}
