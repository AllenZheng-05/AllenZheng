import type { ReactNode } from 'react'
import type { Experience, Links, Logo, Period, Profile, Project } from '../../data'
import { formatPeriod } from '../../lib/dates'
import { Chips, ExternalLink, LinkList, Section } from './ui'

export function About({ profile }: { profile: Profile }) {
  return (
    <Section id="about" title="About">
      <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-5 text-lg leading-relaxed text-pretty">
          {profile.bio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="flex items-start gap-6 lg:flex-col">
          <figure className="w-36 shrink-0 sm:w-44 lg:w-full">
            <img
              src={profile.photo.src}
              alt={profile.photo.alt}
              loading="lazy"
              decoding="async"
              style={{ objectPosition: profile.photo.focus }}
              className="aspect-4/5 w-full rounded-2xl border border-line bg-surface object-cover"
            />
            {profile.photo.caption && (
              <figcaption className="mt-2 font-mono text-xs text-muted">
                {profile.photo.caption}
              </figcaption>
            )}
          </figure>
          <dl className="space-y-4 text-sm">
            {profile.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-mono text-xs text-muted">{fact.label}</dt>
                <dd className="mt-0.5">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}

export function ExperienceSection({ experience }: { experience: Experience[] }) {
  return (
    <Section id="experience" title="Experience">
      <ol className="space-y-12">
        {experience.map((job) => (
          <li key={job.id}>
            <Entry
              logo={job.logo}
              heading={
                <>
                  {job.role}
                  <span className="font-normal text-muted"> · </span>
                  {job.orgUrl ? (
                    <ExternalLink
                      href={job.orgUrl}
                      className="underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      {job.org}
                    </ExternalLink>
                  ) : (
                    job.org
                  )}
                </>
              }
              period={job.period}
              description={job.description}
              links={job.links}
              linksLabel={`${job.role} at ${job.org}`}
              tags={job.skills}
              tagsLabel={`Skills used at ${job.org}`}
            />
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function Projects({ projects }: { projects: Project[] }) {
  return (
    <Section id="projects" title="Projects">
      <ul className="space-y-12">
        {projects.map((project) => (
          <li key={project.id}>
            <Entry
              heading={
                <>
                  {project.title}
                  {project.role && (
                    <span className="font-normal text-muted"> · {project.role}</span>
                  )}
                </>
              }
              period={project.period}
              award={project.award}
              description={project.description}
              links={project.links}
              linksLabel={project.title}
              tags={project.stack}
              tagsLabel={`${project.title} tech stack`}
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** One experience or project: optional logo, heading + dates, award, description, links, tags. */
function Entry({
  logo,
  heading,
  period,
  award,
  description,
  links,
  linksLabel,
  tags,
  tagsLabel,
}: {
  logo?: Logo
  heading: ReactNode
  period: Period
  award?: string
  description: string
  links: Links
  linksLabel: string
  tags: string[]
  tagsLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      {logo && (
        // Each logo sits on the tile color it was designed for (white parts need a dark tile).
        <div
          className={`flex h-14 w-36 shrink-0 items-center justify-center rounded-xl border border-line p-2.5 ${
            logo.background === 'dark' ? 'bg-[#0e0e10]' : 'bg-white'
          }`}
        >
          <img
            src={logo.src}
            alt={logo.alt}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <h3 className="text-lg font-semibold tracking-tight">{heading}</h3>
          <p className="shrink-0 font-mono text-xs text-muted">{formatPeriod(period)}</p>
        </div>
        <p className="mt-2 leading-relaxed text-muted">{description}</p>
        <LinkList links={links} label={linksLabel} className="mt-3" />
        <div className="mt-4">
          <Chips items={tags} label={tagsLabel} award={award} />
        </div>
      </div>
    </div>
  )
}
