import { useId, useRef } from 'react'
import { CloseIcon, PaletteIcon } from '../components/icons'
import { ThemePicker } from './ThemePicker'

interface ThemeMenuProps {
  className?: string
  label?: string
}

/** A "Theme" button that opens the theme picker in a modal dialog. Every theme includes one. */
export function ThemeMenu({ className, label = 'Theme' }: ThemeMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        aria-label="Change theme"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        <PaletteIcon className="size-4" />
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        className="m-auto w-[min(56rem,calc(100%-2rem))] rounded-2xl border border-line bg-bg text-fg shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                Choose a theme
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-m-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-fg/5 hover:text-fg"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="mt-6">
            <ThemePicker onSelect={close} />
          </div>
        </div>
      </dialog>
    </>
  )
}
