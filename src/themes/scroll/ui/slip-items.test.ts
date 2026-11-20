import { describe, expect, it } from 'vitest'
import { filterSlip } from './slip-items'
import type { SlipGroup } from './slip-items'

const groups: SlipGroup[] = [
  {
    title: 'Sections',
    items: [
      { id: 's1', label: 'Top' },
      { id: 's2', label: 'Experience', current: true },
    ],
  },
  {
    title: 'Links',
    items: [
      { id: 'l1', label: 'Resume', href: '/r.pdf', newTab: true },
      { id: 'l2', label: 'Email', href: 'mailto:x' },
    ],
  },
]

const ids = (gs: SlipGroup[]) => gs.flatMap((g) => g.items.map((i) => i.id))

describe('filterSlip', () => {
  it('keeps everything for an empty query', () => {
    expect(filterSlip(groups, '')).toEqual(groups)
    expect(filterSlip(groups, '   ')).toEqual(groups)
  })

  it('matches by label', () => {
    const out = filterSlip(groups, 'res')
    expect(ids(out)).toEqual(['l1'])
    expect(out.map((g) => g.title)).toEqual(['Links'])
  })

  it('keeps the whole group on a title match', () => {
    const out = filterSlip(groups, 'sections')
    expect(ids(out)).toEqual(['s1', 's2'])
  })

  it('ignores case and surrounding spaces', () => {
    expect(ids(filterSlip(groups, '  EMAIL '))).toEqual(['l2'])
  })

  it('returns nothing when nothing matches', () => {
    expect(filterSlip(groups, 'zzz')).toEqual([])
  })

  it('does not mutate its input', () => {
    filterSlip(groups, 'res')
    expect(groups[1]?.items).toHaveLength(2)
  })
})
