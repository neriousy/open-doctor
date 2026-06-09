import { Effect } from "effect"
import { useEffect, useRef, useState } from "react"
import { formatError } from "../../../error.js"
import { listArchivedSessions } from "../../../utils/sessions.js"
import type { ArchivedSession } from "../../../utils/sessions.js"
import { resolveDbArg } from "../../input.js"
import { runUnarchiveInChild } from "../actions.js"
import { sessionTitle } from "../format.js"
import type { ToolkitHealth } from "../health.js"
import type { ConfirmationRequest, ToastInput } from "../types.js"
import { filteredArchivedSessions } from "./filters.js"

export function useArchivedSessionsController(options: {
  health: ToolkitHealth
  quit: () => void
  openLogs: () => void
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
  setConfirmation: (confirmation: ConfirmationRequest | null) => void
}) {
  const [sessions, setSessions] = useState<ArchivedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUnarchive, setPendingUnarchive] = useState(0)
  const [archivedSearch, setArchivedSearch] = useState("")
  const archivedSearchRef = useRef("")
  const [archivedSearchActive, setArchivedSearchActive] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set())
  const selectedSessionIdsRef = useRef<Set<string>>(new Set())
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null)
  const [sessionSelected, setSessionSelected] = useState(0)
  const visibleArchivedSessions = filteredArchivedSessions(sessions, archivedSearch)

  useEffect(() => {
    if (sessionSelected >= visibleArchivedSessions.length) setSessionSelected(Math.max(0, visibleArchivedSessions.length - 1))
  }, [sessionSelected, visibleArchivedSessions.length])

  function refreshArchivedSessions() {
    setLoading(true)
    options.setStatus("Refreshing archived sessions...")
    Effect.runPromise(listArchivedSessions(resolveDbArg()))
      .then((next) => {
        setSessions(next)
        setSessionSelected(0)
        syncSelectedSessionIds(next)
        if (previewSessionId && !next.some((session) => session.id === previewSessionId)) setPreviewSessionId(null)
        options.setStatus(next.length === 0 ? "No archived sessions found" : `${next.length} archived session(s), newest first`)
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        options.setStatus(message)
        options.showToast({ variant: "error", message })
      })
      .finally(() => setLoading(false))
  }

  function moveArchivedSessions(direction: 1 | -1) {
    setSessionSelected((current) => Math.max(0, Math.min(visibleArchivedSessions.length - 1, current + direction)))
  }

  function startArchivedSearch() {
    setArchivedSearchActive(true)
    options.setStatus("Search archived sessions: type query, Enter to apply, Esc to cancel")
  }

  function handleArchivedSearchKey(key: { name?: string; sequence?: string }) {
    const sequence = key.sequence ?? ""
    if (sequence === "\u0003") {
      options.quit()
      return
    }
    if (key.name === "escape" || sequence === "\u001b") {
      setArchivedSearchActive(false)
      options.setStatus("Search cancelled")
      return
    }
    if (key.name === "return" || key.name === "enter" || sequence === "\r" || sequence === "\n") {
      setArchivedSearchActive(false)
      setSessionSelected(0)
      options.setStatus(archivedSearchRef.current ? `Search archived sessions: ${archivedSearchRef.current}` : "Search cleared")
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      const next = archivedSearchRef.current.slice(0, -1)
      archivedSearchRef.current = next
      setArchivedSearch(next)
      setSessionSelected(0)
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      const next = `${archivedSearchRef.current}${sequence}`
      archivedSearchRef.current = next
      setArchivedSearch(next)
      setSessionSelected(0)
    }
  }

  function toggleSelectedArchivedSession() {
    const session = visibleArchivedSessions[sessionSelected]
    if (!session) return
    const next = new Set(selectedSessionIdsRef.current)
    if (next.has(session.id)) next.delete(session.id)
    else next.add(session.id)
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
    options.setStatus(next.has(session.id) ? `Selected ${session.id}` : `Unselected ${session.id}`)
  }

  function toggleSelectAllArchivedSessions() {
    if (visibleArchivedSessions.length === 0) return
    const next = new Set(selectedSessionIdsRef.current)
    const allVisibleSelected = visibleArchivedSessions.every((session) => next.has(session.id))
    if (allVisibleSelected) visibleArchivedSessions.forEach((session) => next.delete(session.id))
    else visibleArchivedSessions.forEach((session) => next.add(session.id))
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
    options.setStatus(allVisibleSelected ? "Cleared visible archived-session selection" : `Selected ${visibleArchivedSessions.length} visible archived session(s)`)
  }

  function previewArchivedSession() {
    const session = visibleArchivedSessions[sessionSelected]
    if (!session) return
    setPreviewSessionId(session.id)
    options.setStatus(`Previewing ${sessionTitle(session)}`)
  }

  function requestUnarchiveSelectedSessions() {
    const target = unarchiveTargets()
    if (target.length === 0) return
    const title = target.length === 1 ? sessionTitle(target[0]!) : `${target.length} archived sessions`
    options.setConfirmation({
      id: target.length === 1 ? "unarchive-session" : "unarchive-sessions",
      title: target.length === 1 ? "Unarchive OpenCode session?" : "Unarchive OpenCode sessions?",
      body: `This will modify your local OpenCode SQLite database and create a backup before unarchiving ${title}.`,
      targetPath: options.health.dbPath,
      backupStatus: options.health.backupStatus,
      plannedChangesCount: target.length,
      warning: "A backup is required before restore/unarchive. Close OpenCode first if it is actively using this database.",
      onConfirm: () => applyUnarchiveSessions(target),
      onCancel: () => options.setStatus("Unarchive cancelled"),
    })
    options.setStatus("Confirm unarchive with Enter, or Esc to cancel")
  }

  function unarchiveTargets() {
    const checked = sessions.filter((session) => selectedSessionIdsRef.current.has(session.id))
    if (checked.length > 0) return checked
    const highlighted = visibleArchivedSessions[sessionSelected]
    return highlighted ? [highlighted] : []
  }

  function applyUnarchiveSessions(target: ArchivedSession[]) {
    const indexes = new Map(sessions.map((session, index) => [session.id, index]))
    target.forEach((session) => {
      const index = indexes.get(session.id) ?? 0
      applyUnarchiveSession(session, index)
    })
  }

  function applyUnarchiveSession(session: ArchivedSession, index: number) {
    const db = resolveDbArg()
    setSessions((current) => current.filter((item) => item.id !== session.id))
    setSessionSelected((current) => Math.max(0, Math.min(current, visibleArchivedSessions.length - 2)))
    removeSelectedSessionId(session.id)
    if (previewSessionId === session.id) setPreviewSessionId(null)
    setPendingUnarchive((current) => current + 1)
    options.setStatus(`Unarchiving ${session.id} in the background...`)
    options.showToast({ variant: "info", title: "Unarchiving session", message: sessionTitle(session), duration: 2500 })

    runUnarchiveInChild(session.id, db)
      .then((result) => {
        if (result.code !== 0) {
          restoreSession(session, index)
          const message = result.stderr.trim() || result.stdout.trim() || `Failed to unarchive ${session.id}`
          options.setStatus(message)
          options.showToast({ variant: "error", title: "Unarchive failed", message })
          return
        }

        if (result.stdout.includes("No archived session found")) {
          restoreSession(session, index)
          options.setStatus(`No archived session found for ${session.id}`)
          options.showToast({ variant: "warning", message: `No archived session found for ${sessionTitle(session)}` })
          return
        }

        options.setStatus(`Unarchived ${session.id}`)
        options.showToast({ variant: "success", title: "Session unarchived", message: sessionTitle(session) })
      })
      .catch((error: unknown) => {
        restoreSession(session, index)
        const message = formatError(error)
        options.setStatus(message)
        options.showToast({ variant: "error", title: "Unarchive failed", message })
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

  function syncSelectedSessionIds(nextSessions: ArchivedSession[]) {
    const existing = new Set(nextSessions.map((session) => session.id))
    const next = new Set([...selectedSessionIdsRef.current].filter((id) => existing.has(id)))
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
  }

  function removeSelectedSessionId(id: string) {
    const next = new Set(selectedSessionIdsRef.current)
    next.delete(id)
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
  }

  return {
    sessions,
    visibleArchivedSessions,
    sessionSelected,
    selectedSessionIds,
    previewSessionId,
    loading,
    pendingUnarchive,
    archivedSearch,
    archivedSearchActive,
    refreshArchivedSessions,
    moveArchivedSessions,
    startArchivedSearch,
    handleArchivedSearchKey,
    toggleSelectedArchivedSession,
    toggleSelectAllArchivedSessions,
    previewArchivedSession,
    requestUnarchiveSelectedSessions,
  }
}
