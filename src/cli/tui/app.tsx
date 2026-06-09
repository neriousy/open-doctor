// Stateful OpenTUI application shell: keyboard handling, flow state, and screen routing.
import { useKeyboard } from "@opentui/react"
import { useEffect, useState } from "react"
import { formatError } from "../../error.js"
import { runRepair } from "./actions.js"
import { actionIndexesForSection, commandPaletteItems, recommendedActionsFromState } from "./routes/overview/actions.js"
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
  const sessionsState = useSessionsState({
    health,
    quit,
    openLogs,
    setStatus,
    showToast,
    setConfirmation,
  })
  const {
    sessions,
    visibleArchivedSessions,
    sessionSelected,
    selectedSessionIds,
    previewSessionId,
    loading: loadingSessions,
    pendingUnarchive,
    archivedSearch,
    archivedSearchActive,
    refreshArchivedSessions,
    moveArchivedSessions,
    startArchivedSearch,
    handleArchivedSearchKey,
    toggleSelectedArchivedSession,
    toggleSelectAllArchivedSessions,
    previewArchivedSession,
    requestUnarchiveSelectedSessions,
  } = sessionsState
  const backupsState = useBackupsState({
    health,
    setStatus,
    showToast,
    setConfirmation,
    refreshHealth,
  })
  const {
    backups,
    selectedBackup,
    hoveredBackup,
    setHoveredBackup,
    loadingBackups,
    refreshBackups,
    moveBackups,
    selectBackup,
    requestCreateBackupConfirmation,
    verifySelectedBackup,
    copySelectedBackupPath,
  } = backupsState
  const logsState = useLogsState({
    quit,
    openRepairDetail,
    setStatus,
    showToast,
  })
  const {
    logSources,
    visibleLogEntries,
    selectedLogSource,
    selectedLogEntry,
    logsPane,
    logFilter,
    logSearch,
    logSearchActive,
    loadingLogs,
    hoveredLogSource,
    hoveredLogEntry,
    setHoveredLogSource,
    setHoveredLogEntry,
    refreshLogs,
    focusLogsPane,
    moveLogs,
    selectLogSource,
    selectLogEntry,
    cycleLogFilter,
    startLogSearch,
    handleLogSearchKey,
    moveSearchMatch,
    openRelatedRepairFromLog,
  } = logsState

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
  const visibleActionIndexes = actionIndexesForSection(actions, overviewState.activeSection)
  const restoreImplemented = false
  const commandItems = commandPaletteItems(health, {
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
    openSettings,
    requestCreateBackupConfirmation,
    refreshHealth,
  })
  const { paletteOpen, paletteQuery, paletteSelected, visibleCommandItems, openCommandPalette, handlePaletteKey } = useCommandPalette(commandItems, {
    quit,
    setStatus,
  })

  const routeValue = {
    view,
    restoreImplemented,
    quit,
    goOverview,
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
    openSettings,
    refreshSectionPreview,
  }
  const healthValue = { health, status, loadingHealth, setStatus, refreshHealth }
  const overviewValue = { actions, visibleActionIndexes, ...overviewState }
  const sessionsValue = {
    sessions,
    visibleArchivedSessions,
    sessionSelected,
    selectedSessionIds,
    previewSessionId,
    loadingSessions,
    pendingUnarchive,
    archivedSearch,
    archivedSearchActive,
    refreshArchivedSessions,
    moveArchivedSessions,
    startArchivedSearch,
    handleArchivedSearchKey,
    toggleSelectedArchivedSession,
    toggleSelectAllArchivedSessions,
    previewArchivedSession,
    requestUnarchiveSelectedSessions,
  }
  const backupsValue = {
    backups,
    selectedBackup,
    hoveredBackup,
    setHoveredBackup,
    loadingBackups,
    refreshBackups,
    moveBackups,
    selectBackup,
    requestCreateBackupConfirmation,
    verifySelectedBackup,
    copySelectedBackupPath,
  }
  const logsValue = {
    logSources,
    visibleLogEntries,
    selectedLogSource,
    selectedLogEntry,
    logsPane,
    logFilter,
    logSearch,
    logSearchActive,
    loadingLogs,
    hoveredLogSource,
    hoveredLogEntry,
    setHoveredLogSource,
    setHoveredLogEntry,
    refreshLogs,
    focusLogsPane,
    moveLogs,
    selectLogSource,
    selectLogEntry,
    cycleLogFilter,
    startLogSearch,
    handleLogSearchKey,
    moveSearchMatch,
    openRelatedRepairFromLog,
  }
  const repairValue = { showSql, runDryRepair, requestRepairConfirmation, toggleSql }
  const toastValue = { toast, showToast }
  const confirmValue = { confirmation, setConfirmation, handleConfirmationKey }
  const overlaysValue = {
    helpOpen,
    setHelpOpen,
    paletteOpen,
    paletteQuery,
    visibleCommandItems,
    paletteSelected,
    openCommandPalette,
    handlePaletteKey,
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
          if (overviewState.activeSectionCurrent() === "Overview") {
            const nextActions = recommendedActionsFromState(next, {
              openRepairDetail,
              openArchivedSessions,
              openLogs,
              openBackups,
            })
            overviewState.selectFirstAvailableAction("Overview", nextActions)
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
    if (section === "Sessions") refreshArchivedSessions()
    if (section === "Logs") refreshLogs()
    if (section === "Backups") refreshBackups()
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
    overviewState.setActiveSection("Logs")
    refreshLogs()
  }

  function openBackups() {
    setView("backups")
    overviewState.setActiveSection("Backups")
    refreshBackups()
  }

  function openSettings() {
    setView("overview")
    overviewState.selectSection("Settings")
  }

  function openArchivedSessions() {
    setView("archived")
    overviewState.setActiveSection("Sessions")
    refreshArchivedSessions()
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
    if (overlays.helpOpen) {
      if (key.name === "escape" || key.sequence === "?" || key.name === "q") {
        if (key.name === "q") route.quit()
        else overlays.setHelpOpen(false)
      }
      return
    }

    if (overlays.paletteOpen) {
      overlays.handlePaletteKey(key)
      return
    }

    if (key.sequence === "?") {
      overlays.setHelpOpen(true)
      return
    }

    if (key.name === "/" || key.sequence === "/" || key.name === "p") {
      overlays.openCommandPalette()
      return
    }

    if (route.view === "archived" && sessions.archivedSearchActive) {
      sessions.handleArchivedSearchKey(key)
      return
    }

    if (route.view === "logs" && logs.logSearchActive) {
      logs.handleLogSearchKey(key)
      return
    }

    if (key.name === "q") return route.quit()

    if (confirmation.confirmation) {
      confirmation.handleConfirmationKey(key)
      return
    }

    handleRouteKey(route.view, routes, key)
  })

  return <ToolkitShell />
}
