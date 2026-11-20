/** The two painted layers every band starts with: the still painting (painted by paint/painting.ts) and the moving one (drawn by motion/motion.ts). */
export function BandCanvas() {
  return (
    <>
      <canvas className="paint" aria-hidden="true" />
      <canvas className="paint anim" aria-hidden="true" />
    </>
  )
}
