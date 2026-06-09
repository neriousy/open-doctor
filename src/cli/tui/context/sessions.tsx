import type { ArchivedSession } from "../../../utils/sessions.js"
import { createRequiredContext } from "./helper.js"

export type SessionsContext = {
  list: {
    items: ArchivedSession[]
    visible: ArchivedSession[]
    selected: number
  }
  selection: {
    ids: Set<string>
    previewId: string | null
    toggleCurrent: () => void
    toggleAllVisible: () => void
    previewCurrent: () => void
  }
  search: {
    query: string
    active: boolean
    start: () => void
    handleKey: (key: { name?: string; sequence?: string }) => void
  }
  loading: boolean
  pendingUnarchive: number
  actions: {
    refresh: () => void
    move: (direction: 1 | -1) => void
    requestUnarchive: () => void
  }
}

const context = createRequiredContext<SessionsContext>("Sessions")

export const SessionsProvider = context.Provider
export const useSessions = context.useValue
