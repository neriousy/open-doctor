import { Effect } from "effect"

export function run() {
  return Effect.promise(async () => {
    const { runTui } = await import("@open-doctor/tui")
    await runTui()
  })
}
