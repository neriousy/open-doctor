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
  return <BackupsView />
}

function handleBackupsKey(key: KeyInput, route: ReturnType<typeof useRoute>, backups: ReturnType<typeof useBackups>) {
  if (key.name === "escape" || key.name === "left" || key.name === "h") route.goOverview()
  if (key.name === "up" || key.name === "k") backups.moveBackups(-1)
  if (key.name === "down" || key.name === "j") backups.moveBackups(1)
  if (key.name === "r") backups.refreshBackups()
  if (key.name === "c") backups.requestCreateBackupConfirmation()
  if (key.name === "v") backups.verifySelectedBackup()
  if (key.name === "y") backups.copySelectedBackupPath()
}
