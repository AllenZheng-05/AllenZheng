import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { portfolio } from '../data'
import { pathForTheme } from './theme-route'
import { ThemeProvider } from './ThemeProvider'
import { availableThemes } from './themes'

// The theme contract: the minimum every theme must show, however it chooses to show it.
//   - some profile text: the name, plus the tagline or at least one bio paragraph
//   - every experience's role and org
//   - every project's title
// Everything else in src/data (descriptions, awards, skills, stacks, links, logos, media, the
// photo) is there for themes to pick from; what a theme does with it is a design decision.
// Adding a job or project without wiring it into every theme fails this test.
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

    it('shows some profile text', async () => {
      const text = await renderTheme()
      const { profile } = portfolio
      expect(text).toContain(profile.name)
      const shown = [profile.tagline, ...profile.bio].filter((value) => text.includes(value))
      expect(shown.length, 'tagline or a bio paragraph').toBeGreaterThan(0)
    })

    it('shows every role and org', async () => {
      const text = await renderTheme()
      const required = portfolio.experience.flatMap((job) => [job.role, job.org])
      const missing = required.filter((value) => !text.includes(value))
      expect(missing).toEqual([])
    })

    it('shows every project title', async () => {
      const text = await renderTheme()
      const missing = portfolio.projects
        .map((project) => project.title)
        .filter((value) => !text.includes(value))
      expect(missing).toEqual([])
    })

    // Not content: these keep a theme usable, and constrain nothing about its design.
    it('opens any resume link in a new tab', async () => {
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
