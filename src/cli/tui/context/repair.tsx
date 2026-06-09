import { createRequiredContext } from "./helper.js"

export type RepairContext = {
  showSql: boolean
  runDryRepair: () => void
  requestRepairConfirmation: () => void
  toggleSql: () => void
}

const context = createRequiredContext<RepairContext>("Repair")

export const RepairProvider = context.Provider
export const useRepair = context.useValue
