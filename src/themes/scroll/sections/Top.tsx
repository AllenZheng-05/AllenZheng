import { memo } from 'react'
import { ABOUT_THEME } from '../content'
import { useScroll } from '../context'
import { BandCanvas } from '../ui/BandCanvas'
import { NameSeal, ProfileStamps } from '../ui/Seal'
import Experience from './Experience'

/**
 * The first band: the inscription (name, role, bio, links, seal) and the experience hall. `rolls`:
 * how many unrolls of the scroll have started (null: it does not unroll); the seal presses on after each.
 */
function Top({ rolls = null }: { rolls?: number | null }) {
  const { model } = useScroll()
  return (
    <div className="scene band" data-band="top">
      <BandCanvas />
      <div className="upper">
        <div className="peaks" aria-hidden="true" />
        <header className="inscr">
          <h1 tabIndex={-1}>{model.name}</h1>
          <p className="role">{model.roleLine}</p>
          <div className="bio">
            {model.bio.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <p>{ABOUT_THEME}</p>
          </div>
          <ProfileStamps links={model.profileLinks} />
          <NameSeal press="roll" rolls={rolls} />
        </header>
      </div>
      <Experience />
      <div className="gate-foot" aria-hidden="true" />
    </div>
  )
}

// memo: the theme re-renders on every scroll-spy change; a section only follows its props and the scroll context
export default memo(Top)
