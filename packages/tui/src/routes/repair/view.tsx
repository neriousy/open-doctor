// Safe repair inspection screen: no mutation happens until the user explicitly runs repair.
import { useHealth } from "../../context/health.js"
import { useOverview } from "../../context/overview.js"
import { useRepair } from "../../context/repair.js"
import { Box, DetailsPanel, StatusBadge, Text } from "../../ui/primitives.js"
import { useResponsiveLayout } from "../../ui/layout.js"
import { repairStatusDisplay } from "../../util/repair-status.js"
import { WorkspaceSidebar } from "../../ui/workspace-sidebar.js"
import { TUI } from "../../ui/primitives-model.js"

export function RepairDetailView() {
  const health = useHealth()
  const overview = useOverview()
  const layout = useResponsiveLayout()
  const repairState = useRepair()
  const repair = health.snapshot.workspaceRepair
  const display = repairStatusDisplay(repair)
  const changes = repair.changes

  return (
    <Box id="repair-detail" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
      <WorkspaceSidebar selected="Repairs" focused={overview.pane.focused === "sidebar"} />
      <Box flexGrow={1} flexDirection="column">
        <Box id="repair-summary" height={statusHeaderHeight(display.status)} border borderColor="#27272A" padding={1} backgroundColor="#111113">
          <Text fg="#EDEDED" height={1}>
            {display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "Workspace DB schema repair" : "Workspace DB schema"}
          </Text>
          <StatusBadge status={display.status} />
          <StatusHeader status={display.status} description={display.description} error={repair.error} />
          <Text fg="#6F6F76" height={1}>
            {`Database: ${health.snapshot.dbPath}`}
          </Text>
          <Text fg={display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "#F5B84B" : "#67C96F"} height={1}>
            {display.status === "DETECTED" || display.status === "EXPERIMENTAL"
              ? "Applying this repair modifies the SQLite database. A backup will be created first. Confirmation required."
              : "No files will be modified."}
          </Text>
        </Box>

        <Box id="repair-plan" flexGrow={1} flexDirection="row" marginTop={1} columnGap={1}>
          <Box id="planned-changes" width={layout.showDetailPanel ? "58%" : "100%"} border borderColor="#27272A" padding={1} backgroundColor="#111113">
            <Text fg="#EDEDED" height={1}>
            Planned changes
            </Text>
            <PlannedChanges status={display.status} changes={changes.map((change) => change.label)} />
          </Box>

          {layout.showDetailPanel ? (
            <DetailsPanel
              title="Data detail"
              width={48}
              sections={[
                {
                  title: "Why it matters",
                  rows: [["Summary", reportText(display.status, health.status.message, repair.error)]],
                },
                {
                  title: "Safety",
                  rows: [
                    ["Source", health.snapshot.dbPath],
                    ["Next step", display.status === "DETECTED" || display.status === "EXPERIMENTAL" ? "Dry run, show SQL, then Apply repair..." : "Review details"],
                  ],
                },
              ]}
            />
          ) : null}
        </Box>

        {repairState.sql.visible ? (
          <Box id="repair-sql" height={Math.min(8, Math.max(3, changes.length + 2))} marginTop={1} border borderColor="#27272A" padding={1} backgroundColor="#111113">
            <Text fg="#EDEDED" height={1}>
              SQL
            </Text>
            <Text fg="#A1A1AA" wrapMode="word">
              {changes.length === 0 ? "No SQL changes planned." : changes.map((change) => change.sql).join("\n")}
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

function StatusHeader(props: { status: string; description: string; error: string | undefined }) {
  if (props.status === "OK") {
    return (
      <Text fg={TUI.muted} height={1}>
        No repair needed.
      </Text>
    )
  }

  if (props.status === "DETECTED" || props.status === "EXPERIMENTAL") {
    return (
      <Text fg={TUI.muted} wrapMode="word">
        {props.description}
      </Text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <Text fg={TUI.red} wrapMode="word">
        {props.error ?? props.description}
      </Text>
    )
  }

  return (
    <Text fg={TUI.muted} wrapMode="word">
      {detailCopy(props.status)}
    </Text>
  )
}

function PlannedChanges(props: { status: string; changes: string[] }) {
  if (props.status === "OK") {
    return (
      <Text fg={TUI.muted} wrapMode="word">
        No changes would be made.
      </Text>
    )
  }

  if (props.status === "FAILED") {
    return (
      <Box flexDirection="column">
        <Text fg={TUI.red} height={1}>
          No repair plan is available.
        </Text>
        <Text fg={TUI.dim} wrapMode="word">
          Review logs or export a report before attempting changes.
        </Text>
      </Box>
    )
  }

  if (props.status !== "DETECTED" && props.status !== "EXPERIMENTAL") {
    return (
      <Text fg={TUI.muted} wrapMode="word">
        Run the check before reviewing planned changes.
      </Text>
    )
  }

  return (
    <Box flexDirection="column">
      <Text fg={TUI.muted} height={1}>
        1. Create backup
      </Text>
      <Text fg={TUI.muted} height={1}>
        2. Apply missing schema changes
      </Text>
      <Text fg={TUI.muted} height={1}>
        3. Verify by re-running health scan
      </Text>
      {props.changes.length > 0 ? (
        <Text fg={TUI.dim} wrapMode="word">
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
