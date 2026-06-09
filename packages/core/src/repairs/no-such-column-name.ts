// Repair flow for the workspace migration wedge behind "Error: no such column: name".
import { Effect } from "effect"
import type { DbInput } from "../input.js"
import { Database } from "../db/sqlite.js"
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
  const database = yield* Database
  return yield* database.withDatabase(input.db, (db) =>
    Effect.gen(function* () {
      const before = yield* database.inspect(db)
      if (!before.tables.has("workspace")) return { filename: input.db, changes: [] }

      const changes = plannedWorkspaceRepairs(before)
      if (changes.length === 0) return { filename: input.db, changes }
      if (input.options.dryRun) return { filename: input.db, changes, dryRun: true }

      const backup = input.options.backup ? yield* database.backup(db, input.db) : undefined
      yield* database.transaction(db, changes)
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
  const changes: WorkspaceRepair[] = [
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
          sql: "ALTER TABLE `workspace` ADD `name` text DEFAULT '' NOT NULL",
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

  if (!workspaceNameCompleted && columns.has("type")) {
    changes.push({
      label: "Backfill workspace.type before the workspace-name migration replays",
      sql: "UPDATE `workspace` SET `type` = 'worktree' WHERE `type` IS NULL OR `type` = ''",
    })
  }

  if (!workspaceNameCompleted && columns.has("name")) {
    changes.push({
      label: "Backfill workspace.name before the workspace-name migration replays",
      sql: "UPDATE `workspace` SET `name` = '' WHERE `name` IS NULL",
    })
  }

  const repairedColumns = repairedWorkspaceColumns(columns)
  if (!completed.has(WORKSPACE_FIELDS_MIGRATION) && hasWorkspaceFields(repairedColumns)) {
    if (!state.tables.has("migration")) {
      changes.push({
        label: "Create OpenCode migration journal for repaired workspace schema",
        sql: "CREATE TABLE IF NOT EXISTS `migration` (`id` TEXT PRIMARY KEY, `time_completed` INTEGER NOT NULL)",
      })
    }
    changes.push({
      label: "Mark workspace-fields migration complete after repairing its schema",
      sql: `INSERT OR IGNORE INTO \`migration\` (\`id\`, \`time_completed\`) VALUES ('${WORKSPACE_FIELDS_MIGRATION}', ${Date.now()})`,
    })
  }

  return changes
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

function repairedWorkspaceColumns(columns: Set<string>) {
  const repaired = new Set(columns)
  repaired.add("type")
  repaired.add("name")
  repaired.add("directory")
  repaired.add("extra")
  return repaired
}

function hasWorkspaceFields(columns: Set<string>) {
  return columns.has("type") && columns.has("name") && columns.has("directory") && columns.has("extra")
}
