// Shared user-facing error helpers for CLI, TUI, and database flows.
import { Effect, Schema } from "effect"

export class ToolkitError extends Schema.TaggedErrorClass<ToolkitError>()("ToolkitError", {
  message: Schema.String,
}) {}

export const fail = (message: string) => Effect.fail(new ToolkitError({ message }))

export function formatError(error: unknown) {
  if (error instanceof ToolkitError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}
