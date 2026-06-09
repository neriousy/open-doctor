// Safe repair inspection screen: no mutation happens until the user explicitly runs repair.
import { useHealth } from "../../context/health.js"
import { useRepair } from "../../context/repair.js"
import { Box, DetailsPanel, StatusBadge, Text } from "../../ui/primitives.js"
import { repairStatusDisplay } from "../../util/repair-status.js"

export function RepairDetailView() {
  const health = useHealth()
  const repairState = useRepair()
  const repair = health.snapshot.workspaceRepair
  const display = repairStatusDisplay(repair)
  const changes = repair.changes

  return (
    <Box id="repair-detail" flexGrow={1} flexDirection="column" marginTop={1}>
      <Box id="repair-summary" height={statusHeaderHeight(display.status)} border borderColor="#263544" padding={1}>
        <Text fg="#d6deeb" height={1}>
          {display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "Workspace DB schema repair" : "Workspace DB schema"}
        </Text>
        <StatusBadge status={display.status} />
        <StatusHeader status={display.status} description={display.description} error={repair.error} />
        <Text fg="#7893ad" height={1}>
          {`Database: ${health.snapshot.dbPath}`}
        </Text>
        <Text fg="#7893ad" height={1}>
          {display.status === "DETECTED" || display.status === "EXPERIMENTAL"
            ? "Safety: backup is required before applying repair"
            : "Safety: read-only check details until a repair is available"}
        </Text>
      </Box>

      <Box id="repair-plan" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
        <Box id="planned-changes" width="58%" border borderColor="#263544" padding={1}>
          <Text fg="#d6deeb" height={1}>
            Planned changes
          </Text>
          <PlannedChanges status={display.status} changes={changes.map((change) => change.label)} />
        </Box>

        <DetailsPanel
          title="Report"
          width={48}
          sections={[
            {
              title: "Status",
              rows: [
                ["Result", reportText(display.status, health.status.message, repair.error)],
                ["Backup", health.snapshot.backupStatus],
              ],
            },
            {
              title: "Target",
              rows: [
                ["Database", health.snapshot.dbPath],
                ["Safety", display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "backup before apply" : "read-only"],
              ],
            },
          ]}
        />
      </Box>

      {repairState.sql.visible ? (
        <Box id="repair-sql" height={Math.min(8, Math.max(3, changes.length + 2))} marginTop={1} border borderColor="#263544" padding={1}>
          <Text fg="#d6deeb" height={1}>
            SQL
          </Text>
          <Text fg="#9fb3c8" wrapMode="word">
            {changes.length === 0 ? "No SQL changes planned." : changes.map((change) => change.sql).join("\n")}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}

function StatusHeader(props: { status: string; description: string; error: string | undefined }) {
  if (props.status === "OK") {
    return (
      <Text fg="#9fb3c8" height={1}>
        No repair needed.
      </Text>
    )
  }

  if (props.status === "DETECTED" || props.status === "EXPERIMENTAL") {
    return (
      <Text fg="#9fb3c8" wrapMode="word">
        {props.description}
      </Text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <Text fg="#f07178" wrapMode="word">
        {props.error ?? props.description}
      </Text>
    )
  }

  return (
    <Text fg="#9fb3c8" wrapMode="word">
      {detailCopy(props.status)}
    </Text>
  )
}

function PlannedChanges(props: { status: string; changes: string[] }) {
  if (props.status === "OK") {
    return (
      <Text fg="#9fb3c8" wrapMode="word">
        No changes would be made.
      </Text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <Box flexDirection="column">
        <Text fg="#f07178" height={1}>
          No repair plan is available.
        </Text>
        <Text fg="#7893ad" wrapMode="word">
          Review logs or export a report before attempting changes.
        </Text>
      </Box>
    )
  }

  if (props.status !== "DETECTED" && props.status !== "EXPERIMENTAL") {
    return (
      <Text fg="#9fb3c8" wrapMode="word">
        Run the check before reviewing planned changes.
      </Text>
    )
  }

  return (
    <Box flexDirection="column">
      <Text fg="#9fb3c8" height={1}>
        1. Create backup
      </Text>
      <Text fg="#9fb3c8" height={1}>
        2. Apply missing schema changes
      </Text>
      <Text fg="#9fb3c8" height={1}>
        3. Verify by re-running health scan
      </Text>
      {props.changes.length > 0 ? (
        <Text fg="#7893ad" wrapMode="word">
          {`Detected: ${props.changes.join("; ")}`}
        </Text>
      ) : null}
    </Box>
  )
}

function statusHeaderHeight(status: string) {
  if (status === "DETECTED" || status === "EXPERIMENTAL" || status === "FAILED") return 10
  return 8
}

function reportText(status: string, report: string, error: string | undefined) {
  if (status === "FAILED") return error ?? report
  return report
}

function detailCopy(status: string) {
  if (status === "OK") return "The workspace table has the expected schema for the known migration issue."
  if (status === "DETECTED") return "A known migration issue was found in the workspace table and a repair is available."
  if (status === "WARN") return "The migration state looks suspicious and should be reviewed before changing the database."
  if (status === "CHECK") return "The workspace schema check has not completed yet."
  if (status === "FAILED") return "The workspace schema check could not complete. Review the failure before running any repair."
  return "This repair path is experimental and should be treated carefully."
}
