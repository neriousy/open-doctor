// Safe repair inspection screen: no mutation happens until the user explicitly runs repair.
import type { ToolkitHealth } from "./health.js"
import { repairStatusDisplay } from "./repair-status.js"

export function RepairDetailView(props: {
  health: ToolkitHealth
  status: string
  showSql: boolean
}) {
  const repair = props.health.workspaceRepair
  const display = repairStatusDisplay(repair)
  const changes = repair.changes

  return (
    <box id="repair-detail" flexGrow={1} flexDirection="column" marginTop={1}>
      <box id="repair-summary" height={statusHeaderHeight(display.status)} border borderColor="#263544" padding={1}>
        <text fg="#d6deeb" height={1}>
          {display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "Workspace DB schema repair" : "Workspace DB schema"}
        </text>
        <text fg={display.color} height={1}>
          {`Status: ${display.status}`}
        </text>
        <StatusHeader status={display.status} description={display.description} error={repair.error} />
        <text fg="#7893ad" height={1}>
          {`Database: ${props.health.dbPath}`}
        </text>
        <text fg="#7893ad" height={1}>
          {display.status === "DETECTED" || display.status === "EXPERIMENTAL"
            ? "Safety: backup is required before applying repair"
            : "Safety: read-only check details until a repair is available"}
        </text>
      </box>

      <box id="repair-plan" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <box id="planned-changes" width="58%" border borderColor="#263544" padding={1}>
          <text fg="#d6deeb" height={1}>
            Planned changes
          </text>
          <PlannedChanges status={display.status} changes={changes.map((change) => change.label)} />
        </box>

        <box id="repair-report" flexGrow={1} border borderColor="#263544" padding={1}>
          <text fg="#d6deeb" height={1}>
            Report
          </text>
          <ReportPanel status={display.status} report={props.status} databasePath={props.health.dbPath} error={repair.error} />
          <text fg="#7893ad" height={1}>
            {`Backup: ${props.health.backupStatus}`}
          </text>
        </box>
      </box>

      {props.showSql ? (
        <box id="repair-sql" height={Math.min(8, Math.max(3, changes.length + 2))} marginTop={1} border borderColor="#263544" padding={1}>
          <text fg="#d6deeb" height={1}>
            SQL
          </text>
          <text fg="#9fb3c8" wrapMode="word">
            {changes.length === 0 ? "No SQL changes planned." : changes.map((change) => change.sql).join("\n")}
          </text>
        </box>
      ) : null}
    </box>
  )
}

function StatusHeader(props: { status: string; description: string; error: string | undefined }) {
  if (props.status === "OK") {
    return (
      <text fg="#9fb3c8" height={1}>
        No repair needed.
      </text>
    )
  }

  if (props.status === "DETECTED" || props.status === "EXPERIMENTAL") {
    return (
      <text fg="#9fb3c8" wrapMode="word">
        {props.description}
      </text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <text fg="#f07178" wrapMode="word">
        {props.error ?? props.description}
      </text>
    )
  }

  return (
    <text fg="#9fb3c8" wrapMode="word">
      {detailCopy(props.status)}
    </text>
  )
}

function PlannedChanges(props: { status: string; changes: string[] }) {
  if (props.status === "OK") {
    return (
      <text fg="#9fb3c8" wrapMode="word">
        No changes would be made.
      </text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <box flexDirection="column">
        <text fg="#f07178" height={1}>
          No repair plan is available.
        </text>
        <text fg="#7893ad" wrapMode="word">
          Review logs or export a report before attempting changes.
        </text>
      </box>
    )
  }

  if (props.status !== "DETECTED" && props.status !== "EXPERIMENTAL") {
    return (
      <text fg="#9fb3c8" wrapMode="word">
        Run the check before reviewing planned changes.
      </text>
    )
  }

  return (
    <box flexDirection="column">
      <text fg="#9fb3c8" height={1}>
        1. Create backup
      </text>
      <text fg="#9fb3c8" height={1}>
        2. Apply missing schema changes
      </text>
      <text fg="#9fb3c8" height={1}>
        3. Verify by re-running health scan
      </text>
      {props.changes.length > 0 ? (
        <text fg="#7893ad" wrapMode="word">
          {`Detected: ${props.changes.join("; ")}`}
        </text>
      ) : null}
    </box>
  )
}

function ReportPanel(props: { status: string; report: string; databasePath: string; error: string | undefined }) {
  if (props.status === "OK") {
    return (
      <box flexDirection="column">
        <text fg="#9fb3c8" height={1}>
          {props.report}
        </text>
        <text fg="#7893ad" wrapMode="word">
          {`Database: ${props.databasePath}`}
        </text>
      </box>
    )
  }

  if (props.status === "FAILED") {
    return (
      <box flexDirection="column">
        <text fg="#f07178" wrapMode="word">
          {props.error ?? props.report}
        </text>
        <text fg="#7893ad" wrapMode="word">
          Open logs or export a report before repairing.
        </text>
      </box>
    )
  }

  return (
    <text fg="#9fb3c8" wrapMode="word">
      {props.report}
    </text>
  )
}

function statusHeaderHeight(status: string) {
  if (status === "DETECTED" || status === "EXPERIMENTAL" || status === "FAILED") return 10
  return 8
}

function detailCopy(status: string) {
  if (status === "OK") return "The workspace table has the expected schema for the known migration issue."
  if (status === "DETECTED") return "A known migration issue was found in the workspace table and a repair is available."
  if (status === "WARN") return "The migration state looks suspicious and should be reviewed before changing the database."
  if (status === "CHECK") return "The workspace schema check has not completed yet."
  if (status === "FAILED") return "The workspace schema check could not complete. Review the failure before running any repair."
  return "This repair path is experimental and should be treated carefully."
}
