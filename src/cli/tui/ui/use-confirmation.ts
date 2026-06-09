import { useState } from "react"
import type { ConfirmationRequest } from "../types.js"

export function useConfirmation(setStatus: (status: string) => void) {
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null)

  function handleConfirmationKey(key: { name?: string; sequence?: string }) {
    if (!confirmation) return
    if (key.name === "escape") {
      cancelConfirmation()
      return
    }

    if (confirmation.requireText) {
      if (key.name === "backspace" || key.name === "delete") {
        setConfirmation({ ...confirmation, input: (confirmation.input ?? "").slice(0, -1) })
        return
      }
      if (key.name === "return" || key.name === "enter") {
        if ((confirmation.input ?? "") === confirmation.requireText) confirmCurrentAction()
        else setStatus(`Type ${confirmation.requireText} to confirm`)
        return
      }
      if (key.sequence && key.sequence.length === 1 && /^[ -~]$/.test(key.sequence)) {
        setConfirmation({ ...confirmation, input: `${confirmation.input ?? ""}${key.sequence}` })
      }
      return
    }

    if (key.name === "return" || key.name === "enter") confirmCurrentAction()
  }

  function confirmCurrentAction() {
    const current = confirmation
    if (!current) return
    setConfirmation(null)
    current.onConfirm()
  }

  function cancelConfirmation() {
    const current = confirmation
    setConfirmation(null)
    current?.onCancel?.()
    setStatus("Action cancelled")
  }

  return { confirmation, setConfirmation, handleConfirmationKey, cancelConfirmation }
}
