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
  if (key.name === "escape") route.actions.goOverview()
  if (key.name === "left" || key.name === "h") logs.pane.focus("sources")
  if (key.name === "right" || key.name === "l") logs.pane.focus("entries")
  if (key.name === "up" || key.name === "k") logs.actions.move(-1)
  if (key.name === "down" || key.name === "j") logs.actions.move(1)
  if (key.name === "r") logs.actions.refresh()
  if (key.name === "f") logs.filter.cycle()
  if (key.name === "s") logs.search.start()
  if (key.name === "n" && key.sequence !== "N") logs.search.moveMatch(1)
  if (key.sequence === "N") logs.search.moveMatch(-1)
  if (key.name === "return" || key.name === "enter") logs.actions.openRelatedRepair()
}
