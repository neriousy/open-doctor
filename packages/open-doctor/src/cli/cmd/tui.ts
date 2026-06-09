import process from "node:process"
import { Effect } from "effect"
import { effectCmd, fail } from "../effect-cmd.js"

export const TuiCommand = effectCmd<{}, void>({
  command: "tui",
  describe: "Open the interactive terminal UI",
  handler: () =>
    Effect.gen(function* () {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        return yield* fail("The TUI requires an interactive terminal")
      }
      const { run } = yield* Effect.promise(() => import("../../tui/layer.js"))
      yield* run()
    }),
})
