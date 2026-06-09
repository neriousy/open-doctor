# TUI Guideline

These rules mirror `../opencode/packages/tui/src`, which is the reusable TUI
package. The old `../opencode/packages/opencode/src/cli/tui` path is mostly an
adapter from the CLI process into `@opencode-ai/tui`.

Core rules:

- Keep `app.tsx` to provider composition, runtime state, global keyboard
  priority, and shell routing.
- Split state by domain under `context/`; do not use one app-wide state object.
- Route modules consume domain contexts directly. Do not pass route-sized prop
  bags from `app.tsx` or route indexes into views.
- Keep props for generic UI primitives and small leaf components only.
- Put route-specific keyboard handling beside the route.
- Keep Effect at the runtime/domain boundary. Do not put Effect pipelines in
  render-only route views.

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
