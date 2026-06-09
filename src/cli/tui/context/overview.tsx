import type { OverviewAction, OverviewPane, SidebarSection } from "../types.js"
import { createRequiredContext } from "./helper.js"

export type OverviewContext = {
  actions: OverviewAction[]
  visibleActionIndexes: number[]
  selectedAction: number
  activeSection: SidebarSection
  focusedPane: OverviewPane
  hoveredSection: SidebarSection | null
  hoveredAction: number | null
  setHoveredSection: (section: SidebarSection | null) => void
  setHoveredAction: (index: number | null) => void
  selectSection: (section: SidebarSection) => void
  setActiveSection: (section: SidebarSection) => void
  inspectHomeAction: (index: number) => void
  focusOverviewPane: (pane: OverviewPane) => void
  moveOverview: (direction: 1 | -1) => void
  openFocusedOverviewAction: () => void
  activeSectionCurrent: () => SidebarSection
  selectFirstAvailableAction: (section: SidebarSection, actions: OverviewAction[]) => void
}

const context = createRequiredContext<OverviewContext>("Overview")

export const OverviewProvider = context.Provider
export const useOverview = context.useValue
