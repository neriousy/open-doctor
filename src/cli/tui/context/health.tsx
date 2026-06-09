import type { ToolkitHealth } from "../health.js"
import { createRequiredContext } from "./helper.js"

export type HealthContext = {
  snapshot: ToolkitHealth
  status: {
    message: string
    set: (status: string) => void
  }
  loading: boolean
  actions: {
    refresh: () => void
  }
}

const context = createRequiredContext<HealthContext>("Health")

export const HealthProvider = context.Provider
export const useHealth = context.useValue
