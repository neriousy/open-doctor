# State And Context

Use contexts as the default state-sharing primitive, matching upstream
`packages/tui`.

Domain contexts:

- `context/route.tsx`: current view and navigation actions.
- `context/health.tsx`: health snapshot, scan loading state, status text.
- `context/overview.tsx`: overview sidebar, selected action, focus/hover state.
- `context/sessions.tsx`: archived session list, search, selection, unarchive.
- `context/logs.tsx`: sources, entries, filters, search, selected pane.
- `context/backups.tsx`: backup list, selected row, create/verify/copy actions.
- `context/repair.tsx`: repair-specific display and mutation actions.
- `ui/dialog-confirm.tsx`: confirmation state and key handling.
- `ui/toast.tsx`: toast state and toast actions.

Rules:

- Do not introduce a state management library unless state must be shared
  outside the TUI tree or requires external-store semantics.
- Do not add a giant `ToolkitAppContext`.
- Avoid `controller` terminology. Use state/domain names.
- Context values should be cohesive and typed; consumers import only the hooks
  for domains they need.
- Keep refs inside state hooks when keyboard handlers need current values.
- View components should not receive selected indexes, hover indexes, active
  panes, and callbacks through route-sized prop bags.

Acceptable props:

- Generic UI primitive props, such as title, selected, focused, rows, and event
  handlers.
- Small leaf component props when the data is local to the same route file.
- Derived values passed to pure formatting/detail helpers.
