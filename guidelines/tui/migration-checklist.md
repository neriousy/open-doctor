# Migration Checklist

Use this checklist for every TUI refactor:

1. Pick the owning domain before editing.
2. Add or update the narrow context first.
3. Move route rendering into `routes/<route>/view.tsx`.
4. Keep route keyboard handling beside the route.
5. Remove route-sized props; route views should call domain hooks directly.
6. Keep generic UI primitives prop-driven.
7. Keep Effect out of render-only files.
8. Run `npm run build`.
9. Run `git diff --check`.
10. Run `npx react-doctor@latest --verbose --diff`.

Audit commands:

```sh
rg -n "controller|Controller|onSectionHover|onActionHover|onSourceHover|onEntryHover" src/cli/tui
rg -n "Effect\\.|Effect\\b" src/cli/tui -g'*.ts' -g'*.tsx'
find src/cli/tui -maxdepth 3 -type f | sort
```
