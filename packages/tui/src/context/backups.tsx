import type { BackupFile } from "@open-doctor/core/utils/backups"
import { useConfirmDialog } from "../ui/dialog-confirm.js"
import { useToastContext } from "../ui/toast.js"
import { useBackupsState } from "./backups-state.js"
import { useHealth } from "./health.js"
import { createStateContext } from "./helper.js"

export type BackupsContext = {
  backup: {
    items: BackupFile[]
    selected: number
    select: (index: number) => void
  }
  loading: boolean
  refreshing: boolean
  stale: boolean
  error: string | undefined
  actions: {
    refresh: () => void
    move: (direction: 1 | -1) => void
    moveBy: (amount: number) => void
    jump: (position: "start" | "end") => void
    create: () => void
    verifySelected: () => void
    copySelectedPath: () => void
  }
}

const context = createStateContext<BackupsContext>({
  name: "Backups",
  init: () => {
    const health = useHealth()
    const toast = useToastContext()
    const confirm = useConfirmDialog()

    return useBackupsState({
      health: health.snapshot,
      setStatus: health.status.set,
      showToast: toast.actions.show,
      setConfirmation: confirm.actions.set,
    })
  },
})

export const BackupsProvider = context.Provider
export const useBackups = context.useValue
