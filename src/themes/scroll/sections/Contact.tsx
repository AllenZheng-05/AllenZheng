import { memo } from 'react'
import { ThemeMenu } from '../../../shell/ThemeMenu'
import { CONTACT_HEADING, THEME_BUTTON } from '../content'
import { useScroll } from '../context'
import { BandCanvas } from '../ui/BandCanvas'
import { NameSeal, ProfileStamps } from '../ui/Seal'

/** The closing pavilion: how to write to me. */
function Contact() {
  const { model } = useScroll()
  return (
    <section className="band" data-band="end" aria-labelledby="end-t">
      <BandCanvas />
      <div className="pavilion hall">
        <div className="bays">
          <div className="storey" data-n="1">
            <div className="bay">
              <h2 id="end-t" tabIndex={-1}>
                {CONTACT_HEADING}
              </h2>
              <a className="mail" href={`mailto:${model.email}`}>
                {model.email}
              </a>
              <ProfileStamps links={model.profileLinks} />
              <div className="foot">
                <NameSeal press="view" />
                <ThemeMenu className="theme-btn">{THEME_BUTTON}</ThemeMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="ground" aria-hidden="true" />
    </section>
  )
}

// memo: the theme re-renders on every scroll-spy change; a section only follows its props and the scroll context
export default memo(Contact)
