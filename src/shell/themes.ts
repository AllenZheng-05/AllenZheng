import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Portfolio } from '../data'
import PokemonPreview from '../themes/pokemon/Preview'
import ScrollPreview from '../themes/scroll/Preview'
import VSCodePreview from '../themes/vscode/Preview'

export interface ThemeProps {
  data: Portfolio
}

interface ThemeBase {
  id: string
  name: string
  /** Small illustration shown in the theme picker. Kept tiny because it loads eagerly. */
  Preview: ComponentType
}

export interface AvailableTheme extends ThemeBase {
  status: 'available'
  /** The full theme, code-split so visitors only download the one they view. */
  Component: LazyExoticComponent<ComponentType<ThemeProps>>
}

export interface UpcomingTheme extends ThemeBase {
  status: 'coming-soon'
}

export type ThemeDefinition = AvailableTheme | UpcomingTheme

// To add a theme: create src/themes/<id>/ with a default-exported component and a Preview,
// then register it here.
export const themes: ThemeDefinition[] = [
  {
    id: 'scroll',
    name: 'Scroll',
    status: 'available',
    Preview: ScrollPreview,
    Component: lazy(() => import('../themes/scroll')),
  },
  {
    id: 'pokemon',
    name: 'Pokémon',
    status: 'coming-soon',
    Preview: PokemonPreview,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    status: 'coming-soon',
    Preview: VSCodePreview,
  },
]

export const DEFAULT_THEME_ID = 'scroll'

export const availableThemes = themes.filter(
  (theme): theme is AvailableTheme => theme.status === 'available',
)

export function isAvailableThemeId(id: string | null | undefined): id is string {
  return availableThemes.some((theme) => theme.id === id)
}

export function getAvailableTheme(id: string): AvailableTheme {
  const theme = availableThemes.find((t) => t.id === id)
  if (!theme) throw new Error(`Unknown theme: ${id}`)
  return theme
}
