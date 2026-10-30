import '@fontsource-variable/inter'
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
import './default.css'

const LINK_META: Record<keyof Links, { label: string; Icon: typeof GlobeIcon }> = {
  live: { label: 'Live site', Icon: GlobeIcon },
  source: { label: 'Source code', Icon: GitHubIcon },
  demo: { label: 'Demo', Icon: DevpostIcon },
  video: { label: 'Video', Icon: YouTubeIcon },
  post: { label: 'Write-up', Icon: ArrowUpRightIcon },
}

const LINK_ORDER: (keyof Links)[] = ['live', 'source', 'demo', 'video', 'post']

export default function DefaultTheme({ data }: ThemeProps) {
  const { profile } = data

  return (
    <div className="qc">
      <a href="#main" className="qc-skip">
        Skip to content
      </a>

      <header className="qc-header">
        <div className="qc-shell qc-header-inner">
          <a href="#top" className="qc-brand">
            <span className="qc-brand-name">{profile.name}</span>
            <span className="qc-brand-sub">{profile.headline}</span>
          </a>
          <nav aria-label="Primary" className="qc-nav">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="qc-header-actions">
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="qc-btn qc-btn-primary"
            >
              <DownloadIcon className="qc-btn-icon" aria-hidden="true" />
              Resume
            </a>
            <ThemeMenu label="Theme" className="qc-btn qc-btn-ghost" />
          </div>
        </div>
      </header>

      <main id="main" className="qc-shell">
        <section className="qc-hero" id="top" aria-labelledby="qc-name">
          <div className="qc-hero-text">
            <p className="qc-eyebrow">
              {profile.headline} · {profile.location}
            </p>
            <h1 id="qc-name" className="qc-name">
              {profile.name}
            </h1>
            <p className="qc-tagline">{profile.tagline}</p>
            <p className="qc-lede">{profile.bio[0]}</p>
            <div className="qc-cta">
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="qc-btn qc-btn-primary"
              >
                <DownloadIcon className="qc-btn-icon" aria-hidden="true" />
                View resume
              </a>
              <a href={`mailto:${profile.email}`} className="qc-btn qc-btn-secondary">
                <MailIcon className="qc-btn-icon" aria-hidden="true" />
                Email me
              </a>
            </div>
            <ul className="qc-social" aria-label="Profiles">
              <li>
                <a href={profile.github} target="_blank" rel="noreferrer" className="qc-chip-link">
                  <GitHubIcon className="qc-chip-icon" aria-hidden="true" />
                  GitHub
                </a>
              </li>
              <li>
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="qc-chip-link">
                  <LinkedInIcon className="qc-chip-icon" aria-hidden="true" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={`mailto:${profile.email}`} className="qc-chip-link">
                  <MailIcon className="qc-chip-icon" aria-hidden="true" />
                  {profile.email}
                </a>
              </li>
            </ul>
            <dl className="qc-facts">
              {profile.facts.map((fact) => (
                <div key={fact.label} className="qc-fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="qc-photo-card">
            <img
              src={profile.photo.src}
              alt={profile.photo.alt}
              style={{ objectPosition: profile.photo.focus }}
              className="qc-photo"
            />
            {profile.photo.caption && (
              <figcaption className="qc-caption">{profile.photo.caption}</figcaption>
            )}
          </figure>
        </section>

        <section className="qc-section" id="about" aria-labelledby="qc-about-h">
          <h2 id="qc-about-h" className="qc-h">
            About
          </h2>
          <div className="qc-prose">
            {profile.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="qc-section" id="experience" aria-labelledby="qc-exp-h">
          <h2 id="qc-exp-h" className="qc-h">
            Experience
          </h2>
          <p className="qc-section-sub">Where I&apos;ve worked and what I shipped.</p>
          <ol className="qc-list">
            {data.experience.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ol>
        </section>

        <section className="qc-section" id="projects" aria-labelledby="qc-proj-h">
          <h2 id="qc-proj-h" className="qc-h">
            Projects
          </h2>
          <p className="qc-section-sub">Selected work, newest first.</p>
          <ol className="qc-grid">
            {data.projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="qc-footer" id="contact">
        <div className="qc-shell qc-footer-inner">
          <div>
            <h2 className="qc-h qc-h-small">Let&apos;s talk</h2>
            <p className="qc-footer-text">
              I&apos;m open to internships, hackathons, and collaborations.
            </p>
            <div className="qc-cta">
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="qc-btn qc-btn-primary"
              >
                <DownloadIcon className="qc-btn-icon" aria-hidden="true" />
                View resume
              </a>
              <a href={`mailto:${profile.email}`} className="qc-btn qc-btn-secondary">
                <MailIcon className="qc-btn-icon" aria-hidden="true" />
                {profile.email}
              </a>
            </div>
          </div>
          <div className="qc-footer-meta">
            <p>
              © {new Date().getFullYear()} {profile.name} · {profile.location}
            </p>
            <p className="qc-webring">
              <a href="https://ecs.utdring.com/#allenzheng.com?nav=prev">Previous</a>
              <a
                href="https://ecs.utdring.com/#allenzheng.com"
                title="UTD CS Webring"
                className="qc-webring-badge"
              >
                <WebringIcon className="qc-webring-icon" aria-hidden="true" />
                UTD CS Webring
              </a>
              <a href="https://ecs.utdring.com/#allenzheng.com?nav=next">Next</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function JobCard({ job }: { job: Experience }) {
  return (
    <article className="qc-card">
      <div className="qc-card-top">
        {job.logo && (
          <img
            src={job.logo.src}
            alt={job.logo.alt}
            className={job.logo.background === 'dark' ? 'qc-logo qc-logo-dark' : 'qc-logo'}
          />
        )}
        <div>
          <h3 className="qc-card-title">
            {job.role} ·{' '}
            {job.orgUrl ? (
              <a href={job.orgUrl} target="_blank" rel="noreferrer">
                {job.org}
              </a>
            ) : (
              job.org
            )}
          </h3>
          <p className="qc-date">{formatPeriod(job.period)}</p>
        </div>
      </div>
      <p className="qc-desc">{job.description}</p>
      <ul className="qc-tags" aria-label="Skills">
        {job.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <ProjectLinks links={job.links} />
    </article>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="qc-card qc-card-full">
      {project.award && (
        <p className="qc-award">
          <TrophyIcon className="qc-award-icon" aria-hidden="true" />
          {project.award}
        </p>
      )}
      <h3 className="qc-card-title">{project.title}</h3>
      {project.role && <p className="qc-role">{project.role}</p>}
      <p className="qc-date">{formatPeriod(project.period)}</p>
      <p className="qc-desc">{project.description}</p>
      <ul className="qc-tags" aria-label="Tech stack">
        {project.stack.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      <ProjectLinks links={project.links} />
    </article>
  )
}

function ProjectLinks({ links }: { links: Links }) {
  const entries = LINK_ORDER.flatMap((kind) => {
    const href = links[kind]
    return href ? [{ kind, href }] : []
  })
  if (entries.length === 0) return null
  return (
    <ul className="qc-links" aria-label="Project links">
      {entries.map(({ kind, href }) => {
        const { label, Icon } = LINK_META[kind]
        return (
          <li key={kind}>
            <a href={href} target="_blank" rel="noreferrer" className="qc-text-link">
              <Icon className="qc-link-icon" aria-hidden="true" />
              {label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
