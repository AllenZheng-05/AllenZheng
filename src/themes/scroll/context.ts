import { createContext, useContext } from 'react'
import type { ArtMode, ScrollModel } from './model'

export interface ScrollUi {
  model: ScrollModel
  mode: ArtMode
  /** True when the painting is stilled (also the initial state under prefers-reduced-motion). */
  stilled: boolean
  openHouse: string | null // project id
  openStop: string | null // project id
  /** Open this house, or close it when it is the open one. */
  toggleHouse(id: string): void
  /** Unroll this stop's note, or roll it up when it is the open one. */
  toggleStop(id: string): void
  closeStop(returnFocus?: boolean): void
}

export const ScrollContext = createContext<ScrollUi | null>(null)

export function useScroll(): ScrollUi {
  const ui = useContext(ScrollContext)
  if (!ui) throw new Error('useScroll must be used inside the scroll theme')
  return ui
}
