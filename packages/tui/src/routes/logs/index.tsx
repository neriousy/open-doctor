import { useEffect } from "react"
import { LogsView } from "./view.js"
import { useLogs } from "../../context/logs.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { focusContent, focusSidebar, handleSidebarKey } from "../../runtime/sidebar-navigation.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useLogsRoute(): ScreenRoute {
  const route = useRoute()
  const logs = useLogs()
  const overview = useOverview()

  return {
    id: "logs",
    onKey: (key) => handleLogsKey(key, route, logs, overview),
    render: () => <LogsScreen />,
  }
}

function LogsScreen() {
  const logs = useLogs()
  const overview = useOverview()
  useEffect(() => {
    overview.section.set("Logs")
    logs.actions.refresh()
  }, [])

  return <LogsView />
}

function handleLogsKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  logs: ReturnType<typeof useLogs>,
  overview: ReturnType<typeof useOverview>,
) {
  if (logs.search.active) return logs.search.handleKey(key)
  if (overview.pane.focused === "sidebar" && (key.name === "right" || key.name === "l" || key.name === "return" || key.name === "enter")) {
    focusContent(overview, "Logs")
    logs.pane.focus("sources")
    return
  }
  if (handleSidebarKey(key, route, overview, "Logs")) return

  if (key.name === "escape") return route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return logs.pane.active === "entries" ? logs.pane.focus("sources") : focusSidebar(overview, "Logs")
  if (key.name === "right" || key.name === "l") return logs.pane.focus("entries")
  if (key.name === "tab" || key.sequence === "\t") return logs.pane.focus(logs.pane.active === "sources" ? "entries" : "sources")
  if (key.sequence === "[") return logs.pane.focus("sources")
  if (key.sequence === "]") return logs.pane.focus("entries")
  if (key.name === "up" || key.name === "k") return logs.actions.move(-1)
  if (key.name === "down" || key.name === "j") return logs.actions.move(1)
  if (key.name === "pageup") return logs.actions.moveBy(-10)
  if (key.name === "pagedown") return logs.actions.moveBy(10)
  if (key.name === "home") return logs.actions.jump("start")
  if (key.name === "end") return logs.actions.jump("end")
  if (key.name === "r") return logs.actions.refresh()
  if (key.name === "f") return logs.filter.cycle()
  if (key.name === "s") return logs.search.start()
  if (key.name === "n" && key.sequence !== "N") return logs.search.moveMatch(1)
  if (key.sequence === "N") return logs.search.moveMatch(-1)
  if (key.name === "y") return logs.actions.copySelectedPath()
  if (key.name === "return" || key.name === "enter") return logs.actions.openRelatedRepair()
}
