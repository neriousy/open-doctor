// Formatting helpers for compact terminal tables and transient toast styling.
import type { ArchivedSession } from "../../../utils/sessions.js"
import type { ToastVariant } from "../types.js"

export function renderArchivedSessions(sessions: ArchivedSession[], selected: number, loading: boolean) {
  if (loading && sessions.length === 0) return "Loading archived sessions..."
  if (sessions.length === 0) return "No archived sessions found.\n\nPress r to refresh or esc to return."

  const visibleLimit = 8
  const start = Math.min(Math.max(0, selected - 4), Math.max(0, sessions.length - visibleLimit))
  const visible = sessions.slice(start, start + visibleLimit)
  const header = "   Archived          Title"
  const rows = visible.map((session, visibleIndex) => {
    const index = start + visibleIndex
    const marker = index === selected ? ">" : " "
    return `${marker} ${tableTime(session.timeArchived)}  ${truncate(session.title || "(untitled)", 48)}`
  })
  const selectedSession = sessions[selected]
  const details = selectedSession
    ? `\n\nSelected\n${selectedSession.id}\nUpdated ${tableTime(selectedSession.timeUpdated)}\n${selectedSession.directory}`
    : ""
  return `Newest archived first | showing ${start + 1}-${start + visible.length} of ${sessions.length}\n\n${header}\n${rows.join("\n")}${details}`
}

export function archivedSummary(count: number, pending: number, loading: boolean) {
  if (loading && count === 0) return "Loading newest archived sessions..."
  const pendingText = pending > 0 ? ` | ${pending} background unarchive${pending === 1 ? "" : "s"}` : ""
  return `${count} archived session${count === 1 ? "" : "s"} | newest archived first${pendingText}`
}

export function sessionTitle(session: ArchivedSession) {
  return session.title ? `${session.title} (${session.id})` : session.id
}

export function toastColor(variant: ToastVariant) {
  if (variant === "success") return "#c3e88d"
  if (variant === "warning") return "#ecc48d"
  if (variant === "error") return "#f07178"
  return "#82aaff"
}

function tableTime(value: number) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value.padEnd(max, " ")
  return `${value.slice(0, max - 3)}...`
}
