// Reusable confirmation overlay for local OpenCode data mutations.
import type { ConfirmationRequest } from "./types.js"
import { ConfirmModal } from "./primitives.js"

export function ConfirmationModal(props: { confirmation: ConfirmationRequest }) {
  const confirmation = props.confirmation
  const inputProps = {
    ...(confirmation.requireText ? { requireText: confirmation.requireText } : {}),
    ...(confirmation.input !== undefined ? { input: confirmation.input } : {}),
  }
  return (
    <ConfirmModal
      title={confirmation.title}
      body={confirmation.body}
      warning={confirmation.warning}
      targetPath={confirmation.targetPath}
      backupStatus={confirmation.backupStatus}
      plannedChangesCount={confirmation.plannedChangesCount}
      {...inputProps}
    />
  )
}
