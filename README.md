# opencode-toolkit

Support toolkit for local OpenCode data.

## Usage

```sh
npx opencode-toolkit
npx opencode-toolkit repair-db
npx opencode-toolkit sessions archived
npx opencode-toolkit sessions unarchive <session-id>
```

For local development:

```sh
npm install
npm run build
node dist/index.js --help
```

By default the toolkit targets the same database path as the stable OpenCode desktop app:

```txt
$XDG_DATA_HOME/opencode/opencode.db
```

If `OPENCODE_DB` is set, that path is used instead. You can also pass a database path directly:

```sh
npx opencode-toolkit repair-db ~/.local/share/opencode/opencode.db
npx opencode-toolkit sessions unarchive ses_... ~/.local/share/opencode/opencode.db
```

## Commands

- `repair-db [db]`: repairs the known workspace migration wedge behind `Error: no such column: name`.
- `sessions archived [db]`: lists archived sessions.
- `sessions unarchive <session-id> [db]`: clears `session.time_archived` for one session.
- `db path`: prints the resolved database path.

Every mutating command creates a SQLite backup first using `VACUUM INTO`. Use `--no-backup` only if you already made a separate backup.
