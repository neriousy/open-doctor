# TUI Guideline

These rules mirror `../opencode/packages/tui/src`, which is the reusable TUI
package.

Core rules:

- Keep `app.tsx` to provider composition, runtime state, global keyboard
  priority, and shell routing.
- Split state by domain under `context/`.
- Shape complex context APIs as nested objects such as `source`, `entry`,
  `filter`, `search`, `location`, `status`, and `actions`.
- Route modules consume domain contexts directly.
- Keep props for generic UI primitives and small leaf components only.
- Put route-specific keyboard handling beside the route.
- Keep Effect at the runtime/domain boundary.

Current target shape:

```text
src/cli/tui/
  app.tsx
  runtime/
  context/
  routes/
  component/
  ui/
  util/
```

Before adding a new TUI feature, pick an owning domain first: route, health,
overview, sessions, logs, backups, repair, dialog, toast, or runtime.
