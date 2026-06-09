import type { HelpContext } from "../help-overlay.js"
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
    return "up/down move - enter preview - u unarchive - space select - a all - s search - l logs - r refresh - / or p palette - esc back - q quit - ? help"
  }
  if (view === "repair-detail") return repairFooter(repairStatus, confirmation?.id === "apply-repair")
  if (view === "logs") {
    return "left/right pane - up/down move - f filter - s search - n/N match - r refresh - enter related repair - / or p palette - esc back - q quit - ? help"
  }
  if (view === "backups") return backupsFooter(restoreImplemented)
  return overviewFooter(section)
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
      "Repairs create backups before modifying databases.",
      "Restore/unarchive actions require confirmation where applicable.",
    ],
  }
}

function overviewFooter(section: SidebarSection) {
  if (section === "Overview") return "left/right pane - up/down move - enter open - 1 repair - 2 sessions - 3 logs - 4 backups - / or p palette - q quit - ? help"
  if (section === "Repairs") return "enter inspect repair - d in repair view dry-run - r in repair view apply - / or p palette - left sidebar - q quit - ? help"
  if (section === "Sessions") return "enter browse sessions - 2 open sessions - / or p palette - left sidebar - up/down section - q quit - ? help"
  if (section === "Logs") return "enter open log viewer - 3 logs - f in viewer filter - / or p palette - left sidebar - q quit - ? help"
  if (section === "Backups") return "enter open backups - 4 backups - c in backups view create - / or p palette - left sidebar - q quit - ? help"
  return "settings planned - / or p palette - left sidebar - up/down section - q quit - ? help"
}

function repairFooter(status: RepairStatus, confirmRepair: boolean) {
  if (confirmRepair) return "enter confirm - esc cancel - / or p palette - q quit - ? help"
  if (status === "DETECTED" || status === "EXPERIMENTAL") {
    return "d dry run - r repair - s show sql - b create backup - / or p palette - esc back - q quit - ? help"
  }
  return "d dry run - s show sql - b create backup - / or p palette - esc back - q quit - ? help"
}

function backupsFooter(restoreImplemented: boolean) {
  const restore = restoreImplemented ? " - restore confirm" : ""
  return `up/down move - c create backup - v verify - y copy path - r refresh${restore} - / or p palette - esc back - q quit - ? help`
}

function helpScreen(view: View, section: SidebarSection): HelpContext["screen"] {
  if (view === "repair-detail") return "Repairs"
  if (view === "archived") return "Sessions"
  if (view === "logs") return "Logs"
  if (view === "backups") return "Backups"
  if (section === "Repairs" || section === "Sessions" || section === "Logs" || section === "Backups") return section
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
    const actions = ["c create backup", "v verify backup", "y copy path", "r refresh", "/ or p command palette"]
    if (restoreImplemented) actions.push("restore confirm")
    return actions
  }
  if (view === "repair-detail") {
    if (confirmation?.id === "apply-repair") return ["Enter confirm", "Esc cancel"]
    const actions = ["d dry run", "s show sql", "b create backup", "/ or p command palette"]
    if (repairStatus === "DETECTED" || repairStatus === "EXPERIMENTAL") actions.splice(1, 0, "r repair")
    return actions
  }
  if (section === "Repairs") return ["Enter inspect repair", "d in repair view dry-run", "r in repair view apply", "/ or p command palette"]
  if (section === "Sessions") return ["Enter browse sessions", "2 open sessions", "/ or p command palette"]
  if (section === "Logs") return ["Enter open log viewer", "3 logs", "f in viewer filter", "/ or p command palette"]
  if (section === "Backups") return ["Enter open backups", "4 backups", "c in backups view create", "/ or p command palette"]
  return ["Enter open", "1 repair", "2 sessions", "3 logs", "4 backups", "/ or p command palette"]
}
