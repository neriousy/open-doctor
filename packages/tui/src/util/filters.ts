import type { LogEntry } from "@open-doctor/core/utils/logs"
import type { ArchivedSession } from "@open-doctor/core/utils/sessions"
import type { LogFilter } from "../types.js"

export function filteredArchivedSessions(sessions: ArchivedSession[], search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return sessions
  return sessions.filter((session) =>
    [session.title, session.directory, session.id, session.messageCount === undefined ? "" : String(session.messageCount)]
      .some((value) => value.toLowerCase().includes(query)),
  )
}

export function filteredLogEntries(entries: LogEntry[], filter: LogFilter, search: string) {
  if (filter === "ALL") return entries
  if (filter === "ERRORS") return entries.filter((entry) => entry.inheritedSeverity === "ERROR")
  if (filter === "WARNINGS") return entries.filter((entry) => entry.inheritedSeverity === "WARN")

  const query = search.trim().toLowerCase()
  if (!query) return entries
  const matchingEntryIds = new Set<string>()
  for (const entry of entries) {
    if (rowMatchesSearch(entry, query)) matchingEntryIds.add(entry.entryId)
  }
  return entries.filter((entry) => matchingEntryIds.has(entry.entryId))
}

export function nextLogFilter(current: LogFilter): LogFilter {
  if (current === "ALL") return "ERRORS"
  if (current === "ERRORS") return "WARNINGS"
  if (current === "WARNINGS") return "SEARCH"
  return "ALL"
}

export function rowMatchesSearch(entry: LogEntry, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return false
  return [entry.raw, entry.text, entry.message, entry.parentMessage, entry.service]
    .some((value) => value.toLowerCase().includes(query))
}

export function isWorkspaceRepairLog(entry: LogEntry) {
  const value = `${entry.raw} ${entry.message} ${entry.parentMessage}`.toLowerCase()
  return value.includes("no such column: name") || value.includes("workspace.name") || value.includes("workspace schema")
}
