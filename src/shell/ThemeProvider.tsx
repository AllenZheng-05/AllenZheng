import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'
import { pathForTheme, resolveThemeFromLocation, SITE_URL } from './theme-route'
import { getAvailableTheme, isAvailableThemeId, themes } from './themes'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(resolveThemeFromLocation)

  // Back/forward buttons move between themes.
  useEffect(() => {
    const onPopState = () => setThemeId(resolveThemeFromLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = themeId
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', new URL(pathForTheme(themeId), SITE_URL).href)
  }, [themeId])

  const setTheme = useCallback(
    (id: string) => {
      if (!isAvailableThemeId(id) || id === themeId) return
      // Section anchors differ between themes, so the #hash is dropped; ?query is kept.
      window.history.pushState(null, '', `${pathForTheme(id)}${window.location.search}`)
      setThemeId(id)
      window.scrollTo({ top: 0 })
    },
    [themeId],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: getAvailableTheme(themeId), themes, setTheme }),
    [themeId, setTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
