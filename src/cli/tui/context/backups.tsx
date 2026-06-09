import type { BackupFile } from "../../../utils/backups.js"
import { createRequiredContext } from "./helper.js"

export type BackupsContext = {
  backup: {
    items: BackupFile[]
    selected: number
    select: (index: number) => void
  }
  loading: boolean
  actions: {
    refresh: () => void
    move: (direction: 1 | -1) => void
    create: () => void
    verifySelected: () => void
    copySelectedPath: () => void
  }
}

const context = createRequiredContext<BackupsContext>("Backups")

export const BackupsProvider = context.Provider
export const useBackups = context.useValue
