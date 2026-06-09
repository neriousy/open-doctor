// Full-width archived sessions browser used by the utils section.
import type { ArchivedSession } from "../../utils/sessions.js"
import { archivedSummary, renderArchivedSessions } from "./format.js"

export function ArchivedSessionsView(props: {
  sessions: ArchivedSession[]
  selected: number
  loading: boolean
  pending: number
}) {
  return (
    <box id="archived" flexGrow={1} flexDirection="column" marginTop={1}>
      <box id="archived-summary" height={4} border borderColor="#263544" paddingLeft={2} paddingRight={2}>
        <text fg="#d6deeb" height={1}>
          Archived sessions
        </text>
        <text fg="#7893ad" height={1}>
          {archivedSummary(props.sessions.length, props.pending, props.loading)}
        </text>
      </box>

      <box id="archived-list" flexGrow={1} marginTop={1} border borderColor="#263544" padding={1}>
        <text fg="#d6deeb">{renderArchivedSessions(props.sessions, props.selected, props.loading)}</text>
      </box>
    </box>
  )
}
