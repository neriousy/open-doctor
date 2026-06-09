# State And Context

Use contexts as the default state-sharing primitive, matching upstream
`packages/tui`.

Domain contexts:

- `context/route.tsx`: `location`, `flags`, and navigation `actions`.
- `context/health.tsx`: `snapshot`, `status`, loading state, and refresh
  `actions`.
- `context/overview.tsx`: `section`, `action`, `pane`, and movement `actions`.
- `context/sessions.tsx`: `list`, `selection`, `search`, loading state, and
  unarchive `actions`.
- `context/logs.tsx`: `source`, `entry`, `pane`, `filter`, `search`, loading
  state, and log `actions`.
- `context/backups.tsx`: `backup`, loading state, and backup `actions`.
- `context/repair.tsx`: `sql` display state and repair `actions`.
- `ui/dialog-confirm.tsx`: current confirmation and dialog `actions`.
- `ui/toast.tsx`: current toast and toast `actions`.

Rules:

- Use React contexts for state shared inside the TUI tree.
- Shape context values as cohesive domain objects, such as `source`, `entry`,
  `filter`, `search`, and `actions`.
- Use state/domain names for hooks and files.
- Consumers import only the hooks for domains they need.
- Keep refs inside state hooks when keyboard handlers need current values.
- Keep hover and pointer-only affordances local to the component that renders
  the mouse target.
- Prefer `actions.<verb>()` for commands and named state objects for data.

Props:

- Generic UI primitives receive props such as title, selected, focused, rows, and event
  handlers.
- Small leaf components can receive props when the data is local to the same
  route file.
- Pure formatting/detail helpers can receive derived values.
