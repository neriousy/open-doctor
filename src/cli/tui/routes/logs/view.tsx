// Read-only diagnostic log file viewer.
import type { LogEntry, LogLevel, LogSource } from "../../../../utils/logs.js"
import { useLogs } from "../../context/logs.js"
import { Box, DetailsPanel, EmptyState, Text } from "../../ui/primitives.js"

export function LogsView() {
  const logs = useLogs()
  const selectedSource = logs.logSources[logs.selectedLogSource]
  const selectedEntry = logs.visibleLogEntries[logs.selectedLogEntry]
  const sourceRows = visibleRows(logs.logSources, logs.selectedLogSource, 18)
  const entryRows = visibleRows(logs.visibleLogEntries, logs.selectedLogEntry, 26)
  const selectedEntryId = selectedEntry?.entryId
  const filterLabel = logs.logFilter === "SEARCH" ? `SEARCH ${logs.logSearchActive ? ">" : ""}${logs.logSearch}` : logs.logFilter

  return (
    <Box id="logs" flexGrow={1} flexDirection="column" marginTop={1}>
      <Box id="log-header" height={3} border borderColor="#263544" paddingLeft={1} paddingRight={1}>
        <Text fg="#d6deeb" height={1}>
          {selectedSource ? `${selectedSource.label} | Filter: ${filterLabel} | Line: ${selectedEntry ? selectedEntry.line : "none"}` : `No log file selected | Filter: ${filterLabel}`}
        </Text>
        <Text fg="#9fb3c8" height={1}>
          {selectedSource ? truncate(selectedSource.path, 150) : "No OpenCode log files found in known locations."}
        </Text>
      </Box>

      <Box id="log-columns" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <Box
          id="log-sources"
          width={36}
          border
          borderColor={logs.logsPane === "sources" ? "#81a1c1" : "#35506a"}
          padding={1}
        >
          <Text fg="#d6deeb" height={1}>
            Log files
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {logs.loadingLogs ? "Refreshing..." : `${logs.logSources.length} file(s)`}
          </Text>
          {logs.logSources.length === 0 ? (
            <EmptyState
              title="No log files found"
              explanation="Checked known OpenCode log locations."
              actions={[
                { key: "r", label: "refresh" },
                { key: "Esc", label: "back" },
              ]}
            />
          ) : null}
          {sourceRows.map(({ item, index }) => (
            <Box
              key={item.id}
              height={2}
              paddingLeft={1}
              backgroundColor={rowBackground(index, logs.selectedLogSource, logs.hoveredLogSource, logs.logsPane === "sources")}
              onMouseOver={(event) => {
                event.stopPropagation()
                logs.setHoveredLogSource(index)
              }}
              onMouseOut={(event) => {
                event.stopPropagation()
                logs.setHoveredLogSource(null)
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                logs.selectLogSource(index)
              }}
            >
              <Text fg={index === logs.selectedLogSource ? "#c3e88d" : "#d6deeb"} height={1}>
                {`${index === logs.selectedLogSource && logs.logsPane === "sources" ? ">" : " "} ${truncate(item.label, 23)}   E${item.errorCount} W${item.warningCount}`}
              </Text>
              <Text fg="#7893ad" height={1}>
                {`  ${formatSize(item.size)}`}
              </Text>
            </Box>
          ))}
        </Box>

        <Box
          id="log-text"
          flexGrow={1}
          border
          borderColor={logs.logsPane === "entries" ? "#81a1c1" : "#35506a"}
          padding={1}
        >
          <Text fg="#d6deeb" height={1}>
            Entries
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {selectedSource ? `${logs.visibleLogEntries.length} matching row(s)` : "No source selected"}
          </Text>
          {logs.visibleLogEntries.length === 0 ? (
            selectedSource ? (
              <EmptyState
                title="No matching log lines"
                explanation={`No entries match filter ${filterLabel}.`}
                actions={[
                  { key: "f", label: "change filter" },
                  { key: "s", label: "search" },
                  { key: "r", label: "refresh" },
                ]}
              />
            ) : (
              <EmptyState title="No log source selected" explanation="Select a log file from the source list." />
            )
          ) : null}
          {entryRows.map(({ item, index }) => (
            <Box
              key={item.id}
              height={1}
              paddingLeft={1}
              backgroundColor={logRowBackground(item, selectedEntryId, index, logs.selectedLogEntry, logs.hoveredLogEntry, logs.logsPane === "entries")}
              onMouseOver={(event) => {
                event.stopPropagation()
                logs.setHoveredLogEntry(index)
              }}
              onMouseOut={(event) => {
                event.stopPropagation()
                logs.setHoveredLogEntry(null)
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                logs.selectLogEntry(index)
              }}
            >
              <Text fg={lineColor(item.inheritedSeverity, item.isContinuation, index === logs.selectedLogEntry)} height={1}>
                {formatLogRow(item, index === logs.selectedLogEntry && logs.logsPane === "entries")}
              </Text>
            </Box>
          ))}
        </Box>

        <DetailsPanel
          title="Detail"
          width={38}
          sections={[
            {
              title: "Source",
              rows: [
                ["File", selectedSource?.label ?? "No source"],
                ["Size", selectedSource ? formatSize(selectedSource.size) : undefined],
                ["Errors", selectedSource?.errorCount],
                ["Warnings", selectedSource?.warningCount],
              ],
            },
            {
              title: "Entry",
              rows: [
                ["Line", selectedEntry?.line],
                ["Level", selectedEntry?.inheritedSeverity],
                ["Timestamp", selectedEntry?.timestamp || "unknown"],
                ["Service", selectedEntry ? selectedEntry.service || sourceKind(selectedSource) : undefined],
                ["Range", selectedEntry ? `${selectedEntry.entryStartLine}-${selectedEntry.entryEndLine}` : undefined],
                ["Header", selectedEntry?.headerLine],
              ],
            },
            {
              title: "Context",
              rows: [
                ["Repair", selectedEntry && relatedRepair(selectedEntry) ? "Workspace DB schema" : "none mapped"],
                ["Message", selectedEntry ? truncate(selectedEntry.parentMessage || selectedEntry.message || selectedEntry.raw, 260) : selectedSource?.path],
                ["Note", "Continuation rows inherit parent severity."],
              ],
            },
          ]}
        />
      </Box>
    </Box>
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
