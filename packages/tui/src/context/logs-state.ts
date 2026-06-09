import { useEffect, useMemo, useState } from "react"
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatError } from "@open-doctor/core/error"
import { resolveDbArg } from "@open-doctor/core/input"
import type { LogEntry, LogSource } from "@open-doctor/core/utils/logs"
import type { LogFilter, LogsPane, ToastInput } from "../types.js"
import { filteredLogEntries, isWorkspaceRepairLog, nextLogFilter, rowMatchesSearch } from "../util/filters.js"
import { logEntriesQueryOptions, logSourcesQueryOptions, queryKeys } from "../query/toolkit.js"
import { writeClipboardSequence } from "../util/status.js"

export function useLogsState(options: {
  quit: () => void
  openRepairDetail: () => void
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
}) {
  const db = resolveDbArg()
  const queryClient = useQueryClient()
  const sourcesQuery = useQuery(logSourcesQueryOptions(db))
  const sources = sourcesQuery.data ?? []
  const [sourceIndex, setSourceIndex] = useState(0)
  const [entryIndex, setEntryIndex] = useState(0)
  const [pane, setPane] = useState<LogsPane>("entries")
  const [filter, setFilter] = useState<LogFilter>("ALL")
  const [search, setSearch] = useState("")
  const [searchActive, setSearchActive] = useState(false)
  const selectedSource = sources[sourceIndex]
  const entriesQuery = useQuery(
    selectedSource
      ? logEntriesQueryOptions(selectedSource)
      : {
          queryKey: [...queryKeys.toolkit, "logs", "entries", "none"] as const,
          queryFn: skipToken,
        },
  )
  const entries = entriesQuery.data ?? []
  const visibleEntries = useMemo(() => filteredLogEntries(entries, filter, search), [entries, filter, search])
  const loading = sourcesQuery.isLoading || (Boolean(selectedSource) && entriesQuery.isLoading)
  const refreshing = (sourcesQuery.isFetching || entriesQuery.isFetching) && !loading
  const stale = sourcesQuery.isStale || entriesQuery.isStale
  const error = sourcesQuery.error ?? entriesQuery.error

  useEffect(() => {
    const next = Math.max(0, Math.min(sourceIndex, sources.length - 1))
    if (next !== sourceIndex) setSourceIndex(next)
  }, [sourcesQuery.dataUpdatedAt])

  useEffect(() => {
    setEntryIndex((current) => Math.max(0, Math.min(current, visibleEntries.length - 1)))
  }, [entriesQuery.dataUpdatedAt, filter, search])

  useEffect(() => {
    if (!sourcesQuery.data) return
    options.setStatus(sourcesQuery.data.length === 0 ? "No log sources found" : `${sourcesQuery.data.length} log source(s) found`)
  }, [sourcesQuery.dataUpdatedAt])

  useEffect(() => {
    if (!sourcesQuery.error) return
    const message = formatError(sourcesQuery.error)
    options.setStatus(message)
    options.showToast({ variant: "error", title: "Logs refresh failed", message })
  }, [sourcesQuery.errorUpdatedAt])

  useEffect(() => {
    if (!entriesQuery.error) return
    const message = formatError(entriesQuery.error)
    options.setStatus(message)
    options.showToast({ variant: "error", title: "Log read failed", message })
  }, [entriesQuery.errorUpdatedAt])

  function refreshLogs() {
    options.setStatus(sourcesQuery.data ? "Refreshing log sources..." : "Loading log sources...")
    queryClient.invalidateQueries({ queryKey: queryKeys.logs.sources(db) })
    if (selectedSource) queryClient.invalidateQueries({ queryKey: queryKeys.logs.entries(selectedSource) })
  }

  function focusLogsPane(nextPane: LogsPane) {
    setPane(nextPane)
  }

  function moveLogs(direction: 1 | -1) {
    moveLogsBy(direction)
  }

  function moveLogsBy(amount: number) {
    if (pane === "sources") {
      selectLogSource(Math.max(0, Math.min(sources.length - 1, sourceIndex + amount)))
      return
    }

    setEntryIndex((current) => Math.max(0, Math.min(visibleEntries.length - 1, current + amount)))
  }

  function jumpLogs(position: "start" | "end") {
    if (pane === "sources") {
      selectLogSource(position === "start" ? 0 : Math.max(0, sources.length - 1))
      return
    }

    setEntryIndex(position === "start" ? 0 : Math.max(0, visibleEntries.length - 1))
  }

  function selectLogSource(index: number) {
    const source = sources[index]
    if (!source) return
    setSourceIndex(index)
    setPane("sources")
    setEntryIndex(0)
    options.setStatus(`Selected log source: ${source.label}`)
  }

  function selectLogEntry(index: number) {
    setEntryIndex(index)
    setPane("entries")
  }

  function cycleLogFilter() {
    const next = nextLogFilter(filter)
    setFilter(next)
    setEntryIndex(0)
    options.setStatus(next === "SEARCH" && search.length === 0 ? "Log filter: SEARCH. Press s to enter a query" : `Log filter: ${next}`)
  }

  function startLogSearch() {
    setFilter("SEARCH")
    setSearchActive(true)
    options.setStatus("Search logs: type query, Enter to apply, Esc to cancel")
  }

  function handleLogSearchKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      options.quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      setSearchActive(false)
      options.setStatus("Search cancelled")
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      setSearchActive(false)
      setEntryIndex(0)
      options.setStatus(search ? `Search logs: ${search}` : "Search logs: empty query")
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      setSearch((current) => current.slice(0, -1))
      setEntryIndex(0)
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      setSearch((current) => `${current}${sequence}`)
      setEntryIndex(0)
    }
  }

  function moveSearchMatch(direction: 1 | -1) {
    const searchFilter = filter === "SEARCH" ? filter : "SEARCH"
    const targetEntries = filteredLogEntries(entries, searchFilter, search)
    if (search.length === 0 || targetEntries.length === 0) {
      if (filter !== "SEARCH") setFilter("SEARCH")
      options.setStatus("No search query")
      return
    }
    const matches: number[] = []
    targetEntries.forEach((entry, index) => {
      if (rowMatchesSearch(entry, search)) matches.push(index)
    })
    if (matches.length === 0) {
      if (filter !== "SEARCH") setFilter("SEARCH")
      options.setStatus(`No matches for ${search}`)
      return
    }
    const next = direction > 0
      ? matches.find((index) => index > entryIndex) ?? matches[0]
      : matches.toReversed().find((index) => index < entryIndex) ?? matches[matches.length - 1]
    if (next === undefined) return
    if (filter !== "SEARCH") setFilter("SEARCH")
    setEntryIndex(next)
    setPane("entries")
  }

  function openRelatedRepairFromLog() {
    const entry = visibleEntries[entryIndex]
    if (!entry) return
    if (!isWorkspaceRepairLog(entry)) {
      options.setStatus("No related repair is mapped for this log entry")
      return
    }
    options.openRepairDetail()
  }

  function copySelectedLogPath() {
    const source = sources[sourceIndex]
    if (!source) {
      const message = "No log source selected"
      options.setStatus(message)
      options.showToast({ variant: "warning", message })
      return
    }

    writeClipboardSequence(source.path)
    options.setStatus(`Copied log source path: ${source.path}`)
    options.showToast({ variant: "success", title: "Log path copied", message: source.path })
  }

  return {
    source: {
      items: sources,
      selected: sourceIndex,
      select: selectLogSource,
    },
    entry: {
      items: visibleEntries,
      selected: entryIndex,
      select: selectLogEntry,
    },
    pane: {
      active: pane,
      focus: focusLogsPane,
    },
    filter: {
      value: filter,
      cycle: cycleLogFilter,
    },
    search: {
      query: search,
      active: searchActive,
      start: startLogSearch,
      handleKey: handleLogSearchKey,
      moveMatch: moveSearchMatch,
    },
    loading,
    refreshing,
    stale,
    error: error ? formatError(error) : undefined,
    actions: {
      refresh: refreshLogs,
      move: moveLogs,
      moveBy: moveLogsBy,
      jump: jumpLogs,
      openRelatedRepair: openRelatedRepairFromLog,
      copySelectedPath: copySelectedLogPath,
    },
  }
}
