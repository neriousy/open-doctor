import { useEffect } from "react"
import { BackupsView } from "./view.js"
import { useBackups } from "../../context/backups.js"
import { useRoute } from "../../context/route.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useBackupsRoute(): ScreenRoute {
  const route = useRoute()
  const backups = useBackups()

  return {
    id: "backups",
    onKey: (key) => handleBackupsKey(key, route, backups),
    render: () => <BackupsScreen />,
  }
}

function BackupsScreen() {
  const backups = useBackups()
  useEffect(() => {
    backups.actions.refresh()
  }, [])

  return <BackupsView />
}

function handleBackupsKey(key: KeyInput, route: ReturnType<typeof useRoute>, backups: ReturnType<typeof useBackups>) {
  if (key.name === "escape" || key.name === "left" || key.name === "h") route.actions.goOverview()
  if (key.name === "up" || key.name === "k") backups.actions.move(-1)
  if (key.name === "down" || key.name === "j") backups.actions.move(1)
  if (key.name === "r") backups.actions.refresh()
  if (key.name === "c") backups.actions.create()
  if (key.name === "v") backups.actions.verifySelected()
  if (key.name === "y") backups.actions.copySelectedPath()
}
