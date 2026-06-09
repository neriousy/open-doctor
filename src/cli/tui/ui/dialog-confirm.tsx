import type { ConfirmationRequest } from "../types.js"
import { createRequiredContext } from "../context/helper.js"

export type ConfirmDialogContext = {
  confirmation: ConfirmationRequest | null
  setConfirmation: (confirmation: ConfirmationRequest | null) => void
  handleConfirmationKey: (key: { name?: string; sequence?: string }) => void
}

const context = createRequiredContext<ConfirmDialogContext>("ConfirmDialog")

export const ConfirmDialogProvider = context.Provider
export const useConfirmDialog = context.useValue
