#!/usr/bin/env node
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { Effect, Schema } from "effect"

const WORKSPACE_FIELDS_MIGRATION = "20260303231226_add_workspace_fields"
const WORKSPACE_NAME_MIGRATION = "20260410174513_workspace-name"
const WORKSPACE_TIME_MIGRATION = "20260507164347_add_workspace_time"
const require = createRequire(import.meta.url)

const CliOptions = Schema.Struct({
  dryRun: Schema.Boolean,
  backup: Schema.Boolean,
})
type CliOptions = typeof CliOptions.Type

const DbInput = Schema.Struct({
  db: Schema.String,
  options: CliOptions,
})
type DbInput = typeof DbInput.Type

const ArchivedSession = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  directory: Schema.String,
  timeUpdated: Schema.Number,
  timeArchived: Schema.Number,
})
type ArchivedSession = typeof ArchivedSession.Type

class ToolkitError extends Schema.TaggedErrorClass<ToolkitError>()("ToolkitError", {
  message: Schema.String,
}) {}

type SqliteStatement = {
  all: (...params: unknown[]) => Record<string, unknown>[]
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  run: (...params: unknown[]) => unknown
}

type SqliteDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
  close: () => void
}

type WorkspaceRepair = {
  label: string
  sql: string
}

type DatabaseState = {
  tables: Set<string>
  columns: Record<string, Set<string>>
  completedMigrations: Set<string>
}

type RepairResult = {
  filename: string
  backup?: string
  changes: WorkspaceRepair[]
  dryRun?: boolean
}

type UnarchiveResult = {
  changed: boolean
  backup?: string
  dryRun?: boolean
}

const fail = (message: string) => Effect.fail(new ToolkitError({ message }))

const main = Effect.fn("Cli.main")(function* (args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    yield* Effect.sync(printHelp)
    return
  }

  if (args.length === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      yield* Effect.promise(() => runTui())
      return
    }
    yield* Effect.sync(printHelp)
    return
  }

  if (args[0] === "repair-db") {
    const result = yield* repairDatabase(parseDbAndOptions(args.slice(1)))
    yield* Effect.sync(() => printRepairResult(result))
    return
  }

  if (args[0] === "sessions" && args[1] === "archived") {
    const sessions = yield* listArchivedSessions(parseDbAndOptions(args.slice(2)).db)
    yield* Effect.sync(() => printSessions(sessions))
    return
  }

  if (args[0] === "sessions" && args[1] === "unarchive") {
    const sessionID = args[2]
    if (!sessionID) return yield* fail("Missing session id")
    const result = yield* unarchiveSession(parseDbAndOptions(args.slice(3)), sessionID)
    yield* Effect.sync(() => {
      console.log(result.changed ? `Unarchived ${sessionID}` : `No archived session found for ${sessionID}`)
      if (result.backup) console.log(`Backup: ${result.backup}`)
      if (result.dryRun) console.log("Dry run: no changes written")
    })
    return
  }

  if (args[0] === "db" && args[1] === "path") {
    yield* Effect.sync(() => console.log(parseDbAndOptions(args.slice(2)).db))
    return
  }

  yield* Effect.sync(printHelp)
  return yield* fail(`Unknown command: ${args.join(" ")}`)
})

function printHelp() {
  console.log(`opencode-toolkit

Usage:
  opencode-toolkit
  opencode-toolkit repair-db [db] [--dry-run] [--no-backup]
  opencode-toolkit sessions archived [db]
  opencode-toolkit sessions unarchive <session-id> [db] [--dry-run] [--no-backup]
  opencode-toolkit db path [db]

Database resolution:
  1. explicit [db] argument
  2. OPENCODE_DB
  3. $XDG_DATA_HOME/opencode/opencode.db or ~/.local/share/opencode/opencode.db`)
}

function parseDbAndOptions(input: string[]): DbInput {
  return Schema.decodeUnknownSync(DbInput)({
    db: resolveDbArg(input.find((item) => !item.startsWith("--"))),
    options: Schema.decodeUnknownSync(CliOptions)({
      dryRun: input.includes("--dry-run"),
      backup: !input.includes("--no-backup"),
    }),
  })
}

function resolveDbArg(input?: string) {
  if (input && !input.startsWith("--")) return path.resolve(expandHome(input))
  if (process.env.OPENCODE_DB) {
    if (process.env.OPENCODE_DB === ":memory:") throw new ToolkitError({ message: "OPENCODE_DB=:memory: cannot be repaired" })
    if (path.isAbsolute(process.env.OPENCODE_DB)) return process.env.OPENCODE_DB
    return path.join(defaultDataDir(), "opencode", process.env.OPENCODE_DB)
  }
  return path.join(defaultDataDir(), "opencode", "opencode.db")
}

function defaultDataDir() {
  return process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
}

function expandHome(input: string) {
  if (input === "~") return os.homedir()
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2))
  return input
}

const openDatabase = Effect.fn("Database.open")(function* (filename: string) {
  if (!fs.existsSync(filename)) return yield* fail(`Database not found: ${filename}`)
  const { DatabaseSync } = loadSqlite()
  const db = new DatabaseSync(filename) as SqliteDatabase
  db.exec("PRAGMA busy_timeout = 5000")
  return db
})

function loadSqlite() {
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
  } finally {
    process.emitWarning = emitWarning
  }
}

function withDatabase<A, E>(filename: string, use: (db: SqliteDatabase) => Effect.Effect<A, E | ToolkitError>) {
  return Effect.acquireUseRelease(
    openDatabase(filename),
    use,
    (db) => Effect.sync(() => db.close()),
  )
}

const repairDatabase = Effect.fn("Cli.repairDatabase")(function* (input: DbInput) {
  return yield* withDatabase(input.db, (db) =>
    Effect.gen(function* () {
      const before = yield* inspect(db)
      if (!before.tables.has("workspace")) return { filename: input.db, changes: [] }

      const changes = plannedWorkspaceRepairs(before)
      if (changes.length === 0) return { filename: input.db, changes }
      if (input.options.dryRun) return { filename: input.db, changes, dryRun: true }

      const backup = input.options.backup ? yield* backupDatabase(db, input.db) : undefined
      yield* runTransaction(db, changes)
      if (backup) return { filename: input.db, backup, changes }
      return { filename: input.db, changes }
    }),
  )
})

function plannedWorkspaceRepairs(state: DatabaseState) {
  const columns = state.columns.workspace ?? new Set<string>()
  const completed = state.completedMigrations
  const workspaceNameCompleted = completed.has(WORKSPACE_NAME_MIGRATION)
  const workspaceTimeCompleted = completed.has(WORKSPACE_TIME_MIGRATION)
  const changes = [
    columns.has("type")
      ? undefined
      : {
          label: "Add workspace.type for the skipped workspace-fields migration",
          sql: "ALTER TABLE `workspace` ADD `type` text NOT NULL DEFAULT 'worktree'",
        },
    columns.has("name")
      ? undefined
      : {
          label: "Add workspace.name for the workspace-name migration",
          sql: workspaceNameCompleted
            ? "ALTER TABLE `workspace` ADD `name` text DEFAULT '' NOT NULL"
            : "ALTER TABLE `workspace` ADD `name` text",
        },
    columns.has("directory")
      ? undefined
      : {
          label: "Add workspace.directory for the skipped workspace-fields migration",
          sql: "ALTER TABLE `workspace` ADD `directory` text",
        },
    columns.has("extra")
      ? undefined
      : {
          label: "Add workspace.extra for the skipped workspace-fields migration",
          sql: "ALTER TABLE `workspace` ADD `extra` text",
        },
    workspaceTimeCompleted && !columns.has("time_used")
      ? {
          label: "Add workspace.time_used because its migration is already marked complete",
          sql: "ALTER TABLE `workspace` ADD `time_used` integer NOT NULL DEFAULT 0",
        }
      : undefined,
  ].filter((change): change is WorkspaceRepair => change !== undefined)

  if (changes.length > 0 && completed.has(WORKSPACE_FIELDS_MIGRATION)) return changes
  if (columns.has("config") && changes.length > 0) return changes
  return []
}

const inspect = Effect.fn("Database.inspect")(function* (db: SqliteDatabase) {
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

function tableColumns(db: SqliteDatabase, table: string) {
  return new Set(db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => stringField(row, "name")))
}

function completedMigrations(db: SqliteDatabase) {
  return new Set(db.prepare("SELECT id FROM migration").all().map((row) => stringField(row, "id")))
}

const backupDatabase = Effect.fn("Database.backup")(function* (db: SqliteDatabase, filename: string) {
  return yield* Effect.sync(() => {
    const backup = `${filename}.backup-${timestamp()}.db`
    db.exec(`VACUUM INTO ${quoteString(backup)}`)
    return backup
  })
})

const runTransaction = Effect.fn("Database.runTransaction")(function* (db: SqliteDatabase, changes: WorkspaceRepair[]) {
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

const listArchivedSessions = Effect.fn("Cli.sessions.archived")(function* (filename: string) {
  return yield* withDatabase(filename, (db) =>
    Effect.gen(function* () {
      yield* requireTable(db, "session")
      yield* requireColumns(db, "session", ["id", "title", "directory", "time_updated", "time_archived"])
      return db
        .prepare(
          "SELECT id, title, directory, time_updated, time_archived FROM session WHERE time_archived IS NOT NULL ORDER BY time_archived DESC, id DESC LIMIT 100",
        )
        .all()
        .map(toArchivedSession)
    }),
  )
})

const unarchiveSession = Effect.fn("Cli.sessions.unarchive")(function* (
  input: DbInput,
  sessionID: string,
) {
  return yield* withDatabase(input.db, (db) =>
    Effect.gen(function* () {
      yield* requireTable(db, "session")
      yield* requireColumns(db, "session", ["id", "time_archived"])
      const row = db.prepare("SELECT id FROM session WHERE id = ? AND time_archived IS NOT NULL").get(sessionID)
      if (!row) return { changed: false }
      if (input.options.dryRun) return { changed: true, dryRun: true }

      const backup = input.options.backup ? yield* backupDatabase(db, input.db) : undefined
      yield* Effect.sync(() => db.prepare("UPDATE session SET time_archived = NULL WHERE id = ?").run(sessionID))
      if (backup) return { changed: true, backup }
      return { changed: true }
    }),
  )
})

function requireTable(db: SqliteDatabase, table: string) {
  return Effect.gen(function* () {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
    if (!row) return yield* fail(`Missing table: ${table}`)
  })
}

function requireColumns(db: SqliteDatabase, table: string, columns: string[]) {
  return Effect.gen(function* () {
    const existing = tableColumns(db, table)
    const missing = columns.filter((column) => !existing.has(column))
    if (missing.length > 0) return yield* fail(`Missing ${table} column(s): ${missing.join(", ")}`)
  })
}

function quoteIdentifier(input: string) {
  return `"${input.replaceAll('"', '""')}"`
}

function quoteString(input: string) {
  return `'${input.replaceAll("'", "''")}'`
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "-")
}

function printRepairResult(result: RepairResult) {
  console.log(`Database: ${result.filename}`)
  if (result.dryRun) console.log("Dry run: no changes written")
  if (result.backup) console.log(`Backup: ${result.backup}`)
  if (result.changes.length === 0) {
    console.log("No repair needed")
    return
  }
  console.log("Applied repairs:")
  result.changes.map((change) => console.log(`- ${change.label}`))
}

function printSessions(sessions: ArchivedSession[]) {
  if (sessions.length === 0) {
    console.log("No archived sessions found")
    return
  }
  sessions.map((session) =>
    console.log(`${session.id}\t${formatTime(session.timeArchived)}\t${session.title}\t${session.directory}`),
  )
}

function toArchivedSession(row: Record<string, unknown>) {
  return Schema.decodeUnknownSync(ArchivedSession)({
    id: stringField(row, "id"),
    title: stringField(row, "title"),
    directory: stringField(row, "directory"),
    timeUpdated: numberField(row, "time_updated"),
    timeArchived: numberField(row, "time_archived"),
  })
}

function stringField(row: Record<string, unknown>, field: string) {
  const value = row[field]
  if (typeof value === "string") return value
  return ""
}

function numberField(row: Record<string, unknown>, field: string) {
  const value = row[field]
  if (typeof value === "number") return value
  return 0
}

function formatTime(value: number) {
  return new Date(value).toISOString()
}

async function runTui() {
  const { createCliRenderer, BoxRenderable, TextRenderable } = await import("@opentui/core")
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  })

  renderer.start()
  renderer.setBackgroundColor("#0f1419")

  let selected = 0
  let status = `DB: ${resolveDbArg()}`
  const menu = [
    { label: "Repair database", action: () => runTuiRepair() },
    { label: "List archived sessions", action: () => runTuiArchivedSessions() },
    { label: "Unarchive session", action: () => runTuiUnarchiveSession() },
    { label: "Show database path", action: () => setStatus(`DB: ${resolveDbArg()}`) },
    { label: "Quit", action: () => shutdown() },
  ]

  const root = new BoxRenderable(renderer, {
    id: "root",
    padding: 1,
    backgroundColor: "#0f1419",
  })
  renderer.root.add(root)

  const title = new TextRenderable(renderer, {
    id: "title",
    content: "OpenCode Toolkit",
    fg: "#d6deeb",
    height: 1,
  })
  root.add(title)

  const body = new TextRenderable(renderer, {
    id: "body",
    content: "",
    fg: "#d6deeb",
  })
  root.add(body)

  const footer = new TextRenderable(renderer, {
    id: "footer",
    content: "",
    fg: "#9fb3c8",
    height: 3,
  })
  root.add(footer)

  function draw() {
    body.content = menu.map((item, index) => `${index === selected ? "> " : "  "}${item.label}`).join("\n")
    footer.content = `${status}\nUp/down or k/j to move, enter to select, q to quit.`
  }

  function setStatus(input: string) {
    status = input
    draw()
  }

  function shutdown() {
    renderer.stop()
    process.exit(0)
  }

  function runTuiRepair() {
    Effect.runPromise(repairDatabase(parseDbAndOptions([])))
      .then((result) =>
        setStatus(result.changes.length === 0 ? "No repair needed" : `Repair complete. Backup: ${result.backup ?? "none"}`),
      )
      .catch((error: unknown) => setStatus(formatError(error)))
  }

  function runTuiArchivedSessions() {
    Effect.runPromise(listArchivedSessions(resolveDbArg()))
      .then((sessions) =>
        setStatus(
          sessions.length === 0
            ? "No archived sessions found"
            : sessions
                .slice(0, 5)
                .map((session) => `${session.id} ${session.title}`)
                .join("\n"),
        ),
      )
      .catch((error: unknown) => setStatus(formatError(error)))
  }

  function runTuiUnarchiveSession() {
    renderer.stop()
    process.stdout.write("Session ID to unarchive: ")
    process.stdin.setEncoding("utf8")
    process.stdin.resume()
    process.stdin.once("data", (input) => {
      const sessionID = String(input).trim()
      if (!sessionID) process.exit(1)
      Effect.runPromise(unarchiveSession(parseDbAndOptions([]), sessionID))
        .then((result) => {
          console.log(result.changed ? `Unarchived ${sessionID}` : `No archived session found for ${sessionID}`)
          if (result.backup) console.log(`Backup: ${result.backup}`)
          process.exit(0)
        })
        .catch((error: unknown) => {
          console.error(formatError(error))
          process.exit(1)
        })
    })
  }

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "q" || key.name === "escape") shutdown()
    if (key.name === "up" || key.name === "k") {
      selected = selected === 0 ? menu.length - 1 : selected - 1
      draw()
    }
    if (key.name === "down" || key.name === "j") {
      selected = selected === menu.length - 1 ? 0 : selected + 1
      draw()
    }
    if (key.name === "return" || key.name === "enter") menu[selected]?.action()
  })

  draw()
}

function formatError(error: unknown) {
  if (error instanceof ToolkitError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

Effect.runPromise(main(process.argv.slice(2))).catch((error: unknown) => {
  console.error(formatError(error))
  process.exitCode = 1
})
