// Read-only backup browser with manual backup creation and verification actions.
import { useState } from "react"
import type { BackupFile } from "@open-doctor/core/utils/backups"
import { useBackups } from "../../context/backups.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { Box, DetailsPanel, EmptyState, MainPanel, Text } from "../../ui/primitives.js"
import { useResponsiveLayout } from "../../ui/layout.js"
import { TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"

export function BackupsView() {
  const backups = useBackups()
  const overview = useOverview()
  const route = useRoute()
  const layout = useResponsiveLayout()
  const [hovered, setHovered] = useState<number | null>(null)
  const selected = backups.backup.items[backups.backup.selected]
  const rows = visibleRows(backups.backup.items, backups.backup.selected, 16)
  const dataState = backups.error
    ? "Load failed"
    : backups.refreshing
      ? "Refreshing in background"
      : backups.stale && backups.backup.items.length > 0
        ? "Cached data"
        : "Ready"

  return (
    <Box id="backups" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected="Data" focused={overview.pane.focused === "sidebar"} />
      <MainPanel id="backup-main" title="Database backups" summary={`Create, verify, and inspect local backup files. ${dataState}.`} focused={overview.pane.focused === "actions"}>
        <Box id="backup-list" flexGrow={1} marginTop={1} border borderColor={TUI.border} padding={1} backgroundColor={TUI.panel}>
          {backups.error && backups.backup.items.length === 0 ? (
            <EmptyState
              title="Backup load failed"
              explanation={backups.error}
              actions={[
                { key: "r", label: "refresh" },
                { key: "Esc", label: "back" },
              ]}
            />
          ) : backups.loading && backups.backup.items.length === 0 ? (
            <EmptyState title="Loading backups..." explanation="Scanning local toolkit-created database backups." />
          ) : backups.backup.items.length === 0 ? (
            <EmptyState
              title="No backups yet"
              explanation="No toolkit-created database backups were found yet."
              actions={[
                { key: "c", label: "create backup" },
                { key: "r", label: "refresh" },
                { key: "Esc", label: "back" },
              ]}
            />
          ) : (
            <>
              <DataStateLine refreshing={backups.refreshing} stale={backups.stale} error={backups.error} />
              <Box height={1} paddingLeft={1}>
                <Text fg={TUI.dim} height={1}>
                  {"  Created            Size      Reason"}
                </Text>
              </Box>
              {rows.map(({ item, index }) => (
                <Box
                  key={item.id}
                  height={1}
                  paddingLeft={1}
                  backgroundColor={rowBackground(index, backups.backup.selected, hovered)}
                  onMouseOver={(event) => {
                    event.stopPropagation()
                    setHovered(index)
                  }}
                  onMouseOut={(event) => {
                    event.stopPropagation()
                    setHovered(null)
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    backups.backup.select(index)
                  }}
                >
                  <Text fg={index === backups.backup.selected ? TUI.blue : TUI.text} height={1}>
                    {formatRow(item, index === backups.backup.selected, layout.compact ? 18 : 32)}
                  </Text>
                </Box>
              ))}
            </>
          )}
        </Box>
      </MainPanel>

      {layout.showDetailPanel ? <BackupDetail backup={selected} restoreImplemented={route.flags.restoreImplemented} /> : null}
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
        Refreshing backups in background...
      </Text>
    )
  }
  if (props.stale) {
    return (
      <Text fg={TUI.yellow} height={1}>
        Cached backup list. Press r to refresh.
      </Text>
    )
  }
  return null
}

function BackupDetail(props: { backup: BackupFile | undefined; restoreImplemented: boolean }) {
  const backup = props.backup

  return (
    <DetailsPanel
      title="Backup detail"
      width={56}
      sections={[
        {
          title: "Why it matters",
          rows: [
            ["Summary", backup ? `Backup created ${formatDate(backup.mtime)} (${formatSize(backup.size)})` : "No backup selected"],
            ["Source", backup?.sourceDatabase],
          ],
        },
        {
          title: "Source/path",
          rows: props.restoreImplemented
            ? [
                ["Path", backup?.path],
                ["Restore", "Confirmation required"],
              ]
            : [
                ["Path", backup?.path ?? "Press c to create a backup of the current OpenCode database."],
                ["Restore", "Automatic restore is not available yet."],
              ],
        },
        {
          title: "Safety",
          rows: [
            ["Create backup", "No existing data is changed."],
            ["Verify backup", "Read-only."],
            ["Restore", props.restoreImplemented ? "Changes database. Confirmation required." : "Manual restore only."],
          ],
        },
      ]}
    />
  )
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function rowBackground(index: number, selected: number, hovered: number | null) {
  if (index === selected) return TUI.selected
  if (index === hovered) return TUI.hover
  return TUI.panel
}

function formatRow(item: BackupFile, selected: boolean, maxReason: number) {
  const marker = selected ? ">" : " "
  const created = formatDate(item.mtime).padEnd(16, " ")
  const size = formatSize(item.size).padEnd(9, " ")
  return `${marker} ${created}  ${size} ${truncate(item.reason ?? "-", maxReason)}`
}

function formatDate(value: number) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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

function pad(value: number) {
  return String(value).padStart(2, "0")
}
