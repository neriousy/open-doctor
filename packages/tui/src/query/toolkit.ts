import { queryOptions } from "@tanstack/react-query"
import { Effect } from "effect"
import type { BackupFile } from "@open-doctor/core/utils/backups"
import { createBackup, listBackups, verifyBackup } from "@open-doctor/core/utils/backups"
import type { BackupVerification } from "@open-doctor/core/utils/backups"
import { resolveDbArg } from "@open-doctor/core/input"
import { Logs } from "@open-doctor/core/utils/logs"
import type { LogEntry, LogSource } from "@open-doctor/core/utils/logs"
import { listArchivedSessions } from "@open-doctor/core/utils/sessions"
import type { ArchivedSession } from "@open-doctor/core/utils/sessions"
import type { ToolkitHealth } from "../health.js"
import { scanToolkitHealth } from "../health.js"
import { runCorePromise, runCoreSync } from "../core-runtime.js"

export const queryKeys = {
  toolkit: ["toolkit"] as const,
  health: (dbPath = resolveDbArg()) => [...queryKeys.toolkit, "health", { dbPath }] as const,
  sessions: {
    archived: (dbPath = resolveDbArg()) => [...queryKeys.toolkit, "sessions", "archived", { dbPath }] as const,
  },
  logs: {
    sources: (dbPath = resolveDbArg()) => [...queryKeys.toolkit, "logs", "sources", { dbPath }] as const,
    entries: (source: LogSource) => [...queryKeys.toolkit, "logs", "entries", { sourceId: source.id, path: source.path, mtime: source.mtime }] as const,
  },
  backups: {
    list: (dbPath = resolveDbArg()) => [...queryKeys.toolkit, "backups", "list", { dbPath }] as const,
  },
}

export const mutationKeys = {
  sessions: {
    unarchive: () => [...queryKeys.toolkit, "sessions", "unarchive"] as const,
  },
  backups: {
    create: () => [...queryKeys.toolkit, "backups", "create"] as const,
    verify: () => [...queryKeys.toolkit, "backups", "verify"] as const,
  },
}

export function healthQueryOptions(dbPath = resolveDbArg()) {
  return queryOptions<ToolkitHealth>({
    queryKey: queryKeys.health(dbPath),
    queryFn: () => scanToolkitHealth(dbPath),
  })
}

export function archivedSessionsQueryOptions(dbPath = resolveDbArg()) {
  return queryOptions<ArchivedSession[]>({
    queryKey: queryKeys.sessions.archived(dbPath),
    queryFn: () => runCorePromise(listArchivedSessions(dbPath)),
  })
}

export function logSourcesQueryOptions(dbPath = resolveDbArg()) {
  return queryOptions<LogSource[]>({
    queryKey: queryKeys.logs.sources(dbPath),
    queryFn: () => discoverLogSources(dbPath),
  })
}

export function logEntriesQueryOptions(source: LogSource) {
  return queryOptions<LogEntry[]>({
    queryKey: queryKeys.logs.entries(source),
    queryFn: () => readLogEntries(source),
  })
}

export function backupsQueryOptions(dbPath = resolveDbArg()) {
  return queryOptions<BackupFile[]>({
    queryKey: queryKeys.backups.list(dbPath),
    queryFn: () => listBackups(dbPath),
  })
}

export function createManualBackup(dbPath = resolveDbArg()) {
  return runCorePromise(createBackup(dbPath))
}

export function verifyBackupFile(filename: string): Promise<BackupVerification> {
  return runCorePromise(verifyBackup(filename))
}

function discoverLogSources(dbPath: string) {
  const logs = runCoreSync(Effect.gen(function* () {
    return yield* Logs
  }))
  return logs.discover(dbPath)
}

function readLogEntries(source: LogSource) {
  const logs = runCoreSync(Effect.gen(function* () {
    return yield* Logs
  }))
  return logs.read(source)
}
