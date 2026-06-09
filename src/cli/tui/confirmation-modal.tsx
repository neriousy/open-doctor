// Reusable confirmation overlay for local OpenCode data mutations.
import type { ConfirmationRequest } from "./types.js"

export function ConfirmationModal(props: { confirmation: ConfirmationRequest }) {
  const confirmation = props.confirmation
  const typed = confirmation.requireText

  return (
    <box
      id="confirmation-modal"
      position="absolute"
      top="25%"
      left="25%"
      width="50%"
      border
      borderColor="#ecc48d"
      padding={1}
      backgroundColor="#101820"
      flexDirection="column"
    >
      <text fg="#ecc48d" height={1}>
        {confirmation.title}
      </text>
      <text fg="#d6deeb" wrapMode="word">
        {confirmation.body}
      </text>
      <box marginTop={1} flexDirection="column">
        <text fg="#9fb3c8" height={1}>
          {`Target database: ${shortenPath(confirmation.targetPath, 58)}`}
        </text>
        <text fg="#9fb3c8" height={1}>
          {`Backup status: ${confirmation.backupStatus}`}
        </text>
        <text fg="#9fb3c8" height={1}>
          {`Planned changes: ${confirmation.plannedChangesCount}`}
        </text>
        <text fg="#f07178" wrapMode="word">
          {confirmation.warning}
        </text>
      </box>
      {typed ? (
        <box marginTop={1} flexDirection="column">
          <text fg="#d6deeb" height={1}>
            {`Type ${typed} to continue`}
          </text>
          <text fg={confirmation.input === typed ? "#c3e88d" : "#9fb3c8"} height={1}>
            {`> ${confirmation.input ?? ""}`}
          </text>
        </box>
      ) : null}
      <text fg="#7893ad" height={1}>
        {typed ? "Enter confirm when typed - Esc cancel" : "Enter confirm - Esc cancel"}
      </text>
    </box>
  )
}

function shortenPath(value: string, width: number) {
  if (value.length <= width) return value
  const parts = value.split("/").filter(Boolean)
  if (parts.length <= 3) return middleEllipsis(value, width)

  const prefix = value.startsWith("/") ? `/${parts[0]}` : parts[0] ?? ""
  const tail = parts.slice(-2).join("/")
  const candidate = `${prefix}/.../${tail}`
  if (candidate.length <= width) return candidate

  const last = parts.at(-1)
  if (last) {
    const next = `${prefix}/.../${last}`
    if (next.length <= width) return next
  }
  return middleEllipsis(value, width)
}

function middleEllipsis(value: string, width: number) {
  if (width <= 5) return value.slice(0, width)
  const left = Math.ceil((width - 3) / 2)
  const right = Math.floor((width - 3) / 2)
  return `${value.slice(0, left)}...${value.slice(value.length - right)}`
}
