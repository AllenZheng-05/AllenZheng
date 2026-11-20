import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { portfolio } from '../../data'
import { ThemeProvider } from '../../shell/ThemeProvider'
import { buildModel } from './model'
import ScrollTheme from './ScrollTheme'

/* The theme with a faked 2D canvas: the painting controller is created, and StrictMode mounts it
 twice. jsdom has no layout, so bands report a zero size and paint nothing, so each canvas gets a
 box here and a fake context counts what is drawn on it. */

// the unroll runs here: never import the real three.js into jsdom
vi.mock('./unroll/gl', () => ({ createScrollGl: vi.fn(() => null) }))

class FakeContext {
  globalAlpha = 1
  fillStyle: unknown = '#000'
  filter = 'none'
  globalCompositeOperation = 'source-over'
  constructor(readonly canvas: HTMLCanvasElement) {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  fill() {
    paintsOn.set(this.canvas, (paintsOn.get(this.canvas) ?? 0) + 1)
  }
  translate() {}
  setTransform() {}
  clearRect() {}
  fillRect() {}
  drawImage() {}
  createPattern() {
    return {}
  }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4) }
  }
  putImageData() {}
}

class FakeObserver {
  static all: FakeObserver[] = []
  disconnected = false
  targets: Element[] = []
  constructor(readonly callback: ResizeObserverCallback) {
    FakeObserver.all.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
}

const paintsOn = new Map<HTMLCanvasElement, number>()

function box(height: number): DOMRect {
  return {
    left: 0,
    top: 0,
    width: 1000,
    height,
    right: 1000,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
}

const houses = buildModel(portfolio).houses
const first = houses[0]
if (!first) throw new Error('The test needs a personal project')

beforeEach(() => {
  FakeObserver.all = []
  paintsOn.clear()
  const made = new WeakMap<HTMLCanvasElement, FakeContext>()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    let f = made.get(this)
    if (!f) {
      f = new FakeContext(this)
      made.set(this, f)
    }
    return f as unknown as CanvasRenderingContext2D
  })
  // bands get a size so they are painted
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('band') ? box(900) : box(0)
  })
  vi.stubGlobal('CanvasRenderingContext2D', class {})
  vi.stubGlobal('ResizeObserver', FakeObserver)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderStrict() {
  return render(
    <StrictMode>
      <ThemeProvider>
        <ScrollTheme data={portfolio} />
      </ThemeProvider>
    </StrictMode>,
  )
}

const bandCanvas = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLCanvasElement>(`.band[data-band="${id}"] > canvas.paint:not(.anim)`)

describe('scroll theme painting', () => {
  it('keeps exactly one live observer after the StrictMode double mount, and disconnects it on unmount', () => {
    const { unmount } = renderStrict()
    // the unroll watches the mount with an observer of its own (unroll/unroll.test.ts)
    const unrolls = (o: FakeObserver) => o.targets.some((t) => t.classList.contains('mount'))
    const live = FakeObserver.all.filter((o) => !o.disconnected && !unrolls(o))
    expect(FakeObserver.all.length).toBeGreaterThan(1)
    expect(live).toHaveLength(1)
    expect(FakeObserver.all.filter((o) => !o.disconnected && unrolls(o))).toHaveLength(1)
    unmount()
    expect(FakeObserver.all.every((o) => o.disconnected)).toBe(true)
  })

  it('paints the works band alone when a house opens', async () => {
    const user = userEvent.setup()
    const { container } = renderStrict()
    const ids = ['top', 'works', 'road', 'end']
    for (const id of ids) {
      expect(paintsOn.get(bandCanvas(container, id) as HTMLCanvasElement) ?? 0).toBeGreaterThan(0)
    }
    const before = ids.map((id) => paintsOn.get(bandCanvas(container, id) as HTMLCanvasElement))
    const button = screen
      .getAllByRole('button', { name: (name) => name.includes(first.title) })
      .find((el) => el.classList.contains('hd'))
    if (!button) throw new Error('no house button')
    await user.click(button)
    const after = ids.map((id) => paintsOn.get(bandCanvas(container, id) as HTMLCanvasElement))
    expect(after[1]).toBeGreaterThan(before[1] ?? Infinity)
    expect([after[0], after[2], after[3]]).toEqual([before[0], before[2], before[3]])
  })
})
