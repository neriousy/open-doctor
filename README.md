# open-doctor

Support toolkit for repairing and inspecting local OpenCode data.

<img width="1867" height="979" alt="image" src="https://github.com/user-attachments/assets/34643952-9575-4d38-855c-ba9313c06af5" />


This repository is a Bun/Turbo monorepo. The published CLI is `open-doctor`; the
internal packages keep database repair logic, terminal UI code, and release
packaging separated.

## Packages

- `packages/open-doctor`: runnable CLI package, command registry, Node bundle,
  npm package staging, and the `open-doctor` binary wrapper.
- `packages/core`: database path resolution, SQLite boundary, backups, repair
  flows, session utilities, schemas, and shared errors.
- `packages/tui`: OpenTUI React application, routes, state contexts, keyboard
  runtime, and reusable terminal UI primitives.

Architecture notes live in `guidelines/`. Start with
`guidelines/monorepo-migration.md` for the package split and
`guidelines/tui/README.md` before changing the TUI.

## Requirements

- Bun `1.3.14` for workspace development.
- Node `>=20.17.0` for non-interactive CLI commands.
- Node `26.x` with `--experimental-ffi` for the interactive OpenTUI menu. The
  CLI re-execs itself with that flag when opening the TUI.

## Install

Run the CLI without cloning the repository:

```sh
npx open-doctor --help
npx open-doctor repair no-such-column-name --dry-run
```

For local development:

```sh
bun install
bun run build
bun run start -- --help
```

`bun run start` runs `packages/open-doctor/dist/index.js`, so build first after
changing source files.

## Commands

Running `open-doctor` with no arguments opens the interactive TUI when stdin and
stdout are TTYs. In non-interactive shells, use explicit commands:

```sh
npx open-doctor tui
npx open-doctor repair no-such-column-name [db]
npx open-doctor repair-db [db]
npx open-doctor sessions archived [db]
npx open-doctor sessions unarchive <session-id> [db]
npx open-doctor db path [db]
```

Compatibility command forms are also registered:

```sh
npx open-doctor utils sessions archived [db]
npx open-doctor utils sessions unarchive <session-id> [db]
npx open-doctor utils db path [db]
```

### Repair

- `repair no-such-column-name [db]`: repairs OpenCode workspace rows after a
  skipped workspace name migration.
- `repair-db [db]`: alias for `repair no-such-column-name`.

Repair commands support:

```sh
--dry-run
--no-backup
```

By default, mutating commands create a SQLite backup first with `VACUUM INTO`.
Use `--no-backup` only if you already made a separate backup.

### Sessions

- `sessions archived [db]`: lists archived sessions.
- `sessions unarchive <session-id> [db]`: clears `session.time_archived` for one
  session.

`sessions unarchive` supports `--dry-run` and `--no-backup`.

### Database

- `db path [db]`: prints the resolved OpenCode database path.

## Database Resolution

If a `[db]` argument is supplied, it is resolved to an absolute path. `~` and
`~/...` are expanded.

Without `[db]`, the toolkit checks `OPENCODE_DB` first. Absolute values are used
as-is; relative values are resolved under the OpenCode data directory. The value
`:memory:` is rejected because it cannot be repaired safely.

If `OPENCODE_DB` is not set, the toolkit mirrors OpenCode core's data directory
resolution:

```txt
$XDG_DATA_HOME/opencode/opencode.db
~/.local/share/opencode/opencode.db
```

## Workspace Scripts

Run these from the repository root:

```sh
bun run build      # turbo build for all packages
bun run check      # turbo typecheck for all packages
bun run start      # run the built open-doctor CLI
bun run pack:cli   # stage and pack the open-doctor npm package
bun run doctor     # run react-doctor diagnostics
```

Package-specific scripts:

```sh
bun run --cwd packages/open-doctor build
bun run --cwd packages/open-doctor typecheck
bun run --cwd packages/open-doctor pack:npm
```

The CLI build bundles `packages/open-doctor/src/index.ts` for Node ESM and keeps
native/runtime packages such as `better-sqlite3` and `@opentui/core` external.
`pack:npm` stages a publishable package in
`packages/open-doctor/.release/open-doctor` and rewrites workspace/catalog
dependencies to concrete runtime dependencies.

## Development Notes

- Keep repair and utility behavior in `packages/core` when it can be tested
  without the CLI.
- Keep command registration, yargs options, build scripts, and publish staging in
  `packages/open-doctor`.
- Keep route state, keyboard handling, and UI components in `packages/tui`.
- Prefer Effect schemas and services at IO boundaries; current path parsing and
  command handlers follow that pattern.
- Non-interactive commands should avoid loading the TUI path until the user asks
  for `open-doctor tui`.
