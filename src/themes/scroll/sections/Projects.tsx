import { memo } from 'react'
import { DOOR_LABEL, linkFor, NO_CAPTURE, SECTION_LABEL } from '../content'
import { useScroll } from '../context'
import type { HouseModel } from '../model'
import { BandCanvas } from '../ui/BandCanvas'
import { Stamp, StampLink } from '../ui/Seal'

function CaptureWindow({ house }: { house: HouseModel }) {
  const { capture } = house
  if (!capture) {
    return (
      <div className="win blank" role="img" aria-label={NO_CAPTURE}>
        <canvas className="motif big" data-m={house.motif} aria-hidden="true" />
      </div>
    )
  }
  const image = <img width={960} height={540} src={capture.src} alt={capture.alt} />
  // the capture leads where the project's first link does (the live site if there is one)
  const [link] = house.links
  if (!link) return <div className="win">{image}</div>
  return (
    <a
      className="win"
      href={link.href}
      title={linkFor(link.label, house.title)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {image}
    </a>
  )
}

function House({ house, open, onToggle }: { house: HouseModel; open: boolean; onToggle(): void }) {
  const detailId = `house-${house.id}`
  return (
    <div className={open ? 'house open' : 'house'} data-id={house.id}>
      <canvas className="bld" aria-hidden="true" />
      <button
        type="button"
        className="hd"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggle}
      >
        <canvas className="motif" data-m={house.motif} aria-hidden="true" />
        <b>{house.title}</b>
        <small>{open ? house.bylineOpen : house.byline}</small>
        <span className="door">
          <Stamp ch="門" shape="re" fill={open} />
          <span>{open ? DOOR_LABEL.close : DOOR_LABEL.open}</span>
        </span>
      </button>
      <div className="detail" id={detailId} hidden={!open}>
        {open && (
          <>
            <div className="dt">
              <p>{house.sentence}</p>
              {house.stack.length > 0 && <p className="keys">{house.stack.join(', ')}</p>}
              <div className="stamps">
                {house.links.map((link) => (
                  <StampLink
                    key={link.kind}
                    href={link.href}
                    label={link.label}
                    ch={link.ch}
                    shape={link.shape}
                    ariaLabel={linkFor(link.label, house.title)}
                  />
                ))}
              </div>
            </div>
            <figure className="winfig">
              <CaptureWindow house={house} />
            </figure>
          </>
        )}
      </div>
    </div>
  )
}

/** The village: one house per project; the open one grows into a hall with the project inside. */
function Projects() {
  const { model, openHouse, toggleHouse } = useScroll()
  // no projects, no village: the band and its heading are left out
  if (model.houses.length === 0) return null
  return (
    <section className="band" data-band="works" aria-labelledby="proj-t">
      <BandCanvas />
      <header className="sec">
        <h2 id="proj-t" tabIndex={-1}>
          {SECTION_LABEL.projects}
        </h2>
      </header>
      <div className="village">
        {model.houses.map((house) => (
          <House
            key={house.id}
            house={house}
            open={openHouse === house.id}
            onToggle={() => toggleHouse(house.id)}
          />
        ))}
      </div>
    </section>
  )
}

// memo: the theme re-renders on every scroll-spy change; a section only follows its props and the scroll context
export default memo(Projects)
