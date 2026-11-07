import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Description, Media } from '../../data'
import { DescriptionText, MediaGallery } from './ui'

const description: Description = {
  sentence: 'One sentence.',
  paragraph: 'A longer paragraph.',
  bullets: ['First point', 'Second point'],
}

describe('DescriptionText', () => {
  it.each(['sentence', 'paragraph'] as const)('shows only the %s', (format) => {
    const { container } = render(<DescriptionText description={description} format={format} />)
    expect(container.textContent).toBe(description[format])
  })

  it('shows bullets as a list', () => {
    render(<DescriptionText description={description} format="bullets" />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      description.bullets,
    )
  })
})

describe('MediaGallery', () => {
  it('renders each kind of media', () => {
    const media: Media[] = [
      { kind: 'image', src: '/shot.gif', alt: 'A screenshot', caption: 'The caption' },
      { kind: 'video', src: '/clip.mp4', alt: 'A clip', poster: '/poster.png' },
      { kind: 'embed', src: 'https://example.com/embed/1', alt: 'A player' },
    ]
    render(<MediaGallery media={media} label="Project" />)

    expect(screen.getByAltText('A screenshot')).toHaveAttribute('src', '/shot.gif')
    expect(screen.getByText('The caption')).toBeInTheDocument()
    expect(screen.getByLabelText('A clip')).toHaveAttribute('poster', '/poster.png')
    expect(screen.getByTitle('A player')).toHaveAttribute('src', 'https://example.com/embed/1')
  })

  it('renders nothing without media', () => {
    const { container } = render(<MediaGallery label="Project" />)
    expect(container).toBeEmptyDOMElement()
  })
})
