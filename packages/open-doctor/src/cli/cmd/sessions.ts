import type { Argv } from "yargs"
import { Effect } from "effect"
import { parseDbAndOptions } from "@open-doctor/core/input"
import { listArchivedSessions, printSessions, unarchiveSession } from "@open-doctor/core/utils/sessions"
import type { UnarchiveResult } from "@open-doctor/core/utils/sessions"
import { inputFromArgs, stringArg } from "../args.js"
import { effectCmd } from "../effect-cmd.js"
import { cmd } from "./cmd.js"

type DbArgs = {
  db?: string
}

type UnarchiveArgs = DbArgs & {
  sessionId?: string
  dryRun?: boolean
  backup?: boolean
}

export const SessionsArchivedCommand = effectCmd<DbArgs, void>({
  command: "archived [db]",
  describe: "List archived sessions",
  builder: (yargs) => dbPositional(yargs),
  handler: (args) =>
    Effect.gen(function* () {
      const sessions = yield* listArchivedSessions(parseDbAndOptions(args.db ? [args.db] : []).db)
      yield* Effect.sync(() => printSessions(sessions))
    }),
})

export const SessionsUnarchiveCommand = effectCmd<UnarchiveArgs, void>({
  command: "unarchive <session-id> [db]",
  describe: "Clear the archived marker for a session",
  builder: (yargs) =>
    dbPositional(yargs)
      .positional("session-id", {
        type: "string",
        describe: "Session id to unarchive.",
      })
      .option("dry-run", {
        type: "boolean",
        default: false,
        describe: "Show whether the session would change without writing.",
      })
      .option("backup", {
        type: "boolean",
        default: true,
        describe: "Create a backup before writing changes. Use --no-backup to disable.",
      }) as Argv<UnarchiveArgs>,
  handler: (args) =>
    Effect.gen(function* () {
      const sessionID = stringArg(args.sessionId, "session id")
      const result = yield* unarchiveSession(inputFromArgs(args), sessionID)
      yield* Effect.sync(() => printUnarchiveResult(sessionID, result))
    }),
})

export const SessionsCommand = cmd({
  command: "sessions <command>",
  describe: "Inspect or repair OpenCode sessions",
  builder: (yargs: Argv) => yargs.command(SessionsArchivedCommand).command(SessionsUnarchiveCommand).demandCommand(1).strict(),
  handler() {},
})

function dbPositional<T>(yargs: Argv<T>) {
  return yargs.positional("db", {
    type: "string",
    describe: "Path to opencode.db. Defaults to OPENCODE_DB or the OpenCode data dir.",
  }) as Argv<T & DbArgs>
}

function printUnarchiveResult(sessionID: string, result: UnarchiveResult) {
  console.log(result.changed ? `Unarchived ${sessionID}` : `No archived session found for ${sessionID}`)
  if (result.backup) console.log(`Backup: ${result.backup}`)
  if (result.dryRun) console.log("Dry run: no changes written")
}
