import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePress } from './usePress'

class FakeIO {
  static all: FakeIO[] = []
  targets: Element[] = []
  disconnected = false
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIO.all.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  takeRecords() {
    return []
  }
  trigger(isIntersecting: boolean) {
    const entries = this.targets.map(
      (target) => ({ target, isIntersecting }) as unknown as IntersectionObserverEntry,
    )
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

function Seal(props: { delayMs?: number; disabled?: boolean; held?: boolean; restart?: number }) {
  const ref = useRef<HTMLElement>(null)
  const cls = usePress(ref, props)
  return <i ref={ref} data-testid="seal" className={cls} />
}

const live = () => FakeIO.all.filter((o) => !o.disconnected)

afterEach(() => {
  FakeIO.all = []
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('usePress', () => {
  it('waits until the seal is fully in view, then presses it on once', () => {
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const { getByTestId } = render(<Seal />)
    const seal = getByTestId('seal')
    expect(seal.className).toBe('wait')
    const [io] = live()
    expect(io?.options).toEqual({ threshold: 1, rootMargin: '0px 0px -12% 0px' })
    act(() => io?.trigger(false))
    expect(seal.className).toBe('wait')
    act(() => io?.trigger(true))
    expect(seal.className).toBe('press')
    expect(live()).toHaveLength(0)
  })

  it('is plain and final 500 ms after it was pressed, and stays so when motion is stilled and resumes', () => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const { getByTestId, rerender } = render(<Seal />)
    const seal = getByTestId('seal')
    act(() => live()[0]?.trigger(true))
    expect(seal.className).toBe('press')
    act(() => vi.advanceTimersByTime(499))
    expect(seal.className).toBe('press')
    act(() => vi.advanceTimersByTime(1))
    expect(seal.className).toBe('')
    rerender(<Seal disabled />)
    rerender(<Seal />)
    expect(seal.className).toBe('')
    expect(live()).toHaveLength(0)
  })

  it('with a delay, presses after it', () => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const { getByTestId } = render(<Seal delayMs={400} />)
    expect(getByTestId('seal').className).toBe('wait')
    act(() => vi.advanceTimersByTime(399))
    expect(getByTestId('seal').className).toBe('wait')
    act(() => vi.advanceTimersByTime(1))
    expect(getByTestId('seal').className).toBe('press')
    act(() => vi.advanceTimersByTime(500))
    expect(getByTestId('seal').className).toBe('')
  })

  it('never waits when motion is stilled from the start', () => {
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const { getByTestId } = render(<Seal disabled />)
    expect(getByTestId('seal').className).toBe('')
    expect(live()).toHaveLength(0)
  })

  it('a waiting seal appears at once when the painting is stilled', () => {
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const { getByTestId, rerender } = render(<Seal />)
    expect(getByTestId('seal').className).toBe('wait')
    rerender(<Seal disabled />)
    expect(getByTestId('seal').className).toBe('')
  })

  it('is simply visible without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { getByTestId } = render(<Seal />)
    expect(getByTestId('seal').className).toBe('')
  })

  it('with held, waits without counting; each new restart value waits and presses again', () => {
    vi.stubGlobal('IntersectionObserver', FakeIO)
    vi.useFakeTimers()
    const { getByTestId, rerender } = render(<Seal delayMs={2500} held restart={0} />)
    const seal = getByTestId('seal')
    act(() => vi.advanceTimersByTime(5000))
    expect(seal.className).toBe('wait')
    // the unroll starts: the seal presses on 2500 ms later
    rerender(<Seal delayMs={2500} restart={1} />)
    act(() => vi.advanceTimersByTime(2400))
    expect(seal.className).toBe('wait')
    act(() => vi.advanceTimersByTime(100))
    expect(seal.className).toBe('press')
    act(() => vi.advanceTimersByTime(600))
    expect(seal.className).toBe('')
    // a re-roll: wait again, then press again
    rerender(<Seal delayMs={2500} restart={2} />)
    expect(seal.className).toBe('wait')
    act(() => vi.advanceTimersByTime(2500))
    expect(seal.className).toBe('press')
  })
})
