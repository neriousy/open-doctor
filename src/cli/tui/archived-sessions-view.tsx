// Full-width archived sessions browser used by the utils section.
import type { ArchivedSession } from "../../utils/sessions.js"
import { archivedSummary, sessionTitle } from "./format.js"

export function ArchivedSessionsView(props: {
  sessions: ArchivedSession[]
  selected: number
  loading: boolean
  pending: number
  databasePath: string
}) {
  const rows = visibleRows(props.sessions, props.selected, 12)
  const selected = props.sessions[props.selected]

  return (
    <box id="archived" flexGrow={1} flexDirection="column" marginTop={1}>
      <box id="archived-summary" height={4} border borderColor="#263544" paddingLeft={2} paddingRight={2}>
        <text fg="#d6deeb" height={1}>
          Archived sessions
        </text>
        <text fg="#7893ad" height={1}>
          {archivedSummary(props.sessions.length, props.pending, props.loading)}
        </text>
      </box>

      <box id="archived-list" flexGrow={1} marginTop={1} border borderColor="#263544" padding={1}>
        {props.loading && props.sessions.length === 0 ? (
          <SessionEmptyState title="Loading archived sessions..." databasePath={props.databasePath} />
        ) : props.sessions.length === 0 ? (
          <SessionEmptyState title="No archived sessions found" databasePath={props.databasePath} />
        ) : (
          <box flexGrow={1} flexDirection="row" columnGap={1}>
            <box flexGrow={1} flexDirection="column">
              <text fg="#d6deeb" height={1}>
                Newest archived first
              </text>
              {rows.map(({ item, index }) => (
                <box key={item.id} height={2} paddingLeft={1} backgroundColor={index === props.selected ? "#17202a" : "#0f1419"}>
                  <text fg={index === props.selected ? "#c3e88d" : "#d6deeb"} height={1}>
                    {`${index === props.selected ? ">" : " "} ${formatDate(item.timeArchived)}  ${truncate(item.title || "(untitled)", 66)}`}
                  </text>
                </box>
              ))}
            </box>

            <box width={44} border borderColor="#263544" paddingLeft={1} paddingRight={1}>
              <text fg="#d6deeb" height={1}>
                Session detail
              </text>
              <text fg="#9fb3c8" wrapMode="word">
                {selected ? sessionTitle(selected) : "No session selected"}
              </text>
              <text fg="#7893ad" height={1}>
                {selected ? `Archived: ${formatDate(selected.timeArchived)}` : ""}
              </text>
              <text fg="#7893ad" height={1}>
                {selected ? `Updated: ${formatDate(selected.timeUpdated)}` : ""}
              </text>
              <text fg="#7893ad" wrapMode="word">
                {selected ? selected.directory : ""}
              </text>
            </box>
          </box>
        )}
      </box>
    </box>
  )
}

function SessionEmptyState(props: { title: string; databasePath: string }) {
  return (
    <box flexDirection="column">
      <text fg="#82aaff" height={1}>
        {props.title}
      </text>
      <text fg="#9fb3c8" height={1}>
        {`Checked: ${props.databasePath}`}
      </text>
      <text fg="#7893ad" height={1}>
        Archived sessions will appear here when OpenCode has sessions marked archived.
      </text>
      <text fg="#7893ad" height={1}>
        Actions: r refresh, l open logs, esc back
      </text>
    </box>
  )
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function formatDate(value: number) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}
