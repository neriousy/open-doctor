// Backup utilities for OpenCode SQLite database safety flows.
import fs from "node:fs"
import path from "node:path"
import { Effect } from "effect"
import { backupDatabase, withDatabase } from "../db/sqlite.js"
import { resolveDbArg } from "../cli/input.js"

export type BackupFile = {
  id: string
  path: string
  name: string
  size: number
  mtime: number
}

export function listBackups(dbPath = resolveDbArg()) {
  const dir = path.dirname(dbPath)
  const basename = path.basename(dbPath)
  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${basename}.backup-`) && name.endsWith(".db"))
    .map((name) => {
      const filename = path.join(dir, name)
      const stat = fs.statSync(filename)
      return {
        id: filename,
        path: filename,
        name,
        size: stat.size,
        mtime: stat.mtime.getTime(),
      } satisfies BackupFile
    })
    .sort((left, right) => right.mtime - left.mtime)
}

export function createBackup(dbPath = resolveDbArg()) {
  return withDatabase(dbPath, (db) =>
    Effect.gen(function* () {
      return yield* backupDatabase(db, dbPath)
    }),
  )
}
