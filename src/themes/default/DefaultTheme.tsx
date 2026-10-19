import {
  ArrowUpRightIcon,
  DownloadIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
  WebringIcon,
} from '../../components/icons'
import type { Profile } from '../../data'
import { ThemeMenu } from '../../shell/ThemeMenu'
import type { ThemeProps } from '../../shell/themes'
import './default.css'
import { About, ExperienceSection, Projects } from './sections'
import { ExternalLink } from './ui'

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-fg/30 hover:text-fg'

export default function DefaultTheme({ data }: ThemeProps) {
  const { profile } = data

  return (
    <div className="min-h-dvh bg-bg font-sans text-fg antialiased selection:bg-accent/20">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-fg px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header profile={profile} />
      <main id="main" className="mx-auto max-w-5xl px-4 sm:px-6">
        <Hero profile={profile} />
        <About profile={profile} />
        <ExperienceSection experience={data.experience} />
        <Projects projects={data.projects} />
      </main>
      <Footer profile={profile} />
    </div>
  )
}

function Header({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" className="font-semibold tracking-tight">
          {profile.name}
          <span className="text-accent">.</span>
        </a>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex gap-5 text-sm text-muted">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-fg">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            Resume
          </a>
          <ThemeMenu className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent" />
        </div>
      </div>
    </header>
  )
}

function Hero({ profile }: { profile: Profile }) {
  return (
    <div id="top" className="scroll-mt-16 pt-16 pb-16 sm:pt-28 sm:pb-24">
      <p className="font-mono text-xs tracking-wide text-muted">
        {profile.headline} · {profile.location}
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tighter text-balance sm:text-7xl">
        {profile.name}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted sm:text-xl">
        {profile.tagline}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <a
          href={profile.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-85"
        >
          <DownloadIcon className="size-4" />
          Resume
        </a>
        <a
          href={`mailto:${profile.email}`}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium transition-colors hover:border-fg/30"
        >
          <MailIcon className="size-4" />
          Email me
        </a>
        <ExternalLink href={profile.github} label="GitHub" className={iconButton}>
          <GitHubIcon className="size-4.5" />
        </ExternalLink>
        <ExternalLink href={profile.linkedin} label="LinkedIn" className={iconButton}>
          <LinkedInIcon className="size-4" />
        </ExternalLink>
      </div>
    </div>
  )
}

function Footer({ profile }: { profile: Profile }) {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-5xl px-4 pt-20 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">Contact</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tighter sm:text-6xl">
          Let’s build something<span className="text-accent">.</span>
        </h2>
        <p className="mt-4 max-w-xl text-muted">
          I’m always open to talk about anything interesting.
        </p>
        <a
          href={`mailto:${profile.email}`}
          className="group mt-8 inline-flex items-center gap-2 text-lg font-medium break-all underline decoration-line underline-offset-8 transition-colors hover:decoration-accent sm:text-2xl"
        >
          {profile.email}
          <ArrowUpRightIcon className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </a>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <ExternalLink href={profile.github} className="hover:text-fg">
            GitHub
          </ExternalLink>
          <ExternalLink href={profile.linkedin} className="hover:text-fg">
            LinkedIn
          </ExternalLink>
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg"
          >
            Resume (PDF)
          </a>
        </div>
        <div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {profile.name}.
          </p>
          <ThemeMenu
            label="Try another theme"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
          />
        </div>
        {/* UTD CS Webring widget: https://github.com/ryanpolasky/utdring */}
        <nav
          aria-label="UTD CS Webring"
          className="mt-12 flex items-center justify-center gap-3 text-muted"
        >
          <a
            href="https://ecs.utdring.com/#allenzheng.com?nav=prev"
            aria-label="Previous site in the UTD CS Webring"
            className="rounded-md p-1 transition-colors hover:text-accent"
          >
            ←
          </a>
          <a
            href="https://ecs.utdring.com/#allenzheng.com"
            aria-label="UTD CS Webring"
            title="UTD CS Webring"
            className="rounded-md p-1 transition-colors hover:text-accent"
          >
            <WebringIcon className="h-6 w-auto" />
          </a>
          <a
            href="https://ecs.utdring.com/#allenzheng.com?nav=next"
            aria-label="Next site in the UTD CS Webring"
            className="rounded-md p-1 transition-colors hover:text-accent"
          >
            →
          </a>
        </nav>
      </div>
    </footer>
  )
}
