import type { Ref } from 'react'
import { ThemeMenu } from '../../../shell/ThemeMenu'
import { ART_TAG_LABEL, ART_TAG_TIP, menuTagLabel, SECTION_LABEL, TAG_LABEL } from '../content'
import type { ArtMode, SectionId } from '../model'
import { Stamp } from './Seal'

interface TagsProps {
  /** The tags wait until the scroll has unrolled. */
  shown: boolean
  section: SectionId
  slipOpen: boolean
  /** The id of the menu slip the menu tag opens. */
  slipId: string
  mode: ArtMode
  menuRef: Ref<HTMLButtonElement>
  onMenu(): void
  onArt(): void
}

/* Three paper tags hang by cords at the top left: the menu (it names the section you are in), the
 art switch (中 Chinese, 日 Japanese) and the theme switch. Ported from the design mock-up. */
export function Tags({
  shown,
  section,
  slipOpen,
  slipId,
  mode,
  menuRef,
  onMenu,
  onArt,
}: TagsProps) {
  const label = SECTION_LABEL[section]
  const ja = mode === 'ja'
  return (
    // hidden (while the scroll unrolls) they are also out of the tab order
    <div className={shown ? 'tag on' : 'tag'} inert={!shown}>
      <div className="tg">
        <button
          ref={menuRef}
          type="button"
          className="tag-menu"
          aria-haspopup="dialog"
          aria-expanded={slipOpen}
          aria-controls={slipId}
          aria-label={menuTagLabel(label)}
          onClick={onMenu}
        >
          <span>{label}</span>
        </button>
      </div>
      <div className="tg">
        <button
          type="button"
          className="tag-art"
          aria-label={ART_TAG_LABEL[mode]}
          title={ART_TAG_TIP[mode]}
          onClick={onArt}
        >
          <span className="wd">{TAG_LABEL.art}</span>
          <Stamp ch="中" fill={!ja} />
          <Stamp ch="日" fill={ja} />
        </button>
      </div>
      <div className="tg">
        <ThemeMenu className="tag-theme">{TAG_LABEL.theme}</ThemeMenu>
      </div>
    </div>
  )
}
