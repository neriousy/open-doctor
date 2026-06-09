// Session utility flows: archived session listing and unarchive repair.
import { Effect, Schema } from "effect"
import type { DbInput } from "../cli/input.js"
import { backupDatabase, requireColumns, requireTable, withDatabase } from "../db/sqlite.js"
import { numberField, stringField } from "../db/row.js"

export const ArchivedSession = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  directory: Schema.String,
  timeUpdated: Schema.Number,
  timeArchived: Schema.Number,
})
export type ArchivedSession = typeof ArchivedSession.Type

export type UnarchiveResult = {
  changed: boolean
  backup?: string
  dryRun?: boolean
}

export const listArchivedSessions = Effect.fn("Utils.sessions.archived")(function* (filename: string) {
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

export const unarchiveSession = Effect.fn("Utils.sessions.unarchive")(function* (
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

export function printSessions(sessions: ArchivedSession[]) {
  if (sessions.length === 0) {
    console.log("No archived sessions found")
    return
  }
  sessions.map((session) =>
    console.log(`${session.id}\t${formatTime(session.timeArchived)}\t${session.title}\t${session.directory}`),
  )
}

export function toArchivedSession(row: Record<string, unknown>) {
  return Schema.decodeUnknownSync(ArchivedSession)({
    id: stringField(row, "id"),
    title: stringField(row, "title"),
    directory: stringField(row, "directory"),
    timeUpdated: numberField(row, "time_updated"),
    timeArchived: numberField(row, "time_archived"),
  })
}

export function formatTime(value: number) {
  return new Date(value).toISOString()
}
