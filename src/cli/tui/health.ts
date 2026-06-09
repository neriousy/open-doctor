// Non-destructive startup checks that feed the TUI overview and recommendations.
import fs from "node:fs"
import path from "node:path"
import { Effect } from "effect"
import { formatError } from "../../error.js"
import { inspect, withDatabase } from "../../db/sqlite.js"
import type { SqlChange } from "../../db/sqlite.js"
import { plannedWorkspaceRepairs } from "../../repairs/no-such-column-name.js"
import { listBackups } from "../../utils/backups.js"
import { discoverLogSources, summarizeLogs } from "../../utils/logs.js"
import { listArchivedSessions } from "../../utils/sessions.js"
import { defaultDataDir, resolveDbArg } from "../input.js"

export type RepairStatus = "OK" | "DETECTED" | "WARN" | "CHECK" | "FAILED" | "EXPERIMENTAL"
export type ToolStatus = RepairStatus | "INFO" | "UTILITY" | "PLANNED" | "MISSING"

export type HealthCheck = {
  label: string
  status: ToolStatus
  detail: string
}

export type WorkspaceRepairHealth = {
  status: RepairStatus
  changes: SqlChange[]
  detail: string
  error?: string
}

export type ToolkitHealth = {
  dataDir: string
  dbPath: string
  dbFound: boolean
  scannedAt: number
  issueCount: number
  archivedCount: number
  logSourceCount: number
  logWarningCount: number
  logErrorCount: number
  latestLog: string | undefined
  backupCount: number
  lastBackup: string | undefined
  backupStatus: string
  workspaceRepair: WorkspaceRepairHealth
  checks: HealthCheck[]
}

export function emptyHealth(dbPath = resolveDbArg()): ToolkitHealth {
  const dataDir = fs.existsSync(dbPath) ? path.dirname(dbPath) : path.join(defaultDataDir(), "opencode")
  return {
    dataDir,
    dbPath,
    dbFound: false,
    scannedAt: Date.now(),
    issueCount: 0,
    archivedCount: 0,
    logSourceCount: 0,
    logWarningCount: 0,
    logErrorCount: 0,
    latestLog: undefined,
    backupCount: 0,
    lastBackup: undefined,
    backupStatus: "checking",
    workspaceRepair: {
      status: "CHECK",
      changes: [],
      detail: "Checking workspace database schema...",
    },
    checks: [],
  }
}

export async function scanToolkitHealth(dbPath = resolveDbArg()): Promise<ToolkitHealth> {
  const dataDir = fs.existsSync(dbPath) ? path.dirname(dbPath) : path.join(defaultDataDir(), "opencode")
  const dataDirFound = fs.existsSync(dataDir)
  const dbFound = fs.existsSync(dbPath)
  const lastBackup = newestBackup(dbPath)
  const backupCount = listBackups(dbPath).length
  const logSources = discoverLogSources(dbPath)
  const logSummary = summarizeLogs(logSources)
  const checks: HealthCheck[] = [
    {
      label: "Data directory",
      status: dataDirFound ? "OK" : "MISSING",
      detail: dataDirFound ? dataDir : "OpenCode data directory was not found",
    },
    {
      label: "OpenCode database",
      status: dbFound ? "OK" : "MISSING",
      detail: dbFound ? dbPath : "Database file was not found",
    },
  ]

  if (!dbFound) {
    checks.push({
      label: "Logs",
      status: logSummary.sourceCount > 0 ? "INFO" : "MISSING",
      detail:
        logSummary.sourceCount === 0
          ? "No log sources found"
          : `${logSummary.sourceCount} log file(s), ${logSummary.errorCount} error line(s), ${logSummary.warningCount} warning line(s)`,
    })

    return {
      dataDir,
      dbPath,
      dbFound,
      scannedAt: Date.now(),
      issueCount: 1,
      archivedCount: 0,
      logSourceCount: logSummary.sourceCount,
      logWarningCount: logSummary.warningCount,
      logErrorCount: logSummary.errorCount,
      latestLog: logSources[0]?.label,
      backupCount,
      lastBackup,
      backupStatus: backupStatus(lastBackup),
      workspaceRepair: {
        status: "FAILED",
        changes: [],
        detail: "Cannot inspect workspace schema because the OpenCode database was not found.",
      },
      checks,
    }
  }

  const workspaceRepair = await workspaceRepairHealth(dbPath)
  const archivedCount = await archivedSessionCount(dbPath)
  const issueCount = hasRepairIssue(workspaceRepair.status) ? 1 : 0

  checks.push({
    label: "Workspace schema",
    status: workspaceRepair.status,
    detail: workspaceRepair.detail,
  })
  checks.push({
    label: "Archived sessions",
    status: archivedCount > 0 ? "INFO" : "OK",
    detail: archivedCount > 0 ? `${archivedCount} archived session(s) found` : "No archived sessions found",
  })
  checks.push({
    label: "Logs",
    status: logSummary.sourceCount > 0 ? "INFO" : "MISSING",
    detail:
      logSummary.sourceCount === 0
        ? "No log sources found"
        : `${logSummary.sourceCount} log file(s), ${logSummary.errorCount} error line(s), ${logSummary.warningCount} warning line(s)`,
  })
  checks.push({
    label: "Backups",
    status: backupCount > 0 ? "OK" : "INFO",
    detail: backupCount > 0 ? `${backupCount} backup file(s) found` : "No toolkit backups found yet",
  })

  return {
    dataDir,
    dbPath,
    dbFound,
    scannedAt: Date.now(),
    issueCount,
    archivedCount,
    logSourceCount: logSummary.sourceCount,
    logWarningCount: logSummary.warningCount,
    logErrorCount: logSummary.errorCount,
    latestLog: logSources[0]?.label,
    backupCount,
    lastBackup,
    backupStatus: backupStatus(lastBackup),
    workspaceRepair,
    checks,
  }
}

async function workspaceRepairHealth(dbPath: string): Promise<WorkspaceRepairHealth> {
  try {
    const changes = await Effect.runPromise(
      withDatabase(dbPath, (db) =>
        Effect.gen(function* () {
          const state = yield* inspect(db)
          return plannedWorkspaceRepairs(state)
        }),
      ),
    )

    if (changes.length === 0) {
      return {
        status: "OK",
        changes,
        detail: "No repair needed",
      }
    }

    return {
      status: "DETECTED",
      changes,
      detail: changes.map((change) => problemLabel(change.label)).join("; "),
    }
  } catch (error: unknown) {
    return {
      status: "FAILED",
      changes: [],
      detail: "Workspace schema check failed",
      error: formatError(error),
    }
  }
}

function hasRepairIssue(status: RepairStatus) {
  return status === "DETECTED" || status === "WARN" || status === "FAILED" || status === "EXPERIMENTAL"
}

function problemLabel(label: string) {
  const column = label.match(/workspace\.([a-z_]+)/)?.[1]
  if (column) return `Missing column: workspace.${column}`
  return label
}

async function archivedSessionCount(dbPath: string) {
  try {
    const sessions = await Effect.runPromise(listArchivedSessions(dbPath))
    return sessions.length
  } catch {
    return 0
  }
}

function newestBackup(dbPath: string) {
  const dir = path.dirname(dbPath)
  const basename = path.basename(dbPath)
  if (!fs.existsSync(dir)) return undefined

  const backups = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${basename}.backup-`) && name.endsWith(".db"))
    .map((name) => {
      const filename = path.join(dir, name)
      return { filename, mtime: fs.statSync(filename).mtime.getTime() }
    })
    .sort((left, right) => right.mtime - left.mtime)

  return backups[0]?.filename
}

function backupStatus(lastBackup?: string) {
  if (!lastBackup) return "not created yet"
  const mtime = fs.statSync(lastBackup).mtime
  const now = new Date()
  const sameDay = mtime.getFullYear() === now.getFullYear() && mtime.getMonth() === now.getMonth() && mtime.getDate() === now.getDate()
  return sameDay ? "created today" : "not created today"
}
