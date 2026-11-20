import { memo } from 'react'
import { SECTION_LABEL } from '../content'
import { useScroll } from '../context'
import { gateStoreys } from '../layout/storeys'

/** The hall: one bay per role, stacked in storeys with the short row on top. */
function Experience() {
  const { model } = useScroll()
  const { bays } = model
  if (bays.length === 0) return null

  const sizes = gateStoreys(bays.length)
  const storeys = sizes.map((count, index) => {
    const start = sizes.slice(0, index).reduce((sum, size) => sum + size, 0)
    return { count, row: bays.slice(start, start + count) }
  })

  return (
    <section className="hall" aria-labelledby="exp-t">
      <h2 className="plaque" id="exp-t" tabIndex={-1}>
        {SECTION_LABEL.experience}
      </h2>
      <div className="bays">
        {storeys.map(({ count, row }) => (
          <div className="storey" data-n={count} key={row[0]?.id}>
            {row.map((bay) => (
              <article className="bay" key={bay.id}>
                <time>{bay.period}</time>
                <h3>{bay.role}</h3>
                <p className="org">{bay.org}</p>
                <p className="what">{bay.sentence}</p>
                {bay.skills.length > 0 && <p className="keys">{bay.skills.join(', ')}</p>}
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// memo: the theme re-renders on every scroll-spy change; a section only follows its props and the scroll context
export default memo(Experience)
