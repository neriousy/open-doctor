import type { LogEntry, LogSource } from "../../../utils/logs.js"
import type { LogFilter, LogsPane } from "../types.js"
import { createRequiredContext } from "./helper.js"

export type LogsContext = {
  logSources: LogSource[]
  visibleLogEntries: LogEntry[]
  selectedLogSource: number
  selectedLogEntry: number
  logsPane: LogsPane
  logFilter: LogFilter
  logSearch: string
  logSearchActive: boolean
  loadingLogs: boolean
  hoveredLogSource: number | null
  hoveredLogEntry: number | null
  setHoveredLogSource: (index: number | null) => void
  setHoveredLogEntry: (index: number | null) => void
  refreshLogs: () => void
  focusLogsPane: (pane: LogsPane) => void
  moveLogs: (direction: 1 | -1) => void
  selectLogSource: (index: number) => void
  selectLogEntry: (index: number) => void
  cycleLogFilter: () => void
  startLogSearch: () => void
  handleLogSearchKey: (key: { name?: string; sequence?: string }) => void
  moveSearchMatch: (direction: 1 | -1) => void
  openRelatedRepairFromLog: () => void
}

const context = createRequiredContext<LogsContext>("Logs")

export const LogsProvider = context.Provider
export const useLogs = context.useValue
