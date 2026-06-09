// Repair flow for the workspace migration wedge behind "Error: no such column: name".
import { Effect } from "effect"
import type { DbInput } from "../cli/input.js"
import { backupDatabase, inspect, runTransaction, withDatabase } from "../db/sqlite.js"
import type { DatabaseState, SqlChange } from "../db/sqlite.js"

const WORKSPACE_FIELDS_MIGRATION = "20260303231226_add_workspace_fields"
const WORKSPACE_NAME_MIGRATION = "20260410174513_workspace-name"
const WORKSPACE_TIME_MIGRATION = "20260507164347_add_workspace_time"

export type WorkspaceRepair = SqlChange

export type RepairResult = {
  filename: string
  backup?: string
  changes: WorkspaceRepair[]
  dryRun?: boolean
}

export const repairNoSuchColumnName = Effect.fn("Repair.noSuchColumnName")(function* (input: DbInput) {
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

export function plannedWorkspaceRepairs(state: DatabaseState) {
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

export function printRepairResult(result: RepairResult) {
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
