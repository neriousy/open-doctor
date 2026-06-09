// Full-width archived sessions browser used by the local data workspace.
import path from "node:path"
import type { ArchivedSession } from "@open-doctor/core/utils/sessions"
import { useHealth } from "../../context/health.js"
import { useOverview } from "../../context/overview.js"
import { useSessions } from "../../context/sessions.js"
import { sessionTitle } from "../../util/format.js"
import { Box, EmptyState, MainPanel, Text } from "../../ui/primitives.js"
import { useResponsiveLayout } from "../../ui/layout.js"
import { shortenPath, TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"

export function ArchivedSessionsView() {
  const health = useHealth()
  const overview = useOverview()
  const sessions = useSessions()
  const layout = useResponsiveLayout()
  const rows = visibleRows(sessions.list.visible, sessions.list.selected, 16)
  const highlighted = sessions.list.visible[sessions.list.selected]
  const previewed = sessions.list.visible.find((session) => session.id === sessions.selection.previewId)
  const detail = previewed ?? highlighted
  const noMatches = sessions.list.items.length > 0 && sessions.list.visible.length === 0
  const dataState = sessions.error
    ? "Load failed"
    : sessions.refreshing
      ? "Refreshing in background"
      : sessions.stale && sessions.list.items.length > 0
        ? "Cached data"
        : "Ready"

  return (
    <Box id="archived" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected="Sessions" focused={overview.pane.focused === "sidebar"} />

      <MainPanel
        id="archived-main"
        title="Archived sessions"
        summary={`Browse archived OpenCode sessions. ${dataState}.${sessions.search.query ? ` Search: ${sessions.search.query}` : ""}`}
        focused={overview.pane.focused === "actions"}
      >
        <Box id="archived-list" flexGrow={1} marginTop={1} border borderColor={TUI.border} padding={1} backgroundColor={TUI.panel}>
          {sessions.error && sessions.list.items.length === 0 ? (
            <SessionEmptyState title="Archived-session load failed" databasePath={health.snapshot.dbPath} explanation={sessions.error} />
          ) : sessions.loading && sessions.list.items.length === 0 ? (
            <SessionEmptyState title="Loading archived sessions..." databasePath={health.snapshot.dbPath} />
          ) : sessions.list.items.length === 0 ? (
            <SessionEmptyState title="No archived sessions found" databasePath={health.snapshot.dbPath} />
          ) : noMatches ? (
            <NoMatchesState query={sessions.search.query} />
          ) : (
            <Box flexGrow={1} flexDirection="row" columnGap={1}>
              <Box flexGrow={1} flexDirection="column">
                <DataStateLine refreshing={sessions.refreshing} stale={sessions.stale} error={sessions.error} />
                {rows.map(({ item, index }) => (
                  <Box key={item.id} height={2} paddingLeft={1} backgroundColor={index === sessions.list.selected ? TUI.selected : TUI.panel}>
                    <Text fg={index === sessions.list.selected ? TUI.blue : TUI.text} height={1}>
                      {formatRow(item, {
                        current: index === sessions.list.selected,
                        checked: sessions.selection.ids.has(item.id),
                        previewed: item.id === sessions.selection.previewId,
                      }, layout.compact ? 42 : layout.showDetailPanel ? 58 : 52)}
                    </Text>
                    <Text fg={TUI.dim} height={1}>
                      {`${relativeTime(item.timeArchived)} · ${projectName(item.directory)}`}
                    </Text>
                  </Box>
                ))}
                <Box marginTop={1} flexDirection="column">
                  <Text fg={sessions.search.active ? TUI.yellow : TUI.dim} height={1}>
                    {sessions.search.active ? `Search: ${sessions.search.query}` : "Review is read-only until you choose Restore session..."}
                  </Text>
                  <Text fg={TUI.dim} height={1}>
                    {sessions.selection.ids.size > 0
                      ? `${sessions.selection.ids.size} checked session${sessions.selection.ids.size === 1 ? "" : "s"}`
                      : "No sessions checked; restore targets the highlighted row."}
                  </Text>
                </Box>
              </Box>

              {layout.showDetailPanel ? <SessionDetails session={detail} previewed={Boolean(previewed)} /> : null}
            </Box>
          )}
        </Box>
      </MainPanel>
    </Box>
  )
}

function SessionDetails(props: { session: ArchivedSession | undefined; previewed: boolean }) {
  const session = props.session

  return (
    <Box width={42} border borderColor={TUI.border} padding={1} flexDirection="column" backgroundColor={TUI.panel}>
      <Text fg={TUI.dim} height={1}>
        Session
      </Text>
      <Text fg={TUI.text} wrapMode="word">
        {session ? sessionTitle(session) : "No session selected"}
      </Text>
      <DetailBlock label="Status" text={props.previewed ? "Previewed" : "Archived"} color={TUI.yellow} />
      <DetailBlock label="Why it matters" text="Archived sessions are hidden from the normal OpenCode session list until restored." />
      <DetailBlock label="Source" text={session ? shortenPath(session.directory, 38) : "OpenCode database"} />
      <DetailBlock label="Suggested next step" text={session ? "Preview the session or choose Restore session... when you are ready." : "Select a session to inspect it."} />
      <DetailBlock label="Safety" text="Restoring a session changes the SQLite database. A backup will be created first. Confirmation required." color={TUI.yellow} />
      <Box marginTop={1} flexDirection="column">
        <Text fg={TUI.blue} height={1}>
          Enter Preview session
        </Text>
        <Text fg={TUI.yellow} height={1}>
          u Restore session...
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
        Refreshing archived sessions in background...
      </Text>
    )
  }
  if (props.stale) {
    return (
      <Text fg={TUI.yellow} height={1}>
        Cached archived sessions. Press r to refresh.
      </Text>
    )
  }
  return null
}

function SessionEmptyState(props: { title: string; databasePath: string; explanation?: string }) {
  return (
    <EmptyState
      title={props.title}
      explanation={props.explanation ?? "Archived OpenCode sessions will appear here when sessions are marked archived."}
      checkedPath={props.databasePath}
    />
  )
}

function NoMatchesState(props: { query: string }) {
  return <EmptyState title="No archived sessions match the current search." explanation={`Search: ${props.query}`} />
}

function visibleRows<T>(items: T[], selected: number, limit: number) {
  const start = Math.min(Math.max(0, selected - Math.floor(limit / 2)), Math.max(0, items.length - limit))
  return items.slice(start, start + limit).map((item, offset) => ({ item, index: start + offset }))
}

function formatRow(session: ArchivedSession, state: { current: boolean; checked: boolean; previewed: boolean }, maxTitle: number) {
  const marker = state.current ? ">" : " "
  const checked = state.checked ? "x" : " "
  const preview = state.previewed ? "*" : " "
  return `${marker} [${checked}]${preview} ${truncate(session.title || "(untitled)", maxTitle)}`
}

function projectName(value: string) {
  if (!value) return "-"
  return path.basename(value) || value
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
