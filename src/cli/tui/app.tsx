// Stateful OpenTUI application shell: keyboard handling, flow state, and screen routing.
import { useKeyboard } from "@opentui/react"
import { useEffect, useRef, useState } from "react"
import { formatError } from "../../error.js"
import { runRepair } from "./actions.js"
import { actionIndexesForSection, commandPaletteItems, recommendedActionsFromState } from "./app/actions.js"
import { handleRouteKey, ScreenRouter } from "./app/router.js"
import { ToolkitShell } from "./app/shell.js"
import { overviewStatus } from "./app/status.js"
import { useArchivedSessionsController } from "./app/use-archived-sessions-controller.js"
import { useBackupsController } from "./app/use-backups-controller.js"
import { useCommandPalette } from "./app/use-command-palette.js"
import { useConfirmation } from "./app/use-confirmation.js"
import { useLogsController } from "./app/use-logs-controller.js"
import { useToast } from "./app/use-toast.js"
import { ArchivedSessionsView } from "./archived-sessions-view.js"
import { BackupsView } from "./backups-view.js"
import { emptyHealth, scanToolkitHealth } from "./health.js"
import { HomeView } from "./home-view.js"
import { LogsView } from "./logs-view.js"
import { SIDEBAR_ITEMS } from "./navigation.js"
import { repairStatusDisplay } from "./repair-status.js"
import { RepairDetailView } from "./repair-detail-view.js"
import type { OverviewAction, OverviewPane, SidebarSection, View } from "./types.js"

export function ToolkitApp(props: { onExit: () => void }) {
  const [selectedAction, setSelectedAction] = useState(0)
  const selectedActionRef = useRef(0)
  const [activeSection, setActiveSection] = useState<SidebarSection>("Overview")
  const activeSectionRef = useRef<SidebarSection>("Overview")
  const [focusedPane, setFocusedPane] = useState<OverviewPane>("actions")
  const focusedPaneRef = useRef<OverviewPane>("actions")
  const [hoveredSection, setHoveredSection] = useState<SidebarSection | null>(null)
  const [hoveredAction, setHoveredAction] = useState<number | null>(null)
  const [view, setView] = useState<View>("overview")
  const [status, setStatus] = useState("Checking OpenCode data...")
  const [health, setHealth] = useState(() => emptyHealth())
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [showSql, setShowSql] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const { toast, showToast } = useToast()
  const { confirmation, setConfirmation, handleConfirmationKey } = useConfirmation(setStatus)
  const archivedController = useArchivedSessionsController({
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
  } = archivedController
  const backupsController = useBackupsController({
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
  } = backupsController
  const logsController = useLogsController({
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
  } = logsController

  const actions = recommendedActionsFromState(health, {
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
  })
  const visibleActionIndexes = actionIndexesForSection(actions, activeSection)
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

  const routes = [
    {
      id: "overview" as const,
      onKey: handleOverviewKey,
      render: () => (
        <HomeView
          actions={actions}
          visibleActionIndexes={visibleActionIndexes}
          selected={selectedAction}
          activeSection={activeSection}
          focusedPane={focusedPane}
          hoveredSection={hoveredSection}
          hoveredAction={hoveredAction}
          health={health}
          sessions={sessions}
          logs={logSources}
          backups={backups}
          status={status}
          loading={loadingHealth}
          loadingSessions={loadingSessions}
          loadingLogs={loadingLogs}
          loadingBackups={loadingBackups}
          onSectionSelect={selectSection}
          onSectionHover={setHoveredSection}
          onActionSelect={inspectHomeAction}
          onActionHover={setHoveredAction}
        />
      ),
    },
    {
      id: "repair-detail" as const,
      onKey: handleRepairKey,
      render: () => <RepairDetailView health={health} status={status} showSql={showSql} />,
    },
    {
      id: "archived" as const,
      onKey: handleArchivedKey,
      render: () => (
        <ArchivedSessionsView
          sessions={visibleArchivedSessions}
          totalSessions={sessions.length}
          selected={sessionSelected}
          selectedIds={selectedSessionIds}
          previewSessionId={previewSessionId}
          loading={loadingSessions}
          pending={pendingUnarchive}
          databasePath={health.dbPath}
          searchQuery={archivedSearch}
          searchActive={archivedSearchActive}
        />
      ),
    },
    {
      id: "logs" as const,
      onKey: handleLogsKey,
      render: () => (
        <LogsView
          sources={logSources}
          entries={visibleLogEntries}
          selectedSource={selectedLogSource}
          selectedEntry={selectedLogEntry}
          focusedPane={logsPane}
          filter={logFilter}
          searchQuery={logSearch}
          searchActive={logSearchActive}
          loading={loadingLogs}
          hoveredSource={hoveredLogSource}
          hoveredEntry={hoveredLogEntry}
          onSourceSelect={selectLogSource}
          onSourceHover={setHoveredLogSource}
          onEntrySelect={selectLogEntry}
          onEntryHover={setHoveredLogEntry}
        />
      ),
    },
    {
      id: "backups" as const,
      onKey: handleBackupsKey,
      render: () => (
        <BackupsView
          backups={backups}
          selected={selectedBackup}
          loading={loadingBackups}
          hovered={hoveredBackup}
          restoreImplemented={restoreImplemented}
          onSelect={selectBackup}
          onHover={setHoveredBackup}
        />
      ),
    },
  ]

  useEffect(() => {
    refreshHealth()
  }, [])

  useKeyboard((key) => {
    if (helpOpen) {
      if (key.name === "escape" || key.sequence === "?" || key.name === "q") {
        if (key.name === "q") quit()
        else setHelpOpen(false)
      }
      return
    }

    if (paletteOpen) {
      handlePaletteKey(key)
      return
    }

    if (key.sequence === "?") {
      setHelpOpen(true)
      return
    }

    if (key.name === "/" || key.sequence === "/" || key.name === "p") {
      openCommandPalette()
      return
    }

    if (view === "archived" && archivedSearchActive) {
      handleArchivedSearchKey(key)
      return
    }

    if (view === "logs" && logSearchActive) {
      handleLogSearchKey(key)
      return
    }

    if (key.name === "q") return quit()

    if (confirmation) {
      handleConfirmationKey(key)
      return
    }

    handleRouteKey(view, routes, key)
  })

  function quit() {
    props.onExit()
  }

  function handleOverviewKey(key: { name?: string; sequence?: string }) {
    if (key.name === "escape") return quit()
    if (key.name === "left" || key.name === "h") return focusOverviewPane("sidebar")
    if (key.name === "right" || key.name === "l") return focusOverviewPane("actions")
    if (key.name === "up" || key.name === "k") return moveOverview(-1)
    if (key.name === "down" || key.name === "j") return moveOverview(1)
    if (key.name === "1") openRepairDetail()
    if (key.name === "2") openArchivedSessions()
    if (key.name === "3") openLogs()
    if (key.name === "4") openBackups()
    if (key.name === "return" || key.name === "enter") openFocusedOverviewAction()
  }

  function handleRepairKey(key: { name?: string; sequence?: string }) {
    if (key.name === "escape" || key.name === "left" || key.name === "h") {
      setView("overview")
      setStatus(overviewStatus(health))
    }
    if (key.name === "d") runRepair(setStatus, showToast, { dryRun: true, onComplete: refreshHealth })
    if (key.name === "r") requestRepairConfirmation()
    if (key.name === "s") setShowSql((current) => !current)
    if (key.name === "b") requestCreateBackupConfirmation()
  }

  function handleArchivedKey(key: { name?: string; sequence?: string }) {
    if (key.name === "escape" || key.name === "left" || key.name === "h") {
      setView("overview")
      setStatus(overviewStatus(health))
    }
    if (key.name === "up" || key.name === "k") moveArchivedSessions(-1)
    if (key.name === "down" || key.name === "j") moveArchivedSessions(1)
    if (key.name === "r") refreshArchivedSessions()
    if (key.name === "l") openLogs()
    if (key.name === "s") startArchivedSearch()
    if (key.name === "space" || key.sequence === " ") toggleSelectedArchivedSession()
    if (key.name === "a") toggleSelectAllArchivedSessions()
    if (key.name === "u") requestUnarchiveSelectedSessions()
    if (key.name === "return" || key.name === "enter") previewArchivedSession()
  }

  function handleLogsKey(key: { name?: string; sequence?: string }) {
    if (key.name === "escape") {
      setView("overview")
      setStatus(overviewStatus(health))
    }
    if (key.name === "left" || key.name === "h") focusLogsPane("sources")
    if (key.name === "right" || key.name === "l") focusLogsPane("entries")
    if (key.name === "up" || key.name === "k") moveLogs(-1)
    if (key.name === "down" || key.name === "j") moveLogs(1)
    if (key.name === "r") refreshLogs()
    if (key.name === "f") cycleLogFilter()
    if (key.name === "s") startLogSearch()
    if (key.name === "n" && key.sequence !== "N") moveSearchMatch(1)
    if (key.sequence === "N") moveSearchMatch(-1)
    if (key.name === "return" || key.name === "enter") openRelatedRepairFromLog()
  }

  function handleBackupsKey(key: { name?: string; sequence?: string }) {
    if (key.name === "escape" || key.name === "left" || key.name === "h") {
      setView("overview")
      setStatus(overviewStatus(health))
    }
    if (key.name === "up" || key.name === "k") moveBackups(-1)
    if (key.name === "down" || key.name === "j") moveBackups(1)
    if (key.name === "r") refreshBackups()
    if (key.name === "c") requestCreateBackupConfirmation()
    if (key.name === "v") verifySelectedBackup()
    if (key.name === "y") copySelectedBackupPath()
  }

  function refreshHealth() {
    setLoadingHealth(true)
    scanToolkitHealth()
      .then((next) => {
        setHealth(next)
        if (view === "overview") {
          setStatus(overviewStatus(next))
          if (activeSectionRef.current === "Overview") {
            const nextActions = recommendedActionsFromState(next, {
              openRepairDetail,
              openArchivedSessions,
              openLogs,
              openBackups,
            })
            const first = actionIndexesForSection(nextActions, "Overview")[0]
            if (first !== undefined) {
              selectedActionRef.current = first
              setSelectedAction(first)
            }
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

  function focusOverviewPane(pane: OverviewPane) {
    setFocusedPane(pane)
    focusedPaneRef.current = pane
  }

  function moveOverview(direction: 1 | -1) {
    if (focusedPaneRef.current === "sidebar") {
      moveSidebar(direction)
      return
    }
    moveHome(direction)
  }

  function moveSidebar(direction: 1 | -1) {
    const currentIndex = SIDEBAR_ITEMS.indexOf(activeSectionRef.current)
    const next = SIDEBAR_ITEMS[(currentIndex + direction + SIDEBAR_ITEMS.length) % SIDEBAR_ITEMS.length]
    if (!next) return
    selectSection(next)
  }

  function moveHome(direction: 1 | -1) {
    const indexes = actionIndexesForSection(actions, activeSectionRef.current)
    if (indexes.length === 0) return
    const currentVisibleIndex = Math.max(0, indexes.indexOf(selectedActionRef.current))
    const next = indexes[(currentVisibleIndex + direction + indexes.length) % indexes.length]
    if (next === undefined) return
    selectedActionRef.current = next
    setSelectedAction(next)
  }

  function openFocusedOverviewAction() {
    const indexes = actionIndexesForSection(actions, activeSectionRef.current)
    if (indexes.length === 0) {
      setStatus(`${activeSectionRef.current} is planned - no tools are wired yet`)
      return
    }

    const selected = indexes.includes(selectedActionRef.current) ? selectedActionRef.current : indexes[0]
    if (selected === undefined) return
    selectedActionRef.current = selected
    setSelectedAction(selected)
    actions[selected]?.run()
  }

  function selectHomeAction(index: number, items: OverviewAction[]) {
    selectedActionRef.current = index
    setSelectedAction(index)
    setActiveSection(items[index]?.section ?? "Overview")
    activeSectionRef.current = items[index]?.section ?? "Overview"
    focusOverviewPane("actions")
    items[index]?.run()
  }

  function inspectHomeAction(index: number) {
    selectedActionRef.current = index
    setSelectedAction(index)
    setActiveSection(actions[index]?.section ?? "Overview")
    activeSectionRef.current = actions[index]?.section ?? "Overview"
    focusOverviewPane("actions")
    actions[index]?.run()
  }

  function selectSection(section: SidebarSection) {
    setActiveSection(section)
    activeSectionRef.current = section
    focusOverviewPane("sidebar")
    setHoveredSection(null)
    const indexes = actionIndexesForSection(actions, section)
    const next = indexes[0]
    if (next !== undefined) {
      selectedActionRef.current = next
      setSelectedAction(next)
      setStatus(`Selected ${section} - Press Enter to open ${actions[next]?.title}`)
      refreshSectionPreview(section)
      return
    }
    setStatus(`${section} is planned - no tools are wired yet`)
    refreshSectionPreview(section)
  }

  function refreshSectionPreview(section: SidebarSection) {
    if (section === "Sessions") refreshArchivedSessions()
    if (section === "Logs") refreshLogs()
    if (section === "Backups") refreshBackups()
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
    setActiveSection("Logs")
    activeSectionRef.current = "Logs"
    refreshLogs()
  }

  function openBackups() {
    setView("backups")
    setActiveSection("Backups")
    activeSectionRef.current = "Backups"
    refreshBackups()
  }

  function openSettings() {
    setView("overview")
    selectSection("Settings")
  }

  function openArchivedSessions() {
    setView("archived")
    setActiveSection("Sessions")
    activeSectionRef.current = "Sessions"
    refreshArchivedSessions()
  }

  return (
    <ToolkitShell
      health={health}
      view={view}
      activeSection={activeSection}
      confirmation={confirmation}
      restoreImplemented={restoreImplemented}
      main={<ScreenRouter view={view} routes={routes} />}
      toast={toast}
      helpOpen={helpOpen}
      paletteOpen={paletteOpen}
      paletteQuery={paletteQuery}
      visibleCommandItems={visibleCommandItems}
      paletteSelected={paletteSelected}
    />
  )
}
