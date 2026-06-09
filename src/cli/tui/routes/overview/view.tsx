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
import { shortenPath, statusColor, TUI } from "../../ui/primitives-model.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"
import type { OverviewAction, SidebarSection } from "../../types.js"

export function HomeView(props: { section: SidebarSection }) {
  const health = useHealth()
  const overview = useOverview()
  const logs = useLogs()
  const sessions = useSessions()
  const backups = useBackups()
  const action = overview.action.items[overview.action.selected]

  useEffect(() => {
    overview.section.set(props.section)
    if (props.section === "Overview" || props.section === "Logs") logs.actions.refresh()
    if (props.section === "Overview" || props.section === "Sessions" || props.section === "Data") sessions.actions.refresh()
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
          {props.section === "Config" ? <ConfigContent /> : null}
          {props.section === "Settings" ? <SettingsContent /> : null}
          {props.section === "Logs" ? <RouteShortcut title="Logs" description="Review issues and inspect context." action="Open log viewer" /> : null}
          {props.section === "Sessions" ? <RouteShortcut title="Archived sessions" description="Browse archived OpenCode sessions." action="Browse sessions" /> : null}
        </Box>

        <Box id="workspace-status" height={2} marginTop={1}>
          <Text fg={TUI.dim} wrapMode="word">
            {health.status.message}
          </Text>
        </Box>
      </MainPanel>

      <ContextPanel section={props.section} action={action} />
    </Box>
  )
}

function OverviewContent() {
  const health = useHealth()
  const logs = useLogs()
  const sessions = useSessions()
  const route = useRoute()
  const overview = useOverview()
  const repair = repairStatusDisplay(health.snapshot.workspaceRepair)
  const healthy = repair.status === "OK"
  const selectedAction = overview.action.items[overview.action.selected]?.id

  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <Box border borderColor={selectedAction === "workspace-repair" ? TUI.borderActive : TUI.border} padding={1} backgroundColor={TUI.panel} flexDirection="column">
        <Text fg={healthy ? TUI.green : statusColor(repair.status)} height={1}>
          {healthy ? "● No database repair needed." : `● ${repair.label}`}
        </Text>
        <Text fg={TUI.muted} wrapMode="word">
          {healthy ? "Your OpenCode data is healthy. You can review logs, sessions, or configuration next." : repair.description}
        </Text>
      </Box>

      <SectionCard title="Recent logs" action="View all" onAction={route.actions.openLogs} selected={selectedAction === "logs"}>
        {logs.source.items.slice(0, 3).map((source) => (
          <PlainRow key={source.id} dot={source.errorCount > 0 ? "ERROR" : source.warningCount > 0 ? "WARN" : "OK"} title={source.label} detail={source.path} />
        ))}
        {logs.source.items.length === 0 ? (
          <PlainRow dot={health.snapshot.logErrorCount > 0 ? "ERROR" : "INFO"} title={health.snapshot.latestLog ?? "No recent log source loaded"} detail="Open Logs to inspect known OpenCode log locations." />
        ) : null}
      </SectionCard>

      <SectionCard title="Archived sessions" action="Browse" onAction={route.actions.openArchivedSessions} selected={selectedAction === "archived-sessions"}>
        {sessions.list.items.slice(0, 3).map((session) => (
          <PlainRow key={session.id} dot="INFO" title={session.title || "(untitled)"} detail={formatDate(session.timeArchived)} />
        ))}
        {sessions.list.items.length === 0 ? <PlainRow dot="OK" title="No archived sessions found" detail="OpenCode sessions marked archived will appear here." /> : null}
      </SectionCard>

      <SectionCard title="Config status">
        <PlainRow dot="OK" title="Config file loaded" detail="Validation is read-only and does not modify files." />
        <PlainRow dot={health.snapshot.logErrorCount > 0 ? "WARN" : "OK"} title={health.snapshot.logErrorCount > 0 ? "One MCP command may need attention" : "No obvious command issue from recent logs"} detail="Open Config to review configuration checks." />
        <PlainRow dot="OK" title="Providers resolved" detail="Provider checks can be reviewed from Config." />
      </SectionCard>
    </Box>
  )
}

function DataContent() {
  const health = useHealth()
  const route = useRoute()
  const backups = useBackups()
  const overview = useOverview()
  const repair = repairStatusDisplay(health.snapshot.workspaceRepair)
  const repairable = repair.status === "DETECTED" || repair.status === "EXPERIMENTAL"
  const latestBackup = backups.backup.items[0]
  const selectedAction = overview.action.items[overview.action.selected]?.id

  return (
    <Box flexGrow={1} flexDirection="column" rowGap={1}>
      <SectionCard title="Database" action={repairable ? "Review repair..." : "View details"} onAction={route.actions.openRepairDetail} selected={selectedAction === "workspace-repair"}>
        <PlainRow dot={repair.status} title={repairable ? "Database repair available" : "Database is healthy"} detail={repair.description} />
        <Text fg={TUI.dim} height={1}>
          {shortenPath(health.snapshot.dbPath, 96)}
        </Text>
      </SectionCard>

      <SectionCard title="Sessions" action="Browse sessions" onAction={route.actions.openArchivedSessions} selected={selectedAction === "archived-sessions"}>
        <PlainRow dot={health.snapshot.archivedCount > 0 ? "INFO" : "OK"} title={health.snapshot.archivedCount > 0 ? "Archived sessions available" : "No archived sessions found"} detail="Browsing sessions is read-only until you choose Restore session..." />
      </SectionCard>

      <SectionCard title="Backups" action="Open backup folder" onAction={route.actions.openBackups} selected={selectedAction === "backups"}>
        <PlainRow dot={health.snapshot.backupCount > 0 ? "OK" : "INFO"} title={health.snapshot.backupCount > 0 ? "Latest backup" : "No toolkit backups yet"} detail={latestBackup ? formatDate(latestBackup.mtime) : "Create backup writes a new file. Existing data is not changed."} />
        <Box flexDirection="row" columnGap={1} marginTop={1}>
          <ActionButton label="Create backup" muted />
          <ActionButton label="Verify backup" muted />
          <ActionButton label="Open backup folder" />
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
          <ActionButton label="View effective config" />
          <ActionButton label="Back up config" />
          <ActionButton label="Edit config..." muted />
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

function SectionCard(props: { title: string; action?: string; onAction?: () => void; selected?: boolean; children: ReactNode }) {
  return (
    <Box border borderColor={props.selected ? TUI.borderActive : TUI.border} padding={1} flexDirection="column" backgroundColor={props.selected ? TUI.selectedMuted : TUI.panel}>
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
        {`${badgeDot(props.dot)} ${props.title}`}
      </Text>
      <Text fg={TUI.dim} height={1}>
        {props.detail}
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
  return "Data"
}

function detailTitle(section: SidebarSection) {
  if (section === "Data") return "Local OpenCode data"
  if (section === "Config") return "OpenCode configuration"
  if (section === "Settings") return "Open Doctor settings"
  return section
}

function detailWhy(section: SidebarSection, repairDescription: string) {
  if (section === "Data") return repairDescription
  if (section === "Config") return "Configuration problems can block providers, MCP commands, or startup behavior."
  if (section === "Settings") return "Settings control how Open Doctor discovers data and presents local diagnostics."
  return "This item is available for local review."
}

function detailNextStep(section: SidebarSection) {
  if (section === "Data") return "Open database details or browse backups."
  if (section === "Config") return "View effective config before choosing Edit config..."
  if (section === "Settings") return "Review available preferences."
  return "Open the selected item."
}

function detailSafety(section: SidebarSection, action: OverviewAction | undefined) {
  if (action) return action.safety
  if (section === "Config") return "Editing config changes files on disk, not the database. A config backup will be created before saving."
  if (section === "Data") return "Review is read-only. Applying repairs changes the SQLite database and requires confirmation."
  return "No files will be modified."
}

function primaryAction(section: SidebarSection, action: OverviewAction | undefined) {
  if (action?.id === "workspace-repair") return action.status === "OK" ? "View details" : "Review repair..."
  if (action?.id === "backups") return "Open backups"
  if (action?.id === "logs") return "Open log file"
  if (action?.id === "archived-sessions") return "Browse sessions"
  if (section === "Config") return "View effective config"
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

function pad(value: number) {
  return String(value).padStart(2, "0")
}
