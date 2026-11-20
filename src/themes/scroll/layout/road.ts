export interface RoadPlan {
  per: number
  rows: number
  rowH: number
  step: number
  height: number
}

/** How the hackathon path is laid out for any number of stops: rows of up to five, turning back at each end. */
export function roadPlan(w: number, n: number, wide: boolean, tall = 150): RoadPlan {
  const per = wide ? Math.max(2, Math.min(5, Math.floor(w / 228))) : 1
  const rows = Math.ceil(n / per)
  const rowH = Math.max(270, tall + 184)
  const step = Math.max(150, tall + 30)
  return {
    per,
    rows,
    rowH,
    step,
    height: wide ? (rows - 1) * rowH + tall + 96 : (n - 1) * step + tall + 50,
  }
}

export interface RoadLayout {
  /** w >= 500. */
  wide: boolean
  plan: RoadPlan
  /** Height of the road element. */
  height: number
  /** One per stop, relative to the road element: where its marker stone stands. */
  pts: [number, number][]
  /** The path of stones through the stops, relative to the road element. */
  line: [number, number][]
  /** Where each stop's box goes. */
  stops: { left: number; top: number; centred: boolean }[]
}

/** w: road width. heights: each stop's offsetHeight, in order. tall: the tallest stop's height (150 if unknown). */
export function roadLayout(w: number, heights: number[], tall: number): RoadLayout {
  const n = heights.length
  const wide = w >= 500
  const plan = roadPlan(w, n, wide, tall)
  const { per, rowH } = plan
  const y0 = 56

  const empty: RoadLayout = { wide, plan, height: 0, pts: [], line: [], stops: [] }
  if (n === 0) return empty

  if (!wide) {
    const pts: [number, number][] = []
    let acc = 34
    for (const h of heights) {
      pts.push([w - 24, acc])
      acc += h + 36
    }
    const height = heights.reduce((a, h) => a + h + 36, 30)
    const top = pts[0]
    const bottom = pts[n - 1]
    if (!top || !bottom) return empty
    const line: [number, number][] = [[top[0], -10], ...pts, [bottom[0], height]]
    const stops = pts.map((p) => ({ left: 0, top: p[1] - 20, centred: false }))
    return { wide, plan, height, pts, line, stops }
  }

  const pts: [number, number][] = heights.map((_, i) => {
    const r = Math.floor(i / per)
    const f = ((i % per) + 0.5) / per
    return [(r % 2 ? f : 1 - f) * w, y0 + r * rowH]
  })
  const line: [number, number][] = [[w + 20, y0 - 34]]
  pts.forEach((q, i) => {
    line.push(q)
    const r = Math.floor(i / per)
    if (i % per === per - 1 && i < n - 1) {
      const x = r % 2 ? w * 0.985 : w * 0.015
      const k = r % 2 ? -1 : 1
      line.push(
        [x + k * 14, q[1] + rowH * 0.28],
        [x, q[1] + rowH * 0.5],
        [x + k * 14, q[1] + rowH * 0.72],
      )
    }
  })
  const last = pts[n - 1]
  if (!last) return empty
  const dir = Math.floor((n - 1) / per) % 2 ? 1 : -1
  line.push([last[0] + dir * 130, last[1] + 44])
  const stops = pts.map((p) => ({ left: p[0], top: p[1] + 30, centred: true }))
  return { wide, plan, height: plan.height, pts, line, stops }
}
