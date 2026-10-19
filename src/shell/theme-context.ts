import { createContext, use } from 'react'
import type { AvailableTheme, ThemeDefinition } from './themes'

export interface ThemeContextValue {
  theme: AvailableTheme
  themes: ThemeDefinition[]
  setTheme: (id: string) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
