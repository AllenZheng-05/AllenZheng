import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ThemeProps } from '../../shell/themes'
import { ScrollContext, type ScrollUi } from './context'
import { byDataId, fitAll, fitNames } from './layout/dom'
import { buildModel, type ArtMode, type SectionId } from './model'
import { flipHouse } from './motion/flip'
import { createMotion, type Motion } from './motion/motion'
import { createPainting, type Painting } from './paint/painting'
import Contact from './sections/Contact'
import Hackathons from './sections/Hackathons'
import Projects from './sections/Projects'
import Top from './sections/Top'
import { nextFrame, prefersReducedMotion } from './ui/calm'
import { buildMenu } from './ui/menu'
import { Slip } from './ui/Slip'
import type { SlipItem } from './ui/slip-items'
import { Tags } from './ui/Tags'
import { useSection, yOf } from './ui/useSection'
import { Webring } from './ui/Webring'
import { createUnroll, preloadGl, type Unroll } from './unroll/unroll'
import './scroll.css'

/** Scroll the page to `top`, smoothly or at once. Quiet where scrolling is not implemented. */
function scrollPage(top: number, smooth: boolean): void {
  try {
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
  } catch {
    // no scrolling here (a test environment)
  }
}

/** The heading that starts each section: where focus goes when the menu takes the visitor there. */
const SECTION_HEADING: Readonly<Record<SectionId, string>> = {
  top: '.inscr h1',
  experience: '#exp-t',
  projects: '#proj-t',
  hackathons: '#hack-t',
  contact: '#end-t',
}

/** The hanging tags come out this long (ms) after an unroll starts. */
const TAGS_DELAY_MS = 2800

/**
 * The page is laid out and painted here (the same conditions under which the painting is made): the
 * scroll can unroll. Not in jsdom, where the page is simply open.
 */
function canUnroll(): boolean {
  return (
    typeof CanvasRenderingContext2D !== 'undefined' &&
    typeof ResizeObserver !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  )
}

/** The page starts rolled up and unrolls: it can, and the visitor has not asked for reduced motion. */
function startsRolledUp(): boolean {
  return canUnroll() && !prefersReducedMotion()
}

// The scroll will unroll: ask for three.js now, while React renders the page, rather than when the
// unroll asks for it. Stilled visitors never download it.
if (startsRolledUp()) void preloadGl()

/** Page y of an element's top. */
const pageTop = (el: HTMLElement): number => el.getBoundingClientRect().top + window.scrollY

export default function ScrollTheme({ data }: ThemeProps) {
  const model = useMemo(() => buildModel(data), [data])
  const rootRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<ArtMode>('zh')
  const [stilled, setStilled] = useState(prefersReducedMotion)
  // Whether the scroll can unroll at all, and whether it starts rolled up (motion allowed): then the
  // root has class `pre` from its first render, so the very first painted frame is rolled up, and
  // `gl-wait` (no roller until it is known whether the 3D one or the CSS one draws it).
  const [unrolls] = useState(canUnroll)
  const [rolledAtMount] = useState(startsRolledUp)
  // After the first render the root's classes are kept by effects (calm below; pre, gl-wait and
  // gl-on by the unroll), so this string never changes and React never rewrites the attribute.
  const [rootClass] = useState(
    () => `scroll-theme${stilled ? ' calm' : ''}${rolledAtMount ? ' pre gl-wait' : ''}`,
  )
  const [openHouse, setOpenHouse] = useState<string | null>(null)
  const [openStop, setOpenStop] = useState<string | null>(null)
  const section = useSection(rootRef)
  const [slipOpen, setSlipOpen] = useState(false)
  const slipId = useId()
  // the tags wait until the scroll has unrolled; the top seal presses on after each unroll starts
  // (rolls: how many have started; null while the scroll has never unrolled and is not about to)
  const [tagsShown, setTagsShown] = useState(!rolledAtMount)
  const [rolls, setRolls] = useState<number | null>(rolledAtMount ? 0 : null)

  // The painting controller and its motion layer (null where there is no 2D canvas, as in jsdom).
  // The art mode is read through a ref so the controller always paints the current one; the open
  // house and the stilled flag are read through refs so toggleHouse stays the same function.
  const paintingRef = useRef<Painting | null>(null)
  const motionRef = useRef<Motion | null>(null)
  const modeRef = useRef<ArtMode>(mode)
  const openHouseRef = useRef<string | null>(openHouse)
  const stilledRef = useRef(stilled)
  // the motion layer follows the stilled flag (setPaused ignores a change it already has, so the
  // governor stilling the painting, mirrored into `stilled` below, does not loop)
  useLayoutEffect(() => {
    stilledRef.current = stilled
    motionRef.current?.setPaused(stilled)
    rootRef.current?.classList.toggle('calm', stilled)
  }, [stilled])
  /** Calm: the painting is stilled (as it starts for a visitor who asks for reduced motion). No smooth scrolling and no waiting for animations. */
  const calm = useCallback(() => stilledRef.current, [])
  const go = useCallback((y: number) => scrollPage(y, !calm()), [calm])

  // Opening one house closes the other; each grows or shrinks in place (motion/flip.ts). Only ever
  // called from event handlers, so flushSync commits the new state at once for the animation to
  // measure; while an animation runs, further toggles are ignored.
  const toggleHouse = useCallback(
    (id: string) => {
      const root = rootRef.current
      if (!root) return
      const next = openHouseRef.current === id ? null : id
      void flipHouse({
        root,
        next,
        painting: paintingRef.current,
        instant: calm(),
        apply: () => flushSync(() => setOpenHouse(next)),
      })
    },
    [calm],
  )
  // A note about to open after a menu choice (see chooseItem) gives way to anything the visitor does by hand.
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(noteTimer.current), [])
  const closeStop = useCallback(
    (returnFocus = false) => {
      clearTimeout(noteTimer.current)
      const root = rootRef.current
      if (returnFocus && openStop !== null && root) {
        byDataId(root, '.stop', openStop)?.querySelector<HTMLElement>('.sb')?.focus()
      }
      setOpenStop(null)
    },
    [openStop],
  )
  const toggleStop = useCallback(
    (id: string) => {
      if (id === openStop) return closeStop(true)
      clearTimeout(noteTimer.current)
      setOpenStop(id)
    },
    [openStop, closeStop],
  )

  // The unroll (unroll/unroll.ts): made on mount where the page is laid out. Each unroll hides the
  // tags until TAGS_DELAY_MS after it starts and makes the top seal press on again.
  const unrollRef = useRef<Unroll | null>(null)
  const tagsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rollRequest = useRef(0)
  const startUnroll = useCallback(() => {
    const unroll = unrollRef.current
    if (!unroll) return
    const request = ++rollRequest.current
    let started = false
    clearTimeout(tagsTimer.current)
    setTagsShown(false)
    void unroll
      .open(true, () => {
        started = true
        setRolls((n) => (n ?? 0) + 1)
        clearTimeout(tagsTimer.current)
        tagsTimer.current = setTimeout(() => setTagsShown(true), TAGS_DELAY_MS)
      })
      .then(() => {
        if (unrollRef.current !== unroll || request !== rollRequest.current) return
        motionRef.current?.redraw()
        // forced open without an animation (a failure, a hidden tab): everything is there at once
        if (!started) {
          setTagsShown(true)
          setRolls((n) => (n === 0 ? null : n))
        } else if (stilledRef.current) {
          // stilled mid-unroll (it was finished at once): the tags do not wait either
          clearTimeout(tagsTimer.current)
          setTagsShown(true)
        }
      })
  }, [])

  // Stilled (from the menu, or by the governor) while an unroll is in flight: it opens at once.
  // (Opening an open scroll changes nothing.)
  useLayoutEffect(() => {
    if (stilled) void unrollRef.current?.open(false)
  }, [stilled])

  // While the tags are hidden they are inert (out of the tab order), and so is the scroll itself
  // (rolled up or unrolling, its content is clipped out of sight); Ctrl+K does nothing. A tag that
  // should have focus meanwhile (the art tag an art switch was made from, the menu tag focus goes
  // back to when the slip closes) gets it when the tags return, unless the visitor has put focus
  // somewhere else meanwhile.
  const tagsShownRef = useRef(tagsShown)
  const refocusTag = useRef<'.tag-art' | '.tag-menu' | null>(null)
  useLayoutEffect(() => {
    tagsShownRef.current = tagsShown
    const selector = refocusTag.current
    if (!tagsShown || selector === null) return
    refocusTag.current = null
    const active = document.activeElement
    if (active && active !== document.body) return
    rootRef.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true })
  }, [tagsShown])
  /** An art switch waiting for its repaint (the mode effect below), after which the scroll re-rolls. */
  const rerollPending = useRef(false)

  // The art switch: the painting follows the mode (the effects below), any open
  // note rolls up, and the scroll rolls up and unrolls again with the new painting (only the page
  // going back to the top when the painting is stilled or the scroll cannot unroll).
  const switchMode = useCallback((next: ArtMode) => {
    if (next === modeRef.current) return
    clearTimeout(noteTimer.current)
    setMode(next)
    setOpenStop(null)
    if (!stilledRef.current && unrollRef.current) {
      rerollPending.current = true
      // only the art tag's own focus is kept for later; a refocus already waiting stays as it is
      if (document.activeElement?.closest('.tag-art') != null) refocusTag.current = '.tag-art'
    } else scrollPage(0, false)
  }, [])

  // The menu slip, opened from the menu tag or with Ctrl+K / Cmd+K. Esc returns focus to whatever
  // opened it.
  const menuRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const slipOpenRef = useRef(slipOpen)
  useLayoutEffect(() => {
    slipOpenRef.current = slipOpen
  }, [slipOpen])
  /**
   * Focus goes back to what opened the slip, or to the menu tag when that is gone or out of reach;
   * while the tags are hidden (a re-roll), to the menu tag once they are shown again.
   */
  const focusOpener = useCallback(() => {
    const usable = (el: HTMLElement | null): el is HTMLElement =>
      el !== null && el.isConnected && !el.closest('[inert], [hidden]')
    const opener = openerRef.current
    const menuTag = menuRef.current
    if (usable(opener)) opener.focus({ preventScroll: true })
    else if (usable(menuTag)) menuTag.focus({ preventScroll: true })
    else refocusTag.current = '.tag-menu'
  }, [])
  const closeSlip = useCallback(
    (returnFocus: boolean) => {
      if (!slipOpenRef.current) return
      slipOpenRef.current = false
      setSlipOpen(false)
      if (returnFocus) focusOpener()
    },
    [focusOpener],
  )
  const toggleSlip = useCallback(
    (from: HTMLElement | null) => {
      if (slipOpenRef.current) return closeSlip(true)
      openerRef.current = from
      slipOpenRef.current = true
      setSlipOpen(true)
    },
    [closeSlip],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      // the tags (and the menu tag the slip belongs to) are not out yet
      if (!tagsShownRef.current) return
      // a modal dialog (the theme picker) is open: the slip must not open behind it
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      const active = document.activeElement
      toggleSlip(active instanceof HTMLElement ? active : null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggleSlip])

  // Escape closes the slip, or else the open note, wherever focus is, and gives focus back to what
  // opened it. (Inside the slip and the note their own handlers do this and stop the event.) A modal
  // dialog (the theme picker) has Escape to itself.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (document.querySelector('dialog[open]')) return
      if (slipOpenRef.current) {
        event.preventDefault()
        closeSlip(true)
      } else if (openStop !== null) {
        event.preventDefault()
        closeStop(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeSlip, closeStop, openStop])

  // a press outside the slip and outside the tags closes it
  useEffect(() => {
    if (!slipOpen) return
    const onDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.slip') || target.closest('.tag')) return
      closeSlip(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [slipOpen, closeSlip])

  // The scroll to a chosen house, a frame after it opens (cancelled by the next choice and on unmount).
  const houseFrame = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => houseFrame.current?.(), [])

  // What the slip's items do.
  const menu = useMemo(() => buildMenu(model, section, stilled), [model, section, stilled])
  const chooseItem = useCallback(
    (item: SlipItem) => {
      const action = menu.actions.get(item.id)
      const root = rootRef.current
      if (!action || !root) return
      clearTimeout(noteTimer.current)
      houseFrame.current?.()
      houseFrame.current = undefined
      // focus goes where the visitor is going (the slip is hiding and holds it now)
      const focus = (el: HTMLElement | null | undefined) => el?.focus({ preventScroll: true })
      if (action.kind === 'section') {
        const y = yOf(root, action.id)
        if (y !== null) go(y)
        focus(root.querySelector<HTMLElement>(SECTION_HEADING[action.id]))
      } else if (action.kind === 'project') {
        // open it unless it is the open one (the menu never closes a house), then go to it
        const { id } = action
        if (openHouseRef.current !== id) toggleHouse(id)
        focus(byDataId(root, '.house', id)?.querySelector<HTMLElement>('button.hd'))
        houseFrame.current = nextFrame(() => {
          houseFrame.current = undefined
          const house = byDataId(root, '.house', id)
          if (house) go(pageTop(house) - window.innerHeight * 0.12)
        })
      } else if (action.kind === 'stop') {
        // go to the stop, then unroll its note once the page has (nearly) arrived; the note takes
        // focus itself when it opens
        const { id } = action
        const stop = byDataId(root, '.stop', id)
        if (stop) go(pageTop(stop) - window.innerHeight * 0.3)
        focus(stop?.querySelector<HTMLElement>('button.sb'))
        noteTimer.current = setTimeout(() => setOpenStop(id), calm() ? 0 : 500)
      } else {
        setStilled(!stilledRef.current)
        focusOpener()
      }
    },
    [menu, go, calm, toggleHouse, focusOpener],
  )

  const ui = useMemo<ScrollUi>(
    () => ({
      model,
      mode,
      stilled,
      openHouse,
      openStop,
      toggleHouse,
      toggleStop,
      closeStop,
    }),
    [model, mode, stilled, openHouse, openStop, toggleHouse, toggleStop, closeStop],
  )

  // These effects run in order: the mode and house effects only act once the painting exists, so on
  // mount the painting below does the first full layout itself.
  useLayoutEffect(() => {
    modeRef.current = mode
    paintingRef.current?.relayout()
    // the new painting is painted: roll up and unroll it
    if (rerollPending.current) {
      rerollPending.current = false
      startUnroll()
    }
  }, [mode, startUnroll])

  // Names shrink to fit their houses, and houses change size, so measure and repaint the village
  // whenever a house opens or closes (its static canvas has the pines between the closed houses).
  // Inside the flushSync of a toggle this runs before flushSync returns, so the house animation
  // measures and draws over the new layout.
  useLayoutEffect(() => {
    openHouseRef.current = openHouse
    const root = rootRef.current
    if (!root) return
    fitNames(root)
    paintingRef.current?.repaint('works')
  }, [openHouse])

  // Measure-and-set layout and the painting: on mount, when the font arrives, and when the page is resized.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const painting = createPainting(root, () => modeRef.current)
    if (painting) {
      paintingRef.current = painting
      // Fit the page, then let the motion layer turn the painting live: setLive repaints every band
      // once, so the page is painted once, not twice. Without a motion layer, relayout paints it.
      fitAll(root)
      const motion = createMotion(root, painting, { paused: stilledRef.current })
      if (!motion) painting.relayout()
      motionRef.current = motion
      // the governor may still the painting by itself: the menu then offers to let it move
      const stopListening = motion?.onPausedChange((paused) => setStilled(paused))
      return () => {
        stopListening?.()
        // The painting goes first, so that the motion layer's setLive(false) does not repaint a
        // page that is going away (a destroyed painting ignores it).
        painting.destroy()
        motion?.destroy()
        if (motionRef.current === motion) motionRef.current = null
        if (paintingRef.current === painting) paintingRef.current = null
      }
    }
    // no canvas (jsdom): only the measure-and-set helpers
    let live = true
    let key = ''
    const run = () => fitAll(root)
    run()
    // the font changes what the inscription measures, which its cache cannot see
    void document.fonts?.ready.then(() => {
      if (live) fitAll(root, { force: true })
    })
    const rerun = () => {
      const next = `${root.clientWidth}x${window.innerHeight}`
      if (next === key) return
      key = next
      run()
    }
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(rerun)
      observer.observe(root)
    }
    window.addEventListener('resize', rerun)
    return () => {
      live = false
      observer?.disconnect()
      window.removeEventListener('resize', rerun)
    }
  }, [])

  // The unroll, after the painting above has laid out and painted the page. Visitors who start
  // stilled get no unroll: the scroll is simply open (and three.js is not loaded).
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !unrolls) return
    const unroll = createUnroll(root)
    unrollRef.current = unroll
    if (rolledAtMount) startUnroll()
    else void unroll.open(false)
    return () => {
      unroll.destroy()
      if (unrollRef.current === unroll) unrollRef.current = null
      clearTimeout(tagsTimer.current)
    }
  }, [unrolls, rolledAtMount, startUnroll])

  return (
    <ScrollContext.Provider value={ui}>
      <div className={rootClass} data-mode={mode} ref={rootRef}>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="rough">
            <feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="3.2" />
          </filter>
        </svg>
        {/* rolled up or unrolling (the tags are hidden meanwhile), its clipped content is out of reach */}
        <div className="hang" id="scroll-top" inert={!tagsShown}>
          <svg className="cord" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M2 64 L200 12 L398 64"
              fill="none"
              stroke="#6a5a45"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="rod" />
          <div className="mount">
            <div className="inner">
              <main className="paper">
                <Top rolls={rolls} />
                <Projects />
                <Hackathons />
                <Contact />
              </main>
            </div>
            <Webring />
          </div>
          <div className="roller" />
        </div>
        {/* outside .hang: its filter would trap position: fixed */}
        <Tags
          shown={tagsShown}
          section={section}
          slipOpen={slipOpen}
          slipId={slipId}
          mode={mode}
          menuRef={menuRef}
          onMenu={() => toggleSlip(menuRef.current)}
          onArt={() => switchMode(mode === 'ja' ? 'zh' : 'ja')}
        />
        <Slip
          id={slipId}
          open={slipOpen}
          groups={menu.groups}
          onChoose={chooseItem}
          onClose={closeSlip}
        />
      </div>
    </ScrollContext.Provider>
  )
}
