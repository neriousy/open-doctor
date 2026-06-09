// CLI input parsing and OpenCode database path resolution.
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { Context, Effect, Layer, Schema } from "effect"
import { ToolkitError } from "./error.js"

export const CliOptions = Schema.Struct({
  dryRun: Schema.Boolean,
  backup: Schema.Boolean,
})
export type CliOptions = typeof CliOptions.Type

export const DbInput = Schema.Struct({
  db: Schema.String,
  options: CliOptions,
})
export type DbInput = typeof DbInput.Type

export type DbInputArgs = {
  db?: string
  dryRun?: boolean
  noBackup?: boolean
}

export interface PathService {
  readonly defaultDataDir: () => string
  readonly resolveDbArg: (input?: string) => string
  readonly parseDbAndOptions: (input: string[]) => DbInput
  readonly dbInputFromArgs: (args: DbInputArgs) => Effect.Effect<DbInput, unknown>
}

export class Paths extends Context.Service<Paths, PathService>()("@open-doctor/core/Paths") {}

export const PathsLayer = Layer.effect(
  Paths,
  Effect.sync(() =>
    Paths.of({
      defaultDataDir,
      resolveDbArg,
      parseDbAndOptions,
      dbInputFromArgs,
    }),
  ),
)

export const defaultLayer = PathsLayer

export function parseDbAndOptions(input: string[]): DbInput {
  return Schema.decodeUnknownSync(DbInput)({
    db: resolveDbArg(input.find((item) => !item.startsWith("--"))),
    options: Schema.decodeUnknownSync(CliOptions)({
      dryRun: input.includes("--dry-run"),
      backup: !input.includes("--no-backup"),
    }),
  })
}

export function dbInputFromArgs(args: DbInputArgs) {
  return Schema.decodeUnknownEffect(DbInput)({
    db: resolveDbArg(args.db),
    options: {
      dryRun: args.dryRun ?? false,
      backup: args.noBackup !== true,
    },
  })
}

export function resolveDbArg(input?: string) {
  if (input && !input.startsWith("--")) return path.resolve(expandHome(input))
  if (process.env.OPENCODE_DB) {
    if (process.env.OPENCODE_DB === ":memory:") throw new ToolkitError({ message: "OPENCODE_DB=:memory: cannot be repaired" })
    if (path.isAbsolute(process.env.OPENCODE_DB)) return process.env.OPENCODE_DB
    return path.join(defaultDataDir(), "opencode", process.env.OPENCODE_DB)
  }
  return path.join(defaultDataDir(), "opencode", "opencode.db")
}

export function defaultDataDir() {
  // Mirrors opencode core's xdg-basedir@5.1.0 `xdgData` resolution.
  return process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")
}

export function expandHome(input: string) {
  if (input === "~") return os.homedir()
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2))
  return input
}
