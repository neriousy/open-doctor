// Small row coercion helpers for SQLite's unknown result values.
export function stringField(row: Record<string, unknown>, field: string) {
  const value = row[field]
  if (typeof value === "string") return value
  return ""
}

export function numberField(row: Record<string, unknown>, field: string) {
  const value = row[field]
  if (typeof value === "number") return value
  return 0
}
