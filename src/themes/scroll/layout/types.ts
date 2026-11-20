import type { RoadLayout } from './road'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface HallLayout {
  bays: Rect
  floors: { r: Rect; bays: Rect[] }[]
}
export interface TopLayout {
  peaks: Rect
  hallTop: number
  hall: HallLayout
}
export interface HouseBox {
  r: Rect
  padTop: number
  open: boolean
  win: Rect | null
}
export interface WorksLayout {
  houses: HouseBox[]
}
export interface RoadBandLayout {
  road: Rect
  layout: RoadLayout
  tall: number
}
export interface EndLayout {
  hall: HallLayout
  ground: Rect
}
export type BandId = 'top' | 'works' | 'road' | 'end'

/** Every band, in page order (a band may be missing from the page: no projects, no hackathons). */
export const BAND_IDS: readonly BandId[] = ['top', 'works', 'road', 'end']
/** Whether a data-band value names a band. */
export const isBandId = (v: string | undefined): v is BandId =>
  v !== undefined && (BAND_IDS as readonly string[]).includes(v)
