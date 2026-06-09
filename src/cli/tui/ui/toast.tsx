import type { ToastInput, ToastState } from "../types.js"
import { createStateContext } from "../context/helper.js"
import { useToast as useToastState } from "./use-toast.js"

export type ToastContext = {
  current: ToastState | null
  actions: {
    show: (input: ToastInput) => void
  }
}

const context = createStateContext<ToastContext>({
  name: "Toast",
  init: () => {
    const { toast, showToast } = useToastState()
    return {
      current: toast,
      actions: {
        show: showToast,
      },
    }
  },
})

export const ToastProvider = context.Provider
export const useToastContext = context.useValue
