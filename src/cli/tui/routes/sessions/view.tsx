// Full-width archived sessions browser used by the utils section.
import path from "node:path"
import type { ArchivedSession } from "../../../../utils/sessions.js"
import { useHealth } from "../../context/health.js"
import { useSessions } from "../../context/sessions.js"
import { archivedSummary, sessionTitle } from "../../util/format.js"
import { Box, DetailsPanel, EmptyState, Text } from "../../ui/primitives.js"

export function ArchivedSessionsView() {
  const health = useHealth()
  const sessions = useSessions()
  const rows = visibleRows(sessions.visibleArchivedSessions, sessions.sessionSelected, 13)
  const highlighted = sessions.visibleArchivedSessions[sessions.sessionSelected]
  const previewed = sessions.visibleArchivedSessions.find((session) => session.id === sessions.previewSessionId)
  const detail = previewed ?? highlighted
  const noMatches = sessions.sessions.length > 0 && sessions.visibleArchivedSessions.length === 0

  return (
    <Box id="archived" flexGrow={1} flexDirection="column" marginTop={1}>
      <Box id="archived-summary" height={4} border borderColor="#263544" paddingLeft={2} paddingRight={2}>
        <Text fg="#d6deeb" height={1}>
          Archived sessions
        </Text>
        <Text fg="#7893ad" height={1}>
          {archivedSummary(sessions.sessions.length, sessions.pendingUnarchive, sessions.loadingSessions)}
          {sessions.archivedSearch ? ` | search: ${sessions.archivedSearch}` : ""}
        </Text>
      </Box>

      <Box id="archived-list" flexGrow={1} marginTop={1} border borderColor="#263544" padding={1}>
        {sessions.loadingSessions && sessions.sessions.length === 0 ? (
          <SessionEmptyState title="Loading archived sessions..." databasePath={health.health.dbPath} />
        ) : sessions.sessions.length === 0 ? (
          <SessionEmptyState title="No archived sessions found" databasePath={health.health.dbPath} />
        ) : noMatches ? (
          <NoMatchesState query={sessions.archivedSearch} />
        ) : (
          <Box flexGrow={1} flexDirection="row" columnGap={1}>
            <Box flexGrow={1} flexDirection="column">
              <Box height={1} paddingLeft={1}>
                <Text fg="#7893ad" height={1}>
                  {"  Sel  Title                         Project          Archived       Messages"}
                </Text>
              </Box>
              {rows.map(({ item, index }) => (
                <Box key={item.id} height={1} paddingLeft={1} backgroundColor={index === sessions.sessionSelected ? "#17202a" : "#0f1419"}>
                  <Text fg={index === sessions.sessionSelected ? "#c3e88d" : "#d6deeb"} height={1}>
                    {formatRow(item, {
                      current: index === sessions.sessionSelected,
                      checked: sessions.selectedSessionIds.has(item.id),
                      previewed: item.id === sessions.previewSessionId,
                    })}
                  </Text>
                </Box>
              ))}
              <Box marginTop={1} flexDirection="column">
                <Text fg={sessions.archivedSearchActive ? "#ecc48d" : "#7893ad"} height={1}>
                  {sessions.archivedSearchActive ? `Search: ${sessions.archivedSearch}` : "Enter preview - u unarchive selected - Space select/unselect - a select all - s search - / or p palette - r refresh - Esc back"}
                </Text>
                <Text fg="#7893ad" height={1}>
                  {sessions.selectedSessionIds.size > 0
                    ? `${sessions.selectedSessionIds.size} checked session${sessions.selectedSessionIds.size === 1 ? "" : "s"}`
                    : "No sessions checked; u targets the highlighted row."}
                </Text>
              </Box>
            </Box>

            <SessionDetails session={detail} previewed={Boolean(previewed)} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

function SessionDetails(props: { session: ArchivedSession | undefined; previewed: boolean }) {
  const session = props.session

  return (
    <DetailsPanel
      title={props.previewed ? "Session preview" : "Session detail"}
      width={48}
      sections={[
        {
          title: "Session",
          rows: [
            ["Title", session ? sessionTitle(session) : "No session selected"],
            ["Project", session ? projectName(session.directory) : undefined],
            ["Archived", session ? formatDate(session.timeArchived) : undefined],
            ["Messages", formatMessageCount(session?.messageCount)],
          ],
        },
        {
          title: "Location",
          rows: [
            ["Session id", session?.id],
            ["Path", session?.directory],
          ],
        },
        {
          title: "Safety",
          rows: [["Note", "Backup before restore."]],
        },
      ]}
    />
  )
}

function SessionEmptyState(props: { title: string; databasePath: string }) {
  return (
    <EmptyState
      title={props.title}
      explanation="Archived OpenCode sessions will appear here when sessions are marked archived."
      checkedPath={props.databasePath}
      actions={[
        { key: "r", label: "refresh" },
        { key: "l", label: "open logs" },
        { key: "Esc", label: "back" },
      ]}
    />
  )
}

function NoMatchesState(props: { query: string }) {
  return (
    <EmptyState
      title="No archived sessions match the current search."
      explanation={`Search: ${props.query}`}
      actions={[
        { key: "s", label: "change search" },
        { key: "r", label: "refresh" },
        { key: "Esc", label: "back" },
      ]}
    />
  )
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function formatRow(session: ArchivedSession, state: { current: boolean; checked: boolean; previewed: boolean }) {
  const marker = state.current ? ">" : " "
  const checked = state.checked ? "x" : " "
  const preview = state.previewed ? "*" : " "
  const title = truncate(session.title || "(untitled)", 28).padEnd(28, " ")
  const project = truncate(projectName(session.directory), 14).padEnd(14, " ")
  const archived = relativeTime(session.timeArchived).padEnd(14, " ")
  const messages = formatMessageCount(session.messageCount)
  return `${marker} [${checked}]${preview} ${title} ${project} ${archived} ${messages}`
}

function projectName(value: string) {
  if (!value) return "-"
  return path.basename(value) || value
}

function formatMessageCount(value: number | undefined) {
  if (value === undefined) return "-"
  return `${value} msg${value === 1 ? "" : "s"}`
}

function relativeTime(value: number) {
  const delta = Date.now() - value
  const abs = Math.abs(delta)
  const suffix = delta >= 0 ? "ago" : "from now"
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  if (abs < minute) return "just now"
  if (abs < hour) return `${Math.round(abs / minute)} mins ${suffix}`
  if (abs < day) return `${Math.round(abs / hour)} hours ${suffix}`
  if (abs < week) return `${Math.round(abs / day)} days ${suffix}`
  return formatDate(value)
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
