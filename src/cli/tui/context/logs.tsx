import type { LogEntry, LogSource } from "../../../utils/logs.js"
import type { LogFilter, LogsPane } from "../types.js"
import { createRequiredContext } from "./helper.js"

export type LogsContext = {
  source: {
    items: LogSource[]
    selected: number
    select: (index: number) => void
  }
  entry: {
    items: LogEntry[]
    selected: number
    select: (index: number) => void
  }
  pane: {
    active: LogsPane
    focus: (pane: LogsPane) => void
  }
  filter: {
    value: LogFilter
    cycle: () => void
  }
  search: {
    query: string
    active: boolean
    start: () => void
    handleKey: (key: { name?: string; sequence?: string }) => void
    moveMatch: (direction: 1 | -1) => void
  }
  loading: boolean
  actions: {
    refresh: () => void
    move: (direction: 1 | -1) => void
    openRelatedRepair: () => void
  }
}

const context = createRequiredContext<LogsContext>("Logs")

export const LogsProvider = context.Provider
export const useLogs = context.useValue
