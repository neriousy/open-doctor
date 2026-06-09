// Focused workspace screens for the top-level Open Doctor navigation.
import { useEffect, type ReactNode } from "react"
import { useBackups } from "../../context/backups.js"
import { useHealth } from "../../context/health.js"
import { useLogs } from "../../context/logs.js"
import { useOverview } from "../../context/overview.js"
import { useRoute } from "../../context/route.js"
import { useSessions } from "../../context/sessions.js"
import { repairStatusDisplay } from "../../util/repair-status.js"
import { Box, EmptyState, MainPanel, StatusBadge, Text } from "../../ui/primitives.js"
import { useResponsiveLayout } from "../../ui/layout.js"
import { shortenPath, statusColor, TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"
import type { OverviewAction, SidebarSection } from "../../types.js"

export function HomeView(props: { section: SidebarSection }) {
  const health = useHealth()
  const overview = useOverview()
  const logs = useLogs()
  const sessions = useSessions()
  const backups = useBackups()
  const layout = useResponsiveLayout()
  const action = overview.action.items[overview.action.selected]
  const statusMessage = health.error
    ? `Health refresh failed: ${health.error}`
    : health.refreshing
      ? `Refreshing: ${health.status.message}`
      : health.stale
        ? `Cached: ${health.status.message}`
        : health.status.message

  useEffect(() => {
    overview.section.set(props.section)
    if (props.section === "Overview" || props.section === "Logs") logs.actions.refresh()
    if (props.section === "Overview" || props.section === "Sessions") sessions.actions.refresh()
    if (props.section === "Data") backups.actions.refresh()
  }, [props.section])

  const page = pageCopy(props.section)

  return (
    <Box id="workspace" flexGrow={1} flexShrink={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected={props.section} focused={overview.pane.focused === "sidebar"} />

      <MainPanel id="workspace-main" title={page.title} summary={page.summary} focused={overview.pane.focused === "actions"}>
        <Box id="workspace-content" flexGrow={1} flexDirection="column" marginTop={1}>
          {props.section === "Overview" ? <OverviewContent /> : null}
          {props.section === "Data" ? <DataContent /> : null}
          {props.section === "Repairs" ? <RouteShortcut title="Repairs" description="Inspect workspace database repair state." action="Open repair detail" /> : null}
          {props.section === "Config" ? <ConfigContent /> : null}
          {props.section === "Settings" ? <SettingsContent /> : null}
          {props.section === "Logs" ? <RouteShortcut title="Logs" description="Review issues and inspect context." action="Open log viewer" /> : null}
          {props.section === "Sessions" ? <RouteShortcut title="Archived sessions" description="Browse archived OpenCode sessions." action="Browse sessions" /> : null}
        </Box>

        <Box id="workspace-status" height={2} marginTop={1}>
          <Text fg={health.error ? TUI.red : health.refreshing ? TUI.blue : health.stale ? TUI.yellow : TUI.dim} height={1}>
            {truncate(statusMessage, 120)}
          </Text>
        </Box>
      </MainPanel>

      {layout.showDetailPanel ? <ContextPanel section={props.section} action={action} /> : null}
    </Box>
  )
}

function OverviewContent() {
  const health = useHealth()
  const logs = useLogs()
  const sessions = useSessions()
  const route = useRoute()
  const overview = useOverview()
  const layout = useResponsiveLayout()
  const repair = repairStatusDisplay(health.snapshot.workspaceRepair)
  const healthy = repair.status === "OK"
  const selectedAction = overview.action.items[overview.action.selected]?.id
  const compact = layout.compact || layout.height < 28
  const tiny = layout.height < 28

  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <Box border borderColor={selectedAction === "workspace-repair" ? TUI.borderActive : TUI.border} padding={1} backgroundColor={TUI.panel} flexDirection="column">
        <Text fg={healthy ? TUI.green : statusColor(repair.status)} height={1}>
          {healthy ? "● No database repair needed." : `● ${repair.label}`}
        </Text>
        <Text fg={TUI.muted} height={1}>
          {truncate(healthy ? "Your OpenCode data is healthy. You can review logs, sessions, or configuration next." : repair.description, compact ? 52 : 112)}
        </Text>
      </Box>

      <SectionCard title="Recent logs" action="View all" onAction={route.actions.openLogs} selected={selectedAction === "logs"}>
        {logs.source.items.slice(0, 1).map((source) => (
          compact ? (
            <PlainRowCompact key={source.id} dot={source.errorCount > 0 ? "ERROR" : source.warningCount > 0 ? "WARN" : "OK"} title={source.label} />
          ) : (
            <PlainRow key={source.id} dot={source.errorCount > 0 ? "ERROR" : source.warningCount > 0 ? "WARN" : "OK"} title={source.label} detail={source.path} />
          )
        ))}
        {logs.source.items.length === 0 ? (
          compact ? (
            <PlainRowCompact dot={health.snapshot.logErrorCount > 0 ? "ERROR" : "INFO"} title={health.snapshot.latestLog ?? "No recent log source loaded"} />
          ) : (
            <PlainRow dot={health.snapshot.logErrorCount > 0 ? "ERROR" : "INFO"} title={health.snapshot.latestLog ?? "No recent log source loaded"} detail="Open Logs to inspect known OpenCode log locations." />
          )
        ) : null}
      </SectionCard>

      {tiny ? null : (
        <SectionCard title="Archived sessions" action="Browse" onAction={route.actions.openArchivedSessions} selected={selectedAction === "archived-sessions"}>
          {sessions.list.items.slice(0, 1).map((session) => (
            compact ? (
              <PlainRowCompact key={session.id} dot="INFO" title={session.title || "(untitled)"} />
            ) : (
              <PlainRow key={session.id} dot="INFO" title={session.title || "(untitled)"} detail={formatDate(session.timeArchived)} />
            )
          ))}
          {sessions.list.items.length === 0 ? (
            compact ? (
              <PlainRowCompact dot="OK" title="No archived sessions found" />
            ) : (
              <PlainRow dot="OK" title="No archived sessions found" detail="OpenCode sessions marked archived will appear here." />
            )
          ) : null}
        </SectionCard>
      )}

      {compact || tiny ? null : (
        <SectionCard title="Config status">
          <PlainRow dot="OK" title="Config file loaded" detail="Validation is read-only and does not modify files." />
        </SectionCard>
      )}
    </Box>
  )
}

function DataContent() {
  const health = useHealth()
  const route = useRoute()
  const backups = useBackups()
  const overview = useOverview()
  const latestBackup = backups.backup.items[0]
  const selectedAction = overview.action.items[overview.action.selected]?.id

  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <SectionCard title="Backups" action="Open backup folder" onAction={route.actions.openBackups} selected={selectedAction === "backups"}>
        <PlainRow dot={health.snapshot.backupCount > 0 ? "OK" : "INFO"} title={health.snapshot.backupCount > 0 ? "Latest backup" : "No toolkit backups yet"} detail={latestBackup ? formatDate(latestBackup.mtime) : "Create backup writes a new file. Existing data is not changed."} />
        <Box flexDirection="row" columnGap={1} marginTop={1}>
          <ActionButton label="c Create backup" />
          <ActionButton label="v Verify backup" />
          <ActionButton label="o Open backups" />
        </Box>
      </SectionCard>
    </Box>
  )
}

function ConfigContent() {
  const health = useHealth()

  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <SectionCard title="Config source" action="Open file">
        <PlainRow dot="OK" title="Active file" detail="~/.opencode/config.toml" />
        <PlainRow dot="INFO" title="Loaded from" detail="User config" />
      </SectionCard>

      <SectionCard title="Needs attention">
        <PlainRow dot={health.snapshot.logErrorCount > 0 ? "WARN" : "OK"} title={health.snapshot.logErrorCount > 0 ? "MCP command may need attention" : "No config issue detected from recent logs"} detail={health.snapshot.logErrorCount > 0 ? "Recent logs contain errors. Review the selected log source before editing config." : "Validation is read-only and does not modify files."} />
      </SectionCard>

      <SectionCard title="Resolved">
        <PlainRow dot="OK" title="Config file loaded" detail="No files will be modified." />
        <PlainRow dot="OK" title="Environment variables resolved" detail="Review effective config before making changes." />
      </SectionCard>

      <SectionCard title="Actions">
        <Box flexDirection="row" columnGap={1}>
          <ActionButton label="v View effective config" />
          <ActionButton label="b Back up config" muted />
          <ActionButton label="e Edit config..." muted />
        </Box>
      </SectionCard>
    </Box>
  )
}

function SettingsContent() {
  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <SectionCard title="OpenCode path">
        <PlainRow dot="INFO" title="Data directory and log discovery roots" detail="Path settings are shown for review only." />
      </SectionCard>
      <SectionCard title="Backup policy">
        <PlainRow dot="OK" title="Backups before database changes" detail="Mutating data actions require confirmation." />
      </SectionCard>
      <SectionCard title="Display preferences">
        <PlainRow dot="INFO" title="Theme and density" detail="Settings are planned and not available yet." />
      </SectionCard>
    </Box>
  )
}

function RouteShortcut(props: { title: string; description: string; action: string }) {
  return (
    <EmptyState
      title={props.title}
      explanation={props.description}
      actions={[{ key: "Enter", label: props.action }]}
    />
  )
}

function ContextPanel(props: { section: SidebarSection; action: OverviewAction | undefined }) {
  const health = useHealth()
  const repair = repairStatusDisplay(health.snapshot.workspaceRepair)
  const type = props.section === "Overview" ? selectedType(props.action) : props.section
  const title = props.action?.title ?? detailTitle(props.section)
  const source = props.action?.target === "opencode.db" || props.section === "Data" ? health.snapshot.dbPath : health.snapshot.dataDir
  const safety = detailSafety(props.section, props.action)

  return (
    <Box id="context-detail" width={42} border borderColor={TUI.border} padding={1} flexDirection="column" backgroundColor={TUI.panel}>
      <Text fg={TUI.dim} height={1}>
        {type}
      </Text>
      <Text fg={TUI.text} wrapMode="word">
        {title}
      </Text>
      {props.action ? <StatusBadge status={props.action.status} /> : null}

      <DetailBlock label="Why it matters" text={props.action?.details ?? detailWhy(props.section, repair.description)} />
      <DetailBlock label="Source" text={shortenPath(source, 40)} />
      <DetailBlock label="Suggested next step" text={props.action?.actionHint ?? detailNextStep(props.section)} />
      <DetailBlock label="Safety" text={safety} color={safety.includes("modify") || safety.includes("changes") ? TUI.yellow : TUI.green} />

      <Box marginTop={1} flexDirection="column">
        <ActionButton label={primaryAction(props.section, props.action)} />
      </Box>
    </Box>
  )
}

function SectionCard(props: { title: string; action?: string; onAction?: () => void; selected?: boolean; height?: number; children: ReactNode }) {
  const boxProps = props.height === undefined ? {} : { height: props.height }

  return (
    <Box {...boxProps} border borderColor={props.selected ? TUI.borderActive : TUI.border} padding={1} flexDirection="column" backgroundColor={props.selected ? TUI.selectedMuted : TUI.panel}>
      <Box height={1} flexDirection="row" justifyContent="space-between">
        <Text fg={props.selected ? TUI.blue : TUI.text}>{`${props.selected ? "| " : ""}${props.title}`}</Text>
        {props.action && props.onAction ? (
          <Text fg={TUI.blue} onMouseDown={() => props.onAction?.()}>
            {props.action}
          </Text>
        ) : props.action ? (
          <Text fg={TUI.blue}>
            {props.action}
          </Text>
        ) : null}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {props.children}
      </Box>
    </Box>
  )
}

function PlainRow(props: { dot: string; title: string; detail: string }) {
  return (
    <Box height={2} flexDirection="column">
      <Text fg={statusColor(props.dot)} height={1}>
        {`${badgeDot(props.dot)} ${truncate(props.title, 72)}`}
      </Text>
      <Text fg={TUI.dim} height={1}>
        {truncate(props.detail, 88)}
      </Text>
    </Box>
  )
}

function PlainRowCompact(props: { dot: string; title: string }) {
  return (
    <Box height={1}>
      <Text fg={statusColor(props.dot)} height={1}>
        {`${badgeDot(props.dot)} ${truncate(props.title, 88)}`}
      </Text>
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

function ActionButton(props: { label: string; muted?: boolean }) {
  return (
    <Text fg={props.muted ? TUI.muted : TUI.blue} height={1}>
      {props.label}
    </Text>
  )
}

function pageCopy(section: SidebarSection) {
  if (section === "Data") return { title: "Data", summary: "Inspect and maintain local OpenCode data." }
  if (section === "Repairs") return { title: "Repairs", summary: "Inspect workspace database repair state." }
  if (section === "Config") return { title: "Config", summary: "Validate and edit OpenCode configuration." }
  if (section === "Settings") return { title: "Settings", summary: "Review Open Doctor preferences." }
  if (section === "Logs") return { title: "Logs", summary: "Review issues and inspect context." }
  if (section === "Sessions") return { title: "Sessions", summary: "Browse archived OpenCode sessions." }
  return { title: "Overview", summary: "A focused view of what needs attention next." }
}

function selectedType(action: OverviewAction | undefined) {
  if (!action) return "Overview"
  if (action.id === "logs") return "Log"
  if (action.id === "archived-sessions") return "Session"
  if (action.id === "workspace-repair") return "Repair"
  return "Data"
}

function detailTitle(section: SidebarSection) {
  if (section === "Data") return "Local OpenCode data"
  if (section === "Repairs") return "Workspace database repairs"
  if (section === "Config") return "OpenCode configuration"
  if (section === "Settings") return "Open Doctor settings"
  return section
}

function detailWhy(section: SidebarSection, repairDescription: string) {
  if (section === "Data") return repairDescription
  if (section === "Repairs") return repairDescription
  if (section === "Config") return "Configuration problems can block providers, MCP commands, or startup behavior."
  if (section === "Settings") return "Settings control how Open Doctor discovers data and presents local diagnostics."
  return "This item is available for local review."
}

function detailNextStep(section: SidebarSection) {
  if (section === "Data") return "Open database details or browse backups."
  if (section === "Repairs") return "Open repair details before changing the database."
  if (section === "Config") return "View effective config before choosing Edit config..."
  if (section === "Settings") return "Review available preferences."
  return "Open the selected item."
}

function detailSafety(section: SidebarSection, action: OverviewAction | undefined) {
  if (action) return action.safety
  if (section === "Config") return "Editing config changes files on disk, not the database. A config backup will be created before saving."
  if (section === "Repairs") return "Review is read-only. Applying repairs changes the SQLite database and requires confirmation."
  if (section === "Data") return "Review is read-only. Applying repairs changes the SQLite database and requires confirmation."
  return "No files will be modified."
}

function primaryAction(section: SidebarSection, action: OverviewAction | undefined) {
  if (action?.id === "workspace-repair") return action.status === "OK" ? "Enter View details" : "Enter Review repair..."
  if (action?.id === "backups") return "Enter Open backups"
  if (action?.id === "logs") return "Enter Open logs"
  if (action?.id === "archived-sessions") return "Enter Browse sessions"
  if (section === "Config") return "v View effective config"
  if (section === "Settings") return "Review settings"
  return "Open"
}

function badgeDot(status: string) {
  if (status === "ERROR" || status === "FAILED") return "ERROR"
  if (status === "WARN" || status === "DETECTED" || status === "MISSING") return "WARN"
  if (status === "OK") return "OK"
  return "INFO"
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
