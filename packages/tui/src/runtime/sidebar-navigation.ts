import { SIDEBAR_ITEMS } from "../navigation.js"
import type { OverviewContext } from "../context/overview.js"
import type { RouteContext } from "../context/route.js"
import type { KeyInput } from "./keyboard.js"
import type { SidebarSection } from "../types.js"

export function adjacentSidebarSection(section: SidebarSection, direction: 1 | -1) {
  const current = SIDEBAR_ITEMS.indexOf(section)
  return SIDEBAR_ITEMS[(current + direction + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length] ?? "Overview"
}

export function focusSidebar(overview: OverviewContext, section: SidebarSection) {
  overview.section.set(section)
  overview.pane.focus("sidebar")
}

export function focusContent(overview: OverviewContext, section: SidebarSection) {
  overview.section.set(section)
  overview.pane.focus("actions")
}

export function handleSidebarKey(
  key: KeyInput,
  route: RouteContext,
  overview: OverviewContext,
  section: SidebarSection,
) {
  if (overview.pane.focused !== "sidebar") return false

  if (key.name === "up" || key.name === "k") {
    const next = adjacentSidebarSection(section, -1)
    focusSidebar(overview, next)
    route.actions.openSection(next)
    return true
  }

  if (key.name === "down" || key.name === "j") {
    const next = adjacentSidebarSection(section, 1)
    focusSidebar(overview, next)
    route.actions.openSection(next)
    return true
  }

  if (key.name === "right" || key.name === "l" || key.name === "return" || key.name === "enter") {
    focusContent(overview, section)
    return true
  }

  return false
}
