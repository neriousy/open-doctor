import { useEffect } from "react"
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
  const sessions = useSessions()
  useEffect(() => {
    sessions.actions.refresh()
  }, [])

  return <ArchivedSessionsView />
}

function handleArchivedKey(key: KeyInput, route: ReturnType<typeof useRoute>, sessions: ReturnType<typeof useSessions>) {
  if (key.name === "escape" || key.name === "left" || key.name === "h") route.actions.goOverview()
  if (key.name === "up" || key.name === "k") sessions.actions.move(-1)
  if (key.name === "down" || key.name === "j") sessions.actions.move(1)
  if (key.name === "r") sessions.actions.refresh()
  if (key.name === "l") route.actions.openLogs()
  if (key.name === "s") sessions.search.start()
  if (key.name === "space" || key.sequence === " ") sessions.selection.toggleCurrent()
  if (key.name === "a") sessions.selection.toggleAllVisible()
  if (key.name === "u") sessions.actions.requestUnarchive()
  if (key.name === "return" || key.name === "enter") sessions.selection.previewCurrent()
}
