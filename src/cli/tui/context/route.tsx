import type { SidebarSection, View } from "../types.js"
import { createRequiredContext } from "./helper.js"

export type RouteContext = {
  view: View
  restoreImplemented: boolean
  quit: () => void
  goOverview: () => void
  openRepairDetail: () => void
  openArchivedSessions: () => void
  openLogs: () => void
  openBackups: () => void
  openSettings: () => void
  refreshSectionPreview: (section: SidebarSection) => void
}

const context = createRequiredContext<RouteContext>("Route")

export const RouteProvider = context.Provider
export const useRoute = context.useValue
