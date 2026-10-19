import { describe, expect, it } from 'vitest'
import { formatPeriod, formatYearMonth } from './dates'

describe('formatYearMonth', () => {
  it('formats a year-month as a short month and year', () => {
    expect(formatYearMonth('2026-01')).toBe('Jan 2026')
    expect(formatYearMonth('2028-12')).toBe('Dec 2028')
  })
})

describe('formatPeriod', () => {
  it('shows a single month when there is no end', () => {
    expect(formatPeriod({ start: '2026-03' })).toBe('Mar 2026')
  })

  it('collapses a period that starts and ends in the same month', () => {
    expect(formatPeriod({ start: '2026-03', end: '2026-03' })).toBe('Mar 2026')
  })

  it('formats ranges and ongoing periods', () => {
    expect(formatPeriod({ start: '2026-01', end: '2026-08' })).toBe('Jan 2026 – Aug 2026')
    expect(formatPeriod({ start: '2025-12', end: 'present' })).toBe('Dec 2025 – Present')
  })
})
