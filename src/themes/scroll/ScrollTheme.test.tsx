import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { portfolio, type Portfolio } from '../../data'
import { ThemeProvider } from '../../shell/ThemeProvider'
import ScrollTheme from './ScrollTheme'
import { buildModel } from './model'

function renderTheme(data: Portfolio = portfolio) {
  return render(
    <ThemeProvider>
      <ScrollTheme data={data} />
    </ThemeProvider>,
  )
}

const model = buildModel(portfolio)
const houses = model.houses
const first = houses[0]
const second = houses[1]
if (!first || !second) throw new Error('The test needs at least two personal projects')

function houseButton(title: string) {
  // an open house's capture button can carry the title in its alt text, so pick the house's own button
  const button = screen
    .getAllByRole('button', { name: (name) => name.includes(title) })
    .find((candidate) => candidate.classList.contains('hd'))
  if (!button) throw new Error(`No house button for ${title}`)
  return button
}

describe('scroll theme', () => {
  it('renders the four bands with their canvases', () => {
    const { container } = renderTheme()
    const bands = [...container.querySelectorAll('.band')].map((el) => el.getAttribute('data-band'))
    expect(bands).toEqual(['top', 'works', 'road', 'end'])
    for (const band of container.querySelectorAll('.band')) {
      expect(band.querySelectorAll(':scope > canvas.paint')).toHaveLength(2)
    }
    expect(container.querySelector('.scroll-theme')).toHaveAttribute('data-mode', 'zh')
  })

  it('starts with every house closed', () => {
    renderTheme()
    for (const house of houses) {
      expect(houseButton(house.title)).toHaveAttribute('aria-expanded', 'false')
    }
  })

  it('opens a house, closes it again, and closes the other when a second opens', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(houseButton(first.title))
    expect(houseButton(first.title)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(first.sentence)).toBeInTheDocument()
    for (const link of first.links) {
      expect(
        screen.getByRole('link', { name: `${link.label} for ${first.title}` }),
      ).toHaveAttribute('href', link.href)
    }

    await user.click(houseButton(second.title))
    expect(houseButton(first.title)).toHaveAttribute('aria-expanded', 'false')
    expect(houseButton(second.title)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByText(first.sentence)).not.toBeInTheDocument()

    await user.click(houseButton(second.title))
    expect(houseButton(second.title)).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the order of the houses when one opens', async () => {
    const user = userEvent.setup()
    const { container } = renderTheme()
    const order = () =>
      [...container.querySelectorAll('.house')].map((el) => el.getAttribute('data-id'))
    const before = order()
    expect(before).toEqual(houses.map((house) => house.id))
    await user.click(houseButton(second.title))
    expect(order()).toEqual(before)
  })

  it('renders a project the motif map does not know', async () => {
    const user = userEvent.setup()
    const source = portfolio.projects.find((project) => project.category === 'personal')
    if (!source) throw new Error('no personal project')
    const data: Portfolio = {
      ...portfolio,
      projects: [{ ...source, id: 'a-project-nobody-mapped', title: 'Unmapped Thing', media: [] }],
    }
    const { container } = renderTheme(data)
    await user.click(houseButton('Unmapped Thing'))
    expect(container.querySelector('canvas.motif')).toHaveAttribute('data-m', 'lamp')
    expect(screen.getByRole('img', { name: 'No capture yet' })).toBeInTheDocument()
  })

  it('shows a capture window, or a blank one without a capture', async () => {
    const user = userEvent.setup()
    const source = portfolio.projects.find((project) => project.category === 'personal')
    if (!source) throw new Error('no personal project')
    const data: Portfolio = {
      ...portfolio,
      projects: [
        {
          ...source,
          id: 'with-capture',
          title: 'With Capture',
          media: [{ kind: 'image', src: 'x.jpg', alt: 'A test capture' }],
        },
        { ...source, id: 'without-capture', title: 'Without Capture', media: undefined },
      ],
    }
    const { container } = renderTheme(data)

    await user.click(houseButton('With Capture'))
    const capture = screen.getByRole('img', { name: 'A test capture' })
    expect(capture.closest('.win')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A test capture' })).not.toBeInTheDocument()

    await user.click(houseButton('Without Capture'))
    expect(screen.getByRole('img', { name: 'No capture yet' })).toBeInTheDocument()
    expect(container.querySelector('canvas.motif.big')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Capture needed')
  })

  it('renders a bare hackathon without event, result or links', async () => {
    const user = userEvent.setup()
    const source = portfolio.projects.find((project) => project.category === 'hackathon')
    if (!source) throw new Error('no hackathon')
    const data: Portfolio = {
      ...portfolio,
      projects: [
        {
          ...source,
          id: 'bare-hack',
          title: 'Bare Hack',
          links: {},
          award: undefined,
          event: undefined,
        },
      ],
    }
    const { container } = renderTheme(data)
    const stop = container.querySelector('ol.road > li.stop')
    expect(stop).toBeInTheDocument()
    expect(stop?.querySelector('.ev')).toBeNull()
    expect(stop?.querySelector('.res')).toBeNull()

    await user.click(screen.getByRole('button', { name: (name) => name.includes('Bare Hack') }))
    const note = screen.getByRole('dialog', { name: 'Bare Hack' })
    expect(within(note).getByText(source.description.sentence)).toBeInTheDocument()
    expect(note.querySelector('a.stamp')).toBeNull()

    await user.click(within(note).getByRole('button', { name: 'Roll up Bare Hack' }))
    expect(screen.queryByRole('dialog', { name: 'Bare Hack' })).not.toBeInTheDocument()
  })

  /** The labels of the slip's Sections group (the slip is in the page, hidden, while closed). */
  const sectionItems = (container: HTMLElement) => {
    const items = [...container.querySelectorAll('.slip li')]
    const start = items.findIndex((li) => li.textContent === 'Sections')
    const out: string[] = []
    for (const li of items.slice(start + 1)) {
      if (li.classList.contains('g')) break
      out.push(li.textContent ?? '')
    }
    return out
  }

  it('renders with no hackathons: no road band, heading or menu entry', () => {
    const personal = portfolio.projects.filter((project) => project.category === 'personal')
    const { container } = renderTheme({ ...portfolio, projects: personal })
    expect(container.querySelector('.scroll-theme')).toBeInTheDocument()
    expect(container.querySelector('[data-band="road"]')).toBeNull()
    expect(container.querySelector('ol.road')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Hackathons' })).not.toBeInTheDocument()
    expect(container.querySelector('[data-band="works"]')).toBeInTheDocument()
    expect(sectionItems(container)).toEqual(['Top', 'Experience', 'Projects', 'Contact'])
  })

  it('renders with no experience and no projects: no hall, no village', () => {
    const { container } = renderTheme({ ...portfolio, experience: [], projects: [] })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(portfolio.profile.name)
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hackathons' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Experience' })).not.toBeInTheDocument()
    const bands = [...container.querySelectorAll('.band')].map((el) => el.getAttribute('data-band'))
    expect(bands).toEqual(['top', 'end'])
    expect(container.querySelector('.village')).toBeNull()
    expect(sectionItems(container)).toEqual(['Top', 'Contact'])
  })

  it('leaves out an empty list of skills or of a project’s stack', async () => {
    const user = userEvent.setup()
    const source = portfolio.projects.find((project) => project.category === 'personal')
    const role = portfolio.experience[0]
    if (!source || !role) throw new Error('no personal project or role')
    const { container } = renderTheme({
      ...portfolio,
      experience: [{ ...role, skills: [] }],
      projects: [{ ...source, id: 'no-stack', title: 'No Stack', stack: [] }],
    })
    expect(container.querySelector('.bay .keys')).toBeNull()
    await user.click(houseButton('No Stack'))
    expect(container.querySelector('.house.open .dt')).toBeInTheDocument()
    expect(container.querySelector('.house .keys')).toBeNull()
  })
})
