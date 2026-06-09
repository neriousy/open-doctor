import type { ConfirmationRequest } from "../types.js"
import { createStateContext } from "../context/helper.js"
import { useHealth } from "../context/health.js"
import { useConfirmation } from "./use-confirmation.js"

export type ConfirmDialogContext = {
  current: ConfirmationRequest | null
  actions: {
    set: (confirmation: ConfirmationRequest | null) => void
    handleKey: (key: { name?: string; sequence?: string }) => void
  }
}

const context = createStateContext<ConfirmDialogContext>({
  name: "ConfirmDialog",
  init: () => {
    const health = useHealth()
    const { confirmation, setConfirmation, handleConfirmationKey } = useConfirmation(health.status.set)
    return {
      current: confirmation,
      actions: {
        set: setConfirmation,
        handleKey: handleConfirmationKey,
      },
    }
  },
})

export const ConfirmDialogProvider = context.Provider
export const useConfirmDialog = context.useValue
