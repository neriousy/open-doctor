export type StatusKind = "OK" | "DETECTED" | "WARN" | "INFO" | "LOGS" | "BACKUP" | "UTILITY" | "FAILED" | "EXPERIMENTAL" | string

export type DetailsSection = {
  title: string
  rows: Array<[string, string | number | undefined]>
}

export type SidebarItem<T extends string> = {
  id: T
  label: string
  badge?: string | number
}

export type EmptyStateAction = {
  key: string
  label: string
}

export const TUI = {
  bg: "#080808",
  panel: "#111113",
  elevated: "#18181B",
  border: "#27272A",
  borderActive: "#3B82F6",
  borderAlt: "#27272A",
  hover: "#202124",
  selected: "#18181B",
  selectedMuted: "#111113",
  text: "#EDEDED",
  muted: "#A1A1AA",
  dim: "#6F6F76",
  disabled: "#4B4B52",
  blue: "#3B82F6",
  green: "#67C96F",
  yellow: "#F5B84B",
  red: "#F87171",
}

export function shortenPath(value: string, width = 28) {
  if (value.length <= width) return value
  const parts = value.split("/").filter(Boolean)
  if (parts.length <= 3) return middleEllipsis(value, width)

  const prefix = value.startsWith("/") ? `/${parts[0]}` : parts[0] ?? ""
  const tailCount = Math.min(2, parts.length - 1)
  const tail = parts.slice(-tailCount).join("/")
  const candidate = `${prefix}/.../${tail}`
  if (candidate.length <= width) return candidate

  const shorterTail = parts.at(-1)
  if (shorterTail) {
    const next = `${prefix}/.../${shorterTail}`
    if (next.length <= width) return next
  }

  return middleEllipsis(value, width)
}

export function statusColor(status: StatusKind) {
  if (status === "OK" || status === "BACKUP" || status === "UTILITY") return TUI.green
  if (status === "DETECTED" || status === "WARN" || status === "EXPERIMENTAL" || status === "MISSING") return TUI.yellow
  if (status === "FAILED") return TUI.red
  return TUI.blue
}

function middleEllipsis(value: string, width: number) {
  if (width <= 5) return value.slice(0, width)
  const left = Math.ceil((width - 3) / 2)
  const right = Math.floor((width - 3) / 2)
  return `${value.slice(0, left)}...${value.slice(value.length - right)}`
}
