import type { Argv } from "yargs"
import { Effect } from "effect"
import { printRepairResult, repairNoSuchColumnName } from "@open-doctor/core/repairs/no-such-column-name"
import { inputFromArgs } from "../args.js"
import { effectCmd } from "../effect-cmd.js"
import { cmd } from "./cmd.js"

type RepairArgs = {
  db?: string
  dryRun?: boolean
  backup?: boolean
}

export const RepairNoSuchColumnNameCommand = effectCmd<RepairArgs, void>({
  command: "no-such-column-name [db]",
  describe: "Repair OpenCode workspace rows after a skipped workspace name migration",
  builder: (yargs) => repairOptions(yargs),
  handler: (args) =>
    Effect.gen(function* () {
      const result = yield* repairNoSuchColumnName(inputFromArgs(args))
      yield* Effect.sync(() => printRepairResult(result))
    }),
})

export const RepairDbCommand = effectCmd<RepairArgs, void>({
  command: "repair-db [db]",
  describe: "Alias for repair no-such-column-name",
  builder: (yargs) => repairOptions(yargs),
  handler: (args) =>
    Effect.gen(function* () {
      const result = yield* repairNoSuchColumnName(inputFromArgs(args))
      yield* Effect.sync(() => printRepairResult(result))
    }),
})

export const RepairCommand = cmd({
  command: "repair <command>",
  describe: "Run database repair flows",
  builder: (yargs: Argv) => yargs.command(RepairNoSuchColumnNameCommand).demandCommand(1).strict(),
  handler() {},
})

function repairOptions<T>(yargs: Argv<T>) {
  return yargs
    .positional("db", {
      type: "string",
      describe: "Path to opencode.db. Defaults to OPENCODE_DB or the OpenCode data dir.",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      describe: "Show planned repairs without writing changes.",
    })
    .option("backup", {
      type: "boolean",
      default: true,
      describe: "Create a backup before writing changes. Use --no-backup to disable.",
    }) as Argv<T & RepairArgs>
}
