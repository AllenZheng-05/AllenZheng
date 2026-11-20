import { WebringIcon } from '../../../components/icons'
import { WEBRING_LABEL } from '../content'

const WEBRING = 'https://ecs.utdring.com/#allenzheng.com'
const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' }

/** A brushed arrow for the webring's previous and next links (drawn, so it needs no glyph in the hand font). */
function Arrow({ next = false }: { next?: boolean }) {
  return (
    <svg
      className="webring-arrow"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={next ? 'M4 12h15m-6-6 6 6-6 6' : 'M20 12H5m6-6-6 6 6 6'} />
    </svg>
  )
}

/** The UTD CS Webring, on the silk under the painting: https://github.com/ryanpolasky/utdring */
export function Webring() {
  return (
    <nav className="webring" aria-label={WEBRING_LABEL.ring}>
      <a href={`${WEBRING}?nav=prev`} aria-label={WEBRING_LABEL.previous} {...NEW_TAB}>
        <Arrow />
      </a>
      <a href={WEBRING} aria-label={WEBRING_LABEL.ring} title={WEBRING_LABEL.ring} {...NEW_TAB}>
        <WebringIcon className="webring-mark" />
      </a>
      <a href={`${WEBRING}?nav=next`} aria-label={WEBRING_LABEL.next} {...NEW_TAB}>
        <Arrow next />
      </a>
    </nav>
  )
}
