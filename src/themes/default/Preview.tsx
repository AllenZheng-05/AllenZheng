// Previews depict a theme's look, so they use fixed colors rather than the current theme's tokens.
export default function DefaultPreview() {
  return (
    <div className="flex h-full flex-col gap-1.5 bg-[#fbfaf8] p-3">
      <div className="flex items-center justify-between">
        <div className="h-1.5 w-8 rounded-full bg-[#18181b]" />
        <div className="flex gap-1">
          <div className="h-1 w-3 rounded-full bg-[#d4d2cd]" />
          <div className="h-1 w-3 rounded-full bg-[#d4d2cd]" />
          <div className="h-1 w-3 rounded-full bg-[#d4d2cd]" />
        </div>
      </div>
      <div className="mt-2 h-3 w-2/3 rounded-sm bg-[#18181b]" />
      <div className="h-1.5 w-5/6 rounded-full bg-[#c9c6c0]" />
      <div className="h-1.5 w-3/5 rounded-full bg-[#c9c6c0]" />
      <div className="mt-auto flex gap-1.5">
        <div className="h-3 w-10 rounded-sm bg-[#18181b]" />
        <div className="h-3 w-8 rounded-sm border border-[#d4d2cd]" />
        <div className="ml-auto size-1.5 self-center rounded-full bg-[#e3350d]" />
      </div>
    </div>
  )
}
