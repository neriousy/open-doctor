# open-doctor

Support toolkit for local OpenCode data.

## Usage

```sh
npx open-doctor
npx open-doctor repair-db
npx open-doctor repair no-such-column-name
npx open-doctor sessions archived
npx open-doctor sessions unarchive <session-id>
npx open-doctor utils sessions archived
npx open-doctor utils sessions unarchive <session-id>
```

For local development:

```sh
npm install
npm run build
node dist/index.js --help
```

By default the toolkit targets the same database path as OpenCode core's `Global.Path.data` database resolver:

```txt
$XDG_DATA_HOME/opencode/opencode.db
~/.local/share/opencode/opencode.db
```

OpenCode currently gets that data directory from `xdg-basedir@5.1.0`, so the `~/.local/share` fallback is used when `XDG_DATA_HOME` is not set. If `OPENCODE_DB` is set, that path is used instead. You can also pass a database path directly:

```sh
npx open-doctor repair no-such-column-name ~/.local/share/opencode/opencode.db
npx open-doctor utils sessions unarchive ses_... ~/.local/share/opencode/opencode.db
```

## Commands

Running `open-doctor` without arguments opens an OpenTUI menu grouped into Repair and Utils sections.
The interactive menu uses OpenTUI's native renderer. Under Node it requires Node 26.x with `--experimental-ffi`; the toolkit re-execs itself with that flag when opening the menu. Non-interactive commands use the package engine listed in `package.json`.

### Repair

- `repair no-such-column-name [db]`: repairs the known workspace migration wedge behind `Error: no such column: name`.
- `repair-db [db]`: shorter command for the same repair.

### Utils

- `utils sessions archived [db]`: lists archived sessions.
- `utils sessions unarchive <session-id> [db]`: clears `session.time_archived` for one session.
- `utils db path [db]`: prints the resolved database path.

Shorter command forms:

- `sessions archived [db]`
- `sessions unarchive <session-id> [db]`
- `db path [db]`

Every mutating command creates a SQLite backup first using `VACUUM INTO`. Use `--no-backup` only if you already made a separate backup.
