import type { OverviewAction, OverviewPane, SidebarSection } from "../types.js"
import { createRequiredContext } from "./helper.js"

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

const context = createRequiredContext<OverviewContext>("Overview")

export const OverviewProvider = context.Provider
export const useOverview = context.useValue
