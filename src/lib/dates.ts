import type { Period, YearMonth } from '../data/schema'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-01" → "Jan 2026" */
export function formatYearMonth(value: YearMonth): string {
  const [year, month] = value.split('-')
  return `${MONTHS[Number(month) - 1]} ${year}`
}

/** { start: "2026-01", end: "present" } → "Jan 2026 – Present" */
export function formatPeriod({ start, end }: Period): string {
  if (!end || end === start) return formatYearMonth(start)
  return `${formatYearMonth(start)} – ${end === 'present' ? 'Present' : formatYearMonth(end)}`
}
