import { HomeView } from "./view.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useOverviewRoute(): ScreenRoute {
  const route = useRoute()
  const overview = useOverview()

  return {
    id: "overview",
    onKey: (key) => handleOverviewKey(key, route, overview),
    render: () => <OverviewScreen />,
  }
}

function OverviewScreen() {
  return <HomeView />
}

function handleOverviewKey(key: KeyInput, route: ReturnType<typeof useRoute>, overview: ReturnType<typeof useOverview>) {
  if (key.name === "escape") return route.actions.quit()
  if (key.name === "left" || key.name === "h") return overview.pane.focus("sidebar")
  if (key.name === "right" || key.name === "l") return overview.pane.focus("actions")
  if (key.name === "up" || key.name === "k") return overview.actions.move(-1)
  if (key.name === "down" || key.name === "j") return overview.actions.move(1)
  if (key.name === "1") route.actions.openRepairDetail()
  if (key.name === "2") route.actions.openArchivedSessions()
  if (key.name === "3") route.actions.openLogs()
  if (key.name === "4") route.actions.openBackups()
  if (key.name === "return" || key.name === "enter") overview.action.openFocused()
}
