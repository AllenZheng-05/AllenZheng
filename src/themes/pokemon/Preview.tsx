// Original Pokéball-style illustration (no official artwork). It wobbles every few seconds like
// a capture in progress, and continuously while its card is hovered.
export default function PokemonPreview() {
  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#ffe8a3,#f2b632)]">
      <div className="relative aspect-square h-3/5 origin-bottom overflow-hidden rounded-full border-[3px] border-[#1d1d1f] shadow-md motion-safe:animate-[wobble-idle_4s_ease-in-out_infinite] motion-safe:group-hover:animate-[wobble_0.9s_ease-in-out_infinite]">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-[#e3350d]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#f7f7f7]" />
        <div className="absolute inset-x-0 top-1/2 h-0.75 -translate-y-1/2 bg-[#1d1d1f]" />
        <div className="absolute top-1/2 left-1/2 size-[30%] -translate-1/2 rounded-full border-[3px] border-[#1d1d1f] bg-[#f7f7f7]" />
      </div>
    </div>
  )
}
