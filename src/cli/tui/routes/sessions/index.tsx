import { ArchivedSessionsView } from "./view.js"
import { useRoute } from "../../context/route.js"
import { useSessions } from "../../context/sessions.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useSessionsRoute(): ScreenRoute {
  const route = useRoute()
  const sessions = useSessions()

  return {
    id: "archived",
    onKey: (key) => handleArchivedKey(key, route, sessions),
    render: () => <ArchivedScreen />,
  }
}

function ArchivedScreen() {
  return <ArchivedSessionsView />
}

function handleArchivedKey(key: KeyInput, route: ReturnType<typeof useRoute>, sessions: ReturnType<typeof useSessions>) {
  if (key.name === "escape" || key.name === "left" || key.name === "h") route.goOverview()
  if (key.name === "up" || key.name === "k") sessions.moveArchivedSessions(-1)
  if (key.name === "down" || key.name === "j") sessions.moveArchivedSessions(1)
  if (key.name === "r") sessions.refreshArchivedSessions()
  if (key.name === "l") route.openLogs()
  if (key.name === "s") sessions.startArchivedSearch()
  if (key.name === "space" || key.sequence === " ") sessions.toggleSelectedArchivedSession()
  if (key.name === "a") sessions.toggleSelectAllArchivedSessions()
  if (key.name === "u") sessions.requestUnarchiveSelectedSessions()
  if (key.name === "return" || key.name === "enter") sessions.previewArchivedSession()
}
