import { Effect, Layer } from "effect"
import { Database, DatabaseLayer } from "@open-doctor/core/db/sqlite"
import { Paths, PathsLayer } from "@open-doctor/core/input"
import { Backup, BackupLayer } from "@open-doctor/core/utils/backups"
import { Logs, LogsLayer } from "@open-doctor/core/utils/logs"

export const CoreLayer = Layer.mergeAll(DatabaseLayer, BackupLayer, LogsLayer, PathsLayer)

export type CoreServices = Database | Backup | Logs | Paths

export function runCorePromise<A, E>(effect: Effect.Effect<A, E, CoreServices>) {
  return Effect.runPromise(effect.pipe(Effect.provide(CoreLayer)))
}

export function runCoreSync<A, E>(effect: Effect.Effect<A, E, CoreServices>) {
  return Effect.runSync(effect.pipe(Effect.provide(CoreLayer)))
}
