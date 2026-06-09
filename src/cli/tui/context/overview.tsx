import type { OverviewAction, OverviewPane, SidebarSection } from "../types.js"
import { recommendedActionsFromState } from "../routes/overview/actions.js"
import { useBackups } from "./backups.js"
import { useHealth } from "./health.js"
import { createStateContext } from "./helper.js"
import { useLogs } from "./logs.js"
import { useOverviewState } from "./overview-state.js"
import { useRoute } from "./route.js"
import { useSessions } from "./sessions.js"

export type OverviewContext = {
  action: {
    items: OverviewAction[]
    visibleIndexes: number[]
    selected: number
    inspect: (index: number) => void
    openFocused: () => void
    selectFirstAvailable: (section: SidebarSection, actions: OverviewAction[]) => void
  }
  section: {
    active: SidebarSection
    select: (section: SidebarSection) => void
    set: (section: SidebarSection) => void
    current: () => SidebarSection
  }
  pane: {
    focused: OverviewPane
    focus: (pane: OverviewPane) => void
  }
  actions: {
    move: (direction: 1 | -1) => void
  }
}

const context = createStateContext<OverviewContext>({
  name: "Overview",
  init: () => {
    const health = useHealth()
    const route = useRoute()
    const sessions = useSessions()
    const logs = useLogs()
    const backups = useBackups()
    const actions = recommendedActionsFromState(health.snapshot, {
      openRepairDetail: route.actions.openRepairDetail,
      openArchivedSessions: route.actions.openArchivedSessions,
      openLogs: route.actions.openLogs,
      openBackups: route.actions.openBackups,
    })

    function refreshSectionPreview(section: SidebarSection) {
      if (section === "Sessions") sessions.actions.refresh()
      if (section === "Logs") logs.actions.refresh()
      if (section === "Backups") backups.actions.refresh()
    }

    return useOverviewState({
      actions,
      setStatus: health.status.set,
      refreshSectionPreview,
    })
  },
})

export const OverviewProvider = context.Provider
export const useOverview = context.useValue
