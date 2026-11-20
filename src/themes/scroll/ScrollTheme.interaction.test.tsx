import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { portfolio } from '../../data'
import { ThemeProvider } from '../../shell/ThemeProvider'
import { buildModel } from './model'
import ScrollTheme from './ScrollTheme'

/* The tags, the menu slip, the hackathon notes and the art switch. */

function renderTheme() {
  return render(
    <ThemeProvider>
      <ScrollTheme data={portfolio} />
    </ThemeProvider>,
  )
}

const model = buildModel(portfolio)
const [house1, house2] = model.houses
const [stop1, stop2] = model.stops
if (!house1 || !house2 || !stop1 || !stop2) {
  throw new Error('The tests need two personal projects and two hackathons')
}

const menuTag = () => screen.getByRole('button', { name: /^Menu\. You are at / })
const slip = () => screen.getByRole('dialog', { name: 'Jump to' })
const slipInput = () => within(slip()).getByRole('textbox', { name: 'Jump to' })
const root = (container: HTMLElement) => {
  const el = container.querySelector<HTMLElement>('.scroll-theme')
  if (!el) throw new Error('no theme root')
  return el
}
function houseButton(title: string) {
  const button = screen
    .getAllByRole('button', { name: (name) => name.includes(title) })
    .find((el) => el.classList.contains('hd'))
  if (!button) throw new Error(`No house button for ${title}`)
  return button
}
function stopButton(title: string) {
  const button = screen
    .getAllByRole('button', { name: (name) => name.includes(title) })
    .find((el) => el.classList.contains('sb'))
  if (!button) throw new Error(`No stop button for ${title}`)
  return button
}

describe('scroll theme tags', () => {
  it('hangs the menu, art and theme tags', () => {
    const { container } = renderTheme()
    expect(menuTag()).toHaveAccessibleName(/Menu\. You are at Top/)
    expect(menuTag()).toHaveTextContent('Top')
    expect(menuTag()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(menuTag()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Art: Chinese/ })).toBeInTheDocument()
    // the theme tag and the pavilion's link
    expect(screen.getAllByRole('button', { name: 'Change theme' })).toHaveLength(2)
    const tags = container.querySelector('.tag')
    expect(tags).toHaveClass('on')
    // no layout here (jsdom): the scroll is simply open, never rolled up
    expect(root(container)).not.toHaveClass('pre')
    expect(container.querySelector('canvas.gl')).toBeNull()
    // a sibling of the scroll, never inside it
    expect(tags?.closest('.hang')).toBeNull()
    // never rolled up here, so the scroll is never out of reach
    expect(container.querySelector('.hang')).not.toHaveAttribute('inert')
    expect(within(tags as HTMLElement).getByRole('button', { name: 'Change theme' })).toHaveClass(
      'tag-theme',
    )
  })
})

describe('scroll theme menu slip', () => {
  it('opens from the menu tag with every section, project, hackathon, link and the motion switch', async () => {
    const user = userEvent.setup()
    renderTheme()
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    await user.click(menuTag())
    expect(menuTag()).toHaveAttribute('aria-expanded', 'true')
    const s = slip()
    expect([...s.querySelectorAll('li.g')].map((li) => li.textContent)).toEqual([
      'Sections',
      'Projects',
      'Hackathons',
      'Links',
      'Motion',
    ])
    for (const label of ['Top', 'Experience', 'Projects', 'Hackathons', 'Contact']) {
      expect(within(s).getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(within(s).getByRole('button', { name: 'Top' })).toHaveAttribute('aria-current', 'true')
    for (const house of model.houses) {
      expect(within(s).getByRole('button', { name: house.title })).toBeInTheDocument()
    }
    for (const stop of model.stops) {
      expect(within(s).getByRole('button', { name: stop.title })).toBeInTheDocument()
    }
    for (const link of model.profileLinks) {
      expect(within(s).getByRole('link', { name: link.label })).toHaveAttribute('href', link.href)
    }
    const resume = within(s).getByRole('link', { name: 'Resume' })
    expect(resume).toHaveAttribute('target', '_blank')
    expect(resume).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(s).getByRole('button', { name: 'Still the painting' })).toBeInTheDocument()
    expect(slipInput()).toHaveFocus()
    expect(slipInput()).toHaveAttribute('placeholder', 'Jump to...')
  })

  it('filters as you type, and says when nothing matches', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.type(slipInput(), house2.title)
    expect(within(slip()).getByRole('button', { name: house2.title })).toBeInTheDocument()
    expect(within(slip()).queryByRole('button', { name: house1.title })).not.toBeInTheDocument()
    expect(within(slip()).queryByRole('button', { name: 'Top' })).not.toBeInTheDocument()

    await user.clear(slipInput())
    await user.type(slipInput(), 'zzqqxx')
    expect(slip()).toHaveTextContent('Nothing matches "zzqqxx". Try a project or section name.')
  })

  it('moves through the items with the arrow keys', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.keyboard('{ArrowDown}')
    expect(within(slip()).getByRole('button', { name: 'Top' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(slipInput()).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(slipInput()).toHaveFocus()
  })

  it('opens the first match with Enter and closes', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.type(slipInput(), house2.title)
    await user.keyboard('{Enter}')
    expect(houseButton(house2.title)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    expect(menuTag()).toHaveAttribute('aria-expanded', 'false')
  })

  it('leaves an open house open when it is chosen again', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(houseButton(house1.title))
    expect(houseButton(house1.title)).toHaveAttribute('aria-expanded', 'true')
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: house1.title }))
    expect(houseButton(house1.title)).toHaveAttribute('aria-expanded', 'true')
  })

  it('puts focus on the house after choosing a project', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.type(slipInput(), house2.title)
    await user.keyboard('{Enter}')
    expect(houseButton(house2.title)).toHaveFocus()
  })

  it('puts focus on the heading after choosing a section', async () => {
    const user = userEvent.setup()
    renderTheme()
    for (const [label, heading] of [
      ['Contact', 'Write to me.'],
      ['Projects', 'Projects'],
      ['Hackathons', 'Hackathons'],
      ['Experience', 'Experience'],
    ] as const) {
      await user.click(menuTag())
      await user.click(within(slip()).getByRole('button', { name: label }))
      expect(screen.getByRole('heading', { name: heading })).toHaveFocus()
    }
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Top' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('puts focus on the stop after choosing a hackathon', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: stop2.title }))
    expect(stopButton(stop2.title)).toHaveFocus()
    // the note takes focus itself once it opens
    expect(await screen.findByRole('dialog', { name: stop2.title })).toHaveFocus()
  })

  it('gives focus back to the menu tag after choosing the motion item', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Still the painting' }))
    expect(menuTag()).toHaveFocus()
  })

  it('ignores Ctrl+K while a modal dialog is open', async () => {
    const user = userEvent.setup()
    renderTheme()
    const modal = document.createElement('dialog')
    modal.setAttribute('open', '')
    document.body.appendChild(modal)
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    modal.remove()
  })

  it('gives focus to the menu tag when what opened the slip is gone', async () => {
    const user = userEvent.setup()
    renderTheme()
    const lost = document.createElement('button')
    document.body.appendChild(lost)
    lost.focus()
    await user.keyboard('{Control>}k{/Control}')
    lost.remove()
    await user.keyboard('{Escape}')
    expect(menuTag()).toHaveFocus()
  })

  it('points the menu tag at the slip and an open stop at its note', async () => {
    const user = userEvent.setup()
    const { container } = renderTheme()
    expect(menuTag().getAttribute('aria-controls')).toBe(container.querySelector('.slip')?.id)
    const button = stopButton(stop1.title)
    expect(button).not.toHaveAttribute('aria-controls')
    await user.click(button)
    expect(button.getAttribute('aria-controls')).toBe(
      screen.getByRole('dialog', { name: stop1.title }).id,
    )
  })

  it('closes with Escape and gives focus back to the menu tag', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    expect(menuTag()).toHaveFocus()
  })

  it('closes with Escape when focus has gone elsewhere, giving focus back to its opener', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    const heading = screen.getByRole('heading', { level: 1 })
    heading.focus()
    expect(heading).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    expect(menuTag()).toHaveFocus()
  })

  it('leaves a note behind the slip open when Escape closes the slip', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(stopButton(stop1.title))
    expect(screen.getByRole('dialog', { name: stop1.title })).toHaveFocus()
    await user.keyboard('{Control>}k{/Control}')
    expect(slipInput()).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: stop1.title })).toBeInTheDocument()
  })

  it('toggles with Ctrl+K and Cmd+K', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.keyboard('{Control>}k{/Control}')
    expect(slip()).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(slip()).toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
  })

  it('closes on a press outside it', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.click(screen.getByRole('heading', { level: 1 }))
    expect(screen.queryByRole('dialog', { name: 'Jump to' })).not.toBeInTheDocument()
  })

  it('stills the painting, and offers to let it move again', async () => {
    const user = userEvent.setup()
    const { container } = renderTheme()
    expect(root(container)).not.toHaveClass('calm')
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Still the painting' }))
    expect(root(container)).toHaveClass('calm')
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: 'Let the painting move' }))
    expect(root(container)).not.toHaveClass('calm')
  })

  it('starts still for a visitor who asks for reduced motion, who can let it move', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }))
    try {
      const user = userEvent.setup()
      const { container } = renderTheme()
      expect(root(container)).toHaveClass('calm')
      expect(root(container)).not.toHaveClass('pre')
      expect(container.querySelector('.tag')).toHaveClass('on')
      await user.click(menuTag())
      await user.click(within(slip()).getByRole('button', { name: 'Let the painting move' }))
      expect(root(container)).not.toHaveClass('calm')
      await user.click(menuTag())
      expect(within(slip()).getByRole('button', { name: 'Still the painting' })).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('unrolls a chosen hackathon note', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: stop2.title }))
    const note = await screen.findByRole('dialog', { name: stop2.title })
    expect(within(note).getByText(stop2.sentence)).toBeInTheDocument()
    expect(stopButton(stop2.title)).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('scroll theme hackathon notes', () => {
  it('unrolls under its stop with focus, and rolls up returning focus', async () => {
    const user = userEvent.setup()
    const { container } = renderTheme()
    const button = stopButton(stop1.title)
    await user.click(button)
    const note = screen.getByRole('dialog', { name: stop1.title })
    expect(note).toHaveFocus()
    expect(within(note).getByText(stop1.sentence)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button.querySelector('.door')).toHaveTextContent('Close')
    // placed absolutely in the band, outside the road's flow
    expect(note.style.position).toBe('absolute')
    expect(note.parentElement).toBe(container.querySelector('.band[data-band="road"]'))
    expect(note.closest('ol.road')).toBeNull()

    await user.click(within(note).getByRole('button', { name: `Roll up ${stop1.title}` }))
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.querySelector('.door')).toHaveTextContent('Open')
    expect(button).toHaveFocus()
  })

  it('does not unroll a menu-chosen note once the visitor has opened another by hand', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(menuTag())
    await user.click(within(slip()).getByRole('button', { name: stop2.title }))
    await user.click(stopButton(stop1.title))
    await new Promise((resolve) => setTimeout(resolve, 650))
    expect(screen.getByRole('dialog', { name: stop1.title })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: stop2.title })).not.toBeInTheDocument()
  })

  it('rolls up with Escape, returning focus', async () => {
    const user = userEvent.setup()
    renderTheme()
    const button = stopButton(stop1.title)
    await user.click(button)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('rolls up with Escape when focus has gone elsewhere, returning focus to its stop', async () => {
    const user = userEvent.setup()
    renderTheme()
    const button = stopButton(stop1.title)
    await user.click(button)
    expect(screen.getByRole('dialog', { name: stop1.title })).toHaveFocus()
    // focus moves to another stop's button (Tab, or a script): the note stays open
    stopButton(stop2.title).focus()
    expect(screen.getByRole('dialog', { name: stop1.title })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('leaves Escape to an open modal dialog', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(stopButton(stop1.title))
    stopButton(stop2.title).focus()
    const modal = document.createElement('dialog')
    modal.setAttribute('open', '')
    document.body.appendChild(modal)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: stop1.title })).toBeInTheDocument()
    modal.remove()
  })

  it('keeps one note open at a time', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(stopButton(stop1.title))
    await user.click(stopButton(stop2.title))
    expect(screen.getByRole('dialog', { name: stop2.title })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
    expect(stopButton(stop1.title)).toHaveAttribute('aria-expanded', 'false')
    // the open stop's own button rolls it up
    await user.click(stopButton(stop2.title))
    expect(screen.queryByRole('dialog', { name: stop2.title })).not.toBeInTheDocument()
  })

  it('rolls up on a press outside without moving focus to the stop', async () => {
    const user = userEvent.setup()
    renderTheme()
    const button = stopButton(stop1.title)
    await user.click(button)
    await user.click(screen.getByRole('heading', { level: 1 }))
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
    expect(button).not.toHaveFocus()
  })
})

describe('scroll theme art switch', () => {
  it('switches between Chinese and Japanese art', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo')
    const { container } = renderTheme()
    const paper = container.querySelector('main.paper')
    const text = paper?.textContent
    const seals = () =>
      [...container.querySelectorAll('.stop .award')].map((el) => el.getAttribute('data-ch'))
    const zhSeals = seals()

    await user.click(screen.getByRole('button', { name: /Art: Chinese/ }))
    expect(root(container)).toHaveAttribute('data-mode', 'ja')
    const art = screen.getByRole('button', { name: /Art: Japanese/ })
    expect(art).toHaveAccessibleName('Art: Japanese. Switch to Chinese art')
    expect(art).toHaveAttribute('title', 'Japanese art. Click for Chinese')
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(paper?.textContent).toBe(text)
    const changes = model.stops.some((s) => s.medal === 'silver' || s.medal === 'bronze')
    if (changes) expect(seals()).not.toEqual(zhSeals)
    // the filled seal follows the mode
    const fillOf = (ch: string) =>
      art.querySelector(`[data-ch="${ch}"] g[fill]`)?.getAttribute('fill')
    expect(fillOf('日')).not.toBe('none')
    expect(fillOf('中')).toBe('none')

    await user.click(art)
    expect(root(container)).toHaveAttribute('data-mode', 'zh')
    expect(screen.getByRole('button', { name: /Art: Chinese/ })).toBeInTheDocument()
    expect(seals()).toEqual(zhSeals)
  })

  it('rolls up an open note when the art changes', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(stopButton(stop1.title))
    await user.click(screen.getByRole('button', { name: /Art: Chinese/ }))
    expect(screen.queryByRole('dialog', { name: stop1.title })).not.toBeInTheDocument()
  })
})
