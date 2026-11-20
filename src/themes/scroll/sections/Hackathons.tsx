import { memo, useId } from 'react'
import { DOOR_LABEL, SECTION_LABEL } from '../content'
import { useScroll } from '../context'
import type { StopModel } from '../model'
import { BandCanvas } from '../ui/BandCanvas'
import { NoteScroll } from '../ui/NoteScroll'
import { AwardSeal, Stamp } from '../ui/Seal'

function StopItem({ stop, noteId }: { stop: StopModel; noteId: string }) {
  const { mode, openStop, toggleStop } = useScroll()
  const open = openStop === stop.id
  return (
    <li className="stop" data-id={stop.id}>
      <button
        type="button"
        className="sb"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? noteId : undefined}
        onClick={() => toggleStop(stop.id)}
      >
        <span className="yr">{stop.date}</span>
        <b>{stop.title}</b>
        {stop.event !== null && <span className="ev">{stop.event}</span>}
        {stop.placing !== null && (
          <span className="res">
            {stop.medal !== null && <AwardSeal rank={stop.medal} mode={mode} press />}
            {stop.placing}
          </span>
        )}
        <span className="door">
          {/* unlike a house's, the stop's door seal stays an outline when its note is open */}
          <Stamp ch="門" shape="re" />
          <span>{open ? DOOR_LABEL.close : DOOR_LABEL.open}</span>
        </span>
      </button>
    </li>
  )
}

/** The road: one stop per hackathon; a stop opens a note. */
function Hackathons() {
  const { model } = useScroll()
  const noteId = useId()
  // no hackathons, no road: the band and its heading are left out
  if (model.stops.length === 0) return null
  return (
    <section className="band" data-band="road" aria-labelledby="hack-t">
      <BandCanvas />
      <header className="sec">
        <h2 id="hack-t" tabIndex={-1}>
          {SECTION_LABEL.hackathons}
        </h2>
      </header>
      <ol className="road">
        {model.stops.map((stop) => (
          <StopItem key={stop.id} stop={stop} noteId={noteId} />
        ))}
      </ol>
      <NoteScroll id={noteId} />
    </section>
  )
}

// memo: the theme re-renders on every scroll-spy change; a section only follows its props and the scroll context
export default memo(Hackathons)
