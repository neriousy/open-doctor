// Presentation adapter for workspace schema check and repair status.
import type { RepairStatus, WorkspaceRepairHealth } from "../health.js"
import { TUI } from "../ui/primitives-model.js"

export type RepairStatusDisplay = {
  status: RepairStatus
  label: string
  description: string
  actionHint: string
  category: string
  priority: number
  color: string
}

export function repairStatusDisplay(repair: WorkspaceRepairHealth): RepairStatusDisplay {
  if (repair.status === "OK") {
    return {
      status: repair.status,
      label: "Workspace DB schema",
      description: "No repair needed",
      actionHint: "Enter to view check details",
      category: "Check",
      priority: 80,
      color: TUI.muted,
    }
  }

  if (repair.status === "DETECTED") {
    return {
      status: repair.status,
      label: "Workspace DB schema",
      description: repair.detail || problemDescription(repair),
      actionHint: "Enter to inspect repair",
      category: "Repair",
      priority: 0,
      color: TUI.yellow,
    }
  }

  if (repair.status === "WARN") {
    return {
      status: repair.status,
      label: "Migration state",
      description: repair.detail || "Suspicious migration state",
      actionHint: "Enter to review",
      category: "Review",
      priority: 10,
      color: TUI.yellow,
    }
  }

  if (repair.status === "CHECK") {
    return {
      status: repair.status,
      label: "Workspace DB schema",
      description: repair.detail || "Check has not run yet",
      actionHint: "Enter to run check",
      category: "Check",
      priority: 70,
      color: TUI.blue,
    }
  }

  if (repair.status === "FAILED") {
    return {
      status: repair.status,
      label: "Workspace DB schema",
      description: repair.error ?? repair.detail,
      actionHint: "Enter to view failure",
      category: "Failure",
      priority: 5,
      color: TUI.red,
    }
  }

  return {
    status: repair.status,
    label: "Workspace DB schema",
    description: repair.detail || "Experimental repair is available",
    actionHint: "Enter to review carefully",
    category: "Experimental",
    priority: 20,
    color: TUI.yellow,
  }
}

export function repairStatusColor(status: string) {
  if (status === "OK") return TUI.muted
  if (status === "DETECTED" || status === "WARN" || status === "EXPERIMENTAL") return TUI.yellow
  if (status === "FAILED") return TUI.red
  if (status === "CHECK") return TUI.blue
  return undefined
}

export function problemDescription(repair: WorkspaceRepairHealth) {
  if (repair.changes.length === 0) return repair.detail
  return repair.changes.map((change) => problemLabel(change.label)).join("; ")
}

function problemLabel(label: string) {
  const column = label.match(/workspace\.([a-z_]+)/)?.[1]
  if (column) return `Missing column: workspace.${column}`
  return label
}
