// OpenTUI executable entrypoint kept stable for the CLI dynamic import.
import { spawnSync } from "node:child_process"
import process from "node:process"
import type { CliRenderer } from "@opentui/core"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { ToolkitApp } from "./app.js"
import { toolkitQueryClient } from "./query/client.js"

export async function runTui() {
  ensureFfiRuntime()
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    targetFps: 30,
    backgroundColor: "#0f1419",
  })
  const root = createRoot(renderer)
  const lifecycle = createTuiLifecycle(renderer, () => root.unmount())
  root.render(<ToolkitApp onExit={lifecycle.exit} />)
  await lifecycle.done
  process.exit(0)
}

function createTuiLifecycle(renderer: CliRenderer, unmount: () => void) {
  let cleanupStarted = false
  let doneResolved = false
  let resolveDone!: () => void
  const done = new Promise<void>((resolve) => {
    resolveDone = () => {
      if (doneResolved) return
      doneResolved = true
      resolve()
    }
  })

  const exit = () => {
    if (cleanupStarted) return
    cleanupStarted = true
    process.off("SIGINT", onSignal)
    process.off("SIGTERM", onSignal)
    try {
      unmount()
      toolkitQueryClient.clear()
    } finally {
      if (!renderer.isDestroyed) renderer.destroy()
      setImmediate(resolveDone)
    }
  }

  const onSignal = () => exit()
  renderer.once("destroy", () => {
    process.off("SIGINT", onSignal)
    process.off("SIGTERM", onSignal)
    resolveDone()
  })
  process.on("SIGINT", onSignal)
  process.on("SIGTERM", onSignal)

  return { done, exit }
}

function ensureFfiRuntime() {
  if (process.execArgv.includes("--experimental-ffi")) return
  if (!process.versions.node.startsWith("26.")) {
    throw new Error("OpenTUI renderer support under Node requires Node 26.x with --experimental-ffi")
  }

  const result = spawnSync(process.execPath, ["--experimental-ffi", ...process.argv.slice(1)], {
    stdio: "inherit",
  })
  process.exit(result.status ?? 1)
}
