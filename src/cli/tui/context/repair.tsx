import { useEffect, useState } from "react"
import { runRepair } from "../actions.js"
import { useConfirmDialog } from "../ui/dialog-confirm.js"
import { useToastContext } from "../ui/toast.js"
import { repairStatusDisplay } from "../util/repair-status.js"
import { useHealth } from "./health.js"
import { createStateContext } from "./helper.js"
import { useRoute } from "./route.js"

export type RepairContext = {
  sql: {
    visible: boolean
    toggle: () => void
  }
  actions: {
    dryRun: () => void
    requestApply: () => void
  }
}

const context = createStateContext<RepairContext>({
  name: "Repair",
  init: () => {
    const [showSql, setShowSql] = useState(false)
    const health = useHealth()
    const toast = useToastContext()
    const confirm = useConfirmDialog()
    const route = useRoute()

    useEffect(() => {
      if (route.location.view !== "repair-detail") return
      setShowSql(false)
      const display = repairStatusDisplay(health.snapshot.workspaceRepair)
      health.status.set(`${display.label}: ${display.description}`)
      if (display.status === "CHECK") health.actions.refresh()
    }, [route.location.view])

    function dryRun() {
      runRepair(health.status.set, toast.actions.show, { dryRun: true, onComplete: health.actions.refresh })
    }

    function requestApply() {
      const display = repairStatusDisplay(health.snapshot.workspaceRepair)
      if (display.status === "OK") {
        const message = "No repair needed. Run dry-run to inspect checks."
        health.status.set(message)
        toast.actions.show({ variant: "info", message })
        return
      }
      if (display.status === "FAILED") {
        const message = "Repair unavailable because the check failed. Open logs or export a report."
        health.status.set(message)
        toast.actions.show({ variant: "error", message })
        return
      }
      if (display.status === "CHECK") {
        const message = "Check has not completed yet. Refreshing health scan..."
        health.status.set(message)
        toast.actions.show({ variant: "info", message })
        health.actions.refresh()
        return
      }
      if (display.status !== "DETECTED" && display.status !== "EXPERIMENTAL") {
        const message = "Repair is not available for the current status."
        health.status.set(message)
        toast.actions.show({ variant: "warning", message })
        return
      }
      confirm.actions.set({
        id: "apply-repair",
        title: "Apply Workspace DB schema repair?",
        body: "This will modify your local OpenCode SQLite database.",
        targetPath: health.snapshot.dbPath,
        backupStatus: health.snapshot.backupStatus,
        plannedChangesCount: health.snapshot.workspaceRepair.changes.length,
        warning: "Close OpenCode first if it is actively using this database.",
        onConfirm: () => runRepair(health.status.set, toast.actions.show, { onComplete: health.actions.refresh }),
        onCancel: () => health.status.set("Repair cancelled"),
      })
      health.status.set("Confirm repair with Enter, or Esc to cancel")
    }

    return {
      sql: {
        visible: showSql,
        toggle: () => setShowSql((current) => !current),
      },
      actions: {
        dryRun,
        requestApply,
      },
    }
  },
})

export const RepairProvider = context.Provider
export const useRepair = context.useValue
