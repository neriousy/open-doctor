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
  bg: "#0f1419",
  panel: "#101820",
  border: "#263544",
  borderActive: "#81a1c1",
  borderAlt: "#35506a",
  hover: "#13202a",
  selected: "#17202a",
  selectedMuted: "#121c24",
  text: "#d6deeb",
  muted: "#9fb3c8",
  dim: "#7893ad",
  blue: "#82aaff",
  green: "#c3e88d",
  yellow: "#ecc48d",
  red: "#f07178",
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
  if (status === "OK" || status === "LOGS" || status === "BACKUP" || status === "UTILITY") return TUI.green
  if (status === "DETECTED" || status === "WARN" || status === "EXPERIMENTAL") return TUI.yellow
  if (status === "FAILED") return TUI.red
  return TUI.blue
}

function middleEllipsis(value: string, width: number) {
  if (width <= 5) return value.slice(0, width)
  const left = Math.ceil((width - 3) / 2)
  const right = Math.floor((width - 3) / 2)
  return `${value.slice(0, left)}...${value.slice(value.length - right)}`
}
