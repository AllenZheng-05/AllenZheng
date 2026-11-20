import type { Links, Period, Portfolio, Project, YearMonth } from '../../data'
import { LINK_LABEL, MONTHS, periodRange, PRESENT, PROFILE_LINK_LABEL, roleLine } from './content'
import { motifFor } from './motifs'

export type ArtMode = 'zh' | 'ja'
export type LinkKind = 'live' | 'demo' | 'video' | 'source' | 'post'
/** Square, tall rectangle, round, oval. */
export type SealShape = 'sq' | 're' | 'ro' | 'ov'
export type MedalRank = 'gold' | 'silver' | 'bronze'
export type MotifKind = 'duel' | 'sport' | 'team' | 'grades' | 'branch' | 'lamp'
export type SectionId = 'top' | 'experience' | 'projects' | 'hackathons' | 'contact'

export interface ProfileLink {
  id: 'resume' | 'email' | 'github' | 'linkedin'
  label: string
  href: string
  ch: string
  shape: SealShape
  newTab: boolean
}
export interface LinkSeal {
  kind: LinkKind
  href: string
  label: string
  ch: string
  shape: SealShape
}
export interface BayModel {
  id: string
  period: string
  role: string
  org: string
  sentence: string
  skills: string[]
}
export interface CaptureModel {
  src: string
  alt: string
}
export interface HouseModel {
  id: string
  title: string
  motif: MotifKind
  role: string | null
  period: string
  /** Closed house: the role, or the period when there is no role. */
  byline: string
  /** Open hall: "role, period", or the period alone when there is no role. */
  bylineOpen: string
  sentence: string
  stack: string[]
  links: LinkSeal[]
  /** First media item of kind 'image', else null. */
  capture: CaptureModel | null
}
export interface StopModel {
  id: string
  title: string
  /** First month of the period, e.g. "Jan 2025". */
  date: string
  period: string
  event: string | null
  placing: string | null
  medal: MedalRank | null
  sentence: string
  links: LinkSeal[]
}
export interface ScrollModel {
  name: string
  roleLine: string
  bio: string[]
  email: string
  profileLinks: ProfileLink[]
  bays: BayModel[]
  houses: HouseModel[]
  stops: StopModel[]
}

/** '2026-01' -> 'Jan 2026'. */
export function formatMonth(value: YearMonth): string {
  const [year, month] = value.split('-')
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`
}

export function formatPeriod(period: Period): string {
  const start = formatMonth(period.start)
  const { end } = period
  if (!end || end === period.start) return start
  return periodRange(start, end === 'present' ? PRESENT : formatMonth(end))
}

/* Whole words only ("Thirds" is no placing); "First-Time Hackers Award" or "second time" is not one either. */
const GOLD = /\b(winners?|1st|first(?![- ]time))\b/i
const SILVER = /\b(2nd|second(?![- ]time))\b/i
const BRONZE = /\b(3rd|third(?![- ]time))\b/i

export function medalRank(placing: string | null | undefined): MedalRank | null {
  if (!placing) return null
  if (GOLD.test(placing)) return 'gold'
  if (SILVER.test(placing)) return 'silver'
  if (BRONZE.test(placing)) return 'bronze'
  return null
}

const EM_DASH = '—'

export function splitAward(project: Pick<Project, 'event' | 'award'>): {
  event: string | null
  placing: string | null
} {
  const award = project.award?.trim() ?? ''
  const at = award.indexOf(EM_DASH)
  const before = at < 0 ? '' : award.slice(0, at).trim()
  const placing = at < 0 ? award : award.slice(at + 1).trim()
  return {
    event: project.event || before || null,
    placing: placing || null,
  }
}

const SEALS: readonly Omit<LinkSeal, 'href'>[] = [
  { kind: 'live', label: LINK_LABEL.live, ch: '門', shape: 're' },
  { kind: 'demo', label: LINK_LABEL.demo, ch: '示', shape: 'sq' },
  { kind: 'video', label: LINK_LABEL.video, ch: '目', shape: 'ro' },
  { kind: 'source', label: LINK_LABEL.source, ch: '工', shape: 'sq' },
  { kind: 'post', label: LINK_LABEL.post, ch: '言', shape: 'ov' },
]

export function linkSeals(links: Links): LinkSeal[] {
  return SEALS.flatMap((seal) => {
    const href = links[seal.kind]
    return href ? [{ ...seal, href }] : []
  })
}

function buildHouse(project: Project): HouseModel {
  const role = project.role ?? null
  const period = formatPeriod(project.period)
  const image = (project.media ?? []).find((m) => m.kind === 'image')
  return {
    id: project.id,
    title: project.title,
    motif: motifFor(project.id),
    role,
    period,
    byline: role ?? period,
    bylineOpen: role ? `${role}, ${period}` : period,
    sentence: project.description.sentence,
    stack: [...project.stack],
    links: linkSeals(project.links),
    capture: image ? { src: image.src, alt: image.alt } : null,
  }
}

function buildStop(project: Project): StopModel {
  const { event, placing } = splitAward(project)
  return {
    id: project.id,
    title: project.title,
    date: formatMonth(project.period.start),
    period: formatPeriod(project.period),
    event,
    placing,
    medal: medalRank(placing),
    sentence: project.description.sentence,
    links: linkSeals(project.links),
  }
}

export function buildModel(data: Portfolio): ScrollModel {
  const { profile } = data
  return {
    name: profile.name,
    roleLine: roleLine(profile.headline, profile.location),
    bio: profile.bio,
    email: profile.email,
    profileLinks: [
      {
        id: 'resume',
        label: PROFILE_LINK_LABEL.resume,
        href: profile.resumeUrl,
        ch: '文',
        shape: 're',
        newTab: true,
      },
      {
        id: 'email',
        label: PROFILE_LINK_LABEL.email,
        href: `mailto:${profile.email}`,
        ch: '信',
        shape: 'sq',
        newTab: false,
      },
      {
        id: 'github',
        label: PROFILE_LINK_LABEL.github,
        href: profile.github,
        ch: '工',
        shape: 'ro',
        newTab: true,
      },
      {
        id: 'linkedin',
        label: PROFILE_LINK_LABEL.linkedin,
        href: profile.linkedin,
        ch: '友',
        shape: 'ov',
        newTab: true,
      },
    ],
    bays: data.experience.map((job) => ({
      id: job.id,
      period: formatPeriod(job.period),
      role: job.role,
      org: job.org,
      sentence: job.description.sentence,
      skills: job.skills.slice(0, 4),
    })),
    houses: data.projects.filter((p) => p.category === 'personal').map(buildHouse),
    stops: data.projects
      .filter((p) => p.category === 'hackathon')
      .map((project, index) => ({ project, index }))
      .sort(
        (a, b) => a.project.period.start.localeCompare(b.project.period.start) || a.index - b.index,
      )
      .map(({ project }) => buildStop(project)),
  }
}
