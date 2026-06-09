import type { ToolkitHealth } from "../health.js"
import { createRequiredContext } from "./helper.js"

export type HealthContext = {
  health: ToolkitHealth
  status: string
  loadingHealth: boolean
  setStatus: (status: string) => void
  refreshHealth: () => void
}

const context = createRequiredContext<HealthContext>("Health")

export const HealthProvider = context.Provider
export const useHealth = context.useValue
