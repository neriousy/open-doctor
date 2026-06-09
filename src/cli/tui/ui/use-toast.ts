import { useEffect, useState } from "react"
import type { ToastInput, ToastState } from "../types.js"

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.duration)
    timer.unref()
    return () => clearTimeout(timer)
  }, [toast])

  function showToast(input: ToastInput) {
    const next = { ...input, duration: input.duration ?? 4000 }
    setToast(next)
  }

  return { toast, showToast }
}
