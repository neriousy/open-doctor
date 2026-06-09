# Effect Runtime

Upstream `packages/tui` uses Effect at boundaries:

- `packages/tui/src/app.tsx` uses `Effect.fn`, `Effect.scoped`,
  `Effect.acquireRelease`, `Effect.tryPromise`, `Deferred`, and finalizers for
  renderer lifecycle and shutdown.
- `packages/opencode/src/cli/tui/layer.ts` provides the app layer around
  `runTui(input)`.
- CLI command files dynamically import Effect and call `Effect.runPromise(...)`
  at the process boundary.
- Worker and reload paths use Effect for async lifecycle and disposal.

Rules for this toolkit:

- Keep Effect in CLI/runtime/domain action boundaries.
- It is acceptable for domain state hooks to call `Effect.runPromise` when they
  bridge from UI intent into Effect-based utilities.
- Prefer plain React/OpenTUI state for focus, hover, selected rows, search
  input, and route-local UI state.
- If the app gains a long-lived renderer lifecycle or external subscription,
  model acquire/release with Effect in `runtime/`, not in routes.

Current boundary examples:

- `health.ts`: health scan bridges into Effect-backed checks.
- `actions.ts`: repair command execution bridges into Effect-backed repair.
- `context/sessions-state.ts`: archived session listing uses `Effect.runPromise`.
- `context/backups-state.ts`: backup create/verify uses `Effect.runPromise`.
