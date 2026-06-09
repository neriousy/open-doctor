# Routes And Screens

Route index files should be thin:

```tsx
export function useLogsRoute(): ScreenRoute {
  const route = useRoute()
  const logs = useLogs()

  return {
    id: "logs",
    onKey: (key) => handleLogsKey(key, route, logs),
    render: () => <LogsView />,
  }
}
```

Route view files should consume contexts directly:

```tsx
export function LogsView() {
  const logs = useLogs()
  const selected = logs.visibleLogEntries[logs.selectedLogEntry]
  return <LogsLayout selected={selected} />
}
```

Keyboard rules:

- Global priority stays in `app.tsx`: help, palette, search text input,
  confirmation modal, quit, and final route dispatch.
- Route-specific keys stay in `routes/<route>/index.tsx` or a route-local keys
  module when the route grows.
- Route key handlers call context actions directly.
- Route key handlers should not be passed down into views.

Screen rules:

- Overview sections, logs, backups, sessions, and repair are route-specific
  views, so they may call context hooks directly.
- If a route grows deeply nested repeated helpers, create route-local context
  inside that route folder, following upstream session-route practice.
