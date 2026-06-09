import { useEffect } from "react"
import { ArchivedSessionsView } from "./view.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { useSessions } from "../../context/sessions.js"
import { focusSidebar, handleSidebarKey } from "../../runtime/sidebar-navigation.js"
import type { KeyInput, ScreenRoute } from "../../runtime/keyboard.js"

export function useSessionsRoute(): ScreenRoute {
  const route = useRoute()
  const sessions = useSessions()
  const overview = useOverview()

  return {
    id: "archived",
    onKey: (key) => handleArchivedKey(key, route, sessions, overview),
    render: () => <ArchivedScreen />,
  }
}

function ArchivedScreen() {
  const sessions = useSessions()
  const overview = useOverview()
  useEffect(() => {
    overview.section.set("Sessions")
    sessions.actions.refresh()
  }, [])

  return <ArchivedSessionsView />
}

function handleArchivedKey(
  key: KeyInput,
  route: ReturnType<typeof useRoute>,
  sessions: ReturnType<typeof useSessions>,
  overview: ReturnType<typeof useOverview>,
) {
  if (sessions.search.active) return sessions.search.handleKey(key)
  if (handleSidebarKey(key, route, overview, "Sessions")) return

  if (key.name === "escape") return route.actions.goOverview()
  if (key.name === "left" || key.name === "h") return focusSidebar(overview, "Sessions")
  if (key.name === "up" || key.name === "k") return sessions.actions.move(-1)
  if (key.name === "down" || key.name === "j") return sessions.actions.move(1)
  if (key.name === "pageup") return sessions.actions.moveBy(-10)
  if (key.name === "pagedown") return sessions.actions.moveBy(10)
  if (key.name === "home") return sessions.actions.jump("start")
  if (key.name === "end") return sessions.actions.jump("end")
  if (key.name === "r") return sessions.actions.refresh()
  if (key.name === "l") return route.actions.openLogs()
  if (key.name === "s") return sessions.search.start()
  if (key.name === "space" || key.sequence === " ") return sessions.selection.toggleCurrent()
  if (key.name === "a") return sessions.selection.toggleAllVisible()
  if (key.name === "u") return sessions.actions.requestUnarchive()
  if (key.name === "return" || key.name === "enter") return sessions.selection.previewCurrent()
}
