// Shared state shapes for the OpenTUI React app.
export type View = "overview" | "repair-detail" | "archived" | "logs" | "backups"
export type SidebarSection = "Overview" | "Repairs" | "Sessions" | "Logs" | "Backups" | "Settings"
export type OverviewPane = "sidebar" | "actions"
export type LogsPane = "sources" | "entries"
export type LogFilter = "ALL" | "ERRORS" | "WARNINGS" | "SEARCH"
export type ToastVariant = "info" | "success" | "warning" | "error"

export type ToastState = {
  message: string
  title?: string
  variant: ToastVariant
  duration: number
}

export type ToastInput = Omit<ToastState, "duration"> & { duration?: number }

export type ConfirmationRequest = {
  id: "apply-repair" | "unarchive-session" | "unarchive-sessions" | "create-backup" | "restore-backup" | "delete-backup"
  title: string
  body: string
  targetPath: string
  backupStatus: string
  plannedChangesCount: number
  warning: string
  confirmLabel?: string
  requireText?: string
  input?: string
  onConfirm: () => void
  onCancel?: () => void
}

export type OverviewAction = {
  id: "workspace-repair" | "archived-sessions" | "logs" | "backups"
  section: SidebarSection
  status: string
  category: string
  title: string
  description: string
  actionHint: string
  details: string
  target: string
  targetRoute: View
  safety: string
  hotkey: string
  priority: number
  run: () => void
}

export type ChildResult = {
  code: number
  stdout: string
  stderr: string
}
