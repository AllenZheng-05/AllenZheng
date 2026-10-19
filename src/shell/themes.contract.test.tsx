import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { portfolio } from '../data'
import { pathForTheme } from './theme-route'
import { ThemeProvider } from './ThemeProvider'
import { availableThemes } from './themes'

// The theme contract: every theme must show all of the portfolio's information and the
// essential links, and must offer a way to switch themes. Adding a project, job, or theme
// without wiring it up everywhere fails this test.
describe.each(availableThemes.map((theme) => [theme.name, theme] as const))(
  'theme contract: %s',
  (_name, theme) => {
    async function renderTheme() {
      window.history.replaceState(null, '', pathForTheme(theme.id))
      render(
        <ThemeProvider>
          <theme.Component data={portfolio} />
        </ThemeProvider>,
      )
      // Wait for the lazy-loaded theme chunk.
      await screen.findAllByText(portfolio.profile.name, { exact: false })
      return document.body.textContent ?? ''
    }

    it('shows every piece of portfolio content', async () => {
      const text = await renderTheme()
      const { profile } = portfolio

      const required = [
        profile.tagline,
        ...profile.bio,
        ...profile.facts.map((fact) => fact.value),
        ...portfolio.experience.flatMap((job) => [
          job.role,
          job.org,
          job.description,
          ...job.skills,
        ]),
        ...portfolio.projects.flatMap((project) => [
          project.title,
          project.description,
          ...(project.award ? [project.award] : []),
          ...project.stack,
        ]),
      ]
      const missing = required.filter((value) => !text.includes(value))
      expect(missing).toEqual([])
    })

    it('links to every experience and project link, and shows every logo', async () => {
      await renderTheme()
      const items = [...portfolio.experience, ...portfolio.projects]
      const rendered = new Set(
        Array.from(document.querySelectorAll('a'), (a) => a.getAttribute('href')),
      )
      for (const href of items.flatMap((item) => Object.values(item.links))) {
        expect(rendered.has(href), href).toBe(true)
      }
      for (const job of portfolio.experience) {
        if (job.logo) expect(screen.getByAltText(job.logo.alt)).toHaveAttribute('src', job.logo.src)
      }
    })

    it('links to the resume, email, GitHub, and LinkedIn', async () => {
      await renderTheme()
      const { profile } = portfolio
      for (const href of [
        profile.resumeUrl,
        `mailto:${profile.email}`,
        profile.github,
        profile.linkedin,
      ]) {
        expect(document.querySelector(`a[href="${href}"]`), href).not.toBeNull()
      }
    })

    it('shows the profile photo with alt text', async () => {
      await renderTheme()
      const { photo } = portfolio.profile
      expect(screen.getAllByAltText(photo.alt)[0]).toHaveAttribute('src', photo.src)
    })

    it('opens the resume in a new tab', async () => {
      await renderTheme()
      const resumeLinks = document.querySelectorAll(`a[href="${portfolio.profile.resumeUrl}"]`)
      for (const link of resumeLinks) {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link.getAttribute('rel')).toContain('noopener')
      }
    })

    it('includes a theme switcher', async () => {
      await renderTheme()
      expect(screen.getAllByRole('button', { name: /change theme/i }).length).toBeGreaterThan(0)
    })
  },
)
