// Repair registry used by CLI/TUI help and future repair grouping.
import { repairNoSuchColumnName } from "./no-such-column-name.js"

export const REPAIRS = [
  {
    id: "no-such-column-name",
    section: "Repair",
    label: "Error: no such column: name",
    command: "repair no-such-column-name",
    run: repairNoSuchColumnName,
  },
]
