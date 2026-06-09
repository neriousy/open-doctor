// Health-driven section shell with sidebar navigation, page-specific content, and details.
import { useState } from "react"
import { useBackups } from "../../context/backups.js"
import { useHealth } from "../../context/health.js"
import { useLogs } from "../../context/logs.js"
import { useOverview } from "../../context/overview.js"
import { useSessions } from "../../context/sessions.js"
import type { ToolkitHealth } from "../../health.js"
import { SIDEBAR_ITEMS } from "../../navigation.js"
import { repairStatusDisplay } from "../../util/repair-status.js"
import { ActionListItem, Box, DetailsPanel, EmptyState, MainPanel, Sidebar, Text } from "../../ui/primitives.js"
import type { DetailsSection, SidebarItem } from "../../ui/primitives-model.js"
import type { OverviewAction, SidebarSection } from "../../types.js"

export function HomeView() {
  const health = useHealth()
  const overview = useOverview()
  const [hoveredSection, setHoveredSection] = useState<SidebarSection | null>(null)
  const action = overview.action.visibleIndexes.includes(overview.action.selected) ? overview.action.items[overview.action.selected] : undefined
  const page = sectionPage(overview.section.active, health.snapshot, health.loading)
  const details = detailsSections(overview.section.active, health.snapshot, action)
  const sidebarItems = sidebarItemsFromHealth(health.snapshot)

  return (
    <Box id="home" flexGrow={1} flexShrink={1} flexDirection="row" marginTop={1} columnGap={1}>
      <Sidebar
        items={sidebarItems}
        selected={overview.section.active}
        focused={overview.pane.focused === "sidebar"}
        hovered={hoveredSection}
        onSelect={overview.section.select}
        onHover={setHoveredSection}
      />

      <MainPanel id="overview-main" title={page.title} summary={page.summary} focused={overview.pane.focused === "actions"}>

        <Box id="section-content" flexGrow={1} flexDirection="column" marginTop={1}>
          {overview.section.active === "Overview" ? (
            <OverviewContent />
          ) : overview.section.active === "Repairs" ? (
            <RepairsContent />
          ) : overview.section.active === "Sessions" ? (
            <SessionsContent />
          ) : overview.section.active === "Logs" ? (
            <LogsContent />
          ) : overview.section.active === "Backups" ? (
            <BackupsContent />
          ) : (
            <SettingsContent />
          )}
        </Box>

        <Box id="home-status" height={2} marginTop={1}>
          <Text fg="#9fb3c8" wrapMode="word">
            {health.status.message}
          </Text>
        </Box>
      </MainPanel>

      <DetailsPanel title={details.title} sections={details.sections} />
    </Box>
  )
}

function OverviewContent() {
  const health = useHealth()
  const logs = useLogs()
  const backups = useBackups()
  const latestLog = logs.source.items[0]
  const latestBackup = backups.backup.items[0]

  return (
    <>
      {health.snapshot.workspaceRepair.status === "OK" ? (
        <Text fg="#9fb3c8" height={1}>
          No repairs detected
        </Text>
      ) : null}
      <ActionList />
      <Box id="overview-secondary" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <Box id="health-checks" width="58%" flexDirection="column">
          <Text fg="#d6deeb" height={1}>
            Health checks
          </Text>
          {health.snapshot.checks.slice(0, 6).map((check) => (
            <Text key={check.label} fg="#9fb3c8" height={1}>
              {`[${check.status}] ${check.label}: ${truncate(check.detail, 84)}`}
            </Text>
          ))}
        </Box>

        <Box id="recent-activity" flexGrow={1} flexDirection="column" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
          <Text fg="#d6deeb" height={1}>
            Recent activity
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {`Latest backup: ${latestBackup ? formatDate(new Date(latestBackup.mtime)) : latestBackupTime(health.snapshot.lastBackup)}`}
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {`Latest log: ${latestLog ? latestLog.label : health.snapshot.latestLog ?? "none"}`}
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {`Last scan: ${formatDate(new Date(health.snapshot.scannedAt))}`}
          </Text>
          <Text fg="#7893ad" wrapMode="word">
            {`Data: ${health.snapshot.dataDir}`}
          </Text>
        </Box>
      </Box>
    </>
  )
}

function RepairsContent() {
  const health = useHealth()
  const repair = repairStatusDisplay(health.snapshot.workspaceRepair)

  return (
    <>
      <ActionList />
      <Box flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <Box flexGrow={1} flexDirection="column">
          <Text fg="#d6deeb" height={1}>
            Repair checks
          </Text>
          <Text fg={repair.color} height={1}>
            {`[${repair.status}] ${repair.label}`}
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {repair.description}
          </Text>
          <Text fg="#7893ad" height={1}>
            {repair.actionHint}
          </Text>
          <Text fg="#7893ad" height={1}>
            {`Planned SQL change(s): ${health.snapshot.workspaceRepair.changes.length}`}
          </Text>
        </Box>

        <Box width="42%" flexDirection="column" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
          <Text fg="#d6deeb" height={1}>
            Last repair report
          </Text>
          <Text fg="#9fb3c8" wrapMode="word">
            {health.status.message}
          </Text>
          <Text fg="#d6deeb" height={1}>
            Safety note
          </Text>
          <Text fg="#7893ad" wrapMode="word">
            Repairs that modify OpenCode data require a backup first.
          </Text>
        </Box>
      </Box>
    </>
  )
}

function SessionsContent() {
  const health = useHealth()
  const sessions = useSessions()
  if (sessions.loading && sessions.list.items.length === 0) {
    return (
      <EmptyState
        title="Loading archived sessions..."
        explanation="Newest archived sessions are being read from the OpenCode database."
        checkedPath={health.snapshot.dbPath}
      />
    )
  }

  if (sessions.list.items.length === 0) {
    return (
      <EmptyState
        title="No archived sessions found"
        explanation="Archived sessions will appear here when OpenCode has sessions marked archived."
        checkedPath={health.snapshot.dbPath}
        actions={[
          { key: "r", label: "refresh" },
          { key: "l", label: "open logs" },
          { key: "Esc", label: "back" },
        ]}
      />
    )
  }

  return (
    <Box flexDirection="column">
      <Text fg="#d6deeb" height={1}>
        Archived sessions
      </Text>
      {sessions.list.items.slice(0, 10).map((session) => (
        <Box key={session.id} height={3} paddingLeft={1} backgroundColor="#0f1419">
          <Text fg="#d6deeb" height={1}>
            {truncate(session.title || "(untitled)", 80)}
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {`${formatTimestamp(session.timeArchived)} - ${truncate(session.directory, 80)}`}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

function LogsContent() {
  const health = useHealth()
  const logs = useLogs()
  if (logs.loading && logs.source.items.length === 0) return <EmptyState title="Refreshing logs..." explanation="Scanning known OpenCode log locations." />
  if (logs.source.items.length === 0) {
    return (
      <EmptyState
        title="No log files found"
        explanation="Known OpenCode log locations did not contain readable log files."
        checkedPath={`${health.snapshot.dataDir}/log`}
        actions={[
          { key: "r", label: "refresh" },
          { key: "Esc", label: "back" },
        ]}
      />
    )
  }

  return (
    <Box flexDirection="column">
      <Text fg="#d6deeb" height={1}>
        Log sources
      </Text>
      <Text fg="#9fb3c8" height={1}>
        {`${health.snapshot.logErrorCount} error line(s), ${health.snapshot.logWarningCount} warning line(s) in recent tails`}
      </Text>
      {logs.source.items.slice(0, 12).map((source) => (
        <Box key={source.id} height={2} paddingLeft={1} backgroundColor="#0f1419">
          <Text fg="#d6deeb" height={1}>
            {`${source.label} - ${formatSize(source.size)}`}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

function BackupsContent() {
  const backups = useBackups()
  return (
    <Box flexGrow={1} flexDirection="row" columnGap={1}>
      <Box flexGrow={1} flexDirection="column">
        {backups.loading && backups.backup.items.length === 0 ? (
          <EmptyState title="Loading backups..." explanation="Scanning for toolkit-created database backups." />
        ) : backups.backup.items.length === 0 ? (
          <EmptyState
            title="No backups yet"
            explanation="Open the backups tool to create and inspect toolkit database backups."
            actions={[
              { key: "Enter", label: "open backups" },
              { key: "c", label: "create manual backup" },
            ]}
          />
        ) : (
          <>
            <Text fg="#d6deeb" height={1}>
              Backup list
            </Text>
            {backups.backup.items.slice(0, 10).map((backup) => (
              <Box key={backup.id} height={3} paddingLeft={1} backgroundColor="#0f1419">
                <Text fg="#d6deeb" height={1}>
                  {formatDate(new Date(backup.mtime))}
                </Text>
                <Text fg="#9fb3c8" height={1}>
                  {`${formatSize(backup.size)} - ${truncate(backup.path, 90)}`}
                </Text>
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box width="36%" border borderColor="#263544" paddingLeft={1} paddingRight={1}>
        <Text fg="#d6deeb" height={1}>
          Backup policy
        </Text>
        <Text fg="#9fb3c8" wrapMode="word">
          Backups are created before repairs and restores.
        </Text>
        <Text fg="#7893ad" wrapMode="word">
          Restore should require closing OpenCode first.
        </Text>
      </Box>
    </Box>
  )
}

function SettingsContent() {
  return (
    <Box flexDirection="column">
      {[
        { title: "OpenCode path", detail: "Database location, data directory, and log discovery roots." },
        { title: "Backup policy", detail: "Manual backups, repair-time backups, and future restore confirmation." },
        { title: "Display preferences", detail: "Theme, density, and log rendering defaults." },
      ].map((group) => (
        <Box key={group.title} height={4} paddingLeft={1} border borderColor="#263544">
          <Text fg="#82aaff" height={1}>
            {group.title}
          </Text>
          <Text fg="#9fb3c8" height={1}>
            {group.detail}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

function ActionList() {
  const overview = useOverview()
  const [hoveredAction, setHoveredAction] = useState<number | null>(null)
  const actions = overview.action.visibleIndexes.flatMap((index) => {
    const item = overview.action.items[index]
    return item ? [{ index, action: item }] : []
  })
  if (actions.length === 0) return null

  return (
    <Box id="action-list" flexDirection="column">
      {actions.map(({ action: item, index }) => (
        <ActionListItem
          key={item.id}
          id={item.id}
          status={item.status}
          title={item.title}
          description={item.description}
          actionHint={item.actionHint}
          category={item.category}
          selected={index === overview.action.selected}
          focused={overview.pane.focused === "actions"}
          hovered={hoveredAction === index}
          onSelect={() => overview.action.inspect(index)}
          onHover={(hovered) => setHoveredAction(hovered ? index : null)}
        />
      ))}
    </Box>
  )
}

function sidebarItemsFromHealth(health: ToolkitHealth): SidebarItem<SidebarSection>[] {
  return SIDEBAR_ITEMS.map((item) => {
    const badge =
      item === "Repairs"
        ? health.issueCount
        : item === "Sessions"
          ? health.archivedCount
          : item === "Logs"
            ? health.logErrorCount
            : item === "Backups"
              ? health.backupCount
              : undefined
    const base = { id: item, label: item }
    return badge === undefined ? base : { ...base, badge }
  })
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
