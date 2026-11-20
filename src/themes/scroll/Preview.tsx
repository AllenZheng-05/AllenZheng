// Previews depict a theme's look, so they use fixed colors rather than the current theme's tokens.
export default function ScrollPreview() {
  return (
    <div className="flex h-full flex-col items-center bg-[#e9e4da] pt-1.5">
      <div className="h-0.5 w-[88%] rounded-full bg-[#2c1a0e]" />
      <div className="mt-px w-[88%] flex-1 bg-[#b9ac8c] p-1">
        <div className="relative h-full overflow-hidden border-2 border-[#2b3540] bg-[#d3be93] p-1.5">
          <div className="h-2 w-2/5 rounded-sm bg-[#1e1a16]" />
          <div className="mt-1 h-1 w-3/5 rounded-full bg-[#4a4136]/60" />
          <div className="mt-0.5 h-1 w-1/2 rounded-full bg-[#4a4136]/40" />
          <svg
            viewBox="0 0 60 24"
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 w-full opacity-70"
          >
            <path
              d="M0 24 L10 12 L18 20 L32 4 L44 18 L52 10 L60 24 Z"
              fill="none"
              stroke="#1e1a16"
              strokeWidth="1.2"
            />
          </svg>
          <div className="absolute top-1.5 right-1.5 size-3 rounded-[2px] bg-[#a8321f]" />
        </div>
      </div>
      <div className="h-1.5 w-[92%] rounded-full bg-[#4a301c]" />
    </div>
  )
}
