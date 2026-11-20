import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import handData from '../../assets/hand/allen-studio-data.json?raw'
import { portfolio } from '../../data'
import { ThemeProvider } from '../../shell/ThemeProvider'
import { themes } from '../../shell/themes'
import * as content from './content'
import { MENU_GROUPS, MOTION_LABEL, SECTION_LABEL } from './content'
import { buildModel, linkSeals } from './model'
import ScrollTheme from './ScrollTheme'

// Fields that are never drawn as handwriting (identifiers, URLs, glyph keys, enums, alt text).
const SKIPPED = new Set(['id', 'href', 'src', 'kind', 'ch', 'shape', 'motif', 'medal', 'alt'])

/** Every string the model exposes as visible text, with the path it came from. */
function visibleStrings(
  value: unknown,
  path: string,
  out: [string, string][] = [],
): [string, string][] {
  if (typeof value === 'string') out.push([path, value])
  else if (Array.isArray(value)) value.forEach((v, i) => visibleStrings(v, `${path}[${i}]`, out))
  else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (!SKIPPED.has(key)) visibleStrings(v, `${path}.${key}`, out)
    }
  }
  return out
}

/** A drawing (version) with at least one stroke of two or more points: what the font build draws. */
const drawn = (version: unknown): boolean =>
  Array.isArray(version) && version.some((stroke) => Array.isArray(stroke) && stroke.length > 1)

/**
 * The characters the font has, by the same rule as scripts/build-hand-font.py: it first drops every
 * stroke of fewer than two points and every version left without strokes, then gives a glyph to
 * each key that is exactly one character (one code point) and still has a version. So: keys of one
 * code point with at least one drawn version, the space, and the aliases it adds.
 */
function fontCharacters(): Set<string> {
  const data = JSON.parse(handData) as { hand: Record<string, unknown> }
  const have = new Set<string>([' '])
  for (const [ch, versions] of Object.entries(data.hand)) {
    if ([...ch].length !== 1) continue
    if (!Array.isArray(versions) || !versions.some(drawn)) continue
    have.add(ch)
  }
  // Aliases added by scripts/build-hand-font.py.
  const aliases: [string, string][] = [
    ['’', "'"],
    ['‘', "'"],
    ['“', '"'],
    ['”', '"'],
    ['—', '–'],
    ['−', '-'],
    [' ', ' '],
  ]
  for (const [alias, plain] of aliases) if (have.has(plain)) have.add(alias)
  return have
}

/** The characters of `texts` the font lacks, each with where it was found. */
function missingFrom(have: Set<string>, texts: [string, string][]): string[] {
  const missing = new Map<string, string[]>()
  for (const [path, text] of texts) {
    for (const ch of text) {
      if (have.has(ch)) continue
      missing.set(ch, [...(missing.get(ch) ?? []), path])
    }
  }
  return [...missing].map(
    ([ch, paths]) =>
      `${JSON.stringify(ch)} U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')} in ${[...new Set(paths)].join(', ')}`,
  )
}

/** Every string content.ts holds or makes, joined. */
function contentText(): string {
  const out: string[] = []
  const walk = (value: unknown): void => {
    if (typeof value === 'string') out.push(value)
    else if (typeof value === 'function') walk((value as (...args: string[]) => unknown)('a', 'b'))
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk({ ...content })
  return out.join(' ')
}

describe('handwriting font coverage', () => {
  it('has a glyph for every character the theme draws from the data', () => {
    const report = missingFrom(fontCharacters(), visibleStrings(buildModel(portfolio), 'model'))
    expect(report, `Missing from the font:\n${report.join('\n')}`).toEqual([])
  })

  it('has a glyph for every label the theme and the theme picker draw', () => {
    const allLinks = { live: 'x', demo: 'x', video: 'x', source: 'x', post: 'x' }
    const labels: [string, string][] = [
      ...Object.entries(SECTION_LABEL).map(([k, v]): [string, string] => [`section ${k}`, v]),
      ...Object.entries(MENU_GROUPS).map(([k, v]): [string, string] => [`menu group ${k}`, v]),
      ...Object.entries(MOTION_LABEL).map(([k, v]): [string, string] => [`motion ${k}`, v]),
      ...linkSeals(allLinks).map((seal): [string, string] => [
        `link seal ${seal.kind}`,
        seal.label,
      ]),
      ...themes.map((t): [string, string] => [`theme ${t.id} name`, t.name]),
      ['everything in content.ts', contentText()],
    ]
    const report = missingFrom(fontCharacters(), labels)
    expect(report, `Missing from the font:\n${report.join('\n')}`).toEqual([])
  })

  it('has a glyph for every character on the rendered page: slip, an open hall, a note', async () => {
    const user = userEvent.setup()
    const model = buildModel(portfolio)
    const house = model.houses.find((h) => h.capture) ?? model.houses[0]
    const stop = model.stops.find((s) => s.placing) ?? model.stops[0]
    if (!house || !stop) throw new Error('The test needs a personal project and a hackathon')
    render(createElement(ThemeProvider, null, createElement(ScrollTheme, { data: portfolio })))
    const seen: [string, string][] = []
    const look = (when: string) =>
      seen.push([when, (document.body.textContent ?? '').replace(/\s+/g, ' ')])

    look('first render')
    // the slip, with a search that matches nothing
    await user.click(screen.getByRole('button', { name: /^Menu\. You are at / }))
    const search = within(screen.getByRole('dialog', { name: 'Jump to' })).getByRole('textbox')
    // the search box's placeholder is drawn in the handwriting too
    seen.push(['slip placeholder', search.getAttribute('placeholder') ?? ''])
    await user.type(search, 'zzqq')
    look('slip, nothing matching')
    await user.keyboard('{Escape}')
    // a house opened into its hall
    const hd = screen
      .getAllByRole('button', { name: (name) => name.includes(house.title) })
      .find((el) => el.classList.contains('hd'))
    if (!hd) throw new Error('no house button')
    await user.click(hd)
    look('open hall')
    // a hackathon's note
    const sb = screen
      .getAllByRole('button', { name: (name) => name.includes(stop.title) })
      .find((el) => el.classList.contains('sb'))
    if (!sb) throw new Error('no stop button')
    await user.click(sb)
    look('open note')

    // the labels that exist only as JSX text are all on the page by now
    const page = seen.map(([, text]) => text).join(' ')
    for (const label of [
      'Open',
      'Close',
      'Roll up',
      'Write to me.',
      'Try another theme',
      'Jump to...',
      'Nothing matches',
      'Art',
      'Theme',
      'Choose a theme',
      'Coming soon',
      'Current',
    ]) {
      expect(page).toContain(label)
    }
    const report = missingFrom(fontCharacters(), seen)
    expect(report, `Missing from the font:\n${report.join('\n')}`).toEqual([])
  })
})
