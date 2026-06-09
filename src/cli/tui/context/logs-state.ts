import { useRef, useState } from "react"
import { formatError } from "../../../error.js"
import { discoverLogSources, readLogEntries } from "../../../utils/logs.js"
import type { LogEntry, LogSource } from "../../../utils/logs.js"
import { resolveDbArg } from "../../input.js"
import type { LogFilter, LogsPane, ToastInput } from "../types.js"
import { filteredLogEntries, isWorkspaceRepairLog, nextLogFilter, rowMatchesSearch } from "../util/filters.js"

export function useLogsState(options: {
  quit: () => void
  openRepairDetail: () => void
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
}) {
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
  const visibleLogEntries = filteredLogEntries(logEntries, logFilter, logSearch)

  function refreshLogs() {
    setLoadingLogs(true)
    options.setStatus("Refreshing log sources...")
    try {
      const sources = discoverLogSources(resolveDbArg())
      setLogSources(sources)
      const sourceIndex = Math.max(0, Math.min(selectedLogSourceRef.current, sources.length - 1))
      selectedLogSourceRef.current = sourceIndex
      setSelectedLogSource(sourceIndex)
      loadLogEntries(sources[sourceIndex], logFilterRef.current)
      options.setStatus(sources.length === 0 ? "No log sources found" : `${sources.length} log source(s) found`)
    } catch (error: unknown) {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Logs refresh failed", message })
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
      filteredLogEntries(entries, filter, logSearchRef.current)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
    } catch (error: unknown) {
      const message = formatError(error)
      setLogEntries([])
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Log read failed", message })
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
    options.setStatus(`Selected log source: ${source.label}`)
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
    options.setStatus(next === "SEARCH" && logSearchRef.current.length === 0 ? "Log filter: SEARCH. Press s to enter a query" : `Log filter: ${next}`)
  }

  function startLogSearch() {
    logFilterRef.current = "SEARCH"
    setLogFilter("SEARCH")
    setLogSearchActive(true)
    options.setStatus("Search logs: type query, Enter to apply, Esc to cancel")
  }

  function handleLogSearchKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      options.quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      setLogSearchActive(false)
      options.setStatus("Search cancelled")
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      setLogSearchActive(false)
      selectedLogEntryRef.current = 0
      setSelectedLogEntry(0)
      options.setStatus(logSearchRef.current ? `Search logs: ${logSearchRef.current}` : "Search logs: empty query")
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
      options.setStatus("No search query")
      return
    }
    const current = selectedLogEntryRef.current
    const matches: number[] = []
    targetEntries.forEach((entry, index) => {
      if (rowMatchesSearch(entry, logSearchRef.current)) matches.push(index)
    })
    if (matches.length === 0) {
      options.setStatus(`No matches for ${logSearchRef.current}`)
      return
    }
    const next = direction > 0
      ? matches.find((index) => index > current) ?? matches[0]
      : matches.toReversed().find((index) => index < current) ?? matches[matches.length - 1]
    if (next === undefined) return
    selectedLogEntryRef.current = next
    setSelectedLogEntry(next)
    focusLogsPane("entries")
  }

  function openRelatedRepairFromLog() {
    const entry = visibleLogEntries[selectedLogEntry]
    if (!entry) return
    if (!isWorkspaceRepairLog(entry)) {
      options.setStatus("No related repair is mapped for this log entry")
      return
    }
    options.openRepairDetail()
  }

  return {
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
}
