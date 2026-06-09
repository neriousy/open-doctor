import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatError } from "@open-doctor/core/error"
import { resolveDbArg } from "@open-doctor/core/input"
import type { BackupFile } from "@open-doctor/core/utils/backups"
import type { ToolkitHealth } from "../health.js"
import { backupsQueryOptions, createManualBackup, mutationKeys, queryKeys, verifyBackupFile } from "../query/toolkit.js"
import type { ConfirmationRequest, ToastInput } from "../types.js"
import { writeClipboardSequence } from "../util/status.js"

export function useBackupsState(options: {
  health: ToolkitHealth
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
  setConfirmation: (confirmation: ConfirmationRequest | null) => void
}) {
  const db = resolveDbArg()
  const queryClient = useQueryClient()
  const query = useQuery(backupsQueryOptions(db))
  const backups = query.data ?? []
  const [selectedBackup, setSelectedBackup] = useState(0)
  const selectedBackupRef = useRef(0)

  const createMutation = useMutation({
    mutationKey: mutationKeys.backups.create(),
    mutationFn: () => createManualBackup(db),
    onSuccess: (filename) => {
      options.setStatus(`Backup created: ${filename}`)
      options.showToast({ variant: "success", title: "Backup created", message: filename })
    },
    onError: (error) => {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Backup failed", message })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.list(db) })
      queryClient.invalidateQueries({ queryKey: queryKeys.health(db) })
    },
  })

  const verifyMutation = useMutation({
    mutationKey: mutationKeys.backups.verify(),
    mutationFn: (backup: BackupFile) => verifyBackupFile(backup.path),
    onSuccess: (result, backup) => {
      const message = result.ok ? `Backup verified: ${backup.name}` : `Backup verification failed: ${result.message}`
      options.setStatus(message)
      options.showToast({ variant: result.ok ? "success" : "error", title: result.ok ? "Backup verified" : "Backup verify failed", message })
    },
    onError: (error) => {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Backup verify failed", message })
    },
  })

  useEffect(() => {
    const selected = Math.max(0, Math.min(selectedBackupRef.current, backups.length - 1))
    selectedBackupRef.current = selected
    setSelectedBackup(selected)
  }, [query.dataUpdatedAt])

  useEffect(() => {
    if (!query.data) return
    options.setStatus(query.data.length === 0 ? "No backup files found" : `${query.data.length} backup file(s), newest first`)
  }, [query.dataUpdatedAt])

  useEffect(() => {
    if (!query.error) return
    const message = formatError(query.error)
    options.setStatus(message)
    options.showToast({ variant: "error", title: "Backup refresh failed", message })
  }, [query.errorUpdatedAt])

  function refreshBackups() {
    options.setStatus(query.data ? "Refreshing backup files..." : "Loading backup files...")
    query.refetch().catch(() => undefined)
  }

  function moveBackups(direction: 1 | -1) {
    moveBackupsBy(direction)
  }

  function moveBackupsBy(amount: number) {
    const next = Math.max(0, Math.min(backups.length - 1, selectedBackupRef.current + amount))
    selectedBackupRef.current = next
    setSelectedBackup(next)
  }

  function jumpBackups(position: "start" | "end") {
    const next = position === "start" ? 0 : Math.max(0, backups.length - 1)
    selectedBackupRef.current = next
    setSelectedBackup(next)
  }

  function selectBackup(index: number) {
    selectedBackupRef.current = index
    setSelectedBackup(index)
  }

  function requestCreateBackupConfirmation() {
    options.setConfirmation({
      id: "create-backup",
      title: "Create OpenCode database backup?",
      body: "This will read your local OpenCode SQLite database and write a backup file next to it.",
      targetPath: options.health.dbPath,
      backupStatus: options.health.backupStatus,
      plannedChangesCount: 1,
      warning: "Close OpenCode first if it is actively writing to this database.",
      onConfirm: createBackup,
      onCancel: () => options.setStatus("Backup cancelled"),
    })
    options.setStatus("Confirm backup with Enter, or Esc to cancel")
  }

  function createBackup() {
    options.setStatus("Creating database backup...")
    createMutation.mutate()
  }

  function verifySelectedBackup() {
    const backup = backups[selectedBackupRef.current]
    if (!backup) {
      const message = "No backup selected"
      options.setStatus(message)
      options.showToast({ variant: "warning", message })
      return
    }

    options.setStatus(`Verifying backup: ${backup.name}`)
    verifyMutation.mutate(backup)
  }

  function copySelectedBackupPath() {
    const backup = backups[selectedBackupRef.current]
    if (!backup) {
      const message = "No backup selected"
      options.setStatus(message)
      options.showToast({ variant: "warning", message })
      return
    }

    writeClipboardSequence(backup.path)
    options.setStatus(`Copied backup path: ${backup.path}`)
    options.showToast({ variant: "success", title: "Backup path copied", message: backup.path })
  }

  return {
    backup: {
      items: backups,
      selected: selectedBackup,
      select: selectBackup,
    },
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    stale: query.isStale,
    error: query.error ? formatError(query.error) : undefined,
    actions: {
      refresh: refreshBackups,
      move: moveBackups,
      moveBy: moveBackupsBy,
      jump: jumpBackups,
      create: requestCreateBackupConfirmation,
      verifySelected: verifySelectedBackup,
      copySelectedPath: copySelectedBackupPath,
    },
  }
}
