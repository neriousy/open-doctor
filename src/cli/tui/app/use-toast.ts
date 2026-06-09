import { useEffect, useRef, useState } from "react"
import type { ToastInput, ToastState } from "../types.js"

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(input: ToastInput) {
    const next = { ...input, duration: input.duration ?? 4000 }
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), next.duration)
    toastTimer.current.unref()
  }

  return { toast, showToast }
}
