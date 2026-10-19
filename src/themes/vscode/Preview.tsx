const lines = [
  ['w-6 bg-[#c586c0]', 'w-10 bg-[#9cdcfe]'],
  ['w-4 bg-[#569cd6]', 'w-8 bg-[#dcdcaa]', 'w-5 bg-[#ce9178]'],
  ['ml-3 w-12 bg-[#ce9178]'],
  ['ml-3 w-7 bg-[#9cdcfe]', 'w-6 bg-[#b5cea8]'],
  ['w-3 bg-[#d4d4d4]'],
]

export default function VSCodePreview() {
  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-3 flex-col items-center gap-1 bg-[#333333] pt-1.5">
          <div className="size-1.5 rounded-[1px] bg-[#d4d4d4]" />
          <div className="size-1.5 rounded-[1px] bg-[#858585]" />
        </div>
        <div className="flex w-1/4 flex-col gap-1 bg-[#252526] p-1.5">
          <div className="h-1 w-3/4 rounded-full bg-[#858585]" />
          <div className="ml-1 h-1 w-2/3 rounded-full bg-[#6a6a6a]" />
          <div className="ml-1 h-1 w-1/2 rounded-full bg-[#6a6a6a]" />
          <div className="h-1 w-3/4 rounded-full bg-[#858585]" />
        </div>
        <div className="flex-1">
          <div className="flex h-2.5 bg-[#252526]">
            <div className="w-1/3 border-t border-[#3794ff] bg-[#1e1e1e]" />
          </div>
          <div className="flex flex-col gap-1 p-1.5">
            {lines.map((tokens, i) => (
              <div key={i} className="flex gap-1">
                {tokens.map((token) => (
                  <div key={token} className={`h-1 rounded-full ${token}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-[#007acc]" />
    </div>
  )
}
