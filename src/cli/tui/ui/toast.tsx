import type { ToastInput, ToastState } from "../types.js"
import { createRequiredContext } from "../context/helper.js"

export type ToastContext = {
  current: ToastState | null
  actions: {
    show: (input: ToastInput) => void
  }
}

const context = createRequiredContext<ToastContext>("Toast")

export const ToastProvider = context.Provider
export const useToastContext = context.useValue
