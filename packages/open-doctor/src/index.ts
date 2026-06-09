#!/usr/bin/env node
import process from "node:process"
import yargs from "yargs/yargs"
import { hideBin } from "yargs/helpers"
import { formatError } from "@open-doctor/core/error"
import { DbCommand } from "./cli/cmd/db.js"
import { RepairCommand, RepairDbCommand } from "./cli/cmd/repair.js"
import { SessionsCommand } from "./cli/cmd/sessions.js"
import { TuiCommand } from "./cli/cmd/tui.js"
import { UtilsCommand } from "./cli/cmd/utils.js"

const args = hideBin(process.argv)

if (args.length === 0 && process.stdin.isTTY && process.stdout.isTTY) {
  args.push("tui")
}

const cli = yargs(args)
  .scriptName("open-doctor")
  .command(TuiCommand)
  .command(RepairDbCommand)
  .command(RepairCommand)
  .command(SessionsCommand)
  .command(DbCommand)
  .command(UtilsCommand)
  .demandCommand(0)
  .recommendCommands()
  .strict()
  .help()
  .alias("h", "help")
  .fail((message, error, yargs) => {
    if (message) {
      yargs.showHelp("error")
      throw new Error(message)
    }
    throw error
  })

if (args.length === 0) {
  cli.showHelp()
} else {
  try {
    await cli.parseAsync()
  } catch (error) {
    console.error(formatError(error))
    process.exitCode = error instanceof Error && "exitCode" in error && typeof error.exitCode === "number" ? error.exitCode : 1
  }
}
