import type { RepairStatus } from "../health.js"

export function overviewStatus(health: { issueCount: number }) {
  return `Ready - ${health.issueCount} issue(s) detected - Press Enter to inspect the selected action`
}

export function repairCountForHeader(status: RepairStatus) {
  return status === "DETECTED" || status === "EXPERIMENTAL" ? 1 : 0
}

export function writeClipboardSequence(value: string) {
  const encoded = Buffer.from(value, "utf8").toString("base64")
  process.stdout.write(`\u001b]52;c;${encoded}\u0007`)
}
