// Shared state shapes for the OpenTUI React app.
export type View = "home" | "archived"
export type ToastVariant = "info" | "success" | "warning" | "error"

export type ToastState = {
  message: string
  title?: string
  variant: ToastVariant
  duration: number
}

export type ToastInput = Omit<ToastState, "duration"> & { duration?: number }

export type HomeAction = {
  title: string
  eyebrow: string
  detail: string
  hotkey: string
  run: () => void
}

export type ChildResult = {
  code: number
  stdout: string
  stderr: string
}
