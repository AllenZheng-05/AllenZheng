import { describe, expect, it } from 'vitest'
import { portfolio } from '.'

describe('portfolio data', () => {
  it('never includes a phone number', () => {
    const phoneLike = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}/
    expect(JSON.stringify(portfolio)).not.toMatch(phoneLike)
  })

  it.each([
    ['experience', portfolio.experience],
    ['projects', portfolio.projects],
  ])('has unique ids in %s', (_name, items) => {
    const ids = items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has periods that end on or after they start', () => {
    const periods = [...portfolio.experience, ...portfolio.projects].map((item) => item.period)
    for (const { start, end } of periods) {
      if (end && end !== 'present') expect(end >= start, `${start} → ${end}`).toBe(true)
    }
  })

  it('uses https links', () => {
    const { profile } = portfolio
    const links = [
      profile.github,
      profile.linkedin,
      ...portfolio.experience.flatMap((job) => (job.orgUrl ? [job.orgUrl] : [])),
      ...[...portfolio.experience, ...portfolio.projects].flatMap((item) =>
        Object.values(item.links),
      ),
    ]
    for (const link of links) expect(link).toMatch(/^https:\/\//)
  })
})
