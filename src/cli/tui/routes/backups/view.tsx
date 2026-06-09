// Read-only backup browser with manual backup creation and verification actions.
import { useState } from "react"
import type { BackupFile } from "../../../../utils/backups.js"
import { useBackups } from "../../context/backups.js"
import { useRoute } from "../../context/route.js"
import { Box, DetailsPanel, EmptyState, Text } from "../../ui/primitives.js"

export function BackupsView() {
  const backups = useBackups()
  const route = useRoute()
  const [hovered, setHovered] = useState<number | null>(null)
  const selected = backups.backup.items[backups.backup.selected]
  const rows = visibleRows(backups.backup.items, backups.backup.selected, 16)

  return (
    <Box id="backups" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <Box id="backup-list" flexGrow={1} border borderColor="#35506a" padding={1}>
        <Text fg="#d6deeb" height={1}>
          Backups
        </Text>
        <Text fg="#9fb3c8" height={1}>
          {backups.loading ? "Refreshing..." : `${backups.backup.items.length} backup file(s)`}
        </Text>
        {backups.backup.items.length === 0 ? (
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
            <Box height={1} paddingLeft={1}>
              <Text fg="#7893ad" height={1}>
                {"  Created            Size      Source database  Reason"}
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
                <Text fg={index === backups.backup.selected ? "#c3e88d" : "#d6deeb"} height={1}>
                  {formatRow(item, index === backups.backup.selected)}
                </Text>
              </Box>
            ))}
          </>
        )}
      </Box>

      <BackupDetail backup={selected} restoreImplemented={route.flags.restoreImplemented} />
    </Box>
  )
}

function BackupDetail(props: { backup: BackupFile | undefined; restoreImplemented: boolean }) {
  const backup = props.backup

  return (
    <DetailsPanel
      title="Backup detail"
      width={56}
      sections={[
        {
          title: "Backup",
          rows: [
            ["Created", backup ? formatDate(backup.mtime) : "No backup selected"],
            ["Size", backup ? formatSize(backup.size) : "-"],
            ["Source database", backup?.sourceDatabase],
            ["Backup path", backup?.path ?? "Press c to create a backup of the current OpenCode database."],
            ["Reason", backup?.reason],
          ],
        },
        {
          title: "Restore status",
          rows: props.restoreImplemented
            ? [
                ["Restore", "requires confirmation"],
                ["Safety", "Close OpenCode before restoring."],
              ]
            : [
                ["Restore", "not available yet"],
                ["Safety", "Manual restore requires closing OpenCode first."],
              ],
        },
        {
          title: "Actions",
          rows: [
            ["c", "create backup"],
            ["v", "verify backup"],
            ["y", "copy path"],
            ["r", "refresh"],
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
  if (index === selected) return "#17202a"
  if (index === hovered) return "#13202a"
  return "#0f1419"
}

function formatRow(item: BackupFile, selected: boolean) {
  const marker = selected ? ">" : " "
  const created = formatDate(item.mtime).padEnd(16, " ")
  const size = formatSize(item.size).padEnd(9, " ")
  const source = truncate(item.sourceDatabase, 15).padEnd(15, " ")
  return `${marker} ${created}  ${size} ${source} ${item.reason ?? "-"}`
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
