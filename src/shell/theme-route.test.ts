import { describe, expect, it } from 'vitest'
import { pathForTheme, resolveThemeFromLocation, themeIdFromPath } from './theme-route'
import { DEFAULT_THEME_ID } from './themes'

function visit(url: string) {
  window.history.replaceState(null, '', url)
  const id = resolveThemeFromLocation()
  return { id, url: window.location.pathname + window.location.search + window.location.hash }
}

describe('themeIdFromPath', () => {
  it('maps "/" to the default theme', () => {
    expect(themeIdFromPath('/')).toBe(DEFAULT_THEME_ID)
  })

  it('rejects the default theme’s own id, unknown themes, unreleased themes, and nested paths', () => {
    expect(themeIdFromPath(`/${DEFAULT_THEME_ID}`)).toBeNull()
    expect(themeIdFromPath('/nope')).toBeNull()
    expect(themeIdFromPath('/pokemon')).toBeNull() // coming soon
    expect(themeIdFromPath('/vscode/extra')).toBeNull()
  })
})

describe('pathForTheme', () => {
  it('puts the default theme at the root and others at /<id>', () => {
    expect(pathForTheme(DEFAULT_THEME_ID)).toBe('/')
    expect(pathForTheme('vscode')).toBe('/vscode')
  })
})

describe('resolveThemeFromLocation', () => {
  it('leaves canonical URLs alone', () => {
    expect(visit('/?ref=linkedin#projects')).toEqual({
      id: DEFAULT_THEME_ID,
      url: '/?ref=linkedin#projects',
    })
  })

  it('redirects the default theme’s id to / and keeps the query and hash', () => {
    expect(visit(`/${DEFAULT_THEME_ID}?ref=x#y`)).toEqual({
      id: DEFAULT_THEME_ID,
      url: '/?ref=x#y',
    })
  })

  it('normalizes trailing slashes', () => {
    expect(visit(`/${DEFAULT_THEME_ID}/`).url).toBe('/')
  })

  it('sends unknown and unreleased themes to /, keeping the query and hash', () => {
    expect(visit('/pokemom')).toEqual({ id: DEFAULT_THEME_ID, url: '/' })
    expect(visit('/pokemon')).toEqual({ id: DEFAULT_THEME_ID, url: '/' })
    // "/default" is no theme's path (the default theme's id is not "default")
    expect(visit('/default?ref=resume#about')).toEqual({
      id: DEFAULT_THEME_ID,
      url: '/?ref=resume#about',
    })
  })
})
