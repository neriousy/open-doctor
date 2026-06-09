import { useKeyboard } from "@opentui/react"
import { BackupsProvider } from "./context/backups.js"
import { HealthProvider } from "./context/health.js"
import { LogsProvider, useLogs } from "./context/logs.js"
import { OverviewProvider } from "./context/overview.js"
import { OverlaysProvider, useOverlays } from "./context/overlays.js"
import { RepairProvider } from "./context/repair.js"
import { RouteProvider, useRoute } from "./context/route.js"
import { SessionsProvider, useSessions } from "./context/sessions.js"
import { ToolkitShell } from "./runtime/shell.js"
import { handleRouteKey } from "./runtime/keyboard.js"
import { useScreenRoutes } from "./runtime/router.js"
import { ConfirmDialogProvider, useConfirmDialog } from "./ui/dialog-confirm.js"
import { ToastProvider } from "./ui/toast.js"

export function ToolkitApp(props: { onExit: () => void }) {
  return (
    <ToastProvider>
      <RouteProvider onExit={props.onExit}>
        <HealthProvider>
          <ConfirmDialogProvider>
            <SessionsProvider>
              <LogsProvider>
                <BackupsProvider>
                  <OverviewProvider>
                    <RepairProvider>
                      <OverlaysProvider>
                        <ToolkitAppContent />
                      </OverlaysProvider>
                    </RepairProvider>
                  </OverviewProvider>
                </BackupsProvider>
              </LogsProvider>
            </SessionsProvider>
          </ConfirmDialogProvider>
        </HealthProvider>
      </RouteProvider>
    </ToastProvider>
  )
}

function ToolkitAppContent() {
  const route = useRoute()
  const sessions = useSessions()
  const logs = useLogs()
  const overlays = useOverlays()
  const confirmation = useConfirmDialog()
  const routes = useScreenRoutes()

  useKeyboard((key) => {
    if (overlays.help.open) {
      if (key.name === "escape" || key.sequence === "?" || key.name === "q") {
        if (key.name === "q") route.actions.quit()
        else overlays.help.setOpen(false)
      }
      return
    }

    if (overlays.palette.open) {
      overlays.palette.handleKey(key)
      return
    }

    if (key.sequence === "?") {
      overlays.help.setOpen(true)
      return
    }

    if (key.name === "/" || key.sequence === "/" || key.name === "p") {
      overlays.palette.openPalette()
      return
    }

    if (route.location.view === "archived" && sessions.search.active) {
      sessions.search.handleKey(key)
      return
    }

    if (route.location.view === "logs" && logs.search.active) {
      logs.search.handleKey(key)
      return
    }

    if (key.name === "q") return route.actions.quit()

    if (confirmation.current) {
      confirmation.actions.handleKey(key)
      return
    }

    handleRouteKey(route.location.view, routes, key)
  })

  return <ToolkitShell />
}
