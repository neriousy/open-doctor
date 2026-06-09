import { LogsView } from "./view.js"
import { useLogs } from "../../context/logs.js"
import { useRoute } from "../../context/route.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useLogsRoute(): ScreenRoute {
  const route = useRoute()
  const logs = useLogs()

  return {
    id: "logs",
    onKey: (key) => handleLogsKey(key, route, logs),
    render: () => <LogsScreen />,
  }
}

function LogsScreen() {
  return <LogsView />
}

function handleLogsKey(key: KeyInput, route: ReturnType<typeof useRoute>, logs: ReturnType<typeof useLogs>) {
  if (key.name === "escape") route.goOverview()
  if (key.name === "left" || key.name === "h") logs.focusLogsPane("sources")
  if (key.name === "right" || key.name === "l") logs.focusLogsPane("entries")
  if (key.name === "up" || key.name === "k") logs.moveLogs(-1)
  if (key.name === "down" || key.name === "j") logs.moveLogs(1)
  if (key.name === "r") logs.refreshLogs()
  if (key.name === "f") logs.cycleLogFilter()
  if (key.name === "s") logs.startLogSearch()
  if (key.name === "n" && key.sequence !== "N") logs.moveSearchMatch(1)
  if (key.sequence === "N") logs.moveSearchMatch(-1)
  if (key.name === "return" || key.name === "enter") logs.openRelatedRepairFromLog()
}
