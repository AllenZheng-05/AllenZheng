import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MENU_LABEL, MENU_PLACEHOLDER, menuNothing } from '../content'
import { filterSlip, type SlipGroup, type SlipItem } from './slip-items'

interface SlipProps {
  id: string
  open: boolean
  groups: SlipGroup[]
  /** An item (not a link) was chosen; the slip has already been asked to close, and focus is the item's to place. */
  onChoose(item: SlipItem): void
  onClose(returnFocus: boolean): void
}

/** Wide screens type at once; on a phone the slip is a sheet and the keyboard waits for a tap. */
function wideScreen(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width:761px)').matches
}

/* The menu slip: a search box over every section, project, hackathon, link and the motion switch.
 It stays mounted while closed (hidden), so a chosen link is still in the page as it navigates.
 Port of fillSlip, openSlip and the slip's keys from the design mock-up. */
export function Slip({ id, open, groups, onChoose, onClose }: SlipProps) {
  const slipRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')

  // every opening starts with an empty search
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }

  useLayoutEffect(() => {
    if (!open) return
    const target = wideScreen() ? inputRef.current : slipRef.current
    target?.focus({ preventScroll: true })
  }, [open])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    const list = listRef.current
    if (!input || !list) return
    const items: HTMLElement[] = [input, ...list.querySelectorAll<HTMLElement>('button, a')]
    const at =
      document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1
    if (event.key === 'Escape') {
      // the theme's document-level Escape (for focus outside the slip) must not see it too
      event.preventDefault()
      event.stopPropagation()
      onClose(true)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[Math.min(items.length - 1, at + 1)]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[Math.max(0, at - 1)]?.focus()
    } else if (event.key === 'Enter' && document.activeElement === input && items[1]) {
      event.preventDefault()
      items[1].click()
    }
  }

  const shown = filterSlip(groups, query)
  const choose = (item: SlipItem) => {
    // links navigate by themselves; focus goes back to what opened the slip
    if (item.href) return onClose(true)
    onClose(false)
    onChoose(item)
  }

  return (
    <div
      ref={slipRef}
      id={id}
      className="slip"
      role="dialog"
      aria-label={MENU_LABEL}
      tabIndex={-1}
      hidden={!open}
      onKeyDown={onKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        aria-label={MENU_LABEL}
        placeholder={MENU_PLACEHOLDER}
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul ref={listRef}>
        {shown.length === 0 ? (
          <li className="none">{menuNothing(query.trim())}</li>
        ) : (
          shown.map((group) => (
            <Fragment key={group.title}>
              <li className="g">{group.title}</li>
              {group.items.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <a
                      href={item.href}
                      aria-current={item.current ? 'true' : undefined}
                      {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      onClick={() => choose(item)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      aria-current={item.current ? 'true' : undefined}
                      onClick={() => choose(item)}
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </Fragment>
          ))
        )}
      </ul>
    </div>
  )
}
