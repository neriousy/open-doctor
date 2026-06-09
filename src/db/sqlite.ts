// SQLite boundary: loading SQLite drivers, opening DBs, backups, inspection, and guards.
import fs from "node:fs"
import { createRequire } from "node:module"
import process from "node:process"
import { Effect } from "effect"
import { fail, ToolkitError } from "../error.js"
import { stringField } from "./row.js"

const require = createRequire(import.meta.url)

export type SqliteStatement = {
  all: (...params: unknown[]) => Record<string, unknown>[]
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  run: (...params: unknown[]) => unknown
}

export type SqliteDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
  close: () => void
}

export type DatabaseState = {
  tables: Set<string>
  columns: Record<string, Set<string>>
  completedMigrations: Set<string>
}

export type SqlChange = {
  label: string
  sql: string
}

export const openDatabase = Effect.fn("Database.open")(function* (filename: string) {
  if (!fs.existsSync(filename)) return yield* fail(`Database not found: ${filename}`)
  const db = createDatabase(filename)
  db.exec("PRAGMA busy_timeout = 5000")
  return db
})

export function createDatabase(filename: string) {
  const nodeSqlite = loadNodeSqlite()
  if (nodeSqlite) return new nodeSqlite.DatabaseSync(filename) as SqliteDatabase
  const BetterSqlite = loadBetterSqlite()
  return new BetterSqlite(filename) as SqliteDatabase
}

export function loadNodeSqlite() {
  const emitWarning = process.emitWarning
  process.emitWarning = ((warning: string | Error, type?: string, code?: string, ctor?: Function) => {
    const message = typeof warning === "string" ? warning : warning?.message
    if (typeof message === "string" && message.includes("SQLite is an experimental feature")) return
    Reflect.apply(
      emitWarning,
      process,
      [warning, type, code, ctor].filter((item) => item !== undefined),
    )
  }) as typeof process.emitWarning
  try {
    return require("node:sqlite") as { DatabaseSync: new (filename: string) => unknown }
  } catch (error) {
    if (isMissingBuiltinSqlite(error)) return undefined
    throw error
  } finally {
    process.emitWarning = emitWarning
  }
}

export function loadBetterSqlite() {
  try {
    return require("better-sqlite3") as new (filename: string) => unknown
  } catch (error) {
    throw new ToolkitError({
      message: `Unable to load SQLite support. Use Node >=20.17.0 and reinstall open-doctor so better-sqlite3 can install. ${formatDriverError(error)}`,
    })
  }
}

export function withDatabase<A, E>(filename: string, use: (db: SqliteDatabase) => Effect.Effect<A, E | ToolkitError>) {
  return Effect.acquireUseRelease(
    openDatabase(filename),
    use,
    (db) => Effect.sync(() => db.close()),
  )
}

export const inspect = Effect.fn("Database.inspect")(function* (db: SqliteDatabase) {
  return yield* Effect.sync(() => {
    const tables = new Set(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => stringField(row, "name")),
    )
    return {
      tables,
      columns: Object.fromEntries([...tables].map((table) => [table, tableColumns(db, table)])),
      completedMigrations: tables.has("migration") ? completedMigrations(db) : new Set<string>(),
    } satisfies DatabaseState
  })
})

export function tableColumns(db: SqliteDatabase, table: string) {
  return new Set(db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => stringField(row, "name")))
}

export function completedMigrations(db: SqliteDatabase) {
  return new Set(db.prepare("SELECT id FROM migration").all().map((row) => stringField(row, "id")))
}

export const backupDatabase = Effect.fn("Database.backup")(function* (db: SqliteDatabase, filename: string) {
  return yield* Effect.sync(() => {
    const backup = `${filename}.backup-${timestamp()}.db`
    db.exec(`VACUUM INTO ${quoteString(backup)}`)
    return backup
  })
})

export const runTransaction = Effect.fn("Database.runTransaction")(function* (db: SqliteDatabase, changes: SqlChange[]) {
  return yield* Effect.sync(() => {
    db.exec("BEGIN IMMEDIATE")
    try {
      changes.map((change) => db.exec(change.sql))
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  })
})

export function requireTable(db: SqliteDatabase, table: string) {
  return Effect.gen(function* () {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
    if (!row) return yield* fail(`Missing table: ${table}`)
  })
}

export function requireColumns(db: SqliteDatabase, table: string, columns: string[]) {
  return Effect.gen(function* () {
    const existing = tableColumns(db, table)
    const missing = columns.filter((column) => !existing.has(column))
    if (missing.length > 0) return yield* fail(`Missing ${table} column(s): ${missing.join(", ")}`)
  })
}

export function quoteIdentifier(input: string) {
  return `"${input.replaceAll('"', '""')}"`
}

export function quoteString(input: string) {
  return `'${input.replaceAll("'", "''")}'`
}

export function timestamp() {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "-")
}

function isMissingBuiltinSqlite(error: unknown) {
  if (!(error instanceof Error)) return false
  const code = (error as NodeJS.ErrnoException).code
  return code === "ERR_UNKNOWN_BUILTIN_MODULE" || error.message.includes("No such built-in module")
}

function formatDriverError(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
