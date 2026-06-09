// Read-only diagnostic log file viewer.
import { useState } from "react"
import type { LogEntry, LogLevel, LogSource } from "@open-doctor/core/utils/logs"
import { useLogs } from "../../context/logs.js"
import { useOverview } from "../../context/overview.js"
import { Box, EmptyState, MainPanel, Text } from "../../ui/primitives.js"
import { useResponsiveLayout } from "../../ui/layout.js"
import { TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"

export function LogsView() {
  const logs = useLogs()
  const overview = useOverview()
  const layout = useResponsiveLayout()
  const [hovered, setHovered] = useState<{ source: number | null; entry: number | null }>({ source: null, entry: null })
  const selectedSource = logs.source.items[logs.source.selected]
  const selectedEntry = logs.entry.items[logs.entry.selected]
  const sourceRows = visibleRows(logs.source.items, logs.source.selected, 18)
  const entryRows = visibleRows(logs.entry.items, logs.entry.selected, 24)
  const selectedEntryId = selectedEntry?.entryId
  const filterLabel = logs.filter.value === "SEARCH" ? `Search ${logs.search.active ? ">" : ""}${logs.search.query}` : logs.filter.value.toLowerCase()
  const dataState = logs.error
    ? "Load failed"
    : logs.refreshing
      ? "Refreshing in background"
      : logs.stale && logs.source.items.length > 0
        ? "Cached data"
        : "Ready"

  return (
    <Box id="logs" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected="Logs" focused={overview.pane.focused === "sidebar"} />

      <MainPanel id="logs-main" title="Logs" summary={`Review issues and inspect context. ${dataState}.`} focused={false}>
        <Box id="log-columns" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
          {layout.showLogSourcePanel ? (
            <Box
              id="log-sources"
              width={46}
              border
              borderColor={logs.pane.active === "sources" ? TUI.borderActive : TUI.border}
              padding={1}
              backgroundColor={TUI.panel}
            >
              <Text fg={TUI.text} height={1}>
                Log sources
              </Text>
              <Text fg={TUI.dim} height={1}>
                {logs.loading ? "Refreshing..." : "Select a source"}
              </Text>
              <DataStateLine refreshing={logs.refreshing} stale={logs.stale} error={logs.error} />
              {logs.error && logs.source.items.length === 0 ? (
                <EmptyState title="Log source load failed" explanation={logs.error} />
              ) : logs.loading && logs.source.items.length === 0 ? (
                <EmptyState title="Loading log sources..." explanation="Scanning known OpenCode log locations." />
              ) : logs.source.items.length === 0 ? (
                <EmptyState title="No log files found" explanation="Checked known OpenCode log locations." />
              ) : null}
              {sourceRows.map(({ item, index }) => (
                <Box
                  key={item.id}
                  height={2}
                  paddingLeft={1}
                  backgroundColor={rowBackground(index, logs.source.selected, hovered.source, logs.pane.active === "sources")}
                  onMouseOver={(event) => {
                    event.stopPropagation()
                    setHovered((current) => ({ ...current, source: index }))
                  }}
                  onMouseOut={(event) => {
                    event.stopPropagation()
                    setHovered((current) => ({ ...current, source: null }))
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    logs.source.select(index)
                  }}
                >
                  <Text fg={index === logs.source.selected ? TUI.blue : TUI.text} height={1}>
                    {`${index === logs.source.selected && logs.pane.active === "sources" ? ">" : index === logs.source.selected ? "|" : " "} ${truncate(item.label, 36)}`}
                  </Text>
                  <Text fg={TUI.dim} height={1}>
                    {sourceSummary(item)}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : null}

          <Box
            id="log-entries"
            flexGrow={1}
            border
            borderColor={logs.pane.active === "entries" ? TUI.borderActive : TUI.border}
            padding={1}
            backgroundColor={TUI.panel}
          >
            <Box height={1} flexDirection="row" justifyContent="space-between">
              <Text fg={TUI.text}>Entries</Text>
              <Text fg={TUI.dim}>{`Filter: ${filterLabel}`}</Text>
            </Box>
            {!layout.showLogSourcePanel ? <DataStateLine refreshing={logs.refreshing} stale={logs.stale} error={logs.error} /> : null}
            {logs.error && selectedSource && logs.entry.items.length === 0 ? (
              <EmptyState title="Log entry load failed" explanation={logs.error} />
            ) : logs.loading && selectedSource && logs.entry.items.length === 0 ? (
              <EmptyState title="Loading log entries..." explanation={`Reading ${selectedSource.label}.`} />
            ) : logs.entry.items.length === 0 ? (
              selectedSource ? (
                <EmptyState title="No matching log lines" explanation={`No entries match filter ${filterLabel}.`} />
              ) : (
                <EmptyState title="No log source selected" explanation="Select a log file from the source list." />
              )
            ) : null}
            {entryRows.map(({ item, index }) => (
              <Box
                key={item.id}
                height={1}
                paddingLeft={1}
                backgroundColor={logRowBackground(item, selectedEntryId, index, logs.entry.selected, hovered.entry, logs.pane.active === "entries")}
                onMouseOver={(event) => {
                  event.stopPropagation()
                  setHovered((current) => ({ ...current, entry: index }))
                }}
                onMouseOut={(event) => {
                  event.stopPropagation()
                  setHovered((current) => ({ ...current, entry: null }))
                }}
                onMouseDown={(event) => {
                  event.stopPropagation()
                  logs.entry.select(index)
                }}
              >
                <Text fg={lineColor(item.inheritedSeverity, item.isContinuation, index === logs.entry.selected)} height={1}>
                  {formatLogRow(item, index === logs.entry.selected && logs.pane.active === "entries", selectedSource, layout.compact ? 28 : 96)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </MainPanel>
    </Box>
  )
}

function DataStateLine(props: { refreshing: boolean; stale: boolean; error: string | undefined }) {
  if (props.error) {
    return (
      <Text fg={TUI.red} height={1}>
        {`Last refresh failed: ${props.error}`}
      </Text>
    )
  }
  if (props.refreshing) {
    return (
      <Text fg={TUI.blue} height={1}>
        Refreshing logs in background...
      </Text>
    )
  }
  if (props.stale) {
    return (
      <Text fg={TUI.yellow} height={1}>
        Cached logs. Press r to refresh.
      </Text>
    )
  }
  return null
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function rowBackground(index: number, selected: number, hovered: number | null, focused: boolean) {
  if (index === selected && focused) return TUI.selected
  if (index === selected) return TUI.selectedMuted
  if (index === hovered) return TUI.hover
  return TUI.panel
}

function logRowBackground(item: LogEntry, selectedEntryId: string | undefined, index: number, selected: number, hovered: number | null, focused: boolean) {
  if (index === selected && focused) return TUI.selected
  if (index === selected) return TUI.selectedMuted
  if (item.entryId === selectedEntryId) return TUI.elevated
  if (index === hovered) return TUI.hover
  return TUI.panel
}

function formatLogRow(entry: LogEntry, selected: boolean, source: LogSource | undefined, maxMessage: number) {
  const marker = selected ? ">" : " "
  if (entry.isContinuation) return `${marker} ${truncate(entry.text, maxMessage + 20)}`

  const timestamp = entry.timestamp ? compactTimestamp(entry.timestamp) : "time?"
  return `${marker} ${timestamp} · ${entry.inheritedSeverity.padEnd(5, " ")} · ${sourceKind(source).padEnd(12, " ")} · ${truncate(entry.message, maxMessage)}`
}

function lineColor(level: LogLevel, continuation: boolean, selected: boolean) {
  if (selected) return TUI.blue
  if (level === "ERROR") return continuation ? TUI.muted : TUI.red
  if (level === "WARN") return continuation ? TUI.muted : TUI.yellow
  if (level === "INFO") return continuation ? TUI.dim : TUI.muted
  return TUI.muted
}

function sourceSummary(source: LogSource) {
  if (source.errorCount > 0) return `${source.errorCount} error${source.errorCount === 1 ? "" : "s"}`
  if (source.warningCount > 0) return `${source.warningCount} warning${source.warningCount === 1 ? "" : "s"}`
  return formatSize(source.size)
}

function compactTimestamp(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/)
  if (match) return match[2]
  return value
}

function sourceKind(source: LogSource | undefined) {
  if (!source) return "log"
  return source.label.split(" ")[0] ?? "log"
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}
