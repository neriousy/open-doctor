# Open Doctor Monorepo Migration Guide

This guide is the first migration artifact for moving Open Doctor from a single package into an OpenCode-style monorepo. It is based on the current Open Doctor tree and the current sibling checkout at `../opencode`.

The goal is not to copy OpenCode wholesale. The goal is to adopt the parts that matter for Open Doctor:

- root workspace orchestration with `packages/*`
- a runnable CLI package that owns `bin`, command registration, and release artifacts
- shared packages for core data/repair logic and the TUI surface
- Effect services/layers for IO boundaries
- lazy TUI loading so non-interactive repair commands stay cheap and old-Node compatible

## Source References

Open Doctor current files:

- `package.json`: single package, `bin.open-doctor`, build/start/check scripts
- `src/index.ts`: executable entrypoint with top-level Effect runner
- `src/cli/main.ts`: hand-written command dispatcher
- `src/cli/tui.tsx`: TUI runtime entry loaded dynamically by `src/cli/main.ts`
- `src/db/sqlite.ts`: SQLite boundary for repair utilities
- `src/repairs/no-such-column-name.ts`: repair domain logic
- `src/utils/*`: utility command logic
- `src/cli/tui/**`: OpenTUI React app

OpenCode patterns to mirror:

- `../opencode/package.json`: root workspace catalog and top-level scripts
- `../opencode/turbo.json`: task orchestration and build outputs
- `../opencode/packages/opencode/package.json`: runnable CLI package
- `../opencode/packages/opencode/bin/opencode`: npm package shim that resolves a platform binary
- `../opencode/packages/opencode/script/build.ts`: release build using `Bun.build`, OpenTUI plugin, native targets, and worker entrypoints
- `../opencode/packages/opencode/script/build-node.ts`: node-target bundle precedent
- `../opencode/packages/opencode/src/index.ts`: yargs command registry and top-level error handling
- `../opencode/packages/opencode/src/cli/effect-cmd.ts`: Effect-native command adapter
- `../opencode/packages/opencode/src/cli/cmd/db.ts`: small Effect CLI tool example
- `../opencode/packages/opencode/src/cli/cmd/serve.ts`: long-running Effect command example
- `../opencode/packages/opencode/src/cli/cmd/tui.ts`: TUI command loader, worker transport, and dynamic imports
- `../opencode/packages/opencode/src/cli/tui/worker.ts`: worker-side server/RPC bridge for TUI
- `../opencode/packages/opencode/src/cli/tui/layer.ts`: thin TUI layer provider
- `../opencode/packages/opencode/src/effect/app-runtime.ts`: shared managed runtime assembled from layers
- `../opencode/packages/opencode/src/config/config.ts`: Effect service/layer and schema-driven config loading

## Target Layout

Start with a small monorepo. Do not create packages until they have a clear ownership boundary.

```txt
open-doctor/
  package.json
  turbo.json
  tsconfig.json
  packages/
    open-doctor/
      package.json
      bin/open-doctor
      script/build.ts
      src/index.ts
      src/cli/
        cmd/cmd.ts
        effect-cmd.ts
        cmd/repair.ts
        cmd/sessions.ts
        cmd/db.ts
        cmd/tui.ts
      src/effect/
        app-runtime.ts
      src/tui/
        index.tsx
        layer.ts
    core/
      package.json
      src/db/
      src/repairs/
      src/utils/
      src/error.ts
    tui/
      package.json
      src/app.tsx
      src/context/
      src/routes/
      src/ui/
```

Suggested package ownership:

- `packages/core`: pure-ish data, DB, repair, backup, session utilities, schemas, domain errors
- `packages/tui`: reusable OpenTUI React UI and state controllers
- `packages/open-doctor`: CLI command registration, runtime assembly, package build, executable wrapper

Keep the public npm package name as `open-doctor`. Internal workspace packages can use scoped names:

```json
{
  "name": "@open-doctor/core",
  "type": "module",
  "exports": {
    "./*": "./src/*.ts"
  }
}
```

## Root Workspace

OpenCode uses a root `package.json` for orchestration and catalog versions. Open Doctor can start smaller.

```json
{
  "name": "open-doctor-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.3.14",
  "scripts": {
    "dev": "bun run --cwd packages/open-doctor src/index.ts",
    "build": "bun turbo build",
    "check": "bun turbo typecheck",
    "test": "bun turbo test"
  },
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "@opentui/core": "0.4.0",
      "@opentui/react": "0.4.0",
      "@types/node": "24.12.2",
      "effect": "4.0.0-beta.74",
      "typescript": "5.8.2"
    }
  },
  "devDependencies": {
    "turbo": "2.8.13",
    "typescript": "catalog:"
  }
}
```

If the repo stays npm-first, the same package layout still works with npm workspaces, but it will not match OpenCode's catalog syntax exactly. The OpenCode-style migration should prefer Bun for workspace management and keep the published CLI runtime compatible with Node.

`turbo.json` can start close to OpenCode's minimal task graph:

```json
{
  "$schema": "https://v2-8-13.turborepo.dev/schema.json",
  "globalEnv": ["CI"],
  "globalPassThroughEnv": ["CI"],
  "tasks": {
    "typecheck": {},
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

## Runnable CLI Package

`packages/open-doctor/package.json` owns the npm binary, scripts, and release dependencies. Keep build-only dependencies out of runtime dependencies so `npx open-doctor@latest repair ...` stays old-Node friendly.

```json
{
  "name": "open-doctor",
  "version": "0.0.1",
  "type": "module",
  "private": false,
  "bin": {
    "open-doctor": "./bin/open-doctor"
  },
  "files": ["bin", "dist", "README.md"],
  "scripts": {
    "build": "bun run script/build.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@open-doctor/core": "workspace:*",
    "@opentui/core": "catalog:",
    "better-sqlite3": "^12.10.0"
  },
  "devDependencies": {
    "@open-doctor/tui": "workspace:*",
    "@opentui/react": "catalog:",
    "effect": "catalog:",
    "typescript": "catalog:"
  },
  "engines": {
    "node": ">=20.17.0"
  }
}
```

OpenCode's published `bin/opencode` is a shim that resolves platform-native packages. Open Doctor probably does not need platform binary packages yet. Use a smaller shim that forwards signals and runs the built Node entry:

```js
#!/usr/bin/env node

const childProcess = require("child_process")
const path = require("path")

const target = path.join(__dirname, "..", "dist", "index.js")
const child = childProcess.spawn(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal))
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(typeof code === "number" ? code : 0)
})
```

If Open Doctor later ships native compiled binaries, replace this with OpenCode's platform-resolution model.

## Build Strategy

OpenCode's release build compiles the CLI and TUI together with `Bun.build`, explicit entrypoints, OpenTUI plugin support, and worker paths. Open Doctor can use a simpler package build:

```ts
#!/usr/bin/env bun

import { $ } from "bun"

await $`rm -rf dist`

await Bun.build({
  target: "node",
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  splitting: true,
  sourcemap: "none",
  external: ["better-sqlite3", "@opentui/core"],
  define: {
    OPEN_DOCTOR_CHANNEL: JSON.stringify(process.env.OPEN_DOCTOR_CHANNEL ?? "dev"),
  },
})

await $`chmod +x dist/index.js`
```

Important build rules:

- keep `better-sqlite3` external so the user's install gets the right native ABI
- keep `@opentui/core` external unless the native package is intentionally embedded
- bundle `effect`, `@opentui/react`, React, and app code so old Node users do not install build-only dependency trees for repair commands
- keep TUI imports behind dynamic command paths so `repair no-such-column-name` does not load OpenTUI

## CLI Command Registration

OpenCode uses `yargs` in `src/index.ts` and registers command modules. Replace `src/cli/main.ts`'s manual dispatcher with command modules.

```ts
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RepairCommand } from "./cli/cmd/repair"
import { SessionsCommand } from "./cli/cmd/sessions"
import { DbCommand } from "./cli/cmd/db"
import { TuiCommand } from "./cli/cmd/tui"
import { formatError } from "@open-doctor/core/error"

const args = hideBin(process.argv)

const cli = yargs(args)
  .scriptName("open-doctor")
  .help("help", "show help")
  .alias("help", "h")
  .command(TuiCommand)
  .command(RepairCommand)
  .command(SessionsCommand)
  .command(DbCommand)
  .demandCommand(0)
  .strict()

try {
  if (args.length === 0) {
    await cli.parse(["tui"])
  } else {
    await cli.parse()
  }
} catch (error) {
  console.error(formatError(error))
  process.exitCode = 1
}
```

Use a tiny `cmd()` wrapper like OpenCode so command modules have one local type boundary:

```ts
import type { CommandModule } from "yargs"

export type WithDoubleDash<T> = T & { "--"?: string[] }

export function cmd<T, U>(input: CommandModule<T, WithDoubleDash<U>>) {
  return input
}
```

## Effect Command Adapter

OpenCode's `effectCmd` wraps yargs handlers and runs them inside an app runtime. Open Doctor should use the same shape, but with fewer services.

```ts
import type { Argv } from "yargs"
import { Effect, Schema } from "effect"
import { cmd, type WithDoubleDash } from "./cmd"
import type { AppServices } from "../effect/app-runtime"

export class CliError extends Schema.TaggedErrorClass<CliError>()("CliError", {
  message: Schema.String,
  exitCode: Schema.optional(Schema.Number),
}) {}

export const fail = (message: string, exitCode = 1) =>
  Effect.fail(new CliError({ message, exitCode }))

interface EffectCmdOptions<Args, A> {
  command: string | readonly string[]
  describe: string | false
  builder?: (yargs: Argv) => Argv<Args>
  handler: (args: WithDoubleDash<Args>) => Effect.Effect<A, CliError, AppServices>
}

export const effectCmd = <Args, A>(opts: EffectCmdOptions<Args, A>) =>
  cmd<{}, Args>({
    command: opts.command,
    describe: opts.describe,
    builder: opts.builder as never,
    async handler(rawArgs) {
      const { AppRuntime } = await import("../effect/app-runtime")
      await AppRuntime.runPromise(opts.handler(rawArgs as WithDoubleDash<Args>))
    },
  })
```

Then command modules become small and testable:

```ts
import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { repairNoSuchColumnName } from "@open-doctor/core/repairs/no-such-column-name"
import { DbInput } from "@open-doctor/core/input"

export const RepairNoSuchColumnNameCommand = effectCmd({
  command: "no-such-column-name [db]",
  describe: "repair the workspace schema problem behind Error: no such column: name",
  builder: (yargs) =>
    yargs
      .positional("db", { type: "string" })
      .option("dry-run", { type: "boolean", default: false })
      .option("no-backup", { type: "boolean", default: false }),
  handler: Effect.fn("Cli.repair.noSuchColumnName")(function* (args) {
    const input = yield* DbInput.fromArgs(args)
    const result = yield* repairNoSuchColumnName(input)
    console.log(result.summary)
  }),
})
```

## App Runtime And Services

OpenCode assembles services in `AppLayer` and exposes `AppRuntime`. Open Doctor should do the same for filesystem, DB, backup, logs, and config/path services.

```ts
import { Layer, ManagedRuntime } from "effect"
import { Database } from "@open-doctor/core/db/database"
import { Backup } from "@open-doctor/core/backup"
import { DoctorConfig } from "@open-doctor/core/config"

export const AppLayer = Layer.mergeAll(
  Database.defaultLayer,
  Backup.defaultLayer,
  DoctorConfig.defaultLayer,
)

const runtime = ManagedRuntime.make(AppLayer)

export type AppServices = ManagedRuntime.ManagedRuntime.Services<typeof runtime>

export const AppRuntime = {
  runPromise: runtime.runPromise.bind(runtime),
  runSync: runtime.runSync.bind(runtime),
  dispose: () => runtime.dispose(),
}
```

Service modules should follow the OpenCode style:

```ts
import { Context, Effect, Layer, Schema } from "effect"

export class DatabaseOpenError extends Schema.TaggedErrorClass<DatabaseOpenError>()("DatabaseOpenError", {
  message: Schema.String,
}) {}

export interface Interface {
  readonly inspect: (filename: string) => Effect.Effect<DatabaseState, DatabaseOpenError>
  readonly backup: (filename: string) => Effect.Effect<string, DatabaseOpenError>
}

export class Service extends Context.Service<Service, Interface>()("@open-doctor/Database") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const inspect = Effect.fn("Database.inspect")(function* (filename: string) {
      // open sqlite, inspect schema, close in acquire/release
    })

    const backup = Effect.fn("Database.backup")(function* (filename: string) {
      // VACUUM INTO backup path
    })

    return Service.of({ inspect, backup })
  }),
)

export const defaultLayer = layer
```

Use `Schema.TaggedErrorClass` for typed failures and `Schema.decodeUnknownEffect` / `Schema.decodeUnknownOption` for parsed data. Avoid manual record probing at command boundaries unless there is no schemaable shape.

## Config And Input Parsing

Move `src/cli/input.ts` into `packages/core/src/input.ts` and model it as schema-first parsing.

```ts
import { Effect, Schema } from "effect"

export const RepairOptions = Schema.Struct({
  dryRun: Schema.Boolean,
  backup: Schema.Boolean,
})

export const DbInput = Schema.Struct({
  db: Schema.String,
  options: RepairOptions,
})

export namespace DbInput {
  export const fromArgs = (args: { db?: string; dryRun?: boolean; noBackup?: boolean }) =>
    Effect.gen(function* () {
      return yield* Schema.decodeUnknownEffect(DbInput)({
        db: resolveDbArg(args.db),
        options: {
          dryRun: args.dryRun ?? false,
          backup: args.noBackup !== true,
        },
      })
    })
}
```

Use the same schema style for JSON config:

```ts
const ConfigFile = Schema.Struct({
  database: Schema.optional(Schema.String),
  safeMode: Schema.optional(Schema.Boolean),
})

const decodeConfigText = (text: string) =>
  Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(text)
    return yield* Schema.decodeUnknownEffect(ConfigFile)(parsed)
  })
```

For JSONC, keep a parser boundary like OpenCode's `ConfigParse.jsonc(...)`, then decode the parsed object with Effect Schema.

## TUI Loading

Do not import TUI code from `src/index.ts`. OpenCode's `TuiThreadCommand` dynamically imports TUI config/layer/runtime after command validation and creates a worker transport. Open Doctor can start with a lighter version, while keeping the same lazy-loading rule.

```ts
import { effectCmd } from "../effect-cmd"
import { Effect } from "effect"

export const TuiCommand = effectCmd({
  command: "tui",
  describe: "start Open Doctor TUI",
  handler: Effect.fn("Cli.tui")(function* () {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.log("open-doctor tui requires a TTY")
      return
    }

    const { run } = yield* Effect.promise(() => import("../../tui/layer"))
    yield* run({
      dbPath: process.env.OPENCODE_DB,
    })
  }),
})
```

`packages/open-doctor/src/tui/layer.ts` should be the CLI-facing adapter:

```ts
import { Effect } from "effect"
import { runTui } from "@open-doctor/tui"
import { AppLayer } from "../effect/app-runtime"

export function run(input: { dbPath?: string }) {
  return runTui(input).pipe(Effect.provide(AppLayer))
}
```

`packages/tui/src/index.tsx` owns OpenTUI renderer setup:

```tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Effect } from "effect"
import { ToolkitApp } from "./app"

export function runTui(input: { dbPath?: string }) {
  return Effect.acquireUseRelease(
    Effect.promise(() =>
      createCliRenderer({
        exitOnCtrlC: false,
        targetFps: 30,
        backgroundColor: "#080808",
      }),
    ),
    (renderer) =>
      Effect.promise(async () => {
        const root = createRoot(renderer)
        root.render(<ToolkitApp initialDbPath={input.dbPath} />)
        await new Promise<void>((resolve) => renderer.once("destroy", resolve))
      }),
    (renderer) => Effect.sync(() => renderer.destroy()),
  )
}
```

If Open Doctor needs an internal server or expensive DB watcher later, copy OpenCode's worker pattern:

- CLI command creates `new Worker(file)`
- worker exposes RPC methods for `fetch`, `reload`, `shutdown`, `snapshot`
- TUI talks to the worker through a local transport
- shutdown always terminates the worker in `finally`

For now, direct TUI + services is simpler and enough.

## Repair Package Boundaries

`no-such-column-name` should live in core and not depend on yargs, React, or OpenTUI:

```ts
import { Effect } from "effect"
import { Database } from "../db/database"

export const repairNoSuchColumnName = Effect.fn("Repair.noSuchColumnName")(function* (input: DbInput) {
  const db = yield* Database.Service
  const state = yield* db.inspect(input.db)
  const changes = plannedWorkspaceRepairs(state)
  if (changes.length === 0) return { changed: false, changes }
  if (input.options.dryRun) return { changed: true, dryRun: true, changes }
  const backup = input.options.backup ? yield* db.backup(input.db) : undefined
  yield* db.transaction(input.db, changes)
  return { changed: true, backup, changes }
})
```

The CLI command prints. The TUI renders. The core repair returns data.

## Migration Steps

1. Add root workspace metadata:
   - root `package.json`
   - `turbo.json`
   - root `tsconfig.json`

2. Create packages:
   - `packages/core`
   - `packages/tui`
   - `packages/open-doctor`

3. Move pure/domain files first:
   - `src/db/**` -> `packages/core/src/db/**`
   - `src/repairs/**` -> `packages/core/src/repairs/**`
   - `src/utils/**` -> `packages/core/src/utils/**`
   - `src/error.ts` -> `packages/core/src/error.ts`
   - `src/cli/input.ts` -> `packages/core/src/input.ts`

4. Move TUI files:
   - `src/cli/tui/app.tsx` -> `packages/tui/src/app.tsx`
   - `src/cli/tui/context/**` -> `packages/tui/src/context/**`
   - `src/cli/tui/routes/**` -> `packages/tui/src/routes/**`
   - `src/cli/tui/ui/**` -> `packages/tui/src/ui/**`
   - `src/cli/tui/runtime/**` -> `packages/tui/src/runtime/**`

5. Rebuild CLI package:
   - `packages/open-doctor/src/index.ts`
   - `packages/open-doctor/src/cli/cmd/**`
   - `packages/open-doctor/src/effect/app-runtime.ts`
   - `packages/open-doctor/src/tui/layer.ts`
   - `packages/open-doctor/bin/open-doctor`
   - `packages/open-doctor/script/build.ts`

6. Convert command dispatch:
   - replace manual `if (args[0] === ...)` routing with yargs command modules
   - wrap command handlers with `effectCmd`
   - keep default no-args behavior as `tui` only when TTY is present
   - print help for non-TTY no-args invocation

7. Convert IO boundaries to services:
   - SQLite open/backup/transaction
   - filesystem backup listing
   - log discovery
   - config/path resolution

8. Verify:
   - `bun turbo typecheck`
   - `bun run --cwd packages/open-doctor build`
   - packed install under Node 20
   - `open-doctor repair no-such-column-name <fixture> --no-backup`
   - `open-doctor` in a PTY starts TUI

## Non-Goals For The First Migration

- Do not create platform-native binary packages yet.
- Do not add a worker/server bridge unless the TUI needs it.
- Do not move unrelated UI redesign work during the package split.
- Do not keep command logic in React/TUI files.
- Do not make core depend on `@opentui/*`.

## Acceptance Checklist

- Root has `workspaces.packages` and `turbo.json`.
- `packages/open-doctor` is the only package with `bin.open-doctor`.
- `packages/core` has no React/OpenTUI/yargs imports.
- `packages/tui` has no direct SQLite driver imports.
- `src/index.ts` equivalent registers yargs commands and does not import TUI modules statically.
- TUI command uses dynamic import and remains unreachable for `repair no-such-column-name`.
- Repair command runs under Node 20 from a packed install.
- TUI starts from the package build in a real TTY.
- Effect services use `Context.Service`, `Layer.effect`, `Effect.fn`, and schema-tagged errors for recoverable domain failures.
