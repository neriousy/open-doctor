export function boundedIndex(index: number, length: number) {
  if (length <= 0) return 0
  return Math.max(0, Math.min(length - 1, index))
}
