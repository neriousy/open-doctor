import { useBackupsRoute } from "../routes/backups/index.js"
import { useLogsRoute } from "../routes/logs/index.js"
import { useConfigRoute, useDataRoute, useOverviewRoute, useSettingsRoute } from "../routes/overview/index.js"
import { useRepairRoute } from "../routes/repair/index.js"
import { useSessionsRoute } from "../routes/sessions/index.js"
import { useRoute } from "../context/route.js"
import type { ScreenRoute } from "./keyboard.js"

export function useScreenRoutes() {
  return [
    useOverviewRoute(),
    useLogsRoute(),
    useSessionsRoute(),
    useDataRoute(),
    useConfigRoute(),
    useSettingsRoute(),
    useRepairRoute(),
    useBackupsRoute(),
  ]
}

export function ScreenRouter() {
  const route = useRoute()
  const routes = useScreenRoutes()
  const screen = routes.find((candidate) => candidate.id === route.location.view) ?? routes[0]
  return screen?.render() ?? null
}
