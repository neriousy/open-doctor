import type { BackupFile } from "../../../utils/backups.js"
import { createRequiredContext } from "./helper.js"

export type BackupsContext = {
  backups: BackupFile[]
  selectedBackup: number
  hoveredBackup: number | null
  setHoveredBackup: (index: number | null) => void
  loadingBackups: boolean
  refreshBackups: () => void
  moveBackups: (direction: 1 | -1) => void
  selectBackup: (index: number) => void
  requestCreateBackupConfirmation: () => void
  verifySelectedBackup: () => void
  copySelectedBackupPath: () => void
}

const context = createRequiredContext<BackupsContext>("Backups")

export const BackupsProvider = context.Provider
export const useBackups = context.useValue
