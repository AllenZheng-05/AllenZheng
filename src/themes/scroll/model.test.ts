import { describe, expect, it } from 'vitest'
import { portfolio } from '../../data'
import type { Portfolio, Project } from '../../data'
import { buildModel, formatMonth, formatPeriod, linkSeals, medalRank, splitAward } from './model'
import { motifFor } from './motifs'

const hackathons = portfolio.projects.filter((p) => p.category === 'hackathon')

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'made-up',
    title: 'T',
    category: 'personal',
    description: { sentence: 's', paragraph: 'p', bullets: ['b'] },
    period: { start: '2026-01' },
    stack: ['A'],
    links: {},
    ...over,
  }
}

function withProjects(projects: Project[]): Portfolio {
  return { ...portfolio, projects }
}

describe('period text', () => {
  it('formats a month', () => {
    expect(formatMonth('2026-01')).toBe('Jan 2026')
    expect(formatMonth('2025-12')).toBe('Dec 2025')
  })

  it('formats ranges, present, and single months', () => {
    expect(formatPeriod({ start: '2026-01', end: '2026-08' })).toBe('Jan 2026 to Aug 2026')
    expect(formatPeriod({ start: '2026-09', end: 'present' })).toBe('Sep 2026 to present')
    expect(formatPeriod({ start: '2025-01' })).toBe('Jan 2025')
    expect(formatPeriod({ start: '2025-01', end: '2025-01' })).toBe('Jan 2025')
  })

  it('never uses a dash', () => {
    expect(formatPeriod({ start: '2026-01', end: '2026-08' })).not.toMatch(/[-–—]/)
  })
})

describe('hackathon order', () => {
  it('sorts the real data by start month', () => {
    expect(buildModel(portfolio).stops.map((s) => s.id)).toEqual([
      'candidate-compass',
      'wanderlogic',
      'forkast',
      'mindcraft',
      'jpmc-data-for-good',
      'fitts',
      'reagent',
      'finding-nemo',
    ])
  })

  it('keeps data order on ties', () => {
    const mk = (id: string, start: Project['period']['start']) =>
      project({ id, category: 'hackathon', period: { start } })
    const model = buildModel(
      withProjects([
        mk('b', '2026-05'),
        mk('a', '2026-05'),
        mk('c', '2025-01'),
        mk('d', '2026-05'),
      ]),
    )
    expect(model.stops.map((s) => s.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('puts only personal projects in the houses', () => {
    const ids = buildModel(portfolio).houses.map((h) => h.id)
    expect(ids).toEqual(
      portfolio.projects.filter((p) => p.category === 'personal').map((p) => p.id),
    )
  })
})

describe('splitAward', () => {
  const expected: Record<string, { event: string; placing: string | null }> = {
    'candidate-compass': { event: 'Congressional App Challenge', placing: '2nd Place' },
    wanderlogic: { event: 'HackReason 2025', placing: '3rd Place Overall' },
    forkast: { event: 'Axxess Hackathon 2025', placing: 'Track Winner' },
    mindcraft: { event: 'HackAI 2026', placing: 'Track Winner' },
    'jpmc-data-for-good': {
      event: 'JPMorganChase Data for Good Hackathon 2026',
      placing: 'Winner',
    },
    fitts: { event: 'Meta Global AI Hackathon', placing: null },
    reagent: { event: 'HackTX 2026', placing: 'NMC2 Track 3rd Place' },
    'finding-nemo': { event: 'HackUTD 2026', placing: null },
  }

  it('covers every hackathon in the data', () => {
    expect(hackathons.map((p) => p.id).sort()).toEqual(Object.keys(expected).sort())
  })

  it.each(Object.entries(expected))('splits %s', (id, want) => {
    const found = hackathons.find((p) => p.id === id)
    expect(found).toBeDefined()
    const got = splitAward(found as Project)
    expect(got.event).toBeTruthy()
    expect(got).toEqual(want)
  })

  it('handles synthetic cases', () => {
    expect(splitAward({ award: 'Just Winner' })).toEqual({ event: null, placing: 'Just Winner' })
    expect(splitAward({})).toEqual({ event: null, placing: null })
    expect(splitAward({ event: 'E' })).toEqual({ event: 'E', placing: null })
    expect(splitAward({ event: 'E', award: 'X — Y' })).toEqual({ event: 'E', placing: 'Y' })
    expect(splitAward({ award: ' A — B — C ' })).toEqual({ event: 'A', placing: 'B — C' })
  })
})

describe('medalRank', () => {
  const awards = portfolio.projects.flatMap((p) => (p.award ? [p] : []))

  it('ranks every award in the data', () => {
    const want: Record<string, string | null> = {
      'candidate-compass': 'silver',
      wanderlogic: 'bronze',
      forkast: 'gold',
      mindcraft: 'gold',
      'jpmc-data-for-good': 'gold',
      reagent: 'bronze',
    }
    expect(awards.map((p) => p.id).sort()).toEqual(Object.keys(want).sort())
    for (const p of awards) expect(medalRank(splitAward(p).placing), p.id).toBe(want[p.id])
  })

  it('ranks synthetic placings', () => {
    expect(medalRank('NMC2 Track 3rd Place')).toBe('bronze')
    expect(medalRank('First place')).toBe('gold')
    expect(medalRank('1st')).toBe('gold')
    expect(medalRank('SECOND')).toBe('silver')
    expect(medalRank('Third')).toBe('bronze')
    expect(medalRank('Finalist')).toBeNull()
    expect(medalRank('')).toBeNull()
    expect(medalRank(null)).toBeNull()
    expect(medalRank(undefined)).toBeNull()
  })

  it('matches whole words only, and not "first time"', () => {
    expect(medalRank('First-Time Hackers Award')).toBeNull()
    expect(medalRank('Best first time hack')).toBeNull()
    expect(medalRank('Second-time team')).toBeNull()
    expect(medalRank('Third time lucky')).toBeNull()
    expect(medalRank('Thirds')).toBeNull()
    expect(medalRank('Firstborn Prize')).toBeNull()
    expect(medalRank('21st Century Award')).toBeNull()
    expect(medalRank('Grand Prize Winner')).toBe('gold')
    expect(medalRank('Winner, First-Time Hackers')).toBe('gold')
    expect(medalRank('First-Time Hackers: 2nd place')).toBe('silver')
    expect(medalRank('Best Use of AI (3rd)')).toBe('bronze')
    expect(medalRank('Track 1st Place')).toBe('gold')
    // the plural too
    expect(medalRank('Track Winners')).toBe('gold')
    expect(() => medalRank("winners' circle")).not.toThrow()
  })
})

describe('link seals', () => {
  it('orders and labels seals', () => {
    const seals = linkSeals({ post: 'p', source: 's', video: 'v', demo: 'd', live: 'l' })
    expect(seals.map((s) => [s.kind, s.label, s.ch, s.shape, s.href])).toEqual([
      ['live', 'Live site', '門', 're', 'l'],
      ['demo', 'Demo page', '示', 'sq', 'd'],
      ['video', 'Video', '目', 'ro', 'v'],
      ['source', 'Source', '工', 'sq', 's'],
      ['post', 'Write-up', '言', 'ov', 'p'],
    ])
  })

  it('gives no seals for no links', () => {
    expect(linkSeals({})).toEqual([])
    expect(buildModel(withProjects([project()])).houses[0]?.links).toEqual([])
  })
})

describe('motifs', () => {
  it('maps known ids and falls back to lamp', () => {
    expect(motifFor('toe-to-toe')).toBe('duel')
    expect(motifFor('headless-sports')).toBe('sport')
    expect(motifFor('open-team-sheets')).toBe('team')
    expect(motifFor('utd-grades')).toBe('grades')
    expect(motifFor('docbranch')).toBe('branch')
    expect(motifFor('toString')).toBe('lamp')
  })

  it('renders a made-up project as a lamp', () => {
    expect(buildModel(withProjects([project({ id: 'zzz-new' })])).houses[0]?.motif).toBe('lamp')
  })
})

describe('capture', () => {
  it('finds the first image', () => {
    const house = buildModel(portfolio).houses.find((h) => h.id === 'toe-to-toe')
    const image = portfolio.projects
      .find((p) => p.id === 'toe-to-toe')
      ?.media?.find((m) => m.kind === 'image')
    expect(image).toBeDefined()
    expect(house?.capture?.src).toBe(image?.src)
    expect(house?.capture?.alt).toBe(image?.alt)
  })

  it('is null without an image', () => {
    const video = project({
      media: [
        { kind: 'embed', src: 'e', alt: 'e' },
        { kind: 'video', src: 'v', alt: 'v' },
      ],
    })
    const [a, b] = buildModel(withProjects([video, project({ id: 'two' })])).houses
    expect(a?.capture).toBeNull()
    expect(b?.capture).toBeNull()
  })

  it('skips non-image media before an image', () => {
    const mixed = project({
      media: [
        { kind: 'embed', src: 'e', alt: 'e' },
        { kind: 'image', src: 'i', alt: 'ia' },
      ],
    })
    expect(buildModel(withProjects([mixed])).houses[0]?.capture).toEqual({ src: 'i', alt: 'ia' })
  })
})

describe('profile links', () => {
  it('comes from the profile, resume in a new tab', () => {
    const { profile } = portfolio
    const model = buildModel(portfolio)
    expect(model.profileLinks.map((l) => l.id)).toEqual(['resume', 'email', 'github', 'linkedin'])
    expect(model.profileLinks.map((l) => l.href)).toEqual([
      profile.resumeUrl,
      `mailto:${profile.email}`,
      profile.github,
      profile.linkedin,
    ])
    expect(model.profileLinks.map((l) => l.newTab)).toEqual([true, false, true, true])
    expect(model.profileLinks.map((l) => l.label)).toEqual([
      'Resume',
      'Email',
      'GitHub',
      'LinkedIn',
    ])
    expect(model.roleLine).toBe(`${profile.headline} in ${profile.location}`)
    expect(model.bio).toEqual(profile.bio)
  })
})

describe('robustness', () => {
  it('survives empty arrays', () => {
    const model = buildModel({ ...portfolio, experience: [], projects: [] })
    expect(model.bays).toEqual([])
    expect(model.houses).toEqual([])
    expect(model.stops).toEqual([])
  })

  it('uses the period as the byline without a role', () => {
    const house = buildModel(
      withProjects([project({ period: { start: '2026-01', end: '2026-03' } })]),
    ).houses[0]
    expect(house?.role).toBeNull()
    expect(house?.byline).toBe('Jan 2026 to Mar 2026')
    expect(house?.bylineOpen).toBe('Jan 2026 to Mar 2026')
  })

  it('joins role and period in the open byline', () => {
    const house = buildModel(withProjects([project({ role: 'Lead' })])).houses[0]
    expect(house?.byline).toBe('Lead')
    expect(house?.bylineOpen).toBe('Lead, Jan 2026')
  })

  it('keeps the first four skills of each bay', () => {
    const bays = buildModel(portfolio).bays
    expect(bays.length).toBe(portfolio.experience.length)
    portfolio.experience.forEach((job, i) => {
      expect(bays[i]?.skills).toEqual(job.skills.slice(0, 4))
    })
  })

  it('handles a hackathon with no award or event', () => {
    const stop = buildModel(withProjects([project({ category: 'hackathon' })])).stops[0]
    expect(stop?.event).toBeNull()
    expect(stop?.placing).toBeNull()
    expect(stop?.medal).toBeNull()
    expect(stop?.date).toBe('Jan 2026')
  })
})
