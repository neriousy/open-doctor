# Directory Structure

Target ownership:

```text
src/cli/tui/
  app.tsx                  provider tree, global key priority, runtime state
  runtime/                 shell, router, footer, keyboard dispatcher
  context/                 domain contexts and domain state hooks
  routes/<route>/          route registration, route keys, route-specific view
  component/               reusable app components
  ui/                      generic primitives, dialog, toast, confirmation
  util/                    pure helpers
```

Folder rules:

- `runtime/` should not know details of sessions, logs, backups, or repair
  behavior beyond generic route IDs and shell/footer rendering.
- `context/` files expose cohesive domain APIs. State hooks can live next to the
  context as `<domain>-state.ts`.
- `routes/<route>/index.tsx` registers the route, wires route keyboard handling,
  and renders `<RouteView />`.
- `routes/<route>/view.tsx` may use domain contexts directly when the view is
  route-specific.
- `component/` is for app-level reusable overlays and widgets like command
  palette and help.
- `ui/` is for generic, reusable building blocks. These may still accept props.
- `util/` stays pure and importable from tests.

Do not put new sections into `app.tsx` just because they need several domains.
Create or extend a context, then consume it from the route.
