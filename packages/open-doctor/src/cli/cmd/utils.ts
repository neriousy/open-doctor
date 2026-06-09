import type { Argv } from "yargs"
import { DbCommand } from "./db.js"
import { SessionsCommand } from "./sessions.js"
import { cmd } from "./cmd.js"

export const UtilsCommand = cmd({
  command: "utils <command>",
  describe: "Compatibility namespace for utility commands",
  builder: (yargs: Argv) => yargs.command(SessionsCommand).command(DbCommand).demandCommand(1).strict(),
  handler() {},
})
