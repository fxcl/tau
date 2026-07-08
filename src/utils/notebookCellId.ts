export function parseCellId(cellId: string): number | undefined {
  const match = cellId.match(/^(?:cell-)?(\d+)$/)
  if (match && match[1]) {
    const index = parseInt(match[1], 10)
    return isNaN(index) ? undefined : index
  }
  return undefined
}
