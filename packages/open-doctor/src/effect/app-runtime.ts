import { Layer, ManagedRuntime } from "effect"
import { DatabaseLayer } from "@open-doctor/core/db/sqlite"
import { PathsLayer } from "@open-doctor/core/input"
import { BackupLayer } from "@open-doctor/core/utils/backups"
import { LogsLayer } from "@open-doctor/core/utils/logs"

export const AppLayer = Layer.mergeAll(DatabaseLayer, BackupLayer, LogsLayer, PathsLayer)

export const AppRuntime = ManagedRuntime.make(AppLayer)

export type AppServices = ManagedRuntime.ManagedRuntime.Services<typeof AppRuntime>
