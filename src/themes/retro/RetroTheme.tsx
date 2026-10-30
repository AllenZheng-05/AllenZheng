// The "before" for the Fitts demo: my homepage as I'd have built in 2007. Kept as an
// alternate theme so the original design stays selectable.
import { GitHubIcon, LinkedInIcon, MailIcon, WebringIcon } from '../../components/icons'
import type { Experience, Links, Project } from '../../data'
import { formatPeriod } from '../../lib/dates'
import { ThemeMenu } from '../../shell/ThemeMenu'
import type { ThemeProps } from '../../shell/themes'
import './retro.css'

const LINK_NAMES: Record<keyof Links, string> = {
  live: 'site',
  source: 'code',
  demo: 'devpost',
  video: 'vid',
  post: 'post',
}

export default function RetroTheme({ data }: ThemeProps) {
  const { profile } = data

  return (
    <div className="y2k">
      <div className="y2k-page">
        <div className="y2k-banner">
          <span className="y2k-blink">NEW!!</span>
          <div className="y2k-marquee">
            <span>
              ~*~ Welcome to {profile.name}&apos;s Homepage ~*~ Thanks 4 visiting!! ~*~ Sign my
              guestbook!!! ~*~
            </span>
          </div>
        </div>

        <div className="y2k-nav">
          <a href="#top">Home</a> | <a href="#about">About Me</a> | <a href="#jobz">Jobz</a> |{' '}
          <a href="#werk">My Werk</a> | <a href="#contact">Contact</a> |{' '}
          <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
            Resume
          </a>{' '}
          | <ThemeMenu label="skinz" className="y2k-skin" />
        </div>

        <table className="y2k-layout" id="top">
          <tbody>
            <tr>
              <td className="y2k-side">
                <img
                  src={profile.photo.src}
                  alt={profile.photo.alt}
                  className="y2k-photo"
                  style={{ objectPosition: profile.photo.focus }}
                />
                <p className="y2k-mood">
                  Mood: <b>coding</b> :-)
                </p>
                <p className="y2k-hello">Welcome to my page, {'{{visitor_name}}'}!</p>
                <div className="y2k-box">
                  <h3>Stuff about me</h3>
                  {profile.facts.map((fact) => (
                    <p key={fact.label}>
                      <u>{fact.label}</u>: {fact.value}
                    </p>
                  ))}
                  <p>
                    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                      CV
                    </a>
                  </p>
                </div>
                <div className="y2k-icons">
                  <a href={`mailto:${profile.email}`}>
                    <MailIcon className="y2k-icon" />
                  </a>
                  <a href={profile.github} target="_blank" rel="noreferrer">
                    <GitHubIcon className="y2k-icon" />
                  </a>
                  <a href={profile.linkedin} target="_blank" rel="noreferrer">
                    <LinkedInIcon className="y2k-icon" />
                  </a>
                </div>
                <button type="button" className="y2k-guestbook">
                  Sign my guestbook!
                </button>
                <p className="y2k-counter">
                  You are visitor #<span>000427</span>
                </p>
              </td>

              <td className="y2k-main">
                <h1 className="y2k-name">{profile.name}</h1>
                <h2 className="y2k-tagline">{profile.tagline}</h2>
                <p className="y2k-sub">
                  {profile.headline} -- {profile.location}
                </p>

                <div className="y2k-section" id="about">
                  <h2 className="y2k-h">About Me</h2>
                  {profile.bio.map((paragraph) => (
                    <p key={paragraph} className="y2k-bio">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="y2k-section" id="jobz">
                  <h2 className="y2k-h">Jobz</h2>
                  {data.experience.map((job) => (
                    <Job key={job.id} job={job} />
                  ))}
                </div>

                <div className="y2k-section" id="werk">
                  <h2 className="y2k-h">My Werk</h2>
                  <table className="y2k-projects">
                    <tbody>
                      {data.projects.map((project) => (
                        <ProjectRow key={project.id} project={project} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="y2k-footer" id="contact">
          <p className="y2k-contact">
            email me @ <a href={`mailto:${profile.email}`}>{profile.email}</a> or{' '}
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              Download my stuff
            </a>
          </p>
          <p className="y2k-small">
            best viewed in 1024x768 · (c) {new Date().getFullYear()} {profile.name} · made with
            notepad
          </p>
          <p className="y2k-ring">
            <a href="https://ecs.utdring.com/#allenzheng.com?nav=prev">&lt;&lt;</a>
            <a href="https://ecs.utdring.com/#allenzheng.com" title="UTD CS Webring">
              <WebringIcon className="y2k-ring-icon" />
            </a>
            <a href="https://ecs.utdring.com/#allenzheng.com?nav=next">&gt;&gt;</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function LinkRow({ links }: { links: Links }) {
  const entries = (Object.keys(LINK_NAMES) as (keyof Links)[]).flatMap((kind) => {
    const href = links[kind]
    return href ? [{ kind, href }] : []
  })
  if (entries.length === 0) return null
  return (
    <span className="y2k-links">
      {entries.map(({ kind, href }) => (
        <a key={kind} href={href} target="_blank" rel="noreferrer">
          [{LINK_NAMES[kind]}]
        </a>
      ))}
    </span>
  )
}

function Job({ job }: { job: Experience }) {
  return (
    <div className="y2k-job">
      {job.logo && (
        <img
          src={job.logo.src}
          alt={job.logo.alt}
          className={job.logo.background === 'dark' ? 'y2k-logo y2k-logo-dark' : 'y2k-logo'}
        />
      )}
      <p className="y2k-role">
        <b>{job.role}</b> @{' '}
        {job.orgUrl ? (
          <a href={job.orgUrl} target="_blank" rel="noreferrer">
            {job.org}
          </a>
        ) : (
          job.org
        )}{' '}
        <i>({formatPeriod(job.period)})</i>
      </p>
      <p className="y2k-desc">{job.description}</p>
      <p className="y2k-tags">skillz: {job.skills.join(', ')}</p>
      <LinkRow links={job.links} />
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <tr>
      <td className="y2k-ptitle">
        {project.title}
        {project.role && <div className="y2k-prole">{project.role}</div>}
        <div className="y2k-pdate">{formatPeriod(project.period)}</div>
      </td>
      <td className="y2k-pdesc">
        {project.award && <span className="y2k-award">*~{project.award}~*</span>}
        <p>{project.description}</p>
        <p className="y2k-tags">built w/ {project.stack.join(', ')}</p>
        <LinkRow links={project.links} />
      </td>
    </tr>
  )
}
