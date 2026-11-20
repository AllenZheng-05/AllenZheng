/** Sizes of the storeys of the experience gate, top first: three bays to a storey, the short row on top. */
export function gateStoreys(count: number): number[] {
  if (count <= 0) return []
  const first = count % 3 || 3
  const sizes = [first]
  for (let left = count - first; left > 0; left -= 3) sizes.push(3)
  return sizes
}
