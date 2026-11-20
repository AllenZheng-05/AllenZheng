/* Text that belongs to this theme alone. Everything else the theme says comes from src/data, which
 every theme shares; anything written only for the scroll goes here. Every string below is drawn in
 the handwriting font, so font-coverage.test.ts checks them against it. */

/** A word about this theme itself, shown after the bio. */
export const ABOUT_THEME =
  'This theme is a hanging scroll painted in characters, inspired by my heritage and my interest in Chinese and Japanese. Everything written on it is in my own handwriting.'

/** The role line under the name. */
export const roleLine = (headline: string, location: string) => `${headline} in ${location}`

/** Month names for dates, January first. */
export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const
/** The end of a period that is still running. */
export const PRESENT = 'present'
/** A period from one month to another. */
export const periodRange = (start: string, end: string) => `${start} to ${end}`

/** The sections' names: in the menu, on the menu tag, and as the headings on the page. */
export const SECTION_LABEL = {
  top: 'Top',
  experience: 'Experience',
  projects: 'Projects',
  hackathons: 'Hackathons',
  contact: 'Contact',
} as const

/** The labels beside the profile link seals. */
export const PROFILE_LINK_LABEL = {
  resume: 'Resume',
  email: 'Email',
  github: 'GitHub',
  linkedin: 'LinkedIn',
} as const

/** The labels beside a project's link seals. */
export const LINK_LABEL = {
  live: 'Live site',
  demo: 'Demo page',
  video: 'Video',
  source: 'Source',
  post: 'Write-up',
} as const

/** The door of a house or a hackathon stop. */
export const DOOR_LABEL = { open: 'Open', close: 'Close' } as const
/** The button that closes a hackathon's note. */
export const ROLL_UP = 'Roll up'

/** The closing pavilion. */
export const CONTACT_HEADING = 'Write to me.'
export const THEME_BUTTON = 'Try another theme'

/** The hanging tags. */
export const TAG_LABEL = { art: 'Style', theme: 'Theme' } as const

/** The titles of the menu's groups, in order. */
export const MENU_GROUPS = {
  sections: 'Sections',
  projects: 'Projects',
  hackathons: 'Hackathons',
  links: 'Links',
  motion: 'Motion',
} as const
/** The motion item: stills a moving painting, or lets a stilled one move. */
export const MOTION_LABEL = { still: 'Motion: ON', move: 'Motion: OFF' } as const
/** The menu's search box, and what it says when nothing is found. */
export const MENU_PLACEHOLDER = 'Jump to...'
export const menuNothing = (query: string) =>
  `Nothing matches "${query}". Try a project or section name.`

/* Text that is never drawn: names read out by screen readers, and tooltips. */

/** The name seal, which reads 鄭亞東. */
export const NAME_SEAL_LABEL = 'Name seal reading Zheng Yadong'
/** The row of profile link seals. */
export const PROFILE_LINKS_LABEL = 'Links'
/** A project's or hackathon's link, named with what it belongs to: "Live site for Toe to Toe". */
export const linkFor = (label: string, title: string) => `${label} for ${title}`
/** The window of a project that has no capture. */
export const NO_CAPTURE = 'No capture yet'
/** The button that closes a hackathon's note, named with the hackathon. */
export const rollUp = (title: string) => `${ROLL_UP} ${title}`

/** The menu tag, which shows the section the visitor is at. */
export const menuTagLabel = (section: string) => `Menu. You are at ${section}`
/** The menu and its search box. */
export const MENU_LABEL = 'Jump to'
/** The art tag: its name for screen readers and its tooltip, by the art being shown. */
export const ART_TAG_LABEL = {
  zh: 'Art: Chinese. Switch to Japanese art',
  ja: 'Art: Japanese. Switch to Chinese art',
} as const
export const ART_TAG_TIP = {
  zh: 'Chinese art. Click for Japanese',
  ja: 'Japanese art. Click for Chinese',
} as const

/** The UTD CS Webring links on the silk at the bottom. */
export const WEBRING_LABEL = {
  ring: 'UTD CS Webring',
  previous: 'Previous site in the UTD CS Webring',
  next: 'Next site in the UTD CS Webring',
} as const
