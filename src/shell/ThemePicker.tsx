import type { MouseEvent } from 'react'
import { useTheme } from './theme-context'
import { pathForTheme } from './theme-route'
import type { ThemeDefinition } from './themes'

interface ThemePickerProps {
  /** Called after a theme card is followed (e.g. to close a dialog). */
  onSelect?: () => void
}

// Compact row on phones, full preview card from sm: up.
const card =
  'group flex h-full w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left sm:flex-col sm:items-stretch sm:gap-0'

/**
 * Grid of theme cards with previews. Shared by every theme so the switcher always behaves
 * the same; it uses the semantic color tokens (fg, bg, muted, line, accent), so it picks up
 * whichever theme it is rendered in.
 *
 * Available themes are real links to their path, so they can be opened in a new tab or
 * copied; plain clicks switch in place without a page load.
 */
export function ThemePicker({ onSelect }: ThemePickerProps) {
  const { theme: current, themes, setTheme } = useTheme()

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {themes.map((theme) => {
        if (theme.status !== 'available') {
          return (
            <li key={theme.id}>
              <div aria-disabled="true" className={`${card} cursor-not-allowed`}>
                <CardBody theme={theme} badge="Coming soon" />
              </div>
            </li>
          )
        }

        const isCurrent = theme.id === current.id
        const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
          // Let the browser handle new-tab/window clicks.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          setTheme(theme.id)
          onSelect?.()
        }

        return (
          <li key={theme.id}>
            <a
              href={pathForTheme(theme.id)}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={onClick}
              className={`${card} transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-fg/30 hover:shadow-lg hover:shadow-fg/5 aria-[current=page]:border-accent aria-[current=page]:ring-1 aria-[current=page]:ring-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
            >
              <CardBody theme={theme} badge={isCurrent ? 'Current' : undefined} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function CardBody({ theme, badge }: { theme: ThemeDefinition; badge?: 'Current' | 'Coming soon' }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="aspect-16/10 w-28 shrink-0 overflow-hidden rounded-lg border border-line sm:w-auto"
      >
        <theme.Preview />
      </div>
      <div className="min-w-0 flex-1 sm:mt-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1">
          <span className="font-medium">{theme.name}</span>
          {badge === 'Current' && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[0.6875rem] text-accent">
              Current
            </span>
          )}
          {badge === 'Coming soon' && (
            <span className="rounded-full bg-muted/10 px-2 py-0.5 font-mono text-[0.6875rem] text-muted">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-1 px-1 pb-1 text-sm text-muted">{theme.description}</p>
      </div>
    </>
  )
}
