// Previews depict a theme's look, so they use fixed colors rather than the current theme's tokens.
export default function DefaultPreview() {
  return (
    <div className="flex h-full flex-col gap-1 bg-[#F8FAFC] p-1.5">
      <div className="flex items-center justify-between">
        <div className="h-1.5 w-1/4 rounded-full bg-[#0F172A]" />
        <div className="h-1.5 w-8 rounded-full bg-[#2563EB]" />
      </div>
      <div className="h-2.5 w-2/3 rounded bg-[#0F172A]" />
      <div className="h-1 w-5/6 rounded-full bg-[#94A3B8]" />
      <div className="flex flex-1 gap-1 pt-0.5">
        <div className="flex-1 rounded border border-[#E2E8F0] bg-white p-1">
          <div className="h-1.5 w-2/3 rounded-full bg-[#2563EB]" />
          <div className="mt-1 h-1 w-full rounded-full bg-[#E2E8F0]" />
        </div>
        <div className="flex-1 rounded border border-[#E2E8F0] bg-white p-1">
          <div className="h-1.5 w-1/2 rounded-full bg-[#0F172A]" />
          <div className="mt-1 h-1 w-full rounded-full bg-[#E2E8F0]" />
        </div>
      </div>
    </div>
  )
}
