import {
  ArrowUpRightIcon,
  DevpostIcon,
  DownloadIcon,
  GitHubIcon,
  GlobeIcon,
  LinkedInIcon,
  MailIcon,
  TrophyIcon,
  WebringIcon,
  YouTubeIcon,
} from '../../components/icons'
import type { Experience, Links, Project } from '../../data'
import { formatPeriod } from '../../lib/dates'
import { ThemeMenu } from '../../shell/ThemeMenu'
import type { ThemeProps } from '../../shell/themes'
import SpriteCanvas from './SpriteCanvas'
import './sprite.css'

const LINK_META: Record<keyof Links, { label: string; Icon: typeof GlobeIcon }> = {
  live: { label: 'Live site', Icon: GlobeIcon },
  source: { label: 'Source code', Icon: GitHubIcon },
  demo: { label: 'Demo', Icon: DevpostIcon },
  video: { label: 'Video', Icon: YouTubeIcon },
  post: { label: 'Write-up', Icon: ArrowUpRightIcon },
}
const LINK_ORDER: (keyof Links)[] = ['live', 'source', 'demo', 'video', 'post']

const INTERESTS = [
  { label: 'Pokémon', note: 'Team-sheet tinkerer', tone: 'orange' },
  { label: 'Piano', note: 'Keys between commits', tone: 'blue' },
  { label: 'Chess', note: 'Knight-first thinker', tone: 'dark' },
  { label: 'Climbing', note: 'Problem-solving, vertical edition', tone: 'orange' },
  { label: 'Running', note: 'Mileage for ideas', tone: 'blue' },
] as const

export default function SpriteTheme({ data }: ThemeProps) {
  const { profile } = data
  return (
    <div className="sd">
      <a href="#main" className="sd-skip">Skip to content</a>

      <header className="sd-header">
        <div className="sd-shell sd-header-inner">
          <a href="#top" className="sd-brand">
            <span className="sd-brand-name">{profile.name}</span>
            <span className="sd-brand-sub">{profile.headline}</span>
          </a>
          <nav aria-label="Primary" className="sd-nav">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="sd-header-actions">
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-warm">
              <DownloadIcon className="sd-icon" aria-hidden="true" /> Resume
            </a>
            <ThemeMenu label="Theme" className="sd-btn sd-btn-ghost" />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="sd-hero" id="top" aria-labelledby="sd-name">
          <SpriteCanvas />
          {/* Static CSS fallback sprites, shown only if WebGL is unavailable */}
          <div className="sd-fallback" aria-hidden="true">
            <span className="sd-fallback-ball" /><span className="sd-fallback-knight" /><span className="sd-fallback-hold" />
          </div>
          <div className="sd-shell sd-hero-inner">
            <div className="sd-hero-copy">
              <span className="sd-tape sd-tape-a" aria-hidden="true" />
              <p className="sd-eyebrow">{profile.headline} · {profile.location}</p>
              <h1 id="sd-name" className="sd-name">{profile.name}</h1>
              <p className="sd-tagline">{profile.tagline}</p>
              <svg className="sd-squiggle" viewBox="0 0 220 14" aria-hidden="true"><path d="M3 9 C 40 2, 70 13, 108 7 S 180 3, 217 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
              <p className="sd-lede">{profile.bio[0]}</p>
              <div className="sd-cta">
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-primary">
                  <DownloadIcon className="sd-icon" aria-hidden="true" /> View resume
                </a>
                <a href={`mailto:${profile.email}`} className="sd-btn sd-btn-secondary">
                  <MailIcon className="sd-icon" aria-hidden="true" /> Email me
                </a>
                <a href="#projects" className="sd-btn sd-btn-secondary">See projects</a>
              </div>
              <ul className="sd-social" aria-label="Profiles">
                <li><a href={profile.github} target="_blank" rel="noreferrer" className="sd-chip"><GitHubIcon className="sd-icon" aria-hidden="true" />GitHub</a></li>
                <li><a href={profile.linkedin} target="_blank" rel="noreferrer" className="sd-chip"><LinkedInIcon className="sd-icon" aria-hidden="true" />LinkedIn</a></li>
                <li><a href={`mailto:${profile.email}`} className="sd-chip"><MailIcon className="sd-icon" aria-hidden="true" />{profile.email}</a></li>
              </ul>
            </div>
            <figure className="sd-photo-card">
              <span className="sd-tape sd-tape-b" aria-hidden="true" />
              <img src={profile.photo.src} alt={profile.photo.alt} style={{ objectPosition: profile.photo.focus }} className="sd-photo" />
              {profile.photo.caption && <figcaption className="sd-caption">{profile.photo.caption}</figcaption>}
            </figure>
          </div>
          <div className="sd-shell">
            <ul className="sd-interests" aria-label="Interests">
              {INTERESTS.map((interest) => (
                <li key={interest.label} className={`sd-interest sd-interest-${interest.tone}`}>
                  <span className="sd-interest-label">{interest.label}</span>
                  <span className="sd-interest-note">{interest.note}</span>
                </li>
              ))}
            </ul>
            <dl className="sd-facts">
              {profile.facts.map((fact) => (
                <div key={fact.label} className="sd-fact"><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <div className="sd-shell">
          <section className="sd-section" id="about" aria-labelledby="sd-about-h">
            <SectionHeading id="sd-about-h" sticker="Hello">About</SectionHeading>
            <div className="sd-card sd-prose">
              {profile.bio.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>

          <section className="sd-section" id="experience" aria-labelledby="sd-exp-h">
            <SectionHeading id="sd-exp-h" sticker="Shipped">Experience</SectionHeading>
            <p className="sd-section-sub">Where I&apos;ve worked and what I shipped — recruiter version, no boss level required.</p>
            <ol className="sd-list">
              {data.experience.map((job, i) => <li key={job.id} className={i % 2 ? 'sd-tilt-r' : ''}><JobCard job={job} /></li>)}
            </ol>
          </section>

          <section className="sd-section" id="projects" aria-labelledby="sd-proj-h">
            <SectionHeading id="sd-proj-h" sticker="Playable">Projects</SectionHeading>
            <p className="sd-section-sub">Selected work, newest first. Hackathon wins wear their sticker up front.</p>
            <ol className="sd-grid">
              {data.projects.map((project, i) => <li key={project.id} className={i % 2 ? 'sd-tilt-r' : 'sd-tilt-l'}><ProjectCard project={project} /></li>)}
            </ol>
          </section>
        </div>
      </main>

      <footer className="sd-footer" id="contact">
        <div className="sd-shell sd-footer-inner">
          <div>
            <h2 className="sd-h sd-h-small">Let&apos;s talk</h2>
            <p className="sd-footer-text">I&apos;m open to internships, hackathons, and collaborations.</p>
            <div className="sd-cta">
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-warm">
                <DownloadIcon className="sd-icon" aria-hidden="true" /> View resume
              </a>
              <a href={`mailto:${profile.email}`} className="sd-btn sd-btn-secondary"><MailIcon className="sd-icon" aria-hidden="true" />{profile.email}</a>
            </div>
          </div>
          <div className="sd-footer-meta">
            <p>© {new Date().getFullYear()} {profile.name} · {profile.location}</p>
            <p className="sd-webring">
              <a href="https://ecs.utdring.com/#allenzheng.com?nav=prev">Previous</a>
              <a href="https://ecs.utdring.com/#allenzheng.com" title="UTD CS Webring" className="sd-webring-badge"><WebringIcon className="sd-icon" aria-hidden="true" />UTD CS Webring</a>
              <a href="https://ecs.utdring.com/#allenzheng.com?nav=next">Next</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ id, children, sticker }: { id: string; children: string; sticker: string }) {
  return (
    <div className="sd-heading-row">
      <h2 id={id} className="sd-h">{children}</h2>
      <span className="sd-sticker" aria-hidden="true">{sticker}</span>
    </div>
  )
}

function JobCard({ job }: { job: Experience }) {
  return (
    <article className="sd-card">
      <div className="sd-card-top">
        {job.logo && <img src={job.logo.src} alt={job.logo.alt} className={job.logo.background === 'dark' ? 'sd-logo sd-logo-dark' : 'sd-logo'} />}
        <div>
          <h3 className="sd-card-title">{job.role} · {job.orgUrl ? <a href={job.orgUrl} target="_blank" rel="noreferrer">{job.org}</a> : job.org}</h3>
          <p className="sd-date">{formatPeriod(job.period)}</p>
        </div>
      </div>
      <p className="sd-desc">{job.description}</p>
      <ul className="sd-tags" aria-label="Skills">{job.skills.map((s) => <li key={s}>{s}</li>)}</ul>
      <ProjectLinks links={job.links} />
    </article>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="sd-card sd-card-full">
      {project.award && <p className="sd-award"><TrophyIcon className="sd-icon" aria-hidden="true" />{project.award}</p>}
      <h3 className="sd-card-title">{project.title}</h3>
      {project.role && <p className="sd-role">{project.role}</p>}
      <p className="sd-date">{formatPeriod(project.period)}</p>
      <p className="sd-desc">{project.description}</p>
      <ul className="sd-tags" aria-label="Tech stack">{project.stack.map((t) => <li key={t}>{t}</li>)}</ul>
      <ProjectLinks links={project.links} />
    </article>
  )
}

function ProjectLinks({ links }: { links: Links }) {
  const entries = LINK_ORDER.flatMap((kind) => {
    const href = links[kind]
    return href ? [{ kind, href }] : []
  })
  if (!entries.length) return null
  return (
    <ul className="sd-links" aria-label="Project links">
      {entries.map(({ kind, href }) => {
        const { label, Icon } = LINK_META[kind]
        return <li key={kind}><a href={href} target="_blank" rel="noreferrer" className="sd-text-link"><Icon className="sd-icon" aria-hidden="true" />{label}</a></li>
      })}
    </ul>
  )
}
