import { RepairDetailView } from "./view.js"
import { useBackups } from "../../context/backups.js"
import { useRepair } from "../../context/repair.js"
import { useRoute } from "../../context/route.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useRepairRoute(): ScreenRoute {
  const route = useRoute()
  const repair = useRepair()
  const backups = useBackups()

  return {
    id: "repair-detail",
    onKey: (key) => handleRepairKey(key, route, repair, backups),
    render: () => <RepairScreen />,
  }
}

function RepairScreen() {
  return <RepairDetailView />
}

function handleRepairKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  repair: ReturnType<typeof useRepair>,
  backups: ReturnType<typeof useBackups>,
) {
  if (key.name === "escape" || key.name === "left" || key.name === "h") route.goOverview()
  if (key.name === "d") repair.runDryRepair()
  if (key.name === "r") repair.requestRepairConfirmation()
  if (key.name === "s") repair.toggleSql()
  if (key.name === "b") backups.requestCreateBackupConfirmation()
}
