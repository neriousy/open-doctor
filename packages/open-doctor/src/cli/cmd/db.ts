import type { Argv } from "yargs"
import { Effect } from "effect"
import { parseDbAndOptions } from "@open-doctor/core/input"
import { effectCmd } from "../effect-cmd.js"
import { cmd } from "./cmd.js"

type DbPathArgs = {
  db?: string
}

export const DbPathCommand = effectCmd<DbPathArgs, void>({
  command: "path [db]",
  describe: "Print the resolved OpenCode database path",
  builder: (yargs) =>
    yargs.positional("db", {
      type: "string",
      describe: "Path to opencode.db. Defaults to OPENCODE_DB or the OpenCode data dir.",
    }) as Argv<DbPathArgs>,
  handler: (args) =>
    Effect.sync(() => {
      console.log(parseDbAndOptions(args.db ? [args.db] : []).db)
    }),
})

export const DbCommand = cmd({
  command: "db <command>",
  describe: "Database utilities",
  builder: (yargs: Argv) => yargs.command(DbPathCommand).demandCommand(1).strict(),
  handler() {},
})
