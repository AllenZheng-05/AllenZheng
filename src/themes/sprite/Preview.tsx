// Preview mirrors the Sprite Studio Drift hero: blue studio, chunky cards, orange stickers.
export default function SpritePreview() {
  return (
    <div className="flex h-full flex-col gap-1.5 bg-[#2563EB] p-1.5">
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 rounded-full border-2 border-[#011921] bg-[#FE895C]" />
        <div className="h-3.5 w-5 rounded-md border-2 border-[#011921] bg-[#F8FDFE]" />
        <div className="h-3.5 w-4 rounded-md border-2 border-[#011921] bg-[#011921]" />
        <div className="ml-auto h-3.5 w-8 rounded-md border-2 border-[#011921] bg-[#FE895C]" />
      </div>
      <div className="rounded-lg border-2 border-[#011921] bg-[#F8FDFE] p-1.5 shadow-[0_3px_0_#011921]">
        <div className="h-2 w-2/3 rounded bg-[#011921]" />
        <div className="mt-1 h-1 w-5/6 rounded-full bg-[#3C5B65]" />
        <div className="mt-1 h-1 w-1/2 rounded-full bg-[#FE895C]" />
      </div>
      <div className="flex flex-1 gap-1">
        <div className="flex-1 -rotate-1 rounded-lg border-2 border-[#011921] bg-[#F8FDFE] p-1">
          <div className="h-1.5 w-1/2 rounded-full bg-[#2563EB]" />
          <div className="mt-1 h-1 w-full rounded-full bg-[#C3D4DA]" />
        </div>
        <div className="flex-1 rotate-1 rounded-lg border-2 border-[#011921] bg-[#F8FDFE] p-1">
          <div className="h-1.5 w-2/3 rounded-full bg-[#FE895C]" />
          <div className="mt-1 h-1 w-full rounded-full bg-[#C3D4DA]" />
        </div>
      </div>
    </div>
  )
}
