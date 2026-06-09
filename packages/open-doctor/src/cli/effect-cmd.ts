import type { Argv } from "yargs"
import { Effect, Schema } from "effect"
import type { AppServices } from "../effect/app-runtime.js"
import { cmd, type WithDoubleDash } from "./cmd/cmd.js"

export class CliError extends Schema.TaggedErrorClass<CliError>()("CliError", {
  message: Schema.String,
  exitCode: Schema.optional(Schema.Number),
}) {}

export const fail = (message: string, exitCode = 1) => Effect.fail(new CliError({ message, exitCode }))

interface EffectCmdOpts<Args, A> {
  command: string | readonly string[]
  aliases?: string | readonly string[]
  describe: string | false
  builder?: (yargs: Argv) => Argv<Args>
  handler: (args: WithDoubleDash<Args>) => Effect.Effect<A, unknown, AppServices>
}

export const effectCmd = <Args, A>(opts: EffectCmdOpts<Args, A>) =>
  cmd<{}, Args>({
    command: opts.command,
    aliases: opts.aliases,
    describe: opts.describe,
    builder: opts.builder as never,
    async handler(rawArgs) {
      const { AppRuntime } = await import("../effect/app-runtime.js")
      await AppRuntime.runPromise(opts.handler(rawArgs as unknown as WithDoubleDash<Args>))
    },
  })
