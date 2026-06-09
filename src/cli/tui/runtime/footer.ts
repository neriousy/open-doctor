import type { HelpContext } from "../component/help-overlay.js"
import type { RepairStatus } from "../health.js"
import type { ConfirmationRequest, SidebarSection, View } from "../types.js"

export function footerForContext(
  view: View,
  section: SidebarSection,
  repairStatus: RepairStatus,
  confirmation: ConfirmationRequest | null,
  restoreImplemented: boolean,
) {
  if (view === "archived") {
    return "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
  }
  if (view === "repair-detail") return repairFooter(repairStatus, confirmation?.id === "apply-repair")
  if (view === "logs") {
    return "F1 Help · ↑↓ Move · ←→ Switch pane · Enter Open · f Filter · / Search · y Copy · q Quit"
  }
  if (view === "backups") return backupsFooter(restoreImplemented)
  return overviewFooter(view, section)
}

export function helpContext(
  view: View,
  section: SidebarSection,
  repairStatus: RepairStatus,
  confirmation: ConfirmationRequest | null,
  restoreImplemented: boolean,
): HelpContext {
  return {
    screen: helpScreen(view, section),
    actions: helpActions(view, section, repairStatus, confirmation, restoreImplemented),
    safety: [
      "Reviewing logs and validation results is read-only.",
      "Database or config changes create backups first and require confirmation.",
    ],
  }
}

function overviewFooter(view: View, section: SidebarSection) {
  if (view === "data" || section === "Data") return "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
  return "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
}

function repairFooter(status: RepairStatus, confirmRepair: boolean) {
  if (confirmRepair) return "Enter Confirm · Esc Cancel · q Quit"
  if (status === "DETECTED" || status === "EXPERIMENTAL") {
    return "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
  }
  return "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
}

function backupsFooter(restoreImplemented: boolean) {
  return restoreImplemented
    ? "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
    : "F1 Help · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
}

function helpScreen(view: View, section: SidebarSection): HelpContext["screen"] {
  if (view === "repair-detail") return "Data"
  if (view === "archived") return "Sessions"
  if (view === "logs") return "Logs"
  if (view === "backups" || view === "data") return "Data"
  if (view === "config") return "Config"
  if (view === "settings") return "Settings"
  if (section === "Sessions" || section === "Logs" || section === "Data" || section === "Config" || section === "Settings") return section
  return "Overview"
}

function helpActions(
  view: View,
  section: SidebarSection,
  repairStatus: RepairStatus,
  confirmation: ConfirmationRequest | null,
  restoreImplemented: boolean,
) {
  if (view === "archived") return ["Enter preview", "u unarchive", "Space select/unselect", "a select all", "s search", "l open logs", "r refresh", "/ or p command palette"]
  if (view === "logs") return ["f filter", "s search", "n/N next/previous match", "r refresh", "Enter related repair", "/ or p command palette"]
  if (view === "backups") {
    const actions = ["Enter inspect backup", "c create backup...", "v verify backup", "y copy path", "r refresh", "/ command palette"]
    if (restoreImplemented) actions.push("restore backup...")
    return actions
  }
  if (view === "repair-detail") {
    if (confirmation?.id === "apply-repair") return ["Enter confirm", "Esc cancel"]
    const actions = ["d dry run", "s show SQL", "b create backup", "/ command palette"]
    if (repairStatus === "DETECTED" || repairStatus === "EXPERIMENTAL") actions.splice(1, 0, "r apply repair...")
    return actions
  }
  if (section === "Sessions") return ["Enter browse sessions", "/ command palette"]
  if (section === "Logs") return ["Enter open log viewer", "f filter", "/ command palette"]
  if (section === "Data") return ["Enter inspect selected item", "Mutating actions require confirmation", "/ command palette"]
  if (section === "Config") return ["Enter inspect config item", "Editing config creates a backup first", "/ command palette"]
  return ["Enter open", "/ command palette"]
}
