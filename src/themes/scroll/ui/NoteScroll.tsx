import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { linkFor, ROLL_UP, rollUp } from '../content'
import { useScroll } from '../context'
import { byDataId } from '../layout/dom'
import { bringIn } from '../motion/flip'
import { nextFrame } from './calm'
import { AwardSeal, StampLink } from './Seal'

/** How long the note takes to roll back up (the .p-roll transition is .75 s). */
const ROLL_UP_MS = 760

/* The open hackathon's note: a small hanging scroll (rod, silk, paper, roller) that unrolls beneath
 its stop. It is absolutely placed in the road band, so it never moves the band's layout. While it
 rolls back up it stays mounted, hidden from assistive technology. Port of openNote, closeNote and
 placeNote from the design mock-up. */
export function NoteScroll({ id }: { id: string }) {
  const { model, mode, openStop, stilled, closeStop } = useScroll()
  const ref = useRef<HTMLDivElement>(null)
  const calmRef = useRef(stilled)
  useLayoutEffect(() => {
    calmRef.current = stilled
  }, [stilled])

  // the stop whose note is rolling up after it was closed
  const [closing, setClosing] = useState<string | null>(null)
  const [lastOpen, setLastOpen] = useState(openStop)
  if (openStop !== lastOpen) {
    setLastOpen(openStop)
    setClosing(openStop === null ? lastOpen : null)
  }
  // the stop whose note has been given its unrolled class (a frame after it opened)
  const [unrolled, setUnrolled] = useState<string | null>(null)

  const shownId = openStop ?? closing
  const stop = model.stops.find((s) => s.id === shownId)
  const on = openStop !== null && unrolled === openStop

  /** Centred under its stop, kept 15 px inside the band, 8 px below the stop. */
  const place = useCallback(() => {
    const pop = ref.current
    const band = pop?.parentElement
    if (!pop || !band || shownId === null) return
    const stopEl = byDataId(band, '.stop', shownId)
    const b = band.getBoundingClientRect()
    if (!stopEl || !b.width) return
    const r = stopEl.getBoundingClientRect()
    const w = Math.min(400, b.width - 30)
    const left = Math.max(15, Math.min(b.width - w - 15, r.left - b.left + r.width / 2 - w / 2))
    pop.style.width = `${w}px`
    pop.style.left = `${left}px`
    pop.style.top = `${r.bottom - b.top + 8}px`
  }, [shownId])

  // Opening: place it, take focus, unroll on the next frame, and scroll just enough to show it all.
  useLayoutEffect(() => {
    const pop = ref.current
    const band = pop?.parentElement
    if (openStop === null || !pop || !band) return
    place()
    pop.focus({ preventScroll: true })
    const cancel = nextFrame(() => setUnrolled(openStop))
    const stopEl = byDataId(band, '.stop', openStop)
    const silk = pop.querySelector<HTMLElement>('.p-silk')
    const s = stopEl?.getBoundingClientRect()
    if (s && silk && s.height) {
      bringIn(
        s.top - 12,
        pop.getBoundingClientRect().top + silk.offsetHeight + 40,
        !calmRef.current,
      )
    }
    return cancel
  }, [openStop, place])

  // Closing: it rolls up, then goes.
  useEffect(() => {
    if (closing === null) return
    const timer = setTimeout(
      () => {
        setClosing(null)
        setUnrolled(null)
      },
      calmRef.current ? 0 : ROLL_UP_MS,
    )
    return () => clearTimeout(timer)
  }, [closing])

  // Follow the stop when the page changes size (the road re-places its stops on resize).
  useEffect(() => {
    if (shownId === null) return
    const band = ref.current?.parentElement
    window.addEventListener('resize', place)
    let observer: ResizeObserver | undefined
    if (band && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => place())
      observer.observe(band)
    }
    return () => {
      window.removeEventListener('resize', place)
      observer?.disconnect()
    }
  }, [shownId, place])

  // A press outside the note (and outside every stop, which toggles by itself) rolls it up.
  useEffect(() => {
    if (openStop === null) return
    const onDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (ref.current?.contains(target) || target.closest('.sb')) return
      closeStop(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openStop, closeStop])

  if (!stop) return null
  const rollingUp = openStop === null
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    closeStop(true)
  }

  return (
    <div
      key={stop.id}
      ref={ref}
      id={id}
      className={on ? 'pop on' : 'pop'}
      role="dialog"
      tabIndex={-1}
      aria-label={stop.title}
      aria-hidden={rollingUp || undefined}
      inert={rollingUp}
      style={{ position: 'absolute' }}
      onKeyDown={onKeyDown}
    >
      <div className="p-rod" />
      <div className="p-roll">
        <div className="p-in">
          <div className="p-silk">
            <div className="p-paper paper">
              <h3>{stop.title}</h3>
              <p className="meta">{stop.event ? `${stop.event}, ${stop.period}` : stop.period}</p>
              {stop.placing !== null && (
                <p className="res">
                  {stop.medal !== null && <AwardSeal rank={stop.medal} mode={mode} />}
                  {stop.placing}
                </p>
              )}
              <p>{stop.sentence}</p>
              {stop.links.length > 0 && (
                <div className="stamps">
                  {stop.links.map((link) => (
                    <StampLink
                      key={link.kind}
                      href={link.href}
                      label={link.label}
                      ch={link.ch}
                      shape={link.shape}
                      ariaLabel={linkFor(link.label, stop.title)}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                className="x"
                aria-label={rollUp(stop.title)}
                onClick={() => closeStop(true)}
              >
                {ROLL_UP}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-roller" />
    </div>
  )
}
