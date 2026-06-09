// React/OpenTUI menu for running the sectioned repair and utility flows interactively.
import { spawnSync } from "node:child_process"
import process from "node:process"
import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useRenderer } from "@opentui/react"
import { useState } from "react"
import { Effect } from "effect"
import { formatError } from "../error.js"
import { repairNoSuchColumnName } from "../repairs/no-such-column-name.js"
import { listArchivedSessions, unarchiveSession } from "../utils/sessions.js"
import { parseDbAndOptions, resolveDbArg } from "./input.js"

type MenuItem = {
  label: string
  section?: boolean
  action?: () => void
}

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

function ToolkitApp() {
  const renderer = useRenderer()
  const [selected, setSelected] = useState(1)
  const [status, setStatus] = useState(`DB: ${resolveDbArg()}`)
  const [unarchiveInput, setUnarchiveInput] = useState("")
  const [isUnarchivePromptOpen, setIsUnarchivePromptOpen] = useState(false)

  const menu: MenuItem[] = [
    { label: "Repair", section: true },
    { label: "  Error: no such column: name", action: () => runRepair(setStatus) },
    { label: "Utils", section: true },
    { label: "  Sessions: list archived", action: () => runArchivedSessions(setStatus) },
    {
      label: "  Sessions: unarchive",
      action: () => {
        setUnarchiveInput("")
        setIsUnarchivePromptOpen(true)
        setStatus("Enter a session id, then press enter.")
      },
    },
    { label: "  DB path", action: () => setStatus(`DB: ${resolveDbArg()}`) },
    {
      label: "Quit",
      action: () => {
        renderer.stop()
        process.exit(0)
      },
    },
  ]

  useKeyboard((key) => {
    if (isUnarchivePromptOpen) {
      if (key.name === "escape") {
        setIsUnarchivePromptOpen(false)
        setStatus(`DB: ${resolveDbArg()}`)
      }
      if (key.name === "return" || key.name === "enter") submitUnarchive(unarchiveInput)
      return
    }

    if (key.name === "q" || key.name === "escape") {
      renderer.stop()
      process.exit(0)
    }
    if (key.name === "up" || key.name === "k") setSelected((current) => nextSelectable(menu, current, -1))
    if (key.name === "down" || key.name === "j") setSelected((current) => nextSelectable(menu, current, 1))
    if (key.name === "return" || key.name === "enter") menu[selected]?.action?.()
  })

  function submitUnarchive(sessionID: string) {
    const trimmed = sessionID.trim()
    if (!trimmed) {
      setStatus("Missing session id")
      return
    }
    setIsUnarchivePromptOpen(false)
    runUnarchive(trimmed, setStatus)
  }

  return (
    <box id="root" padding={1} backgroundColor="#0f1419">
      <text id="title" fg="#d6deeb" height={1}>
        OpenCode Toolkit
      </text>
      <text id="body" fg="#d6deeb">
        {menu
          .map((item, index) => {
            if (item.section) return item.label
            return `${index === selected ? "> " : "  "}${item.label}`
          })
          .join("\n")}
      </text>
      {isUnarchivePromptOpen ? (
        <input
          id="unarchive-session-id"
          focused
          placeholder="Session ID"
          value={unarchiveInput}
          onInput={setUnarchiveInput}
        />
      ) : null}
      <text id="footer" fg="#9fb3c8" height={4}>
        {`${status}\nUp/down or k/j to move, enter to select, q to quit.`}
      </text>
    </box>
  )
}

function nextSelectable(menu: MenuItem[], current: number, direction: 1 | -1) {
  let next = current
  do {
    next = (next + direction + menu.length) % menu.length
  } while (menu[next]?.section)
  return next
}

function runRepair(setStatus: (value: string) => void) {
  Effect.runPromise(repairNoSuchColumnName(parseDbAndOptions([])))
    .then((result) =>
      setStatus(result.changes.length === 0 ? "No repair needed" : `Repair complete. Backup: ${result.backup ?? "none"}`),
    )
    .catch((error: unknown) => setStatus(formatError(error)))
}

function runArchivedSessions(setStatus: (value: string) => void) {
  Effect.runPromise(listArchivedSessions(resolveDbArg()))
    .then((sessions) =>
      setStatus(
        sessions.length === 0
          ? "No archived sessions found"
          : sessions
              .slice(0, 5)
              .map((session) => `${session.id} ${session.title}`)
              .join("\n"),
      ),
    )
    .catch((error: unknown) => setStatus(formatError(error)))
}

function runUnarchive(sessionID: string, setStatus: (value: string) => void) {
  Effect.runPromise(unarchiveSession(parseDbAndOptions([]), sessionID))
    .then((result) => {
      const lines = [result.changed ? `Unarchived ${sessionID}` : `No archived session found for ${sessionID}`]
      if (result.backup) lines.push(`Backup: ${result.backup}`)
      if (result.dryRun) lines.push("Dry run: no changes written")
      setStatus(lines.join("\n"))
    })
    .catch((error: unknown) => setStatus(formatError(error)))
}
