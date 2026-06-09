import { useEffect } from "react"
import { BackupsView } from "./view.js"
import { useBackups } from "../../context/backups.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { focusSidebar, handleSidebarKey } from "../../runtime/sidebar-navigation.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useBackupsRoute(): ScreenRoute {
  const route = useRoute()
  const backups = useBackups()
  const overview = useOverview()

  return {
    id: "backups",
    onKey: (key) => handleBackupsKey(key, route, backups, overview),
    render: () => <BackupsScreen />,
  }
}

function BackupsScreen() {
  const backups = useBackups()
  const overview = useOverview()
  useEffect(() => {
    overview.section.set("Data")
    backups.actions.refresh()
  }, [])

  return <BackupsView />
}

function handleBackupsKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  backups: ReturnType<typeof useBackups>,
  overview: ReturnType<typeof useOverview>,
) {
  if (handleSidebarKey(key, route, overview, "Data")) return

  if (key.name === "escape") return route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return focusSidebar(overview, "Data")
  if (key.name === "up" || key.name === "k") return backups.actions.move(-1)
  if (key.name === "down" || key.name === "j") return backups.actions.move(1)
  if (key.name === "pageup") return backups.actions.moveBy(-10)
  if (key.name === "pagedown") return backups.actions.moveBy(10)
  if (key.name === "home") return backups.actions.jump("start")
  if (key.name === "end") return backups.actions.jump("end")
  if (key.name === "r") return backups.actions.refresh()
  if (key.name === "c") return backups.actions.create()
  if (key.name === "v") return backups.actions.verifySelected()
  if (key.name === "y") return backups.actions.copySelectedPath()
}
