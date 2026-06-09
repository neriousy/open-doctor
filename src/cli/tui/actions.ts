// Side-effect helpers used by the TUI without coupling UI components to CLI plumbing.
import { spawn } from "node:child_process"
import process from "node:process"
import { Effect } from "effect"
import { formatError } from "../../error.js"
import { repairNoSuchColumnName } from "../../repairs/no-such-column-name.js"
import { parseDbAndOptions } from "../input.js"
import type { ChildResult, ToastInput } from "./types.js"

export function runRepair(
  setStatus: (value: string) => void,
  showToast: (toast: ToastInput) => void,
  options: { dryRun?: boolean; onComplete?: () => void } = {},
) {
  const input = parseDbAndOptions(options.dryRun ? ["--dry-run"] : [])
  setStatus(options.dryRun ? "Repair dry run running..." : "Repair running...")
  showToast({ variant: "info", message: options.dryRun ? "Running repair dry run..." : "Running repair..." })
  Effect.runPromise(repairNoSuchColumnName(input))
    .then((result) => {
      const message =
        result.changes.length === 0
          ? "No repair needed"
          : result.dryRun
            ? `Dry run found ${result.changes.length} planned change(s)`
            : `Repair complete. Backup: ${result.backup ?? "none"}`
      setStatus(message)
      showToast({ variant: "success", message })
    })
    .catch((error: unknown) => {
      const message = formatError(error)
      setStatus(message)
      showToast({ variant: "error", message })
    })
    .finally(() => options.onComplete?.())
}

export function runUnarchiveInChild(sessionID: string, db: string) {
  const script = process.argv[1]
  if (!script) return Promise.reject(new Error("Cannot locate opencode-toolkit entrypoint"))

  return new Promise<ChildResult>((resolve, reject) => {
    const child = spawn(process.execPath, [script, "utils", "sessions", "unarchive", sessionID, db], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}
