import { createRequiredContext } from "./helper.js"

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

const context = createRequiredContext<RepairContext>("Repair")

export const RepairProvider = context.Provider
export const useRepair = context.useValue
