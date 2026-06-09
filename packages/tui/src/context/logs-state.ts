import { useRef, useState } from "react"
import { Effect } from "effect"
import { formatError } from "@open-doctor/core/error"
import { resolveDbArg } from "@open-doctor/core/input"
import { Logs } from "@open-doctor/core/utils/logs"
import type { LogEntry, LogSource } from "@open-doctor/core/utils/logs"
import type { LogFilter, LogsPane, ToastInput } from "../types.js"
import { filteredLogEntries, isWorkspaceRepairLog, nextLogFilter, rowMatchesSearch } from "../util/filters.js"
import { runCoreSync } from "../core-runtime.js"

type LogsStore = {
  sources: LogSource[]
  entries: LogEntry[]
  sourceIndex: number
  entryIndex: number
  pane: LogsPane
  loading: boolean
  filter: LogFilter
  search: string
  searchActive: boolean
}

const initialLogsStore: LogsStore = {
  sources: [],
  entries: [],
  sourceIndex: 0,
  entryIndex: 0,
  pane: "entries",
  loading: false,
  filter: "ALL",
  search: "",
  searchActive: false,
}

export function useLogsState(options: {
  quit: () => void
  openRepairDetail: () => void
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
}) {
  const [store, setStoreState] = useState<LogsStore>(initialLogsStore)
  const storeRef = useRef(store)
  const visibleEntries = filteredLogEntries(store.entries, store.filter, store.search)

  function setStore(next: LogsStore) {
    storeRef.current = next
    setStoreState(next)
  }

  function refreshLogs() {
    setStore({ ...storeRef.current, loading: true })
    options.setStatus("Refreshing log sources...")
    try {
      const logs = runCoreSync(Effect.gen(function* () {
        return yield* Logs
      }))
      const sources = logs.discover(resolveDbArg())
      const sourceIndex = Math.max(0, Math.min(storeRef.current.sourceIndex, sources.length - 1))
      const entries = readEntries(sources[sourceIndex])
      setStore({ ...storeRef.current, sources, sourceIndex, entries, entryIndex: 0, loading: false })
      options.setStatus(sources.length === 0 ? "No log sources found" : `${sources.length} log source(s) found`)
    } catch (error: unknown) {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Logs refresh failed", message })
      setStore({ ...storeRef.current, loading: false })
    }
  }

  function readEntries(source: LogSource | undefined) {
    if (!source) {
      return []
    }

    try {
      const logs = runCoreSync(Effect.gen(function* () {
        return yield* Logs
      }))
      return logs.read(source)
    } catch (error: unknown) {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Log read failed", message })
      return []
    }
  }

  function focusLogsPane(pane: LogsPane) {
    setStore({ ...storeRef.current, pane })
  }

  function moveLogs(direction: 1 | -1) {
    const current = storeRef.current
    if (current.pane === "sources") {
      const next = Math.max(0, Math.min(current.sources.length - 1, current.sourceIndex + direction))
      selectLogSource(next)
      return
    }

    const entries = filteredLogEntries(current.entries, current.filter, current.search)
    const next = Math.max(0, Math.min(entries.length - 1, current.entryIndex + direction))
    setStore({ ...current, entryIndex: next })
  }

  function selectLogSource(index: number) {
    const current = storeRef.current
    const source = current.sources[index]
    if (!source) return
    setStore({ ...current, sourceIndex: index, pane: "sources", entries: readEntries(source), entryIndex: 0 })
    options.setStatus(`Selected log source: ${source.label}`)
  }

  function selectLogEntry(index: number) {
    setStore({ ...storeRef.current, entryIndex: index, pane: "entries" })
  }

  function cycleLogFilter() {
    const current = storeRef.current
    const next = nextLogFilter(current.filter)
    setStore({ ...current, filter: next, entryIndex: 0 })
    options.setStatus(next === "SEARCH" && current.search.length === 0 ? "Log filter: SEARCH. Press s to enter a query" : `Log filter: ${next}`)
  }

  function startLogSearch() {
    setStore({ ...storeRef.current, filter: "SEARCH", searchActive: true })
    options.setStatus("Search logs: type query, Enter to apply, Esc to cancel")
  }

  function handleLogSearchKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      options.quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      setStore({ ...storeRef.current, searchActive: false })
      options.setStatus("Search cancelled")
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      const current = storeRef.current
      setStore({ ...current, searchActive: false, entryIndex: 0 })
      options.setStatus(current.search ? `Search logs: ${current.search}` : "Search logs: empty query")
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      const current = storeRef.current
      setStore({ ...current, search: current.search.slice(0, -1), entryIndex: 0 })
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      const current = storeRef.current
      setStore({ ...current, search: `${current.search}${sequence}`, entryIndex: 0 })
    }
  }

  function moveSearchMatch(direction: 1 | -1) {
    const current = storeRef.current
    const searchStore = current.filter === "SEARCH" ? current : { ...current, filter: "SEARCH" as const }
    const targetEntries = filteredLogEntries(searchStore.entries, "SEARCH", searchStore.search)
    if (searchStore.search.length === 0 || targetEntries.length === 0) {
      if (searchStore !== current) setStore(searchStore)
      options.setStatus("No search query")
      return
    }
    const matches: number[] = []
    targetEntries.forEach((entry, index) => {
      if (rowMatchesSearch(entry, searchStore.search)) matches.push(index)
    })
    if (matches.length === 0) {
      if (searchStore !== current) setStore(searchStore)
      options.setStatus(`No matches for ${searchStore.search}`)
      return
    }
    const next = direction > 0
      ? matches.find((index) => index > searchStore.entryIndex) ?? matches[0]
      : matches.toReversed().find((index) => index < searchStore.entryIndex) ?? matches[matches.length - 1]
    if (next === undefined) return
    setStore({ ...searchStore, entryIndex: next, pane: "entries" })
  }

  function openRelatedRepairFromLog() {
    const current = storeRef.current
    const entry = filteredLogEntries(current.entries, current.filter, current.search)[current.entryIndex]
    if (!entry) return
    if (!isWorkspaceRepairLog(entry)) {
      options.setStatus("No related repair is mapped for this log entry")
      return
    }
    options.openRepairDetail()
  }

  return {
    source: {
      items: store.sources,
      selected: store.sourceIndex,
      select: selectLogSource,
    },
    entry: {
      items: visibleEntries,
      selected: store.entryIndex,
      select: selectLogEntry,
    },
    pane: {
      active: store.pane,
      focus: focusLogsPane,
    },
    filter: {
      value: store.filter,
      cycle: cycleLogFilter,
    },
    search: {
      query: store.search,
      active: store.searchActive,
      start: startLogSearch,
      handleKey: handleLogSearchKey,
      moveMatch: moveSearchMatch,
    },
    loading: store.loading,
    actions: {
      refresh: refreshLogs,
      move: moveLogs,
      openRelatedRepair: openRelatedRepairFromLog,
    },
  }
}
