// Read-only diagnostic log file viewer.
import type { LogEntry, LogLevel, LogSource } from "../../utils/logs.js"
import type { LogFilter, LogsPane } from "./types.js"

export function LogsView(props: {
  sources: LogSource[]
  entries: LogEntry[]
  selectedSource: number
  selectedEntry: number
  focusedPane: LogsPane
  filter: LogFilter
  searchQuery: string
  searchActive: boolean
  loading: boolean
  hoveredSource: number | null
  hoveredEntry: number | null
  onSourceSelect: (index: number) => void
  onSourceHover: (index: number | null) => void
  onEntrySelect: (index: number) => void
  onEntryHover: (index: number | null) => void
}) {
  const selectedSource = props.sources[props.selectedSource]
  const selectedEntry = props.entries[props.selectedEntry]
  const sourceRows = visibleRows(props.sources, props.selectedSource, 18)
  const entryRows = visibleRows(props.entries, props.selectedEntry, 26)
  const selectedEntryId = selectedEntry?.entryId
  const filterLabel = props.filter === "SEARCH" ? `SEARCH ${props.searchActive ? ">" : ""}${props.searchQuery}` : props.filter

  return (
    <box id="logs" flexGrow={1} flexDirection="column" marginTop={1}>
      <box id="log-header" height={3} border borderColor="#263544" paddingLeft={1} paddingRight={1}>
        <text fg="#d6deeb" height={1}>
          {selectedSource ? `${selectedSource.label} | Filter: ${filterLabel} | Line: ${selectedEntry ? selectedEntry.line : "none"}` : `No log file selected | Filter: ${filterLabel}`}
        </text>
        <text fg="#9fb3c8" height={1}>
          {selectedSource ? truncate(selectedSource.path, 150) : "No OpenCode log files found in known locations."}
        </text>
      </box>

      <box id="log-columns" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <box
          id="log-sources"
          width={36}
          border
          borderColor={props.focusedPane === "sources" ? "#81a1c1" : "#35506a"}
          padding={1}
        >
          <text fg="#d6deeb" height={1}>
            Log files
          </text>
          <text fg="#9fb3c8" height={1}>
            {props.loading ? "Refreshing..." : `${props.sources.length} file(s)`}
          </text>
          {props.sources.length === 0 ? (
            <box flexDirection="column" marginTop={1}>
              <text fg="#82aaff" height={1}>
                No log files found
              </text>
              <text fg="#9fb3c8" wrapMode="word">
                Checked known OpenCode log locations. Press r to refresh or esc to return.
              </text>
            </box>
          ) : null}
          {sourceRows.map(({ item, index }) => (
            <box
              key={item.id}
              height={2}
              paddingLeft={1}
              backgroundColor={rowBackground(index, props.selectedSource, props.hoveredSource, props.focusedPane === "sources")}
              onMouseOver={(event) => {
                event.stopPropagation()
                props.onSourceHover(index)
              }}
              onMouseOut={(event) => {
                event.stopPropagation()
                props.onSourceHover(null)
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                props.onSourceSelect(index)
              }}
            >
              <text fg={index === props.selectedSource ? "#c3e88d" : "#d6deeb"} height={1}>
                {`${index === props.selectedSource && props.focusedPane === "sources" ? ">" : " "} ${truncate(item.label, 23)}   E${item.errorCount} W${item.warningCount}`}
              </text>
              <text fg="#7893ad" height={1}>
                {`  ${formatSize(item.size)}`}
              </text>
            </box>
          ))}
        </box>

        <box
          id="log-text"
          flexGrow={1}
          border
          borderColor={props.focusedPane === "entries" ? "#81a1c1" : "#35506a"}
          padding={1}
        >
          <text fg="#d6deeb" height={1}>
            Entries
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedSource ? `${props.entries.length} matching row(s)` : "No source selected"}
          </text>
          {props.entries.length === 0 ? (
            <box flexDirection="column" marginTop={1}>
              <text fg="#82aaff" height={1}>
                {selectedSource ? "No matching log lines" : "No log source selected"}
              </text>
              <text fg="#9fb3c8" wrapMode="word">
                {selectedSource
                  ? `No entries match filter ${filterLabel}. Press f to change filter, / to search, or r to refresh.`
                  : "Select a log file from the source list."}
              </text>
            </box>
          ) : null}
          {entryRows.map(({ item, index }) => (
            <box
              key={item.id}
              height={1}
              paddingLeft={1}
              backgroundColor={logRowBackground(item, selectedEntryId, index, props.selectedEntry, props.hoveredEntry, props.focusedPane === "entries")}
              onMouseOver={(event) => {
                event.stopPropagation()
                props.onEntryHover(index)
              }}
              onMouseOut={(event) => {
                event.stopPropagation()
                props.onEntryHover(null)
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                props.onEntrySelect(index)
              }}
            >
              <text fg={lineColor(item.inheritedSeverity, item.isContinuation, index === props.selectedEntry)} height={1}>
                {formatLogRow(item, index === props.selectedEntry && props.focusedPane === "entries")}
              </text>
            </box>
          ))}
        </box>

        <box id="log-detail" width={38} border borderColor="#35506a" padding={1}>
          <text fg="#d6deeb" height={1}>
            Detail
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedSource ? selectedSource.label : "No source"}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedSource ? `Size: ${formatSize(selectedSource.size)}  E${selectedSource.errorCount} W${selectedSource.warningCount}` : ""}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedEntry ? `Line: ${selectedEntry.line}  Level: ${selectedEntry.inheritedSeverity}` : "Line: none"}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedEntry ? `Timestamp: ${selectedEntry.timestamp || "unknown"}` : ""}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedEntry ? `Service: ${selectedEntry.service || sourceKind(selectedSource)}` : ""}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedEntry ? `Entry lines: ${selectedEntry.entryStartLine}-${selectedEntry.entryEndLine}` : ""}
          </text>
          <text fg="#9fb3c8" height={1}>
            {selectedEntry?.isContinuation ? `Parent line: ${selectedEntry.headerLine}` : selectedEntry ? `Header line: ${selectedEntry.headerLine}` : ""}
          </text>
          <text fg={selectedEntry && relatedRepair(selectedEntry) ? "#c3e88d" : "#5f7690"} wrapMode="word">
            {selectedEntry && relatedRepair(selectedEntry) ? "Related repair: Workspace DB schema" : "Related repair: none mapped"}
          </text>
          <text fg="#7893ad" wrapMode="word">
            {selectedEntry ? truncate(selectedEntry.parentMessage || selectedEntry.message || selectedEntry.raw, 260) : selectedSource ? truncate(selectedSource.path, 260) : "Select a log file to inspect its raw tail."}
          </text>
          <text fg="#5f7690" wrapMode="word">
            Continuation rows inherit their parent entry severity for filtering and scanning.
          </text>
        </box>
      </box>
    </box>
  )
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function rowBackground(index: number, selected: number, hovered: number | null, focused: boolean) {
  if (index === selected && focused) return "#17202a"
  if (index === selected) return "#121c24"
  if (index === hovered) return "#13202a"
  return "#0f1419"
}

function logRowBackground(item: LogEntry, selectedEntryId: string | undefined, index: number, selected: number, hovered: number | null, focused: boolean) {
  if (index === selected && focused) return "#17202a"
  if (index === selected) return "#121c24"
  if (item.entryId === selectedEntryId) return "#101a22"
  if (index === hovered) return "#13202a"
  return "#0f1419"
}

function formatLogRow(entry: LogEntry, selected: boolean) {
  const marker = selected ? ">" : " "
  const line = String(entry.line).padStart(5, " ")
  if (entry.isContinuation) return `${marker} ${line} │ ${truncate(entry.text, 124)}`

  const timestamp = entry.timestamp ? compactTimestamp(entry.timestamp) : "time?"
  return `${marker} ${line} ${entry.inheritedSeverity.padEnd(5, " ")} ${timestamp} ${truncate(entry.message, 104)}`
}

function lineColor(level: LogLevel, continuation: boolean, selected: boolean) {
  if (selected) return "#c3e88d"
  if (level === "ERROR") return continuation ? "#b4555f" : "#f07178"
  if (level === "WARN") return continuation ? "#b78f5b" : "#ecc48d"
  if (level === "INFO") return continuation ? "#7893ad" : "#82aaff"
  return "#9fb3c8"
}

function compactTimestamp(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/)
  if (match) return `${match[1]} ${match[2]}`
  return value
}

function sourceKind(source: LogSource | undefined) {
  if (!source) return "unknown"
  return source.label.split(" ")[0] ?? "Log"
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
