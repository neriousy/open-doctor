# Components And Dialogs

Use `component/` for reusable app widgets:

- command palette
- help overlay
- feature dialogs that know app concepts

Use `ui/` for generic building blocks:

- primitive layout wrappers
- details panel
- confirmation modal rendering
- dialog/toast providers
- status badges and small presentational controls

Dialog and toast rules:

- Dialog state should be provider-owned, not threaded through route props.
- Confirmation key handling belongs with confirmation state.
- Toast state should expose a small `showToast` API and render through the shell.

Component props are fine when the component is generic. Route-specific views
should prefer context hooks over props for domain state.
