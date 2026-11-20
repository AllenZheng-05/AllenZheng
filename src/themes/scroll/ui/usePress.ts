import { useEffect, useState, type RefObject } from 'react'

type PressState = '' | 'wait' | 'press'

/** Fully in view, and not in the bottom eighth of the screen. */
const VIEW: IntersectionObserverInit = { threshold: 1, rootMargin: '0px 0px -12% 0px' }

/** How long (ms) the stamp animation plays (0.46 s in the stylesheet) before the seal is simply there. */
const PRESS_MS = 500

/**
 * A seal that presses onto the paper when it first comes fully into view. Returns the class to add:
 * 'wait' before, 'press' while the stamp animation plays, then '' for good (a plain visible seal, so
 * the animation never restarts when motion resumes); '' from the start when motion is stilled or
 * IntersectionObserver is missing). With `delayMs` it presses that long after it stops being held
 * instead, wherever it is (the top seal, which waits for the scroll to open), and again that long
 * after each `restart`. `held` (with delayMs): the seal waits without counting (the scroll has not
 * started unrolling yet). `restart` (with delayMs): each new value makes the seal wait and press on
 * again, delayMs later (the scroll has rolled up and is unrolling again).
 * `disabled`: motion is stilled; a seal still waiting when that happens appears at once, without
 * the animation.
 * Port of the seal pressing in the design mock-up.
 */
export function usePress(
  ref: RefObject<Element | null>,
  options: { delayMs?: number; disabled?: boolean; held?: boolean; restart?: number } = {},
): string {
  const { delayMs, disabled = false, held = false, restart } = options
  const [state, setState] = useState<PressState>(() =>
    disabled || typeof IntersectionObserver === 'undefined' ? '' : 'wait',
  )
  // a new restart value: wait and press again (adjusting state during render, as React advises)
  const [seenRestart, setSeenRestart] = useState(restart)
  if (restart !== seenRestart) {
    setSeenRestart(restart)
    if (!disabled && delayMs !== undefined) setState('wait')
  }
  // stilled while it waits: it is simply there at once (no animation while calm)
  if (disabled && state === 'wait') setState('')

  // the stamp is done after its animation: the class goes and the seal stays visible
  useEffect(() => {
    if (state !== 'press') return
    const timer = setTimeout(() => setState(''), PRESS_MS)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (state !== 'wait' || disabled) return
    // the top seal: pressed after its delay, wherever it is
    if (delayMs !== undefined) {
      if (held) return
      const timer = setTimeout(() => setState('press'), delayMs)
      return () => clearTimeout(timer)
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      setState('press')
    }, VIEW)
    io.observe(el)
    return () => io.disconnect()
  }, [state, disabled, delayMs, held, restart, ref])

  return state
}
