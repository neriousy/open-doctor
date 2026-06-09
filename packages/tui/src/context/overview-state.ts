import { useRef, useState } from "react"
import { SIDEBAR_ITEMS } from "../navigation.js"
import type { OverviewAction, OverviewPane, SidebarSection } from "../types.js"
import { actionIndexesForSection } from "../routes/overview/actions.js"

export function useOverviewState(options: {
  actions: OverviewAction[]
  setStatus: (status: string) => void
  refreshSectionPreview: (section: SidebarSection) => void
}) {
  const [selectedAction, setSelectedAction] = useState(0)
  const selectedActionRef = useRef(0)
  const [activeSection, setActiveSectionState] = useState<SidebarSection>("Overview")
  const activeSectionRef = useRef<SidebarSection>("Overview")
  const [focusedPane, setFocusedPane] = useState<OverviewPane>("actions")
  const focusedPaneRef = useRef<OverviewPane>("actions")

  function focusOverviewPane(pane: OverviewPane) {
    setFocusedPane(pane)
    focusedPaneRef.current = pane
  }

  function moveOverview(direction: 1 | -1) {
    if (focusedPaneRef.current === "sidebar") {
      moveSidebar(direction)
      return
    }
    moveHome(direction)
  }

  function moveSidebar(direction: 1 | -1) {
    const currentIndex = SIDEBAR_ITEMS.indexOf(activeSectionRef.current)
    const next = SIDEBAR_ITEMS[(currentIndex + direction + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length]
    if (!next) return
    selectSection(next)
  }

  function moveHome(direction: 1 | -1) {
    const indexes = actionIndexesForSection(options.actions, activeSectionRef.current)
    if (indexes.length === 0) return
    const currentVisibleIndex = Math.max(0, indexes.indexOf(selectedActionRef.current))
    const next = indexes[(currentVisibleIndex + direction + indexes.length) % indexes.length]
    if (next === undefined) return
    selectActionIndex(next)
  }

  function openFocusedOverviewAction() {
    const indexes = actionIndexesForSection(options.actions, activeSectionRef.current)
    if (indexes.length === 0) {
      options.setStatus(`${activeSectionRef.current} is planned - no tools are wired yet`)
      return
    }

    const selected = indexes.includes(selectedActionRef.current) ? selectedActionRef.current : indexes[0]
    if (selected === undefined) return
    selectActionIndex(selected)
    options.actions[selected]?.run()
  }

  function inspectHomeAction(index: number) {
    selectActionIndex(index)
    setActiveSection(options.actions[index]?.section ?? "Overview")
    focusOverviewPane("actions")
    options.actions[index]?.run()
  }

  function selectSection(section: SidebarSection) {
    setActiveSection(section)
    focusOverviewPane("sidebar")
    const indexes = actionIndexesForSection(options.actions, section)
    const next = indexes[0]
    if (next !== undefined) {
      selectActionIndex(next)
      options.setStatus(`Selected ${section} - Press Enter to open ${options.actions[next]?.title}`)
      options.refreshSectionPreview(section)
      return
    }
    options.setStatus(`${section} is planned - no tools are wired yet`)
    options.refreshSectionPreview(section)
  }

  function setActiveSection(section: SidebarSection) {
    setActiveSectionState(section)
    activeSectionRef.current = section
  }

  function activeSectionCurrent() {
    return activeSectionRef.current
  }

  function selectFirstAvailableAction(section: SidebarSection, actions: OverviewAction[]) {
    const first = actionIndexesForSection(actions, section)[0]
    if (first === undefined) return
    selectActionIndex(first)
  }

  function selectActionIndex(index: number) {
    selectedActionRef.current = index
    setSelectedAction(index)
  }

  return {
    action: {
      items: options.actions,
      visibleIndexes: actionIndexesForSection(options.actions, activeSection),
      selected: selectedAction,
      inspect: inspectHomeAction,
      openFocused: openFocusedOverviewAction,
      selectFirstAvailable: selectFirstAvailableAction,
    },
    section: {
      active: activeSection,
      select: selectSection,
      set: setActiveSection,
      current: activeSectionCurrent,
    },
    pane: {
      focused: focusedPane,
      focus: focusOverviewPane,
    },
    actions: {
      move: moveOverview,
    },
  }
}
