import { parseDbAndOptions } from "@open-doctor/core/input"

type OptionArgs = {
  db?: string
  dryRun?: boolean
  backup?: boolean
  noBackup?: boolean
}

export function inputFromArgs(args: OptionArgs) {
  const raw: string[] = []
  if (typeof args.db === "string") raw.push(args.db)
  if (args.dryRun) raw.push("--dry-run")
  if (args.noBackup || args.backup === false) raw.push("--no-backup")
  return parseDbAndOptions(raw)
}

export function stringArg(value: unknown, name: string) {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`Missing ${name}`)
}
