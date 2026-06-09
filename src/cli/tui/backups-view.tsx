// Read-only backup browser with manual backup creation entry point.
import type { BackupFile } from "../../utils/backups.js"

export function BackupsView(props: {
  backups: BackupFile[]
  selected: number
  loading: boolean
  hovered: number | null
  onSelect: (index: number) => void
  onHover: (index: number | null) => void
}) {
  const selected = props.backups[props.selected]
  const rows = visibleRows(props.backups, props.selected, 16)

  return (
    <box id="backups" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <box id="backup-list" flexGrow={1} border borderColor="#35506a" padding={1}>
        <text fg="#d6deeb" height={1}>
          Backups
        </text>
        <text fg="#9fb3c8" height={1}>
          {props.loading ? "Refreshing..." : `${props.backups.length} backup file(s)`}
        </text>
        {props.backups.length === 0 ? (
          <text fg="#9fb3c8" wrapMode="word">
            No toolkit-created database backups found yet. Press c to create one.
          </text>
        ) : null}
        {rows.map(({ item, index }) => (
          <box
            key={item.id}
            height={3}
            paddingLeft={1}
            backgroundColor={rowBackground(index, props.selected, props.hovered)}
            onMouseOver={(event) => {
              event.stopPropagation()
              props.onHover(index)
            }}
            onMouseOut={(event) => {
              event.stopPropagation()
              props.onHover(null)
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              props.onSelect(index)
            }}
          >
            <text fg={index === props.selected ? "#c3e88d" : "#d6deeb"} height={1}>
              {`${index === props.selected ? ">" : " "} ${formatDate(item.mtime)}  ${formatSize(item.size)}`}
            </text>
            <text fg="#7893ad" height={1}>
              {item.name}
            </text>
          </box>
        ))}
      </box>

      <box id="backup-detail" width={52} border borderColor="#35506a" padding={1}>
        <text fg="#d6deeb" height={1}>
          Backup detail
        </text>
        <text fg="#9fb3c8" height={1}>
          {selected ? formatDate(selected.mtime) : "No backup selected"}
        </text>
        <text fg="#9fb3c8" height={1}>
          {selected ? `Size: ${formatSize(selected.size)}` : ""}
        </text>
        <text fg="#7893ad" wrapMode="word">
          {selected ? selected.path : "Press c to create a backup of the current OpenCode database."}
        </text>
        <text fg="#d6deeb" height={1}>
          Backup policy
        </text>
        <text fg="#9fb3c8" wrapMode="word">
          Backups are created before repairs and restores.
        </text>
        <text fg="#7893ad" wrapMode="word">
          Restore should require closing OpenCode first.
        </text>
      </box>
    </box>
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

function formatDate(value: number) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}
