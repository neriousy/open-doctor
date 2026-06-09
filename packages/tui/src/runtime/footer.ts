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
    return "F1 Help · ← Sidebar · ↑↓/Pg Move · Enter Preview · u Restore · Space Select · q Quit"
  }
  if (view === "repair-detail") return repairFooter(repairStatus, confirmation?.id === "apply-repair")
  if (view === "logs") {
    return "F1 Help · ← Sources/Sidebar · → Entries · ↑↓/Pg Move · Tab Pane · f Filter · y Copy path · q Quit"
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
  if (view === "data" || section === "Data") return "F1 Help · ← Sidebar · ↑↓ Move · Enter Open · c Backup · v Verify · o Backups · q Quit"
  if (view === "config" || section === "Config") return "F1 Help · ← Sidebar · ↑↓ Move · Enter Open · v View · b Backup · e Edit · q Quit"
  return "F1 Help · ← Sidebar · ↑↓ Move · Enter Open · / Search · Esc Back · q Quit"
}

function repairFooter(status: RepairStatus, confirmRepair: boolean) {
  if (confirmRepair) return "Enter Confirm · Esc Cancel · q Quit"
  if (status === "DETECTED" || status === "EXPERIMENTAL") {
    return "F1 Help · ← Sidebar · d Dry run · s SQL · r Apply · b Backup · Esc Back · q Quit"
  }
  return "F1 Help · ← Sidebar · d Dry run · s SQL · b Backup · Esc Back · q Quit"
}

function backupsFooter(restoreImplemented: boolean) {
  return restoreImplemented
    ? "F1 Help · ← Sidebar · ↑↓/Pg Move · c Create · v Verify · y Copy · Enter Restore · q Quit"
    : "F1 Help · ← Sidebar · ↑↓/Pg Move · c Create · v Verify · y Copy path · q Quit"
}

function helpScreen(view: View, section: SidebarSection): HelpContext["screen"] {
  if (view === "repair-detail") return "Repairs"
  if (view === "archived") return "Sessions"
  if (view === "logs") return "Logs"
  if (view === "backups" || view === "data") return "Data"
  if (section === "Repairs") return "Repairs"
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
  if (view === "archived") return ["Left focus sidebar", "Up/Down move", "PgUp/PgDn page", "Home/End jump", "Enter preview", "u unarchive", "Space select/unselect", "a select all", "s search", "l open logs", "r refresh", "/ or p command palette"]
  if (view === "logs") return ["Left moves entries to sources, then sidebar", "Right focuses entries", "Tab switches log pane", "Up/Down move", "PgUp/PgDn page", "Home/End jump", "f filter", "s search", "n/N next/previous match", "r refresh", "y copy source path", "Enter related repair", "/ or p command palette"]
  if (view === "backups") {
    const actions = ["Left focus sidebar", "Up/Down move", "PgUp/PgDn page", "Home/End jump", "Enter inspect backup", "c create backup...", "v verify backup", "y copy path", "r refresh", "/ command palette"]
    if (restoreImplemented) actions.push("restore backup...")
    return actions
  }
  if (view === "repair-detail") {
    if (confirmation?.id === "apply-repair") return ["Enter confirm", "Esc cancel"]
    const actions = ["Left focus sidebar", "d dry run", "s show SQL", "b create backup", "/ command palette"]
    if (repairStatus === "DETECTED" || repairStatus === "EXPERIMENTAL") actions.splice(1, 0, "r apply repair...")
    return actions
  }
  if (section === "Sessions") return ["Enter browse sessions", "/ command palette"]
  if (section === "Logs") return ["Enter open log viewer", "f filter", "/ command palette"]
  if (section === "Repairs") return ["Left focus sidebar", "Enter open repair details", "d dry run", "s show SQL", "b create backup", "/ command palette"]
  if (section === "Data") return ["Left focus sidebar", "Enter inspect selected item", "c create backup...", "v verify backup", "o open backups", "/ command palette"]
  if (section === "Config") return ["Left focus sidebar", "Enter inspect config item", "v view effective config", "b backup config", "e edit config", "Editing config creates a backup first", "/ command palette"]
  return ["Enter open", "/ command palette"]
}
