import { describe, expect, it } from 'vitest'
import handData from '../../assets/hand/allen-studio-data.json?raw'
import { portfolio, site } from '../../data'
import { themes } from '../../shell/themes'
import * as content from './content'
import { buildModel } from './model'

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

// content.ts exports that are only read out or shown as tooltips, never drawn in the handwriting.
const NEVER_DRAWN = new Set([
  'NAME_SEAL_LABEL',
  'PROFILE_LINKS_LABEL',
  'linkFor',
  'NO_CAPTURE',
  'rollUp',
  'menuTagLabel',
  'MENU_LABEL',
  'ART_TAG_LABEL',
  'ART_TAG_TIP',
  'WEBRING_LABEL',
])

/** Every string content.ts holds or makes that is drawn, with the export it came from. */
function contentStrings(): [string, string][] {
  const out: [string, string][] = []
  const walk = (name: string, value: unknown): void => {
    if (typeof value === 'string') out.push([`content.ts ${name}`, value])
    else if (typeof value === 'function')
      walk(name, (value as (...args: string[]) => unknown)('a', 'b'))
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => walk(name, v))
  }
  for (const [name, value] of Object.entries(content)) {
    if (!NEVER_DRAWN.has(name)) walk(name, value)
  }
  return out
}

// The scroll draws all of its text in the handwriting font, which only has the characters that
// were written for it. A character it lacks would show in a fallback font, so these fail instead.
describe('handwriting font coverage', () => {
  it('has a glyph for every character the theme draws from the data', () => {
    const report = missingFrom(fontCharacters(), visibleStrings(buildModel(portfolio), 'model'))
    expect(report, `Missing from the font:\n${report.join('\n')}`).toEqual([])
  })

  it('has a glyph for every character of the text in content.ts and the theme picker', () => {
    const labels: [string, string][] = [
      ...contentStrings(),
      ...themes.map((t): [string, string] => [`theme ${t.id} name`, t.name]),
      ...Object.entries(site).map(([k, v]): [string, string] => [`site.${k}`, v]),
    ]
    const report = missingFrom(fontCharacters(), labels)
    expect(report, `Missing from the font:\n${report.join('\n')}`).toEqual([])
  })
})
