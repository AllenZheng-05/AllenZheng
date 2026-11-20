import { describe, expect, it } from 'vitest'
import { drawsOnCanvas, MARGIN, mustResize, rollAt, rollRadius, type ClientBox } from './glMath'

/* The decisions gl.ts takes before drawing, on a 1366 × 768 canvas. */

const VW = 1366
const VH = 768

function box(top: number, height: number, left = 183, width = 1000): ClientBox {
  return { top, bottom: top + height, left, right: left + width, width }
}

/** The page scrolled by `y`: the rod 11 px tall above a mount of `full` px, revealed `reveal` px. */
function page(y: number, full = 9000, reveal = full) {
  const mountTop = 36 - y
  return { mount: box(mountTop, full), rod: box(mountTop - 11, 11, 189, 988), full, reveal }
}

describe('drawsOnCanvas', () => {
  it('draws while the rod is on screen (the top of the page)', () => {
    expect(drawsOnCanvas(page(0), VW, VH)).toBe(true)
  })

  it('draws the roll on screen at the bottom of the page, the rod long gone', () => {
    const full = 9000
    // the roll's axis sits at the mount's bottom plus half its radius: put it 100 px above the screen's foot
    const y = 36 + full + rollRadius(0) * 0.5 - (VH - 100)
    const s = page(y, full)
    expect(s.rod.bottom).toBeLessThan(-MARGIN)
    expect(rollAt(s.mount.top, full, full).y).toBeCloseTo(VH - 100)
    expect(drawsOnCanvas(s, VW, VH)).toBe(true)
  })

  it('draws nothing in the middle of an open page', () => {
    expect(drawsOnCanvas(page(4000), VW, VH)).toBe(false)
  })

  it('counts things within the margin as on screen, and not beyond it', () => {
    // the rod (drawn 7 px beyond its box) ends just inside the margin above the canvas
    const inside = page(36 + 7 + MARGIN - 1)
    expect(inside.rod.bottom + 7).toBeGreaterThan(-MARGIN)
    expect(drawsOnCanvas(inside, VW, VH)).toBe(true)
    const outside = page(36 + 7 + MARGIN)
    expect(drawsOnCanvas(outside, VW, VH)).toBe(false)
    // the roll below the canvas: its top (the higher of the contact shadow, 26 px above the paper's
    // edge, and the roll itself, R / 2 above it) just within the margin under the screen, then just
    // beyond it
    const full = 9000
    const reveal = 1000
    const above = Math.max(26, rollRadius(full - reveal) / 2)
    const at = (edge: number) => {
      const s = page(0, full, reveal)
      const shift = s.mount.top + reveal - above - edge
      return { ...s, mount: box(s.mount.top - shift, full), rod: box(-500, 11) }
    }
    expect(drawsOnCanvas(at(VH + MARGIN - 1), VW, VH)).toBe(true)
    expect(drawsOnCanvas(at(VH + MARGIN), VW, VH)).toBe(false)
  })

  it('draws nothing beside the canvas, left or right', () => {
    const s = page(0)
    const away = { ...s, mount: box(s.mount.top, 9000, VW + 200), rod: box(25, 11, VW + 206) }
    expect(drawsOnCanvas(away, VW, VH)).toBe(false)
  })

  it('draws nothing on a canvas with no size', () => {
    expect(drawsOnCanvas(page(0), 0, VH)).toBe(false)
    expect(drawsOnCanvas(page(0), VW, 0)).toBe(false)
  })
})

describe('mustResize', () => {
  const size = { width: VW, height: VH, ratio: 1 }

  it('resizes the first time (nothing drawn yet)', () => {
    expect(mustResize({ width: 0, height: 0, ratio: 0 }, size)).toBe(true)
  })

  it('keeps the drawing buffer while nothing changed', () => {
    expect(mustResize(size, { ...size })).toBe(false)
  })

  it('resizes when the canvas box changes (a phone’s toolbar, a resized window)', () => {
    expect(mustResize(size, { ...size, height: 700 })).toBe(true)
    expect(mustResize(size, { ...size, width: 1024 })).toBe(true)
  })

  it('resizes when the pixel ratio changes (zoom, another screen)', () => {
    expect(mustResize(size, { ...size, ratio: 2 })).toBe(true)
  })
})
