import { HomeView } from "./view.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"
import type { SidebarSection, View } from "../../types.js"
import { SIDEBAR_ITEMS } from "../../navigation.js"

export function useOverviewRoute(): ScreenRoute {
  return useWorkspaceRoute("overview", "Overview")
}

export function useDataRoute(): ScreenRoute {
  return useWorkspaceRoute("data", "Data")
}

export function useConfigRoute(): ScreenRoute {
  return useWorkspaceRoute("config", "Config")
}

export function useSettingsRoute(): ScreenRoute {
  return useWorkspaceRoute("settings", "Settings")
}

function useWorkspaceRoute(id: View, section: SidebarSection): ScreenRoute {
  const route = useRoute()
  const overview = useOverview()

  return {
    id,
    onKey: (key) => handleWorkspaceKey(key, route, overview, section),
    render: () => <HomeView section={section} />,
  }
}

function handleWorkspaceKey(key: KeyInput, route: ReturnType<typeof useRoute>, overview: ReturnType<typeof useOverview>, section: SidebarSection) {
  if (key.name === "escape") return section === "Overview" ? route.actions.quit() : route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return overview.pane.focus("sidebar")
  if (key.name === "right" || key.name === "l") return overview.pane.focus("actions")
  if (key.name === "up" || key.name === "k") return overview.pane.focused === "sidebar" ? moveWorkspace(route, section, -1) : overview.actions.move(-1)
  if (key.name === "down" || key.name === "j") return overview.pane.focused === "sidebar" ? moveWorkspace(route, section, 1) : overview.actions.move(1)
  if (key.name === "return" || key.name === "enter") overview.action.openFocused()
}

function moveWorkspace(route: ReturnType<typeof useRoute>, section: SidebarSection, direction: 1 | -1) {
  const current = SIDEBAR_ITEMS.indexOf(section)
  const next = SIDEBAR_ITEMS[(current + direction + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length]
  if (next === "Overview") return route.actions.goOverview()
  if (next === "Logs") return route.actions.openLogs()
  if (next === "Sessions") return route.actions.openArchivedSessions()
  if (next === "Data") return route.actions.openData()
  if (next === "Config") return route.actions.openConfig()
  if (next === "Settings") return route.actions.openSettings()
}
