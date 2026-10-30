// Previews depict a theme's look, so they use fixed colors rather than the current theme's tokens.
export default function RetroPreview() {
  return (
    <div className="flex h-full flex-col gap-1 border-2 border-[#ff00ff] bg-black p-1.5">
      <div className="h-2 w-full bg-[#ffff00]" />
      <div className="flex flex-1 gap-1">
        <div className="w-1/3 border border-dashed border-[#00ff00] bg-[#1a001a]" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2.5 w-2/3 bg-[#ff00ff]" />
          <div className="h-1 w-5/6 bg-[#333333]" />
          <div className="h-1 w-3/5 bg-[#333333]" />
          <div className="h-1.5 w-1/2 bg-[#ffff00]" />
        </div>
      </div>
    </div>
  )
}
