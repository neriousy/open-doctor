import { Effect } from "effect"
import { formatError } from "../../../error.js"
import { createBackup, listBackups, verifyBackup } from "../../../utils/backups.js"
import type { BackupFile } from "../../../utils/backups.js"
import { resolveDbArg } from "../../input.js"
import type { ToolkitHealth } from "../health.js"
import type { ConfirmationRequest, ToastInput } from "../types.js"
import { writeClipboardSequence } from "../util/status.js"
import { useRef, useState } from "react"

export function useBackupsState(options: {
  health: ToolkitHealth
  setStatus: (status: string) => void
  showToast: (input: ToastInput) => void
  setConfirmation: (confirmation: ConfirmationRequest | null) => void
  refreshHealth: () => void
}) {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [selectedBackup, setSelectedBackup] = useState(0)
  const selectedBackupRef = useRef(0)
  const [loadingBackups, setLoadingBackups] = useState(false)

  function refreshBackups() {
    setLoadingBackups(true)
    try {
      const next = listBackups(resolveDbArg())
      setBackups(next)
      const selected = Math.max(0, Math.min(selectedBackupRef.current, next.length - 1))
      selectedBackupRef.current = selected
      setSelectedBackup(selected)
      options.setStatus(next.length === 0 ? "No backup files found" : `${next.length} backup file(s), newest first`)
    } catch (error: unknown) {
      const message = formatError(error)
      options.setStatus(message)
      options.showToast({ variant: "error", title: "Backup refresh failed", message })
    } finally {
      setLoadingBackups(false)
    }
  }

  function moveBackups(direction: 1 | -1) {
    const next = Math.max(0, Math.min(backups.length - 1, selectedBackupRef.current + direction))
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
      onConfirm: createManualBackup,
      onCancel: () => options.setStatus("Backup cancelled"),
    })
    options.setStatus("Confirm backup with Enter, or Esc to cancel")
  }

  function createManualBackup() {
    setLoadingBackups(true)
    options.setStatus("Creating database backup...")
    Effect.runPromise(createBackup(resolveDbArg()))
      .then((filename) => {
        options.setStatus(`Backup created: ${filename}`)
        options.showToast({ variant: "success", title: "Backup created", message: filename })
        refreshBackups()
        options.refreshHealth()
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        options.setStatus(message)
        options.showToast({ variant: "error", title: "Backup failed", message })
      })
      .finally(() => setLoadingBackups(false))
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
    Effect.runPromise(verifyBackup(backup.path))
      .then((result) => {
        const message = result.ok ? `Backup verified: ${backup.name}` : `Backup verification failed: ${result.message}`
        options.setStatus(message)
        options.showToast({ variant: result.ok ? "success" : "error", title: result.ok ? "Backup verified" : "Backup verify failed", message })
      })
      .catch((error: unknown) => {
        const message = formatError(error)
        options.setStatus(message)
        options.showToast({ variant: "error", title: "Backup verify failed", message })
      })
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
    loading: loadingBackups,
    actions: {
      refresh: refreshBackups,
      move: moveBackups,
      create: requestCreateBackupConfirmation,
      verifySelected: verifySelectedBackup,
      copySelectedPath: copySelectedBackupPath,
    },
  }
}
