// OpenTUI executable entrypoint kept stable for the CLI dynamic import.
import { spawnSync } from "node:child_process"
import process from "node:process"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { ToolkitApp } from "./tui/app.js"

export async function runTui() {
  ensureFfiRuntime()
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
    backgroundColor: "#0f1419",
  })
  const root = createRoot(renderer)
  root.render(<ToolkitApp />)
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
