import { HomeView } from "./view.js"
import { useBackups } from "../../context/backups.js"
import { useHealth } from "../../context/health.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { adjacentSidebarSection, focusContent, focusSidebar } from "../../runtime/sidebar-navigation.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"
import type { SidebarSection, View } from "../../types.js"

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
  const backups = useBackups()
  const health = useHealth()

  return {
    id,
    onKey: (key) => handleWorkspaceKey(key, route, overview, section, backups, health),
    render: () => <HomeView section={section} />,
  }
}

function handleWorkspaceKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  overview: ReturnType<typeof useOverview>,
  section: SidebarSection,
  backups: ReturnType<typeof useBackups>,
  health: ReturnType<typeof useHealth>,
) {
  if (key.name === "escape") return section === "Overview" ? route.actions.quit() : route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return focusSidebar(overview, section)
  if (key.name === "right" || key.name === "l") return focusContent(overview, section)
  if (key.name === "up" || key.name === "k") return overview.pane.focused === "sidebar" ? moveWorkspace(route, section, -1) : overview.actions.move(-1)
  if (key.name === "down" || key.name === "j") return overview.pane.focused === "sidebar" ? moveWorkspace(route, section, 1) : overview.actions.move(1)
  if (overview.pane.focused === "actions" && section === "Data" && key.name === "c") return backups.actions.create()
  if (overview.pane.focused === "actions" && section === "Data" && key.name === "v") return backups.actions.verifySelected()
  if (overview.pane.focused === "actions" && section === "Data" && key.name === "o") return route.actions.openBackups()
  if (overview.pane.focused === "actions" && section === "Config" && key.name === "v") return health.status.set("Effective config viewer is not wired yet")
  if (overview.pane.focused === "actions" && section === "Config" && key.name === "b") return health.status.set("Config backup is not wired yet")
  if (overview.pane.focused === "actions" && section === "Config" && key.name === "e") return health.status.set("Config editing is not wired yet")
  if (key.name === "return" || key.name === "enter") overview.action.openFocused()
}

function moveWorkspace(route: ReturnType<typeof useRoute>, section: SidebarSection, direction: 1 | -1) {
  route.actions.openSection(adjacentSidebarSection(section, direction))
}
