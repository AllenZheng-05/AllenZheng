export interface SlipItem {
  /** Unique within the menu. */
  id: string
  label: string
  /** The section the visitor is in. */
  current?: boolean
  /** Links render as <a>. */
  href?: string
  newTab?: boolean
}
export interface SlipGroup {
  title: string
  items: SlipItem[]
}

/** Keeps an item when the query (trimmed, case-insensitive) is empty, or is contained in the item's label or in its group's title. Groups left with no items are dropped. */
export function filterSlip(groups: SlipGroup[], query: string): SlipGroup[] {
  const q = query.trim().toLowerCase()
  return groups.flatMap((group) => {
    const items = group.items.filter(
      (item) => !q || item.label.toLowerCase().includes(q) || group.title.toLowerCase().includes(q),
    )
    return items.length ? [{ ...group, items }] : []
  })
}
