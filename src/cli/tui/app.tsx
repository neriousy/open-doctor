// Stateful OpenTUI application shell: keyboard handling, flow state, and screen routing.
import { useKeyboard } from "@opentui/react"
import { useEffect, useRef, useState } from "react"
import { Effect } from "effect"
import { formatError } from "../../error.js"
import { createBackup, listBackups } from "../../utils/backups.js"
import type { BackupFile } from "../../utils/backups.js"
import { discoverLogSources, readLogEntries } from "../../utils/logs.js"
import type { LogEntry, LogSource } from "../../utils/logs.js"
import { listArchivedSessions } from "../../utils/sessions.js"
import type { ArchivedSession } from "../../utils/sessions.js"
import { resolveDbArg } from "../input.js"
import { runRepair, runUnarchiveInChild } from "./actions.js"
import { ArchivedSessionsView } from "./archived-sessions-view.js"
import { BackupsView } from "./backups-view.js"
import { ConfirmationModal } from "./confirmation-modal.js"
import { sessionTitle } from "./format.js"
import type { RepairStatus, ToolkitHealth } from "./health.js"
import { emptyHealth, scanToolkitHealth } from "./health.js"
import { HomeView, SIDEBAR_ITEMS } from "./home-view.js"
import { LogsView } from "./logs-view.js"
import { repairStatusDisplay } from "./repair-status.js"
import { RepairDetailView } from "./repair-detail-view.js"
import { ToastView } from "./toast-view.js"
import type { ConfirmationRequest, LogFilter, LogsPane, OverviewAction, OverviewPane, SidebarSection, ToastInput, ToastState, View } from "./types.js"

export function ToolkitApp(props: { onExit: () => void }) {
  const [selectedAction, setSelectedAction] = useState(0)
  const selectedActionRef = useRef(0)
  const [activeSection, setActiveSection] = useState<SidebarSection>("Overview")
  const activeSectionRef = useRef<SidebarSection>("Overview")
  const [focusedPane, setFocusedPane] = useState<OverviewPane>("actions")
  const focusedPaneRef = useRef<OverviewPane>("actions")
  const [hoveredSection, setHoveredSection] = useState<SidebarSection | null>(null)
  const [hoveredAction, setHoveredAction] = useState<number | null>(null)
  const [sessionSelected, setSessionSelected] = useState(0)
  const [view, setView] = useState<View>("overview")
  const [status, setStatus] = useState("Checking OpenCode data...")
  const [health, setHealth] = useState(() => emptyHealth())
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [sessions, setSessions] = useState<ArchivedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUnarchive, setPendingUnarchive] = useState(0)
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [selectedBackup, setSelectedBackup] = useState(0)
  const selectedBackupRef = useRef(0)
  const [hoveredBackup, setHoveredBackup] = useState<number | null>(null)
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [logSources, setLogSources] = useState<LogSource[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [selectedLogSource, setSelectedLogSource] = useState(0)
  const selectedLogSourceRef = useRef(0)
  const [selectedLogEntry, setSelectedLogEntry] = useState(0)
  const selectedLogEntryRef = useRef(0)
  const [logsPane, setLogsPane] = useState<LogsPane>("entries")
  const logsPaneRef = useRef<LogsPane>("entries")
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logFilter, setLogFilter] = useState<LogFilter>("ALL")
  const logFilterRef = useRef<LogFilter>("ALL")
  const [logSearch, setLogSearch] = useState("")
  const logSearchRef = useRef("")
  const [logSearchActive, setLogSearchActive] = useState(false)
  const [hoveredLogSource, setHoveredLogSource] = useState<number | null>(null)
  const [hoveredLogEntry, setHoveredLogEntry] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showSql, setShowSql] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  const actions = recommendedActionsFromState(health, {
    openRepairDetail,
    openArchivedSessions,
    openLogs,
    openBackups,
  })
  const visibleActionIndexes = actionIndexesForSection(actions, activeSection)
  const visibleLogEntries = filteredLogEntries(logEntries, logFilter, logSearch)

  useEffect(() => {
    refreshHealth()
  }, [])

  useEffect(() => {
    if (sessionSelected >= sessions.length) setSessionSelected(Math.max(0, sessions.length - 1))
  }, [sessionSelected, sessions.length])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  useKeyboard((key) => {
    if (view === "logs" && logSearchActive) {
      handleLogSearchKey(key)
      return
    }

    if (key.name === "q") return quit()

    if (confirmation) {
      handleConfirmationKey(key)
      return
    }

    if (view === "archived") {
      if (key.name === "escape" || key.name === "left" || key.name === "h") {
        setView("overview")
        setStatus(overviewStatus(health))
      }
      if (key.name === "up" || key.name === "k") setSessionSelected((current) => Math.max(0, current - 1))
      if (key.name === "down" || key.name === "j") {
        setSessionSelected((current) => Math.max(0, Math.min(sessions.length - 1, current + 1)))
      }
      if (key.name === "r") refreshArchivedSessions()
      if (key.name === "l") openLogs()
      if (key.name === "return" || key.name === "enter" || key.name === "u") unarchiveSelectedSession()
      return
    }

    if (view === "repair-detail") {
      if (key.name === "escape" || key.name === "left" || key.name === "h") {
        setView("overview")
        setStatus(overviewStatus(health))
      }
      if (key.name === "d") runRepair(setStatus, showToast, { dryRun: true, onComplete: refreshHealth })
      if (key.name === "r") requestRepairConfirmation()
      if (key.name === "s") setShowSql((current) => !current)
      if (key.name === "b") requestCreateBackupConfirmation()
      return
    }

    if (view === "logs") {
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
      if (key.name === "/" || key.sequence === "/") startLogSearch()
      if (key.name === "n" && key.sequence !== "N") moveSearchMatch(1)
      if (key.sequence === "N") moveSearchMatch(-1)
      if (key.name === "return" || key.name === "enter") openRelatedRepairFromLog()
      return
    }

    if (view === "backups") {
      if (key.name === "escape" || key.name === "left" || key.name === "h") {
        setView("overview")
        setStatus(overviewStatus(health))
      }
      if (key.name === "up" || key.name === "k") moveBackups(-1)
      if (key.name === "down" || key.name === "j") moveBackups(1)
      if (key.name === "r") refreshBackups()
      if (key.name === "c") requestCreateBackupConfirmation()
      return
    }

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
  })

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

  function showToast(input: ToastInput) {
    const next = { ...input, duration: input.duration ?? 4000 }
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), next.duration)
    toastTimer.current.unref()
  }

  function handleConfirmationKey(key: { name?: string; sequence?: string }) {
    if (!confirmation) return
    if (key.name === "escape") {
      cancelConfirmation()
      return
    }

    if (confirmation.requireText) {
      if (key.name === "backspace" || key.name === "delete") {
        setConfirmation({ ...confirmation, input: (confirmation.input ?? "").slice(0, -1) })
        return
      }
      if (key.name === "return" || key.name === "enter") {
        if ((confirmation.input ?? "") === confirmation.requireText) confirmCurrentAction()
        else setStatus(`Type ${confirmation.requireText} to confirm`)
        return
      }
      if (key.sequence && key.sequence.length === 1 && /^[ -~]$/.test(key.sequence)) {
        setConfirmation({ ...confirmation, input: `${confirmation.input ?? ""}${key.sequence}` })
      }
      return
    }

    if (key.name === "return" || key.name === "enter") confirmCurrentAction()
  }

  function confirmCurrentAction() {
    const current = confirmation
    if (!current) return
    setConfirmation(null)
    current.onConfirm()
  }

  function cancelConfirmation() {
    const current = confirmation
    setConfirmation(null)
    current?.onCancel?.()
    setStatus("Action cancelled")
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

  function openArchivedSessions() {
    setView("archived")
    setActiveSection("Sessions")
    activeSectionRef.current = "Sessions"
    refreshArchivedSessions()
  }

  function refreshBackups() {
    setLoadingBackups(true)
    try {
      const next = listBackups(resolveDbArg())
      setBackups(next)
      const selected = Math.max(0, Math.min(selectedBackupRef.current, next.length - 1))
      selectedBackupRef.current = selected
      setSelectedBackup(selected)
      setStatus(next.length === 0 ? "No backup files found" : `${next.length} backup file(s), newest first`)
    } catch (error: unknown) {
      const message = formatError(error)
      setStatus(message)
      showToast({ variant: "error", title: "Backup refresh failed", message })
    } finally {
      setLoadingBackups(false)
    }
  }

  function moveBackups(direction: 1 | -1) {
    const next = Math.max(0, Math.min(backups.length - 1, selectedBackupRef.current + direction))
    selectedBackupRef.current = next
    setSelectedBackup(next)
  }

  function selectBackup(index: number) {
    selectedBackupRef.current = index
    setSelectedBackup(index)
  }

  function requestCreateBackupConfirmation() {
    setConfirmation({
      id: "create-backup",
      title: "Create OpenCode database backup?",
      body: "This will read your local OpenCode SQLite database and write a backup file next to it.",
      targetPath: health.dbPath,
      backupStatus: health.backupStatus,
      plannedChangesCount: 1,
      warning: "Close OpenCode first if it is actively writing to this database.",
      onConfirm: createManualBackup,
      onCancel: () => setStatus("Backup cancelled"),
    })
    setStatus("Confirm backup with Enter, or Esc to cancel")
  }

  function createManualBackup() {
    setLoadingBackups(true)
    setStatus("Creating database backup...")
    Effect.runPromise(createBackup(resolveDbArg()))
      .then((filename) => {
        setStatus(`Backup created: ${filename}`)
        showToast({ variant: "success", title: "Backup created", message: filename })
        refreshBackups()
        refreshHealth()
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", title: "Backup failed", message })
      })
      .finally(() => setLoadingBackups(false))
  }

  function refreshLogs() {
    setLoadingLogs(true)
    setStatus("Refreshing log sources...")
    try {
      const sources = discoverLogSources(resolveDbArg())
      setLogSources(sources)
      const sourceIndex = Math.max(0, Math.min(selectedLogSourceRef.current, sources.length - 1))
      selectedLogSourceRef.current = sourceIndex
      setSelectedLogSource(sourceIndex)
      loadLogEntries(sources[sourceIndex], logFilterRef.current)
      setStatus(sources.length === 0 ? "No log sources found" : `${sources.length} log source(s) found`)
    } catch (error: unknown) {
      const message = formatError(error)
      setStatus(message)
      showToast({ variant: "error", title: "Logs refresh failed", message })
    } finally {
      setLoadingLogs(false)
    }
  }

  function loadLogEntries(source: LogSource | undefined, filter: LogFilter) {
    if (!source) {
      setLogEntries([])
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      return
    }

    try {
      const entries = readLogEntries(source)
      setLogEntries(entries)
      const filtered = filteredLogEntries(entries, filter, logSearchRef.current)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(filtered.length === 0 ? 0 : 0)
    } catch (error: unknown) {
      const message = formatError(error)
      setLogEntries([])
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      setStatus(message)
      showToast({ variant: "error", title: "Log read failed", message })
    }
  }

  function focusLogsPane(pane: LogsPane) {
    setLogsPane(pane)
    logsPaneRef.current = pane
  }

  function moveLogs(direction: 1 | -1) {
    if (logsPaneRef.current === "sources") {
      const next = Math.max(0, Math.min(logSources.length - 1, selectedLogSourceRef.current + direction))
      selectLogSource(next)
      return
    }

    const next = Math.max(0, Math.min(visibleLogEntries.length - 1, selectedLogEntryRef.current + direction))
    selectedLogEntryRef.current = next
    setSelectedLogEntry(next)
  }

  function selectLogSource(index: number) {
    const source = logSources[index]
    if (!source) return
    selectedLogSourceRef.current = index
    setSelectedLogSource(index)
    focusLogsPane("sources")
    loadLogEntries(source, logFilterRef.current)
    setStatus(`Selected log source: ${source.label}`)
  }

  function selectLogEntry(index: number) {
    selectedLogEntryRef.current = index
    setSelectedLogEntry(index)
    focusLogsPane("entries")
  }

  function cycleLogFilter() {
    const next = nextLogFilter(logFilterRef.current)
    logFilterRef.current = next
    setLogFilter(next)
    selectedLogEntryRef.current = 0
    setSelectedLogEntry(0)
    setStatus(next === "SEARCH" && logSearchRef.current.length === 0 ? "Log filter: SEARCH. Press / to enter a query" : `Log filter: ${next}`)
  }

  function startLogSearch() {
    logFilterRef.current = "SEARCH"
    setLogFilter("SEARCH")
    setLogSearchActive(true)
    setStatus("Search logs: type query, Enter to apply, Esc to cancel")
  }

  function handleLogSearchKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      setLogSearchActive(false)
      setStatus("Search cancelled")
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      setLogSearchActive(false)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      setStatus(logSearchRef.current ? `Search logs: ${logSearchRef.current}` : "Search logs: empty query")
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      const next = logSearchRef.current.slice(0, -1)
      logSearchRef.current = next
      setLogSearch(next)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      const next = `${logSearchRef.current}${sequence}`
      logSearchRef.current = next
      setLogSearch(next)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
    }
  }

  function moveSearchMatch(direction: 1 | -1) {
    if (logFilterRef.current !== "SEARCH") {
      logFilterRef.current = "SEARCH"
      setLogFilter("SEARCH")
    }
    const targetEntries = filteredLogEntries(logEntries, "SEARCH", logSearchRef.current)
    if (logSearchRef.current.length === 0 || targetEntries.length === 0) {
      setStatus("No search query")
      return
    }
    const current = selectedLogEntryRef.current
    const matches = targetEntries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => rowMatchesSearch(entry, logSearchRef.current))
      .map(({ index }) => index)
    if (matches.length === 0) {
      setStatus(`No matches for ${logSearchRef.current}`)
      return
    }
    const next = direction > 0
      ? matches.find((index) => index > current) ?? matches[0]
      : [...matches].reverse().find((index) => index < current) ?? matches[matches.length - 1]
    if (next === undefined) return
    selectedLogEntryRef.current = next
    setSelectedLogEntry(next)
    focusLogsPane("entries")
  }

  function openRelatedRepairFromLog() {
    const entry = visibleLogEntries[selectedLogEntry]
    if (!entry) return
    if (!isWorkspaceRepairLog(entry)) {
      setStatus("No related repair is mapped for this log entry")
      return
    }
    openRepairDetail()
  }

  function refreshArchivedSessions() {
    setLoading(true)
    setStatus("Refreshing archived sessions...")
    Effect.runPromise(listArchivedSessions(resolveDbArg()))
      .then((next) => {
        setSessions(next)
        setSessionSelected(0)
        setStatus(next.length === 0 ? "No archived sessions found" : `${next.length} archived session(s), newest first`)
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", message })
      })
      .finally(() => setLoading(false))
  }

  function unarchiveSelectedSession() {
    const session = sessions[sessionSelected]
    if (!session) return
    setConfirmation({
      id: "unarchive-session",
      title: "Unarchive OpenCode session?",
      body: "This will modify your local OpenCode SQLite database.",
      targetPath: health.dbPath,
      backupStatus: health.backupStatus,
      plannedChangesCount: 1,
      warning: "Close OpenCode first if it is actively using this database.",
      onConfirm: () => applyUnarchiveSession(session, sessionSelected),
      onCancel: () => setStatus("Unarchive cancelled"),
    })
    setStatus("Confirm unarchive with Enter, or Esc to cancel")
  }

  function applyUnarchiveSession(session: ArchivedSession, index: number) {
    const db = resolveDbArg()
    setSessions((current) => current.filter((item) => item.id !== session.id))
    setSessionSelected((current) => Math.max(0, Math.min(current, sessions.length - 2)))
    setPendingUnarchive((current) => current + 1)
    setStatus(`Unarchiving ${session.id} in the background...`)
    showToast({ variant: "info", title: "Unarchiving session", message: sessionTitle(session), duration: 2500 })

    runUnarchiveInChild(session.id, db)
      .then((result) => {
        if (result.code !== 0) {
          restoreSession(session, index)
          const message = result.stderr.trim() || result.stdout.trim() || `Failed to unarchive ${session.id}`
          setStatus(message)
          showToast({ variant: "error", title: "Unarchive failed", message })
          return
        }

        if (result.stdout.includes("No archived session found")) {
          restoreSession(session, index)
          setStatus(`No archived session found for ${session.id}`)
          showToast({ variant: "warning", message: `No archived session found for ${sessionTitle(session)}` })
          return
        }

        setStatus(`Unarchived ${session.id}`)
        showToast({ variant: "success", title: "Session unarchived", message: sessionTitle(session) })
      })
      .catch((error: unknown) => {
        restoreSession(session, index)
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", title: "Unarchive failed", message })
      })
      .finally(() => setPendingUnarchive((current) => Math.max(0, current - 1)))
  }

  function restoreSession(session: ArchivedSession, index: number) {
    setSessions((current) => {
      if (current.some((item) => item.id === session.id)) return current
      const next = current.slice()
      next.splice(Math.min(index, next.length), 0, session)
      return next
    })
  }

  return (
    <box id="root" flexDirection="column" width="100%" height="100%" padding={1} backgroundColor="#0f1419">
      <box id="header" height={5} border borderColor="#263544" paddingLeft={2} paddingRight={2} paddingTop={1}>
        <text id="title" fg="#d6deeb" height={1}>
          Open Doctor
        </text>
        <text id="subtitle" fg="#7893ad" height={1}>
          {`${health.dataDir} | Health: ${health.issueCount} issue(s) | Backup: ${health.backupStatus}`}
        </text>
      </box>

      {view === "archived" ? (
        <ArchivedSessionsView sessions={sessions} selected={sessionSelected} loading={loading} pending={pendingUnarchive} databasePath={health.dbPath} />
      ) : view === "repair-detail" ? (
        <RepairDetailView health={health} status={status} showSql={showSql} />
      ) : view === "logs" ? (
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
      ) : view === "backups" ? (
        <BackupsView
          backups={backups}
          selected={selectedBackup}
          loading={loadingBackups}
          hovered={hoveredBackup}
          onSelect={selectBackup}
          onHover={setHoveredBackup}
        />
      ) : (
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
          loadingSessions={loading}
          loadingLogs={loadingLogs}
          loadingBackups={loadingBackups}
          onSectionSelect={selectSection}
          onSectionHover={setHoveredSection}
          onActionSelect={inspectHomeAction}
          onActionHover={setHoveredAction}
        />
      )}

      <box id="footer" height={2} marginTop={1} paddingLeft={1}>
        <text id="controls" fg="#7893ad">
          {view === "archived"
            ? "up/down move - enter/u unarchive - r refresh - esc back - q quit"
            : view === "repair-detail"
              ? repairFooter(health.workspaceRepair.status, confirmation?.id === "apply-repair")
              : view === "logs"
                ? "left/right pane - up/down move - f filter - / search - n/N match - r refresh - enter related repair - esc back - q quit"
                : view === "backups"
                  ? "up/down move - c create backup - r refresh - esc back - q quit"
                  : overviewFooter(activeSection)}
        </text>
      </box>

      {toast ? <ToastView toast={toast} /> : null}
      {confirmation ? <ConfirmationModal confirmation={confirmation} /> : null}
    </box>
  )
}

function overviewStatus(health: { issueCount: number }) {
  return `Ready - ${health.issueCount} issue(s) detected - Press Enter to inspect the selected action`
}

function actionIndexesForSection(actions: OverviewAction[], section: SidebarSection) {
  if (section === "Overview") return actions.map((_, index) => index).sort((left, right) => actions[left]!.priority - actions[right]!.priority)
  return actions.flatMap((action, index) => (action.section === section ? [index] : []))
}

function recommendedActionsFromState(
  health: ToolkitHealth,
  routes: {
    openRepairDetail: () => void
    openArchivedSessions: () => void
    openLogs: () => void
    openBackups: () => void
  },
): OverviewAction[] {
  const repair = repairStatusDisplay(health.workspaceRepair)
  const backupWarning = health.backupCount === 0 || health.backupStatus !== "created today"
  const logIssueCount = health.logErrorCount + health.logWarningCount

  return [
    {
      id: "workspace-repair",
      section: "Repairs",
      category: repair.category,
      status: repair.status,
      title: repair.label,
      description: repair.description,
      actionHint: repair.actionHint,
      details:
        repair.status === "OK"
          ? "Workspace schema check passed. No repair is currently needed."
          : repair.status === "DETECTED"
            ? "A known workspace migration problem is present and a repair path is available."
            : "Review the workspace schema check before changing the database.",
      target: "opencode.db",
      targetRoute: "repair-detail",
      safety:
        repair.status === "DETECTED" || repair.status === "EXPERIMENTAL"
          ? "Backup before apply"
          : "Read-only check",
      hotkey: "1",
      priority: repair.priority,
      run: routes.openRepairDetail,
    },
    {
      id: "logs",
      section: "Logs",
      category: "Logs",
      status: health.logSourceCount > 0 ? "LOGS" : "MISSING",
      title: logIssueCount > 0 ? "Review recent errors" : "View logs",
      description:
        health.logSourceCount > 0
          ? `${countLabel(health.logSourceCount, "log file")} - ${countLabel(health.logErrorCount, "error")} - ${countLabel(health.logWarningCount, "warning")}`
          : "No OpenCode log sources found in known locations.",
      actionHint: "Enter to inspect logs",
      details: "Inspect raw OpenCode log tails by source and filter by level.",
      target: "log sources",
      targetRoute: "logs",
      safety: "Read-only",
      hotkey: "3",
      priority: logIssueCount > 0 ? 20 : 45,
      run: routes.openLogs,
    },
    {
      id: "archived-sessions",
      section: "Sessions",
      category: "Sessions",
      status: health.archivedCount > 0 ? "UTILITY" : "OK",
      title: health.archivedCount > 0 ? "Review archived sessions" : "Browse sessions",
      description:
        health.archivedCount > 0
          ? `${health.archivedCount} archived session(s), newest archived first`
          : "No archived sessions detected",
      actionHint: "Enter to browse sessions",
      details: "Preview and restore archived OpenCode sessions from the database.",
      target: "session table",
      targetRoute: "archived",
      safety: "Backup before restore",
      hotkey: "2",
      priority: health.archivedCount > 0 ? 30 : 55,
      run: routes.openArchivedSessions,
    },
    {
      id: "backups",
      section: "Backups",
      category: "Backups",
      status: backupWarning ? "WARN" : "BACKUP",
      title: backupWarning ? "Create a database backup" : "Review database backups",
      description:
        health.backupCount === 0
          ? "No toolkit backups found"
          : `${countLabel(health.backupCount, "backup")} - latest ${health.backupStatus}`,
      actionHint: backupWarning ? "Enter to inspect backups" : "Enter to review backups",
      details: "Review toolkit-created SQLite backups. Restore will require explicit confirmation.",
      target: "opencode.db",
      targetRoute: "backups",
      safety: "Read-only until c creates a backup",
      hotkey: "4",
      priority: backupWarning ? 40 : 60,
      run: routes.openBackups,
    },
  ]
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

function overviewFooter(section: SidebarSection) {
  if (section === "Overview") return "left/right pane - up/down move - enter open - 1 repair - 2 sessions - 3 logs - 4 backups - q quit"
  if (section === "Repairs") return "enter inspect repair - d in repair view dry-run - r in repair view apply - left sidebar - q quit"
  if (section === "Sessions") return "enter browse sessions - 2 open sessions - left sidebar - up/down section - q quit"
  if (section === "Logs") return "enter open log viewer - 3 logs - f in viewer filter - left sidebar - q quit"
  if (section === "Backups") return "enter open backups - 4 backups - c in backups view create - left sidebar - q quit"
  return "settings planned - left sidebar - up/down section - q quit"
}

function repairFooter(status: RepairStatus, confirmRepair: boolean) {
  if (confirmRepair) return "enter confirm - esc cancel - q quit"
  if (status === "DETECTED" || status === "EXPERIMENTAL") {
    return "d dry run - r repair - s show sql - b create backup - esc back - q quit"
  }
  return "d dry run - s show sql - b create backup - esc back - q quit"
}

function filteredLogEntries(entries: LogEntry[], filter: LogFilter, search: string) {
  if (filter === "ALL") return entries
  if (filter === "ERRORS") return entries.filter((entry) => entry.inheritedSeverity === "ERROR")
  if (filter === "WARNINGS") return entries.filter((entry) => entry.inheritedSeverity === "WARN")

  const query = search.trim().toLowerCase()
  if (!query) return entries
  const matchingEntryIds = new Set(entries.filter((entry) => rowMatchesSearch(entry, query)).map((entry) => entry.entryId))
  return entries.filter((entry) => matchingEntryIds.has(entry.entryId))
}

function nextLogFilter(current: LogFilter): LogFilter {
  if (current === "ALL") return "ERRORS"
  if (current === "ERRORS") return "WARNINGS"
  if (current === "WARNINGS") return "SEARCH"
  return "ALL"
}

function rowMatchesSearch(entry: LogEntry, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return false
  return [entry.raw, entry.text, entry.message, entry.parentMessage, entry.service]
    .some((value) => value.toLowerCase().includes(query))
}

function isWorkspaceRepairLog(entry: LogEntry) {
  const value = `${entry.raw} ${entry.message} ${entry.parentMessage}`.toLowerCase()
  return value.includes("no such column: name") || value.includes("workspace.name") || value.includes("workspace schema")
}
