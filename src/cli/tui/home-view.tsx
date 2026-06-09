// Health-driven section shell with sidebar navigation, page-specific content, and details.
import type { BackupFile } from "../../utils/backups.js"
import type { LogSource } from "../../utils/logs.js"
import type { ArchivedSession } from "../../utils/sessions.js"
import { DetailsPanel } from "./details-panel.js"
import type { DetailsSection } from "./details-panel.js"
import type { ToolkitHealth } from "./health.js"
import { repairStatusColor, repairStatusDisplay } from "./repair-status.js"
import type { OverviewAction, OverviewPane, SidebarSection } from "./types.js"

export const SIDEBAR_ITEMS = ["Overview", "Repairs", "Sessions", "Logs", "Backups", "Settings"] as const

export function HomeView(props: {
  actions: OverviewAction[]
  visibleActionIndexes: number[]
  selected: number
  activeSection: SidebarSection
  focusedPane: OverviewPane
  hoveredSection: SidebarSection | null
  hoveredAction: number | null
  health: ToolkitHealth
  sessions: ArchivedSession[]
  logs: LogSource[]
  backups: BackupFile[]
  status: string
  loading: boolean
  loadingSessions: boolean
  loadingLogs: boolean
  loadingBackups: boolean
  onSectionSelect: (section: SidebarSection) => void
  onSectionHover: (section: SidebarSection | null) => void
  onActionSelect: (index: number) => void
  onActionHover: (index: number | null) => void
}) {
  const action = props.visibleActionIndexes.includes(props.selected) ? props.actions[props.selected] : undefined
  const visibleActions = props.visibleActionIndexes.flatMap((index) => {
    const item = props.actions[index]
    return item ? [{ index, action: item }] : []
  })
  const page = sectionPage(props.activeSection, props.health, props.loading)
  const details = detailsSections(props.activeSection, props.health, action)

  return (
    <box id="home" flexGrow={1} flexShrink={1} flexDirection="row" marginTop={1} columnGap={1}>
      <box
        id="sidebar"
        width={20}
        border
        borderColor={props.focusedPane === "sidebar" ? "#81a1c1" : "#263544"}
        paddingTop={1}
        paddingLeft={1}
        paddingRight={1}
      >
        {SIDEBAR_ITEMS.map((item) => (
          <box
            key={item}
            height={2}
            paddingLeft={1}
            backgroundColor={sidebarBackground(item, props.activeSection, props.hoveredSection, props.focusedPane)}
            onMouseOver={(event) => {
              event.stopPropagation()
              props.onSectionHover(item)
            }}
            onMouseOut={(event) => {
              event.stopPropagation()
              props.onSectionHover(null)
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              props.onSectionSelect(item)
            }}
          >
            <text fg={sidebarColor(item, props.activeSection, props.hoveredSection, props.focusedPane)} height={1}>
              {sidebarLabel(item, props.activeSection, props.focusedPane)}
            </text>
          </box>
        ))}
      </box>

      <box
        id="overview-main"
        flexGrow={1}
        flexDirection="column"
        border
        borderColor={props.focusedPane === "actions" ? "#81a1c1" : "#263544"}
        padding={1}
      >
        <text fg="#d6deeb" height={1}>
          {page.title}
        </text>
        <text fg="#7893ad" height={1}>
          {page.summary}
        </text>

        <box id="section-content" flexGrow={1} flexDirection="column" marginTop={1}>
          {props.activeSection === "Overview" ? (
            <OverviewContent
              actions={visibleActions}
              selected={props.selected}
              focusedPane={props.focusedPane}
              hoveredAction={props.hoveredAction}
              health={props.health}
              logs={props.logs}
              backups={props.backups}
              onActionHover={props.onActionHover}
              onActionSelect={props.onActionSelect}
            />
          ) : props.activeSection === "Repairs" ? (
            <RepairsContent
              actions={visibleActions}
              selected={props.selected}
              focusedPane={props.focusedPane}
              hoveredAction={props.hoveredAction}
              health={props.health}
              status={props.status}
              onActionHover={props.onActionHover}
              onActionSelect={props.onActionSelect}
            />
          ) : props.activeSection === "Sessions" ? (
            <SessionsContent sessions={props.sessions} loading={props.loadingSessions} databasePath={props.health.dbPath} />
          ) : props.activeSection === "Logs" ? (
            <LogsContent sources={props.logs} loading={props.loadingLogs} health={props.health} />
          ) : props.activeSection === "Backups" ? (
            <BackupsContent backups={props.backups} loading={props.loadingBackups} />
          ) : (
            <SettingsContent />
          )}
        </box>

        <box id="home-status" height={2} marginTop={1}>
          <text fg="#9fb3c8" wrapMode="word">
            {props.status}
          </text>
        </box>
      </box>

      <DetailsPanel title={details.title} sections={details.sections} />
    </box>
  )
}

function OverviewContent(props: ActionContentProps & { health: ToolkitHealth; logs: LogSource[]; backups: BackupFile[] }) {
  const latestLog = props.logs[0]
  const latestBackup = props.backups[0]

  return (
    <>
      {props.health.workspaceRepair.status === "OK" ? (
        <text fg="#9fb3c8" height={1}>
          No repairs detected
        </text>
      ) : null}
      <ActionList
        actions={props.actions}
        selected={props.selected}
        focusedPane={props.focusedPane}
        hoveredAction={props.hoveredAction}
        onActionHover={props.onActionHover}
        onActionSelect={props.onActionSelect}
      />
      <box id="overview-secondary" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <box id="health-checks" width="58%" flexDirection="column">
          <text fg="#d6deeb" height={1}>
            Health checks
          </text>
          {props.health.checks.slice(0, 6).map((check) => (
            <text key={check.label} fg="#9fb3c8" height={1}>
              {`[${check.status}] ${check.label}: ${truncate(check.detail, 84)}`}
            </text>
          ))}
        </box>

        <box id="recent-activity" flexGrow={1} flexDirection="column" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
          <text fg="#d6deeb" height={1}>
            Recent activity
          </text>
          <text fg="#9fb3c8" height={1}>
            {`Latest backup: ${latestBackup ? formatDate(new Date(latestBackup.mtime)) : latestBackupTime(props.health.lastBackup)}`}
          </text>
          <text fg="#9fb3c8" height={1}>
            {`Latest log: ${latestLog ? latestLog.label : props.health.latestLog ?? "none"}`}
          </text>
          <text fg="#9fb3c8" height={1}>
            {`Last scan: ${formatDate(new Date(props.health.scannedAt))}`}
          </text>
          <text fg="#7893ad" wrapMode="word">
            {`Data: ${props.health.dataDir}`}
          </text>
        </box>
      </box>
    </>
  )
}

function RepairsContent(props: ActionContentProps & { health: ToolkitHealth; status: string }) {
  const repair = repairStatusDisplay(props.health.workspaceRepair)

  return (
    <>
      <ActionList
        actions={props.actions}
        selected={props.selected}
        focusedPane={props.focusedPane}
        hoveredAction={props.hoveredAction}
        onActionHover={props.onActionHover}
        onActionSelect={props.onActionSelect}
      />
      <box flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <box flexGrow={1} flexDirection="column">
          <text fg="#d6deeb" height={1}>
            Repair checks
          </text>
          <text fg={repair.color} height={1}>
            {`[${repair.status}] ${repair.label}`}
          </text>
          <text fg="#9fb3c8" height={1}>
            {repair.description}
          </text>
          <text fg="#7893ad" height={1}>
            {repair.actionHint}
          </text>
          <text fg="#7893ad" height={1}>
            {`Planned SQL change(s): ${props.health.workspaceRepair.changes.length}`}
          </text>
        </box>

        <box width="42%" flexDirection="column" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
          <text fg="#d6deeb" height={1}>
            Last repair report
          </text>
          <text fg="#9fb3c8" wrapMode="word">
            {props.status}
          </text>
          <text fg="#d6deeb" height={1}>
            Safety note
          </text>
          <text fg="#7893ad" wrapMode="word">
            Repairs that modify OpenCode data require a backup first.
          </text>
        </box>
      </box>
    </>
  )
}

function SessionsContent(props: { sessions: ArchivedSession[]; loading: boolean; databasePath: string }) {
  if (props.loading && props.sessions.length === 0) {
    return <EmptyState title="Loading archived sessions..." detail={`Checked: ${props.databasePath}\nNewest archived sessions are being read from the OpenCode database.`} />
  }

  if (props.sessions.length === 0) {
    return (
      <EmptyState
        title="No archived sessions found"
        detail={`Checked: ${props.databasePath}\nArchived sessions will appear here when OpenCode has sessions marked archived.\nActions: r refresh, l open logs, esc back`}
      />
    )
  }

  return (
    <box flexDirection="column">
      <text fg="#d6deeb" height={1}>
        Archived sessions
      </text>
      {props.sessions.slice(0, 10).map((session) => (
        <box key={session.id} height={3} paddingLeft={1} backgroundColor="#0f1419">
          <text fg="#d6deeb" height={1}>
            {truncate(session.title || "(untitled)", 80)}
          </text>
          <text fg="#9fb3c8" height={1}>
            {`${formatTimestamp(session.timeArchived)} - ${truncate(session.directory, 80)}`}
          </text>
        </box>
      ))}
    </box>
  )
}

function LogsContent(props: { sources: LogSource[]; loading: boolean; health: ToolkitHealth }) {
  if (props.loading && props.sources.length === 0) return <EmptyState title="Refreshing logs..." detail="Scanning known OpenCode log locations." />
  if (props.sources.length === 0) return <EmptyState title="No log files found" detail={`Checked: ${props.health.dataDir}/log\nKnown OpenCode log locations did not contain readable log files.\nActions: r refresh, esc back`} />

  return (
    <box flexDirection="column">
      <text fg="#d6deeb" height={1}>
        Log sources
      </text>
      <text fg="#9fb3c8" height={1}>
        {`${props.health.logErrorCount} error line(s), ${props.health.logWarningCount} warning line(s) in recent tails`}
      </text>
      {props.sources.slice(0, 12).map((source) => (
        <box key={source.id} height={2} paddingLeft={1} backgroundColor="#0f1419">
          <text fg="#d6deeb" height={1}>
            {`${source.label} - ${formatSize(source.size)}`}
          </text>
        </box>
      ))}
    </box>
  )
}

function BackupsContent(props: { backups: BackupFile[]; loading: boolean }) {
  return (
    <box flexGrow={1} flexDirection="row" columnGap={1}>
      <box flexGrow={1} flexDirection="column">
        {props.loading && props.backups.length === 0 ? (
          <EmptyState title="Loading backups..." detail="Scanning for toolkit-created database backups." />
        ) : props.backups.length === 0 ? (
          <EmptyState title="No backups yet" detail="Press Enter to open the backups tool. Press c there to create a manual backup." />
        ) : (
          <>
            <text fg="#d6deeb" height={1}>
              Backup list
            </text>
            {props.backups.slice(0, 10).map((backup) => (
              <box key={backup.id} height={3} paddingLeft={1} backgroundColor="#0f1419">
                <text fg="#d6deeb" height={1}>
                  {formatDate(new Date(backup.mtime))}
                </text>
                <text fg="#9fb3c8" height={1}>
                  {`${formatSize(backup.size)} - ${truncate(backup.path, 90)}`}
                </text>
              </box>
            ))}
          </>
        )}
      </box>

      <box width="36%" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
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

function SettingsContent() {
  return (
    <box flexDirection="column">
      {[
        { title: "OpenCode path", detail: "Database location, data directory, and log discovery roots." },
        { title: "Backup policy", detail: "Manual backups, repair-time backups, and future restore confirmation." },
        { title: "Display preferences", detail: "Theme, density, and log rendering defaults." },
      ].map((group) => (
        <box key={group.title} height={4} paddingLeft={1} border borderColor="#263544">
          <text fg="#82aaff" height={1}>
            {group.title}
          </text>
          <text fg="#9fb3c8" height={1}>
            {group.detail}
          </text>
        </box>
      ))}
    </box>
  )
}

function EmptyState(props: { title: string; detail: string }) {
  return (
    <box height={5} border borderColor="#263544" paddingLeft={1} paddingRight={1}>
      <text fg="#82aaff" height={1}>
        {props.title}
      </text>
      <text fg="#9fb3c8" wrapMode="word">
        {props.detail}
      </text>
    </box>
  )
}

type ActionContentProps = {
  actions: { index: number; action: OverviewAction }[]
  selected: number
  focusedPane: OverviewPane
  hoveredAction: number | null
  onActionSelect: (index: number) => void
  onActionHover: (index: number | null) => void
}

function ActionList(props: ActionContentProps) {
  if (props.actions.length === 0) return null

  return (
    <box id="action-list" flexDirection="column">
      {props.actions.map(({ action: item, index }) => (
        <box
          key={item.id}
          height={5}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={actionBackground(index, props.selected, props.hoveredAction, props.focusedPane)}
          border
          borderColor={
            index === props.selected && props.focusedPane === "actions"
              ? "#81a1c1"
              : props.hoveredAction === index
                ? "#3b5870"
                : "#0f1419"
          }
          onMouseOver={(event) => {
            event.stopPropagation()
            props.onActionHover(index)
          }}
          onMouseOut={(event) => {
            event.stopPropagation()
            props.onActionHover(null)
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
            props.onActionSelect(index)
          }}
        >
          <text fg={actionLabelColor(item.status, index === props.selected && props.focusedPane === "actions")} height={1}>
            {`${index === props.selected && props.focusedPane === "actions" ? ">" : " "} [${item.status}] ${item.title}`}
          </text>
          <text fg="#9fb3c8" height={1}>
            {item.description}
          </text>
          <text fg="#7893ad" height={1}>
            {`${item.category} - ${item.actionHint}`}
          </text>
        </box>
      ))}
    </box>
  )
}

function sidebarLabel(item: SidebarSection, activeSection: SidebarSection, focusedPane: OverviewPane) {
  return item === activeSection && focusedPane === "sidebar" ? `> ${item}` : `  ${item}`
}

function sidebarColor(
  item: SidebarSection,
  activeSection: SidebarSection,
  hoveredSection: SidebarSection | null,
  focusedPane: OverviewPane,
) {
  if (item === activeSection && focusedPane === "sidebar") return "#c3e88d"
  if (item === activeSection) return "#c3e88d"
  if (item === hoveredSection) return "#d6deeb"
  return "#b8c7d8"
}

function sidebarBackground(
  item: SidebarSection,
  activeSection: SidebarSection,
  hoveredSection: SidebarSection | null,
  focusedPane: OverviewPane,
) {
  if (item === activeSection && focusedPane === "sidebar") return "#1b2a35"
  if (item === activeSection) return "#17202a"
  if (item === hoveredSection) return "#13202a"
  return "#0f1419"
}

function actionBackground(index: number, selected: number, hovered: number | null, focusedPane: OverviewPane) {
  if (index === selected && focusedPane === "actions") return "#17202a"
  if (index === selected) return "#121c24"
  if (index === hovered) return "#13202a"
  return "#0f1419"
}

function statusColor(status: string) {
  const repairColor = repairStatusColor(status)
  if (repairColor) return repairColor
  if (status === "OK" || status === "UTILITY" || status === "LOGS" || status === "BACKUP") return "#c3e88d"
  if (status === "MISSING") return "#f07178"
  return "#82aaff"
}

function actionLabelColor(status: string, selected: boolean) {
  if (!selected) return statusColor(status)
  if (status === "OK") return statusColor(status)
  return "#c3e88d"
}

function sectionPage(section: SidebarSection, health: ToolkitHealth, loading: boolean) {
  const repairCount = 1
  const detectedRepairCount = health.workspaceRepair.status === "DETECTED" ? 1 : 0
  const summary = loading
    ? "Checking OpenCode data..."
    : section === "Overview"
      ? `Repairs: ${detectedRepairCount} detected - Archived: ${health.archivedCount} - Logs: ${health.logErrorCount} errors - Backups: ${health.backupCount}`
      : section === "Repairs"
        ? `${repairCount} checks - ${detectedRepairCount} detected - backup ${health.backupStatus}`
        : section === "Sessions"
          ? `${health.archivedCount} archived - newest archived first`
          : section === "Logs"
            ? `${health.logSourceCount} files - ${health.logErrorCount} errors - ${health.logWarningCount} warnings - filter: all`
            : section === "Backups"
              ? `${health.backupCount} backups - latest ${latestBackupTime(health.lastBackup)} - restore requires confirmation`
              : "OpenCode path, backup policy, display preferences"

  return {
    title: section === "Overview" ? "Recommended actions" : section,
    summary,
  }
}

function detailsSections(section: SidebarSection, health: ToolkitHealth, action: OverviewAction | undefined): { title: string; sections: DetailsSection[] } {
  if (section === "Overview") {
    return {
      title: "Details",
      sections: [
        {
          title: "Selected",
          rows: [
            ["Title", action?.title],
            ["Status", action?.status],
            ["Category", action?.category],
            ["Action", action?.actionHint],
          ],
        },
        {
          title: "Target",
          rows: [
            ["Type", action?.target],
            ["Mode", action?.safety],
            ["Route", action?.targetRoute],
          ],
        },
        {
          title: "Data",
          rows: [
            ["Path", health.dataDir],
            ["Backup", health.backupStatus],
          ],
        },
      ],
    }
  }

  if (section === "Repairs") {
    const repair = repairStatusDisplay(health.workspaceRepair)
    return {
      title: "Repairs",
      sections: [
        {
          title: "Check",
          rows: [
            ["Type", repair.label],
            ["Status", repair.status],
            ["Action", repair.actionHint],
          ],
        },
        {
          title: "Target",
          rows: [
            ["Type", "opencode.db"],
            ["Mode", action?.safety ?? "read-only"],
            ["Safety", "backup before apply"],
          ],
        },
        {
          title: "Data",
          rows: [
            ["Path", health.dbPath],
            ["Changes", health.workspaceRepair.changes.length],
          ],
        },
      ],
    }
  }

  if (section === "Sessions") {
    return {
      title: "Sessions",
      sections: [
        {
          title: "Summary",
          rows: [
            ["Archived", health.archivedCount],
            ["Order", "newest first"],
            ["Action", "Enter to browse"],
          ],
        },
        {
          title: "Data",
          rows: [
            ["Path", health.dbPath],
            ["Table", "session"],
          ],
        },
        {
          title: "Safety",
          rows: [["Mode", "backup before restore"]],
        },
      ],
    }
  }

  if (section === "Logs") {
    return {
      title: "Logs",
      sections: [
        {
          title: "Summary",
          rows: [
            ["Files", health.logSourceCount],
            ["Errors", health.logErrorCount],
            ["Warnings", health.logWarningCount],
          ],
        },
        {
          title: "Target",
          rows: [
            ["Mode", "read-only"],
            ["Action", "Enter to inspect"],
          ],
        },
        {
          title: "Data",
          rows: [
            ["Path", `${health.dataDir}/log`],
            ["Latest", health.latestLog ?? "none"],
          ],
        },
      ],
    }
  }

  if (section === "Backups") {
    return {
      title: "Backups",
      sections: [
        {
          title: "Summary",
          rows: [
            ["Backups", health.backupCount],
            ["Latest", latestBackupTime(health.lastBackup)],
            ["Status", health.backupStatus],
          ],
        },
        {
          title: "Target",
          rows: [
            ["Type", "opencode.db"],
            ["Mode", "read-only"],
            ["Safety", "confirm restore"],
          ],
        },
        {
          title: "Data",
          rows: [["Path", health.dbPath]],
        },
      ],
    }
  }

  return {
    title: "Settings",
    sections: [
      {
        title: "Groups",
        rows: [
          ["OpenCode", "path"],
          ["Backups", "policy"],
          ["Display", "preferences"],
        ],
      },
      {
        title: "Data",
        rows: [["Path", health.dataDir]],
      },
    ],
  }
}

function latestBackupTime(filename: string | undefined) {
  if (!filename) return "none"
  const parsed = filenameBackupDate(filename)
  return parsed ? formatDate(parsed) : "unknown"
}

function filenameBackupDate(filename: string) {
  const match = filename.match(/backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (!match) return undefined
  const [, year, month, day, hour, minute, second] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatTimestamp(value: number) {
  return formatDate(new Date(value))
}

function formatDate(date: Date) {
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
