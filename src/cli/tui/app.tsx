// Stateful OpenTUI application shell: keyboard handling, flow state, and screen routing.
import { useKeyboard } from "@opentui/react"
import { useEffect, useState } from "react"
import { formatError } from "../../error.js"
import { runRepair } from "./actions.js"
import { commandPaletteItems, recommendedActionsFromState } from "./routes/overview/actions.js"
import { handleRouteKey } from "./runtime/keyboard.js"
import { useScreenRoutes } from "./runtime/router.js"
import { ToolkitShell } from "./runtime/shell.js"
import { overviewStatus } from "./util/status.js"
import { useSessionsState } from "./context/sessions-state.js"
import { useBackupsState } from "./context/backups-state.js"
import { useCommandPalette } from "./component/use-command-palette.js"
import { useConfirmation } from "./ui/use-confirmation.js"
import { useLogsState } from "./context/logs-state.js"
import { useOverviewState } from "./context/overview-state.js"
import { useToast } from "./ui/use-toast.js"
import { BackupsProvider } from "./context/backups.js"
import { useConfirmDialog } from "./ui/dialog-confirm.js"
import { HealthProvider } from "./context/health.js"
import { LogsProvider } from "./context/logs.js"
import { useLogs } from "./context/logs.js"
import { OverviewProvider } from "./context/overview.js"
import { OverlaysProvider } from "./context/overlays.js"
import { useOverlays } from "./context/overlays.js"
import { RepairProvider } from "./context/repair.js"
import { RouteProvider } from "./context/route.js"
import { useRoute } from "./context/route.js"
import { SessionsProvider } from "./context/sessions.js"
import { useSessions } from "./context/sessions.js"
import { emptyHealth, scanToolkitHealth } from "./health.js"
import { repairStatusDisplay } from "./util/repair-status.js"
import type { SidebarSection, View } from "./types.js"
import { ConfirmDialogProvider } from "./ui/dialog-confirm.js"
import { ToastProvider } from "./ui/toast.js"

export function ToolkitApp(props: { onExit: () => void }) {
  const [view, setView] = useState<View>("overview")
  const [status, setStatus] = useState("Checking OpenCode data...")
  const [health, setHealth] = useState(() => emptyHealth())
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [showSql, setShowSql] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const { toast, showToast } = useToast()
  const { confirmation, setConfirmation, handleConfirmationKey } = useConfirmation(setStatus)
  const sessionsValue = useSessionsState({
    health,
    quit,
    openLogs,
    setStatus,
    showToast,
    setConfirmation,
  })
  const backupsValue = useBackupsState({
    health,
    setStatus,
    showToast,
    setConfirmation,
    refreshHealth,
  })
  const logsValue = useLogsState({
    quit,
    openRepairDetail,
    setStatus,
    showToast,
  })

  const actions = recommendedActionsFromState(health, {
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
  })
  const overviewState = useOverviewState({
    actions,
    setStatus,
    refreshSectionPreview,
  })
  const restoreImplemented = false
  const commandItems = commandPaletteItems(health, {
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
    openSettings,
    requestCreateBackupConfirmation: backupsValue.actions.create,
    refreshHealth,
  })
  const { paletteOpen, paletteQuery, paletteSelected, visibleCommandItems, openCommandPalette, handlePaletteKey } = useCommandPalette(commandItems, {
    quit,
    setStatus,
  })

  const routeValue = {
    location: {
      view,
    },
    flags: {
      restoreImplemented,
    },
    actions: {
      quit,
      goOverview,
      openRepairDetail,
      openArchivedSessions,
      openLogs,
      openBackups,
      openSettings,
      refreshSectionPreview,
    },
  }
  const healthValue = {
    snapshot: health,
    status: {
      message: status,
      set: setStatus,
    },
    loading: loadingHealth,
    actions: {
      refresh: refreshHealth,
    },
  }
  const overviewValue = overviewState
  const repairValue = {
    sql: {
      visible: showSql,
      toggle: toggleSql,
    },
    actions: {
      dryRun: runDryRepair,
      requestApply: requestRepairConfirmation,
    },
  }
  const toastValue = {
    current: toast,
    actions: {
      show: showToast,
    },
  }
  const confirmValue = {
    current: confirmation,
    actions: {
      set: setConfirmation,
      handleKey: handleConfirmationKey,
    },
  }
  const overlaysValue = {
    help: {
      open: helpOpen,
      setOpen: setHelpOpen,
    },
    palette: {
      open: paletteOpen,
      query: paletteQuery,
      items: visibleCommandItems,
      selected: paletteSelected,
      openPalette: openCommandPalette,
      handleKey: handlePaletteKey,
    },
  }

  useEffect(() => {
    refreshHealth()
  }, [])

  function quit() {
    props.onExit()
  }

  function refreshHealth() {
    setLoadingHealth(true)
    scanToolkitHealth()
      .then((next) => {
        setHealth(next)
        if (view === "overview") {
          setStatus(overviewStatus(next))
          if (overviewState.section.current() === "Overview") {
            const nextActions = recommendedActionsFromState(next, {
              openRepairDetail,
              openArchivedSessions,
              openLogs,
              openBackups,
            })
            overviewState.action.selectFirstAvailable("Overview", nextActions)
          }
        }
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", message })
      })
      .finally(() => setLoadingHealth(false))
  }

  function refreshSectionPreview(section: SidebarSection) {
    if (section === "Sessions") sessionsValue.actions.refresh()
    if (section === "Logs") logsValue.actions.refresh()
    if (section === "Backups") backupsValue.actions.refresh()
  }

  function goOverview() {
    setView("overview")
    setStatus(overviewStatus(health))
  }

  function runDryRepair() {
    runRepair(setStatus, showToast, { dryRun: true, onComplete: refreshHealth })
  }

  function toggleSql() {
    setShowSql((current) => !current)
  }

  function openRepairDetail() {
    setView("repair-detail")
    setShowSql(false)
    setConfirmation(null)
    const display = repairStatusDisplay(health.workspaceRepair)
    setStatus(`${display.label}: ${display.description}`)
    if (display.status === "CHECK") refreshHealth()
  }

  function requestRepairConfirmation() {
    const display = repairStatusDisplay(health.workspaceRepair)
    if (display.status === "OK") {
      const message = "No repair needed. Run dry-run to inspect checks."
      setStatus(message)
      showToast({ variant: "info", message })
      return
    }
    if (display.status === "FAILED") {
      const message = "Repair unavailable because the check failed. Open logs or export a report."
      setStatus(message)
      showToast({ variant: "error", message })
      return
    }
    if (display.status === "CHECK") {
      const message = "Check has not completed yet. Refreshing health scan..."
      setStatus(message)
      showToast({ variant: "info", message })
      refreshHealth()
      return
    }
    if (display.status !== "DETECTED" && display.status !== "EXPERIMENTAL") {
      const message = "Repair is not available for the current status."
      setStatus(message)
      showToast({ variant: "warning", message })
      return
    }
    setConfirmation({
      id: "apply-repair",
      title: "Apply Workspace DB schema repair?",
      body: "This will modify your local OpenCode SQLite database.",
      targetPath: health.dbPath,
      backupStatus: health.backupStatus,
      plannedChangesCount: health.workspaceRepair.changes.length,
      warning: "Close OpenCode first if it is actively using this database.",
      onConfirm: () => runRepair(setStatus, showToast, { onComplete: refreshHealth }),
      onCancel: () => setStatus("Repair cancelled"),
    })
    setStatus("Confirm repair with Enter, or Esc to cancel")
  }

  function openLogs() {
    setView("logs")
    overviewState.section.set("Logs")
    logsValue.actions.refresh()
  }

  function openBackups() {
    setView("backups")
    overviewState.section.set("Backups")
    backupsValue.actions.refresh()
  }

  function openSettings() {
    setView("overview")
    overviewState.section.select("Settings")
  }

  function openArchivedSessions() {
    setView("archived")
    overviewState.section.set("Sessions")
    sessionsValue.actions.refresh()
  }

  return (
    <RouteProvider value={routeValue}>
      <HealthProvider value={healthValue}>
        <ToastProvider value={toastValue}>
          <ConfirmDialogProvider value={confirmValue}>
            <OverviewProvider value={overviewValue}>
              <SessionsProvider value={sessionsValue}>
                <LogsProvider value={logsValue}>
                  <BackupsProvider value={backupsValue}>
                    <RepairProvider value={repairValue}>
                      <OverlaysProvider value={overlaysValue}>
                        <ToolkitAppContent />
                      </OverlaysProvider>
                    </RepairProvider>
                  </BackupsProvider>
                </LogsProvider>
              </SessionsProvider>
            </OverviewProvider>
          </ConfirmDialogProvider>
        </ToastProvider>
      </HealthProvider>
    </RouteProvider>
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
