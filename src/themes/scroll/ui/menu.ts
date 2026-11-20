import { MENU_GROUPS, MOTION_LABEL } from '../content'
import type { ScrollModel, SectionId } from '../model'
import type { SlipGroup } from './slip-items'
import { SECTIONS } from './useSection'

/** What choosing a menu item does (links have no action: they navigate). */
export type MenuAction =
  | { kind: 'section'; id: SectionId }
  | { kind: 'project'; id: string }
  | { kind: 'stop'; id: string }
  | { kind: 'motion' }

/** The slip's groups from the model, and each item's action by item id. Port of the design mock-up's `menuGroups`. */
export function buildMenu(
  model: ScrollModel,
  section: SectionId,
  stilled: boolean,
): { groups: SlipGroup[]; actions: Map<string, MenuAction> } {
  const actions = new Map<string, MenuAction>()
  const add = (itemId: string, action: MenuAction): string => {
    actions.set(itemId, action)
    return itemId
  }
  // a section with nothing in it is not on the page: no hall, village or road to go to
  const present: Partial<Record<SectionId, boolean>> = {
    experience: model.bays.length > 0,
    projects: model.houses.length > 0,
    hackathons: model.stops.length > 0,
  }
  const sections = SECTIONS.filter((s) => present[s.id] !== false)

  const groups: SlipGroup[] = [
    {
      title: MENU_GROUPS.sections,
      items: sections.map((s) => ({
        id: add(`section:${s.id}`, { kind: 'section', id: s.id }),
        label: s.label,
        current: s.id === section,
      })),
    },
    {
      title: MENU_GROUPS.projects,
      items: model.houses.map((h) => ({
        id: add(`project:${h.id}`, { kind: 'project', id: h.id }),
        label: h.title,
      })),
    },
    {
      title: MENU_GROUPS.hackathons,
      items: model.stops.map((s) => ({
        id: add(`stop:${s.id}`, { kind: 'stop', id: s.id }),
        label: s.title,
      })),
    },
    {
      title: MENU_GROUPS.links,
      items: model.profileLinks.map((l) => ({
        id: `link:${l.id}`,
        label: l.label,
        href: l.href,
        newTab: l.newTab,
      })),
    },
    {
      title: MENU_GROUPS.motion,
      items: [
        {
          id: add('motion', { kind: 'motion' }),
          label: stilled ? MOTION_LABEL.move : MOTION_LABEL.still,
        },
      ],
    },
  ]
  return { groups, actions }
}
