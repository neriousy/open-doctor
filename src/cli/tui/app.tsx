// Stateful OpenTUI application shell: keyboard handling, flow state, and screen routing.
import process from "node:process"
import { useKeyboard, useRenderer } from "@opentui/react"
import { useEffect, useRef, useState } from "react"
import { Effect } from "effect"
import { formatError } from "../../error.js"
import { listArchivedSessions } from "../../utils/sessions.js"
import type { ArchivedSession } from "../../utils/sessions.js"
import { resolveDbArg } from "../input.js"
import { runRepair, runUnarchiveInChild } from "./actions.js"
import { ArchivedSessionsView } from "./archived-sessions-view.js"
import { sessionTitle } from "./format.js"
import { HomeView } from "./home-view.js"
import { ToastView } from "./toast-view.js"
import type { HomeAction, ToastInput, ToastState, View } from "./types.js"

export function ToolkitApp() {
  const renderer = useRenderer()
  const [selectedAction, setSelectedAction] = useState(0)
  const selectedActionRef = useRef(0)
  const [sessionSelected, setSessionSelected] = useState(0)
  const [view, setView] = useState<View>("home")
  const [status, setStatus] = useState("Ready")
  const [sessions, setSessions] = useState<ArchivedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUnarchive, setPendingUnarchive] = useState(0)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  const actions: HomeAction[] = [
    {
      eyebrow: "Repair",
      title: "Error: no such column: name",
      detail: "Patch the workspace table after a migration was marked complete before the new fields existed.",
      hotkey: "1",
      run: () => runRepair(setStatus, showToast),
    },
    {
      eyebrow: "Utils",
      title: "Archived sessions",
      detail: "Review archived sessions newest first, then unarchive the selected session from the list.",
      hotkey: "2",
      run: openArchivedSessions,
    },
  ]

  useEffect(() => {
    if (sessionSelected >= sessions.length) setSessionSelected(Math.max(0, sessions.length - 1))
  }, [sessionSelected, sessions.length])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  useKeyboard((key) => {
    if (key.name === "q") return quit()

    if (view === "archived") {
      if (key.name === "escape" || key.name === "left" || key.name === "h") {
        setView("home")
        setStatus("Ready")
      }
      if (key.name === "up" || key.name === "k") setSessionSelected((current) => Math.max(0, current - 1))
      if (key.name === "down" || key.name === "j") setSessionSelected((current) => Math.min(sessions.length - 1, current + 1))
      if (key.name === "r") refreshArchivedSessions()
      if (key.name === "return" || key.name === "enter" || key.name === "u") unarchiveSelectedSession()
      return
    }

    if (key.name === "escape") return quit()
    if (key.name === "left" || key.name === "up" || key.name === "h" || key.name === "k") moveHome(-1)
    if (key.name === "right" || key.name === "down" || key.name === "l" || key.name === "j") moveHome(1)
    if (key.name === "1") selectHomeAction(0, actions)
    if (key.name === "2") selectHomeAction(1, actions)
    if (key.name === "return" || key.name === "enter") actions[selectedActionRef.current]?.run()
  })

  function quit() {
    renderer.stop()
    process.exit(0)
  }

  function showToast(input: ToastInput) {
    const next = { ...input, duration: input.duration ?? 4000 }
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), next.duration)
    toastTimer.current.unref()
  }

  function moveHome(direction: 1 | -1) {
    const next = (selectedActionRef.current + direction + actions.length) % actions.length
    selectedActionRef.current = next
    setSelectedAction(next)
  }

  function selectHomeAction(index: number, items: HomeAction[]) {
    selectedActionRef.current = index
    setSelectedAction(index)
    items[index]?.run()
  }

  function openArchivedSessions() {
    setView("archived")
    refreshArchivedSessions()
  }

  function refreshArchivedSessions() {
    setLoading(true)
    setStatus("Refreshing archived sessions...")
    Effect.runPromise(listArchivedSessions(resolveDbArg()))
      .then((next) => {
        setSessions(next)
        setSessionSelected(0)
        setStatus(next.length === 0 ? "No archived sessions found" : `${next.length} archived session(s), newest first`)
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", message })
      })
      .finally(() => setLoading(false))
  }

  function unarchiveSelectedSession() {
    const session = sessions[sessionSelected]
    if (!session) return

    const index = sessionSelected
    const db = resolveDbArg()
    setSessions((current) => current.filter((item) => item.id !== session.id))
    setSessionSelected((current) => Math.max(0, Math.min(current, sessions.length - 2)))
    setPendingUnarchive((current) => current + 1)
    setStatus(`Unarchiving ${session.id} in the background...`)
    showToast({ variant: "info", title: "Unarchiving session", message: sessionTitle(session), duration: 2500 })

    runUnarchiveInChild(session.id, db)
      .then((result) => {
        if (result.code !== 0) {
          restoreSession(session, index)
          const message = result.stderr.trim() || result.stdout.trim() || `Failed to unarchive ${session.id}`
          setStatus(message)
          showToast({ variant: "error", title: "Unarchive failed", message })
          return
        }

        if (result.stdout.includes("No archived session found")) {
          restoreSession(session, index)
          setStatus(`No archived session found for ${session.id}`)
          showToast({ variant: "warning", message: `No archived session found for ${sessionTitle(session)}` })
          return
        }

        setStatus(`Unarchived ${session.id}`)
        showToast({ variant: "success", title: "Session unarchived", message: sessionTitle(session) })
      })
      .catch((error: unknown) => {
        restoreSession(session, index)
        const message = formatError(error)
        setStatus(message)
        showToast({ variant: "error", title: "Unarchive failed", message })
      })
      .finally(() => setPendingUnarchive((current) => Math.max(0, current - 1)))
  }

  function restoreSession(session: ArchivedSession, index: number) {
    setSessions((current) => {
      if (current.some((item) => item.id === session.id)) return current
      const next = current.slice()
      next.splice(Math.min(index, next.length), 0, session)
      return next
    })
  }

  return (
    <box id="root" flexDirection="column" width="100%" height="100%" padding={1} backgroundColor="#0f1419">
      <box id="header" height={5} border borderColor="#263544" paddingLeft={2} paddingRight={2} paddingTop={1}>
        <text id="title" fg="#d6deeb" height={1}>
          OpenCode Toolkit
        </text>
        <text id="subtitle" fg="#7893ad" height={1}>
          Repair and utility flows for local OpenCode data
        </text>
      </box>

      {view === "archived" ? (
        <ArchivedSessionsView sessions={sessions} selected={sessionSelected} loading={loading} pending={pendingUnarchive} />
      ) : (
        <HomeView actions={actions} selected={selectedAction} status={status} />
      )}

      <box id="footer" height={2} marginTop={1} paddingLeft={1}>
        <text id="controls" fg="#7893ad">
          {view === "archived"
            ? "up/down move - enter/u unarchive - r refresh - esc back - q quit"
            : "left/right choose - enter run - 1 repair - 2 archived sessions - q quit"}
        </text>
      </box>

      {toast ? <ToastView toast={toast} /> : null}
    </box>
  )
}
