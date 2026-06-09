import { useEffect } from "react"
import { RepairDetailView } from "./view.js"
import { useBackups } from "../../context/backups.js"
import { useOverview } from "../../context/overview.js"
import { useRepair } from "../../context/repair.js"
import { useRoute } from "../../context/route.js"
import { focusSidebar, handleSidebarKey } from "../../runtime/sidebar-navigation.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useRepairRoute(): ScreenRoute {
  const route = useRoute()
  const repair = useRepair()
  const backups = useBackups()
  const overview = useOverview()

  return {
    id: "repair-detail",
    onKey: (key) => handleRepairKey(key, route, repair, backups, overview),
    render: () => <RepairScreen />,
  }
}

function RepairScreen() {
  const overview = useOverview()
  useEffect(() => {
    overview.section.set("Repairs")
  }, [])

  return <RepairDetailView />
}

function handleRepairKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  repair: ReturnType<typeof useRepair>,
  backups: ReturnType<typeof useBackups>,
  overview: ReturnType<typeof useOverview>,
) {
  if (handleSidebarKey(key, route, overview, "Repairs")) return

  if (key.name === "escape") return route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return focusSidebar(overview, "Repairs")
  if (key.name === "d") return repair.actions.dryRun()
  if (key.name === "r") return repair.actions.requestApply()
  if (key.name === "s") return repair.sql.toggle()
  if (key.name === "b") return backups.actions.create()
}
