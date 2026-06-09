// Command dispatcher: maps legacy commands and grouped section commands to flows.
import process from "node:process"
import { Effect } from "effect"
import { fail } from "../error.js"
import { repairNoSuchColumnName, printRepairResult } from "../repairs/no-such-column-name.js"
import { printSessions, listArchivedSessions, unarchiveSession } from "../utils/sessions.js"
import { parseDbAndOptions } from "./input.js"

export const main = Effect.fn("Cli.main")(function* (args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    yield* Effect.sync(printHelp)
    return
  }

  if (args.length === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      const { runTui } = yield* Effect.promise(() => import("./tui.js"))
      yield* Effect.promise(() => runTui())
      return
    }
    yield* Effect.sync(printHelp)
    return
  }

  if (args[0] === "repair-db") {
    const result = yield* repairNoSuchColumnName(parseDbAndOptions(args.slice(1)))
    yield* Effect.sync(() => printRepairResult(result))
    return
  }

  if (args[0] === "repair" && args[1] === "no-such-column-name") {
    const result = yield* repairNoSuchColumnName(parseDbAndOptions(args.slice(2)))
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
    yield* Effect.sync(() => printUnarchiveResult(sessionID, result))
    return
  }

  if (args[0] === "utils" && args[1] === "sessions" && args[2] === "archived") {
    const sessions = yield* listArchivedSessions(parseDbAndOptions(args.slice(3)).db)
    yield* Effect.sync(() => printSessions(sessions))
    return
  }

  if (args[0] === "utils" && args[1] === "sessions" && args[2] === "unarchive") {
    const sessionID = args[3]
    if (!sessionID) return yield* fail("Missing session id")
    const result = yield* unarchiveSession(parseDbAndOptions(args.slice(4)), sessionID)
    yield* Effect.sync(() => printUnarchiveResult(sessionID, result))
    return
  }

  if (args[0] === "db" && args[1] === "path") {
    yield* Effect.sync(() => console.log(parseDbAndOptions(args.slice(2)).db))
    return
  }

  if (args[0] === "utils" && args[1] === "db" && args[2] === "path") {
    yield* Effect.sync(() => console.log(parseDbAndOptions(args.slice(3)).db))
    return
  }

  yield* Effect.sync(printHelp)
  return yield* fail(`Unknown command: ${args.join(" ")}`)
})

export function printHelp() {
  console.log(`opencode-toolkit

Usage:
  opencode-toolkit
  opencode-toolkit repair-db [db] [--dry-run] [--no-backup]
  opencode-toolkit repair no-such-column-name [db] [--dry-run] [--no-backup]
  opencode-toolkit sessions archived [db]
  opencode-toolkit sessions unarchive <session-id> [db] [--dry-run] [--no-backup]
  opencode-toolkit utils sessions archived [db]
  opencode-toolkit utils sessions unarchive <session-id> [db] [--dry-run] [--no-backup]
  opencode-toolkit db path [db]
  opencode-toolkit utils db path [db]

Repair:
  Error: no such column: name
    repair no-such-column-name

Utils:
  Sessions: list archived
    utils sessions archived
  Sessions: unarchive
    utils sessions unarchive <session-id>
  DB path
    utils db path

Database resolution:
  1. explicit [db] argument
  2. OPENCODE_DB
  3. $XDG_DATA_HOME/opencode/opencode.db or ~/.local/share/opencode/opencode.db`)
}

type UnarchiveResult = {
  changed: boolean
  backup?: string
  dryRun?: boolean
}

function printUnarchiveResult(sessionID: string, result: UnarchiveResult) {
  console.log(result.changed ? `Unarchived ${sessionID}` : `No archived session found for ${sessionID}`)
  if (result.backup) console.log(`Backup: ${result.backup}`)
  if (result.dryRun) console.log("Dry run: no changes written")
}
