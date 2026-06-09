// Backup utilities for OpenCode SQLite database safety flows.
import fs from "node:fs"
import path from "node:path"
import { Effect } from "effect"
import { backupDatabase, withDatabase } from "../db/sqlite.js"
import { stringField } from "../db/row.js"
import { resolveDbArg } from "../cli/input.js"

export type BackupFile = {
  id: string
  path: string
  name: string
  size: number
  mtime: number
  sourceDatabase: string
  reason?: string
}

export function listBackups(dbPath = resolveDbArg()) {
  const dir = path.dirname(dbPath)
  const basename = path.basename(dbPath)
  if (!fs.existsSync(dir)) return []

  const backups: BackupFile[] = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith(`${basename}.backup-`) || !name.endsWith(".db")) continue
    const filename = path.join(dir, name)
    const stat = fs.statSync(filename)
    const metadata = parseBackupMetadata(name, basename)
    const backup = {
      id: filename,
      path: filename,
      name,
      size: stat.size,
      mtime: stat.mtime.getTime(),
      sourceDatabase: metadata.sourceDatabase,
    } satisfies BackupFile
    backups.push(metadata.reason ? { ...backup, reason: metadata.reason } : backup)
  }

  return backups.toSorted((left, right) => right.mtime - left.mtime)
}

export function createBackup(dbPath = resolveDbArg()) {
  return withDatabase(dbPath, (db) =>
    Effect.gen(function* () {
      return yield* backupDatabase(db, dbPath)
    }),
  )
}

export type BackupVerification = {
  ok: boolean
  message: string
}

export function verifyBackup(filename: string) {
  return withDatabase(filename, (db) =>
    Effect.sync(() => {
      const row = db.prepare("PRAGMA integrity_check").get()
      const message = stringField(row ?? {}, "integrity_check") || "No integrity check result"
      return {
        ok: message === "ok",
        message,
      } satisfies BackupVerification
    }),
  )
}

function parseBackupMetadata(name: string, fallbackSource: string) {
  const match = name.match(/^(?<source>.+)\.backup-[^.]+(?:\.(?<reason>[^.]+))?\.db$/)
  return {
    sourceDatabase: match?.groups?.source ?? fallbackSource,
    reason: match?.groups?.reason?.replaceAll("-", " "),
  }
}
