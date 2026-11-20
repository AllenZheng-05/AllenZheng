/* The two decisions gl.ts makes before drawing, kept free of three.js so they can be tested: whether
 anything it draws is near its canvas, and whether its renderer must be resized. */

/** Anything drawn this far (px) outside the canvas still counts as on screen. */
export const MARGIN = 60

/** A client rect: what gl.ts reads from .mount and .rod. */
export type ClientBox = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width'>

/** Radius of the roll with `left` px of paper still rolled round it. */
export const rollRadius = (left: number): number => Math.sqrt(196 + left * 1.1)

/** The roll's axis (client y) and radius with `reveal` of the mount's `full` px unrolled. */
export function rollAt(mountTop: number, full: number, reveal: number): { y: number; R: number } {
  const R = rollRadius(full - reveal)
  return { y: mountTop + reveal + R * 0.5, R }
}

/**
 * Whether anything gl.ts draws is within the canvas box (vw × vh, client px) or MARGIN px of it:
 * the rod (with its ends), or the roll at its y ± R with its knobs and caps, the contact shadow
 * above it and the drop shadow below it. A canvas with no size shows nothing.
 */
export function drawsOnCanvas(
  state: { mount: ClientBox; rod: ClientBox; full: number; reveal: number },
  vw: number,
  vh: number,
): boolean {
  if (vw <= 0 || vh <= 0) return false
  const { mount: r, rod: rr, full, reveal } = state
  const near = (top: number, bottom: number, left: number, right: number) =>
    bottom > -MARGIN && top < vh + MARGIN && right > -MARGIN && left < vw + MARGIN
  const { y, R } = rollAt(r.top, full, reveal)
  const cx = r.left + r.width / 2
  const half = r.width / 2 + 45
  return (
    near(rr.top - 7, rr.bottom + 7, rr.left - 11, rr.right + 11) ||
    near(Math.min(r.top + reveal - 26, y - R), y + R + 28, cx - half, cx + half)
  )
}

/** The renderer's drawing size: its canvas box (CSS px) and pixel ratio. */
export interface DrawSize {
  width: number
  height: number
  ratio: number
}

/** Whether the renderer must be resized (which clears it): the canvas box or the pixel ratio changed. */
export function mustResize(last: DrawSize, next: DrawSize): boolean {
  return last.width !== next.width || last.height !== next.height || last.ratio !== next.ratio
}
