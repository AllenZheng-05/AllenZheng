import type { ComponentType, ReactNode, SVGProps } from 'react'
import {
  DevpostIcon,
  GitHubIcon,
  GlobeIcon,
  LinkedInIcon,
  TrophyIcon,
  YouTubeIcon,
} from '../../components/icons'
import type { Description, DescriptionFormat, Links, Media } from '../../data'

export function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 border-t border-line py-14 sm:py-20"
    >
      <div className="grid gap-6 sm:grid-cols-[9rem_1fr] sm:gap-10">
        <h2
          id={`${id}-title`}
          className="font-mono text-xs tracking-[0.18em] text-muted uppercase sm:pt-1.5"
        >
          {title}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

export function Chips({
  items,
  label,
  award,
}: {
  items: string[]
  label: string
  /** Shown as the first, accent-tinted chip with a trophy. */
  award?: string
}) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {award && (
        <li className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">
          <TrophyIcon className="size-3 shrink-0" />
          {award}
        </li>
      )}
      {items.map((item) => (
        <li
          key={item}
          className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

/** An entry's write-up in the given format. */
export function DescriptionText({
  description,
  format,
  className = '',
}: {
  description: Description
  format: DescriptionFormat
  className?: string
}) {
  if (format === 'bullets') {
    return (
      <ul className={`list-disc space-y-1 pl-5 ${className}`}>
        {description.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    )
  }
  return <p className={className}>{description[format]}</p>
}

/** Grid of an entry's videos, GIFs, and screenshots. Renders nothing when there are none. */
export function MediaGallery({
  media = [],
  label,
  className = '',
}: {
  media?: Media[]
  /** What the media belongs to, for screen readers (e.g. the project title). */
  label: string
  className?: string
}) {
  if (media.length === 0) return null

  return (
    <ul aria-label={`${label} media`} className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {media.map((item) => (
        <li key={item.src}>
          <figure>
            <MediaItem item={item} />
            {item.caption && (
              <figcaption className="mt-2 font-mono text-xs text-muted">{item.caption}</figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  )
}

function MediaItem({ item }: { item: Media }) {
  const className = 'aspect-video w-full rounded-xl border border-line bg-surface object-contain'

  switch (item.kind) {
    case 'image':
      return (
        <img src={item.src} alt={item.alt} loading="lazy" decoding="async" className={className} />
      )
    case 'video':
      return (
        <video
          src={item.src}
          poster={item.poster}
          aria-label={item.alt}
          controls
          playsInline
          preload="metadata"
          className={className}
        />
      )
    case 'embed':
      return (
        <iframe
          src={item.src}
          title={item.alt}
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          className={className}
        />
      )
  }
}

const LINK_ORDER: (keyof Links)[] = ['live', 'source', 'demo', 'video', 'post']

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Picks a brand icon from the link's host; anything unrecognized is shown as a website. */
function linkIcon(href: string): { Icon: Icon; name: string } {
  const host = new URL(href).hostname.replace(/^www\./, '')
  if (host === 'github.com') return { Icon: GitHubIcon, name: 'GitHub' }
  if (host === 'linkedin.com') return { Icon: LinkedInIcon, name: 'LinkedIn' }
  if (host === 'devpost.com' || host.endsWith('.devpost.com'))
    return { Icon: DevpostIcon, name: 'Devpost' }
  if (host === 'youtube.com' || host === 'youtu.be') return { Icon: YouTubeIcon, name: 'YouTube' }
  return { Icon: GlobeIcon, name: 'Website' }
}

/** Row of icon links (website, GitHub, Devpost, …). Renders nothing when there are none. */
export function LinkList({
  links,
  label,
  className = '',
}: {
  links: Links
  /** What the links belong to, for screen readers (e.g. the project title). */
  label: string
  className?: string
}) {
  const entries = LINK_ORDER.flatMap((kind) => {
    const href = links[kind]
    return href ? [{ kind, href, ...linkIcon(href) }] : []
  })
  if (entries.length === 0) return null

  return (
    <ul aria-label={`${label} links`} className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {entries.map(({ kind, href, Icon, name }) => (
        <li key={kind}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${name}: ${label}`}
            title={name}
            className="-m-1.5 inline-flex rounded-md p-1.5 text-muted transition-colors hover:text-accent"
          >
            <Icon className="size-4.5" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ExternalLink({
  href,
  className,
  children,
  label,
}: {
  href: string
  className?: string
  children: ReactNode
  label?: string
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
      {children}
    </a>
  )
}
