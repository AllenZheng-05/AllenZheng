import { DEFAULT_THEME_ID, isAvailableThemeId } from './themes'

export const SITE_URL = 'https://allenzheng.com'

/**
 * Each theme lives at its own path: the default theme at "/", every other theme at "/<id>".
 * Returns null for paths that aren't a theme's canonical home (including "/default").
 */
export function themeIdFromPath(pathname: string): string | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '')
  if (segment === '') return DEFAULT_THEME_ID
  if (segment !== DEFAULT_THEME_ID && isAvailableThemeId(segment)) return segment
  return null
}

export function pathForTheme(id: string): string {
  return id === DEFAULT_THEME_ID ? '/' : `/${id}`
}

/**
 * Reads the theme from the current URL. Non-canonical paths — "/default", trailing slashes,
 * unknown or unreleased themes — are rewritten in place (keeping ?query and #hash) and fall
 * back to the default theme.
 */
export function resolveThemeFromLocation(): string {
  const { pathname, search, hash } = window.location
  const id = themeIdFromPath(pathname) ?? DEFAULT_THEME_ID
  const canonical = pathForTheme(id)
  if (pathname !== canonical) {
    window.history.replaceState(window.history.state, '', `${canonical}${search}${hash}`)
  }
  return id
}
