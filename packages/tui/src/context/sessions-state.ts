import { useEffect, useMemo, useRef, useState } from "react"
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatError } from "@open-doctor/core/error"
import { resolveDbArg } from "@open-doctor/core/input"
import type { ArchivedSession } from "@open-doctor/core/utils/sessions"
import { runUnarchiveInChild } from "../actions.js"
import type { ToolkitHealth } from "../health.js"
import { archivedSessionsQueryOptions, mutationKeys, queryKeys } from "../query/toolkit.js"
import { sessionTitle } from "../util/format.js"
import type { ConfirmationRequest, ToastInput } from "../types.js"
import { filteredArchivedSessions } from "../util/filters.js"
import { boundedIndex } from "../util/indexing.js"

type UnarchiveVariables = {
  db: string
  session: ArchivedSession
  index: number
}

export function useSessionsState(options: {
  health: ToolkitHealth
  quit: () => void
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
  setConfirmation: (confirmation: ConfirmationRequest | null) => void
}) {
  const db = resolveDbArg()
  const queryClient = useQueryClient()
  const query = useQuery(archivedSessionsQueryOptions(db))
  const sessions = query.data ?? []
  const [archivedSearch, setArchivedSearch] = useState("")
  const archivedSearchRef = useRef("")
  const [archivedSearchActive, setArchivedSearchActive] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set())
  const selectedSessionIdsRef = useRef<Set<string> | null>(null)
  if (selectedSessionIdsRef.current === null) selectedSessionIdsRef.current = new Set()
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null)
  const [sessionSelectedIndex, setSessionSelectedIndex] = useState(0)
  const visibleArchivedSessions = useMemo(() => filteredArchivedSessions(sessions, archivedSearch), [sessions, archivedSearch])
  const sessionSelected = boundedIndex(sessionSelectedIndex, visibleArchivedSessions.length)
  const pendingUnarchive = useIsMutating({ mutationKey: mutationKeys.sessions.unarchive() })

  const unarchiveMutation = useMutation({
    mutationKey: mutationKeys.sessions.unarchive(),
    mutationFn: async (variables: UnarchiveVariables) => {
      const result = await runUnarchiveInChild(variables.session.id, variables.db)
      if (result.code !== 0) {
        const message = result.stderr.trim() || result.stdout.trim() || `Failed to unarchive ${variables.session.id}`
        throw new Error(message)
      }
      if (result.stdout.includes("No archived session found")) {
        throw new Error(`No archived session found for ${variables.session.id}`)
      }
      return result
    },
    onMutate: async (variables) => {
      const key = queryKeys.sessions.archived(variables.db)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ArchivedSession[]>(key)
      queryClient.setQueryData<ArchivedSession[]>(key, (current = []) => current.filter((item) => item.id !== variables.session.id))
      return { previous }
    },
    onError: (error, variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.sessions.archived(variables.db), context.previous)
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Unarchive failed", message })
    },
    onSuccess: (_result, variables) => {
      options.setStatus(`Unarchived ${variables.session.id}`)
      options.showToast({ variant: "success", title: "Session unarchived", message: sessionTitle(variables.session) })
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.archived(variables.db) })
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.list(variables.db) })
      queryClient.invalidateQueries({ queryKey: queryKeys.health(variables.db) })
    },
  })

  useEffect(() => {
    const selected = Math.max(0, Math.min(sessionSelectedIndex, sessions.length - 1))
    if (selected !== sessionSelectedIndex) setSessionSelectedIndex(selected)
    syncSelectedSessionIds(sessions)
    setPreviewSessionId((current) => (current && !sessions.some((session) => session.id === current) ? null : current))
  }, [query.dataUpdatedAt])

  useEffect(() => {
    if (!query.data) return
    options.setStatus(query.data.length === 0 ? "No archived sessions found" : `${query.data.length} archived session(s), newest first`)
  }, [query.dataUpdatedAt])

  useEffect(() => {
    if (!query.error) return
    const message = formatError(query.error)
    options.setStatus(message)
    options.showToast({ variant: "error", title: "Archived-session refresh failed", message })
  }, [query.errorUpdatedAt])

  function refreshArchivedSessions() {
    options.setStatus(query.data ? "Refreshing archived sessions..." : "Loading archived sessions...")
    query.refetch().catch(() => undefined)
  }

  function moveArchivedSessions(direction: 1 | -1) {
    moveArchivedSessionsBy(direction)
  }

  function moveArchivedSessionsBy(amount: number) {
    setSessionSelectedIndex((current) => boundedIndex(current + amount, visibleArchivedSessions.length))
  }

  function jumpArchivedSessions(position: "start" | "end") {
    setSessionSelectedIndex(position === "start" ? 0 : Math.max(0, visibleArchivedSessions.length - 1))
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
      setSessionSelectedIndex(0)
      options.setStatus(archivedSearchRef.current ? `Search archived sessions: ${archivedSearchRef.current}` : "Search cleared")
      return
    }
    if (key.name === "backspace" || key.name === "delete" || sequence === "\u007f") {
      const next = archivedSearchRef.current.slice(0, -1)
      archivedSearchRef.current = next
      setArchivedSearch(next)
      setSessionSelectedIndex(0)
      return
    }
    if (sequence.length === 1 && sequence >= " ") {
      const next = `${archivedSearchRef.current}${sequence}`
      archivedSearchRef.current = next
      setArchivedSearch(next)
      setSessionSelectedIndex(0)
    }
  }

  function toggleSelectedArchivedSession() {
    const session = visibleArchivedSessions[sessionSelected]
    if (!session) return
    const next = new Set(selectedSessionIdsCurrent())
    if (next.has(session.id)) next.delete(session.id)
    else next.add(session.id)
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
    options.setStatus(next.has(session.id) ? `Selected ${session.id}` : `Unselected ${session.id}`)
  }

  function toggleSelectAllArchivedSessions() {
    if (visibleArchivedSessions.length === 0) return
    const next = new Set(selectedSessionIdsCurrent())
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
    const selectedIds = selectedSessionIdsCurrent()
    const checked = sessions.filter((session) => selectedIds.has(session.id))
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
    removeSelectedSessionId(session.id)
    if (previewSessionId === session.id) setPreviewSessionId(null)
    setSessionSelectedIndex((current) => boundedIndex(current, Math.max(0, visibleArchivedSessions.length - 1)))
    options.setStatus(`Unarchiving ${session.id} in the background...`)
    options.showToast({ variant: "info", title: "Unarchiving session", message: sessionTitle(session), duration: 2500 })
    unarchiveMutation.mutate({ db, session, index })
  }

  function syncSelectedSessionIds(nextSessions: ArchivedSession[]) {
    const existing = new Set(nextSessions.map((session) => session.id))
    const next = new Set([...selectedSessionIdsCurrent()].filter((id) => existing.has(id)))
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
  }

  function removeSelectedSessionId(id: string) {
    const next = new Set(selectedSessionIdsCurrent())
    next.delete(id)
    selectedSessionIdsRef.current = next
    setSelectedSessionIds(next)
  }

  function selectedSessionIdsCurrent() {
    if (selectedSessionIdsRef.current === null) selectedSessionIdsRef.current = new Set()
    return selectedSessionIdsRef.current
  }

  return {
    list: {
      items: sessions,
      visible: visibleArchivedSessions,
      selected: sessionSelected,
    },
    selection: {
      ids: selectedSessionIds,
      previewId: previewSessionId,
      toggleCurrent: toggleSelectedArchivedSession,
      toggleAllVisible: toggleSelectAllArchivedSessions,
      previewCurrent: previewArchivedSession,
    },
    search: {
      query: archivedSearch,
      active: archivedSearchActive,
      start: startArchivedSearch,
      handleKey: handleArchivedSearchKey,
    },
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    stale: query.isStale,
    error: query.error ? formatError(query.error) : undefined,
    pendingUnarchive,
    actions: {
      refresh: refreshArchivedSessions,
      move: moveArchivedSessions,
      moveBy: moveArchivedSessionsBy,
      jump: jumpArchivedSessions,
      requestUnarchive: requestUnarchiveSelectedSessions,
    },
  }
}
