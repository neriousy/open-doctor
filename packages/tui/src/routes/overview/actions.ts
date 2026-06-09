import type { CommandPaletteItem } from "../../component/command-palette.js"
import type { ToolkitHealth } from "../../health.js"
import { repairStatusDisplay } from "../../util/repair-status.js"
import type { OverviewAction, SidebarSection } from "../../types.js"

export type CommandPaletteAction = CommandPaletteItem & {
  run: () => void
}

export function actionIndexesForSection(actions: OverviewAction[], section: SidebarSection) {
  if (section === "Overview") return actions.map((_, index) => index).sort((left, right) => actions[left]!.priority - actions[right]!.priority)
  return actions.flatMap((action, index) => (action.section === section ? [index] : []))
}

export function recommendedActionsFromState(
  health: ToolkitHealth,
  routes: {
    openRepairDetail: () => void
    openArchivedSessions: () => void
    openLogs: () => void
    openBackups: () => void
  },
): OverviewAction[] {
  const repair = repairStatusDisplay(health.workspaceRepair)
  const backupWarning = health.backupCount === 0 || health.backupStatus !== "created today"
  const logIssueCount = health.logErrorCount + health.logWarningCount

  return [
    {
      id: "workspace-repair",
      section: "Repairs",
      category: "Repairs",
      status: repair.status,
      title: repair.label,
      description: repair.description,
      actionHint: repair.actionHint,
      details:
        repair.status === "OK"
          ? "Workspace schema check passed. No repair is currently needed."
          : repair.status === "DETECTED"
            ? "A known workspace migration problem is present and a repair path is available."
            : "Review the workspace schema check before changing the database.",
      target: "opencode.db",
      targetRoute: "repair-detail",
      safety:
        repair.status === "DETECTED" || repair.status === "EXPERIMENTAL"
          ? "Changes database. A backup will be created first. Confirmation required."
          : "No files will be modified.",
      hotkey: "1",
      priority: repair.priority,
      run: routes.openRepairDetail,
    },
    {
      id: "logs",
      section: "Logs",
      category: "Logs",
      status: health.logSourceCount > 0 ? "LOGS" : "MISSING",
      title: logIssueCount > 0 ? "Review recent errors" : "View logs",
      description:
        health.logSourceCount > 0
          ? `${countLabel(health.logSourceCount, "log file")} - ${countLabel(health.logErrorCount, "error")} - ${countLabel(health.logWarningCount, "warning")}`
          : "No OpenCode log sources found in known locations.",
      actionHint: "Enter to inspect logs",
      details: "Inspect raw OpenCode log tails by source and filter by level.",
      target: "log sources",
      targetRoute: "logs",
      safety: "Reviewing logs is read-only.",
      hotkey: "3",
      priority: logIssueCount > 0 ? 20 : 45,
      run: routes.openLogs,
    },
    {
      id: "archived-sessions",
      section: "Sessions",
      category: "Sessions",
      status: health.archivedCount > 0 ? "UTILITY" : "OK",
      title: health.archivedCount > 0 ? "Review archived sessions" : "Browse sessions",
      description:
        health.archivedCount > 0
          ? `${health.archivedCount} archived session(s), newest archived first`
          : "No archived sessions detected",
      actionHint: "Enter to browse sessions",
      details: "Preview and restore archived OpenCode sessions from the database.",
      target: "session table",
      targetRoute: "archived",
      safety: "Restoring sessions changes the database. A backup will be created first.",
      hotkey: "2",
      priority: health.archivedCount > 0 ? 30 : 55,
      run: routes.openArchivedSessions,
    },
    {
      id: "backups",
      section: "Data",
      category: "Data",
      status: backupWarning ? "WARN" : "BACKUP",
      title: backupWarning ? "Create a database backup" : "Review database backups",
      description:
        health.backupCount === 0
          ? "No toolkit backups found"
          : `${countLabel(health.backupCount, "backup")} - latest ${health.backupStatus}`,
      actionHint: backupWarning ? "Enter to inspect backups" : "Enter to review backups",
      details: "Review toolkit-created SQLite backups. Restore will require explicit confirmation.",
      target: "opencode.db",
      targetRoute: "backups",
      safety: "Creating a backup writes a new file. Existing data is not changed.",
      hotkey: "4",
      priority: backupWarning ? 40 : 60,
      run: routes.openBackups,
    },
  ]
}

export function commandPaletteItems(
  health: ToolkitHealth,
  routes: {
    openRepairDetail: () => void
    openArchivedSessions: () => void
    openLogs: () => void
    openBackups: () => void
    openData: () => void
    openConfig: () => void
    openSettings: () => void
    requestCreateBackupConfirmation: () => void
    refreshHealth: () => void
  },
): CommandPaletteAction[] {
  const repair = repairStatusDisplay(health.workspaceRepair)
  const logStatus =
    health.logErrorCount > 0
      ? countLabel(health.logErrorCount, "error")
      : health.logWarningCount > 0
        ? countLabel(health.logWarningCount, "warning")
        : health.logSourceCount > 0
          ? countLabel(health.logSourceCount, "source")
          : "missing"

  return [
    {
      id: "workspace-db-schema",
      title: "Workspace DB schema",
      category: "Repairs",
      status: repair.status,
      actionHint: "Open schema repair detail",
      run: routes.openRepairDetail,
    },
    {
      id: "archived-sessions",
      title: "Archived sessions",
      category: "Sessions",
      status: countLabel(health.archivedCount, "archived"),
      actionHint: "Browse archived sessions",
      run: routes.openArchivedSessions,
    },
    {
      id: "view-logs",
      title: "View logs",
      category: "Logs",
      status: logStatus,
      actionHint: "Open log viewer",
      run: routes.openLogs,
    },
    {
      id: "database-backups",
      title: "Database backups",
      category: "Data",
      status: health.backupCount > 0 ? `${countLabel(health.backupCount, "backup")} - ${health.backupStatus}` : "none",
      actionHint: "Open backup browser",
      run: routes.openBackups,
    },
    {
      id: "data",
      title: "Data",
      category: "Navigation",
      status: "available",
      actionHint: "Open local data workspace",
      run: routes.openData,
    },
    {
      id: "config",
      title: "Config",
      category: "Navigation",
      status: "available",
      actionHint: "Open configuration workspace",
      run: routes.openConfig,
    },
    {
      id: "settings",
      title: "Settings",
      category: "Navigation",
      status: "planned",
      actionHint: "Open settings section",
      run: routes.openSettings,
    },
    {
      id: "create-backup",
      title: "Create backup",
      category: "Data",
      status: "available",
      actionHint: "Create a database backup...",
      run: routes.requestCreateBackupConfirmation,
    },
    {
      id: "run-health-scan",
      title: "Run health scan",
      category: "Overview",
      status: "available",
      actionHint: "Refresh health checks",
      run: routes.refreshHealth,
    },
  ]
}

export function filteredCommandItems(items: CommandPaletteAction[], query: string) {
  const search = query.trim().toLowerCase()
  if (!search) return items
  return items.filter((item) =>
    [item.title, item.category, item.status, item.actionHint].some((value) => value.toLowerCase().includes(search)),
  )
}

export function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
