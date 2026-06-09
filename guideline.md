# TUI Guidelines

The TUI guidelines live in `guidelines/tui/`.

- `guidelines/tui/README.md`: entry point and source-of-truth rules.
- `guidelines/tui/upstream-analysis.md`: notes from `../opencode/packages/tui`.
- `guidelines/tui/directory-structure.md`: target folders and ownership.
- `guidelines/tui/state-and-context.md`: context/state rules.
- `guidelines/tui/routes-and-screens.md`: route and keyboard conventions.
- `guidelines/tui/components-and-dialogs.md`: reusable component boundaries.
- `guidelines/tui/effect-runtime.md`: Effect usage boundaries.
- `guidelines/tui/migration-checklist.md`: checks to run while refactoring.

Use these files for future TUI changes. The old pattern of keeping most app
state, screen rendering, and screen props in one `app.tsx` should not be
reintroduced.
