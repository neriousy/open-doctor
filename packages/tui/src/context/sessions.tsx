import type { ArchivedSession } from "@open-doctor/core/utils/sessions"
import { useConfirmDialog } from "../ui/dialog-confirm.js"
import { useToastContext } from "../ui/toast.js"
import { useHealth } from "./health.js"
import { createStateContext } from "./helper.js"
import { useRoute } from "./route.js"
import { useSessionsState } from "./sessions-state.js"

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

const context = createStateContext<SessionsContext>({
  name: "Sessions",
  init: () => {
    const health = useHealth()
    const route = useRoute()
    const toast = useToastContext()
    const confirm = useConfirmDialog()

    return useSessionsState({
      health: health.snapshot,
      quit: route.actions.quit,
      setStatus: health.status.set,
      showToast: toast.actions.show,
      setConfirmation: confirm.actions.set,
    })
  },
})

export const SessionsProvider = context.Provider
export const useSessions = context.useValue
