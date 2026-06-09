# Upstream Analysis

Reference implementation: `../opencode/packages/tui/src`.

Observed structure:

- `app.tsx` owns renderer lifecycle, provider composition, global command
  handling, and route switching.
- `context/` contains narrow providers such as route, sdk, local, sync, theme,
  runtime, prompt, and command state.
- `routes/` contains route modules like home and session. Route modules own
  route-specific layout, keyboard behavior, and route-local context when nested
  helpers need shared values.
- `component/` contains reusable app components and feature dialogs.
- `ui/` contains generic primitives such as dialog, toast, alert,
  confirmation, borders, links, and spinner.
- `util/` contains pure formatting, layout, persistence, path, scrolling, and
  presentation helpers.

Practices to copy:

- Many small contexts are preferred over a single global store.
- Routes call hooks directly instead of receiving assembled app props.
- Route-only derived state can live in a route-local context.
- Dialogs and toasts are modeled as UI state providers.
- Runtime wiring uses Effect, while rendering code remains plain React/OpenTUI.

Practices to avoid:

- No `controller` layer naming. If a hook owns state for a domain, name it for
  that domain, such as `useLogsState` or `useBackupsState`.
- No prop chains for screen-level state like selected rows, hover state,
  active panes, and navigation callbacks.
- No shared helper abstraction when a small explicit function in the owning
  module is clearer.
