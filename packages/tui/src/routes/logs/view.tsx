// Read-only diagnostic log file viewer.
import { useState } from "react"
import type { LogEntry, LogLevel, LogSource } from "@open-doctor/core/utils/logs"
import { useLogs } from "../../context/logs.js"
import { Box, EmptyState, Text } from "../../ui/primitives.js"
import { shortenPath, TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"

export function LogsView() {
  const logs = useLogs()
  const [hovered, setHovered] = useState<{ source: number | null; entry: number | null }>({ source: null, entry: null })
  const selectedSource = logs.source.items[logs.source.selected]
  const selectedEntry = logs.entry.items[logs.entry.selected]
  const sourceRows = visibleRows(logs.source.items, logs.source.selected, 18)
  const entryRows = visibleRows(logs.entry.items, logs.entry.selected, 24)
  const selectedEntryId = selectedEntry?.entryId
  const filterLabel = logs.filter.value === "SEARCH" ? `Search ${logs.search.active ? ">" : ""}${logs.search.query}` : logs.filter.value.toLowerCase()

  return (
    <Box id="logs" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected="Logs" />

      <Box flexGrow={1} flexDirection="column">
        <Text fg={TUI.text} height={1}>
          Logs
        </Text>
        <Text fg={TUI.muted} height={1}>
          Review issues and inspect context.
        </Text>

        <Box id="log-columns" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
          <Box
            id="log-sources"
            width={30}
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
            {logs.source.items.length === 0 ? (
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
                  {`${index === logs.source.selected && logs.pane.active === "sources" ? ">" : index === logs.source.selected ? "|" : " "} ${truncate(item.label, 22)}`}
                </Text>
                <Text fg={TUI.dim} height={1}>
                  {sourceSummary(item)}
                </Text>
              </Box>
            ))}
          </Box>

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
            {logs.entry.items.length === 0 ? (
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
                  {formatLogRow(item, index === logs.entry.selected && logs.pane.active === "entries", selectedSource)}
                </Text>
              </Box>
            ))}
          </Box>

          <LogDetail source={selectedSource} entry={selectedEntry} />
        </Box>
      </Box>
    </Box>
  )
}

function LogDetail(props: { source: LogSource | undefined; entry: LogEntry | undefined }) {
  const entry = props.entry
  const title = entry ? truncate(entry.parentMessage || entry.message || entry.raw, 64) : props.source?.label ?? "No log selected"

  return (
    <Box width={40} border borderColor={TUI.border} padding={1} flexDirection="column" backgroundColor={TUI.panel}>
      <Text fg={TUI.dim} height={1}>
        Log
      </Text>
      <Text fg={TUI.text} wrapMode="word">
        {title}
      </Text>
      <DetailBlock label="Status" text={entry?.inheritedSeverity ?? "No entry selected"} color={entry ? lineColor(entry.inheritedSeverity, false, false) : TUI.dim} />
      <DetailBlock label="Why it matters" text={entry ? impactText(entry) : "Select a log entry to inspect the message and source."} />
      <DetailBlock label="Source" text={props.source ? shortenPath(props.source.path, 38) : "No source"} />
      <DetailBlock label="Suggested next step" text={entry && relatedRepair(entry) ? "Open the related database repair from Data." : "Open the source file or copy details for manual inspection."} />
      <DetailBlock label="Safety" text="Reviewing logs is read-only. No files will be modified." color={TUI.green} />
      <Box marginTop={1} flexDirection="column">
        <Text fg={TUI.blue} height={1}>
          Open source file
        </Text>
        <Text fg={TUI.muted} height={1}>
          Raw details collapsed
        </Text>
      </Box>
    </Box>
  )
}

function DetailBlock(props: { label: string; text: string; color?: string }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text fg={TUI.dim} height={1}>
        {props.label}
      </Text>
      <Text fg={props.color ?? TUI.muted} wrapMode="word">
        {props.text}
      </Text>
    </Box>
  )
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

function formatLogRow(entry: LogEntry, selected: boolean, source: LogSource | undefined) {
  const marker = selected ? ">" : " "
  if (entry.isContinuation) return `${marker} ${truncate(entry.text, 124)}`

  const timestamp = entry.timestamp ? compactTimestamp(entry.timestamp) : "time?"
  return `${marker} ${timestamp} · ${entry.inheritedSeverity.padEnd(5, " ")} · ${sourceKind(source).padEnd(12, " ")} · ${truncate(entry.message, 88)}`
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

function impactText(entry: LogEntry) {
  if (entry.inheritedSeverity === "ERROR") return "This may explain a failed command, provider call, or local startup path."
  if (entry.inheritedSeverity === "WARN") return "This is worth reviewing when behavior looks degraded."
  return "This entry provides context for normal OpenCode activity."
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

function relatedRepair(entry: LogEntry) {
  const value = `${entry.raw} ${entry.message} ${entry.parentMessage}`.toLowerCase()
  return value.includes("no such column: name") || value.includes("workspace.name") || value.includes("workspace schema")
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
