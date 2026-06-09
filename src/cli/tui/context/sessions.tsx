import type { ArchivedSession } from "../../../utils/sessions.js"
import { createRequiredContext } from "./helper.js"

export type SessionsContext = {
  sessions: ArchivedSession[]
  visibleArchivedSessions: ArchivedSession[]
  sessionSelected: number
  selectedSessionIds: Set<string>
  previewSessionId: string | null
  loadingSessions: boolean
  pendingUnarchive: number
  archivedSearch: string
  archivedSearchActive: boolean
  refreshArchivedSessions: () => void
  moveArchivedSessions: (direction: 1 | -1) => void
  startArchivedSearch: () => void
  handleArchivedSearchKey: (key: { name?: string; sequence?: string }) => void
  toggleSelectedArchivedSession: () => void
  toggleSelectAllArchivedSessions: () => void
  previewArchivedSession: () => void
  requestUnarchiveSelectedSessions: () => void
}

const context = createRequiredContext<SessionsContext>("Sessions")

export const SessionsProvider = context.Provider
export const useSessions = context.useValue
