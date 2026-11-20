import { useContext, useRef, type Ref, type RefObject } from 'react'
import { NAME_SEAL_LABEL, PROFILE_LINKS_LABEL } from '../content'
import { ScrollContext } from '../context'
import type { ArtMode, MedalRank, ProfileLink, SealShape } from '../model'
import { glyphPath } from '../paint/glyphs'
import { usePress } from './usePress'

const RED = '#A8321F'
const CREAM = '#DCCDA8'
const STAMP_CREAM = '#E3D4B0'

const NAME_LAYOUT: readonly (readonly [string, number, number])[] = [
  ['鄭', 1, 0],
  ['印', 1, 1],
  ['亞', 0, 0],
  ['東', 0, 1],
]

function nameSealPath(): string {
  const pad = 9
  const c = 41
  return NAME_LAYOUT.map(([ch, cx, cy]) =>
    glyphPath(ch, pad + cx * c, pad + cy * c, c, c, 3.6),
  ).join('')
}

const NAME_SEAL_PATH = nameSealPath()

/** How long after an unroll starts the top name seal presses on. */
const TOP_SEAL_DELAY_MS = 2500

/**
 * A seal that presses on: the class to add (see usePress). `press` false: never waits. Stilled
 * painting from the start: never waits either; stilled later: a waiting seal appears at once.
 */
function useSealPress(
  ref: RefObject<Element | null>,
  press: boolean,
  options: { delayMs?: number; held?: boolean; restart?: number } = {},
): string {
  const stilled = useContext(ScrollContext)?.stilled ?? false
  return usePress(ref, { ...options, disabled: !press || stilled })
}

const withClass = (base: string, extra: string): string => (extra ? `${base} ${extra}` : base)

/**
 * The painter's name seal: a red square with the four characters of the name cut out of it.
 * press 'view': it presses on when it first comes into view; 'roll': TOP_SEAL_DELAY_MS after each
 * unroll starts, wherever it is (the seal at the top, once the scroll has opened). `rolls` (with
 * 'roll'): how many unrolls have started; 0 while the first is still to come (the seal waits),
 * null when the scroll does not unroll (the seal is simply there).
 */
export function NameSeal({
  press,
  rolls = null,
}: {
  press?: 'view' | 'roll'
  rolls?: number | null
}) {
  const ref = useRef<HTMLElement>(null)
  const roll = press === 'roll'
  const cls = useSealPress(
    ref,
    press === 'view' || (roll && rolls !== null),
    roll ? { delayMs: TOP_SEAL_DELAY_MS, held: rolls === 0, restart: rolls ?? 0 } : {},
  )
  return (
    <i ref={ref} className={withClass('seal', cls)} role="img" aria-label={NAME_SEAL_LABEL}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g filter="url(#rough)">
          <rect x="2" y="2" width="96" height="96" rx="5" fill={RED} />
          <path
            d={NAME_SEAL_PATH}
            fill="none"
            stroke={CREAM}
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </i>
  )
}

interface StampProps {
  ch: string
  shape?: SealShape
  fill?: boolean
  dense?: boolean
  className?: string
  ref?: Ref<HTMLElement>
}

function StampShape({ shape }: { shape: SealShape }) {
  if (shape === 'ro') return <circle cx="50" cy="50" r="44" />
  if (shape === 'ov') return <ellipse cx="50" cy="50" rx="36" ry="46" />
  if (shape === 're') return <rect x="15" y="5" width="70" height="90" rx="6" />
  return <rect x="6" y="6" width="88" height="88" rx="7" />
}

/** A small seal: a red outline with one character, as a painter adds a leisure seal. */
export function Stamp({
  ch,
  shape = 'sq',
  fill = false,
  dense = false,
  className,
  ref,
}: StampProps) {
  const d = dense ? glyphPath(ch, 15, 15, 70, 70, 0) : glyphPath(ch, 21, 21, 58, 58, 0)
  return (
    <i ref={ref} className={className ? `st ${className}` : 'st'} data-ch={ch} aria-hidden="true">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g filter="url(#rough)" strokeLinecap="round" strokeLinejoin="round">
          <g fill={fill ? RED : 'none'} stroke={RED} strokeWidth="5">
            <StampShape shape={shape} />
          </g>
          <path
            fill="none"
            stroke={fill ? STAMP_CREAM : RED}
            strokeWidth={dense ? 5.6 : fill ? 9 : 6.5}
            d={d}
          />
        </g>
      </svg>
    </i>
  )
}

const MEDALS: Readonly<Record<MedalRank, { zh: string; ja: string }>> = {
  gold: { zh: '金', ja: '金' },
  silver: { zh: '银', ja: '銀' },
  bronze: { zh: '铜', ja: '銅' },
}

/** A medal seal for a placing: gold, silver or bronze. `press`: it presses on when it first comes into view. */
export function AwardSeal({
  rank,
  mode,
  press = false,
}: {
  rank: MedalRank
  mode: ArtMode
  press?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const cls = useSealPress(ref, press)
  return <Stamp ref={ref} ch={MEDALS[rank][mode]} fill dense className={withClass('award', cls)} />
}

interface StampLinkProps {
  href: string
  label: string
  ch: string
  shape: SealShape
  newTab?: boolean
  ariaLabel?: string
}

/** A link shown as a small seal with its label beside it. It opens in a new tab unless told not to. */
export function StampLink({ href, label, ch, shape, newTab = true, ariaLabel }: StampLinkProps) {
  return (
    <a
      className="stamp"
      href={href}
      aria-label={ariaLabel}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <Stamp ch={ch} shape={shape} />
      <span>{label}</span>
    </a>
  )
}

/** The four profile links (resume, email, GitHub, LinkedIn) as seals. */
export function ProfileStamps({ links }: { links: ProfileLink[] }) {
  return (
    <nav className="stamps" aria-label={PROFILE_LINKS_LABEL}>
      {links.map((link) => (
        <StampLink
          key={link.id}
          href={link.href}
          label={link.label}
          ch={link.ch}
          shape={link.shape}
          newTab={link.newTab}
        />
      ))}
    </nav>
  )
}
