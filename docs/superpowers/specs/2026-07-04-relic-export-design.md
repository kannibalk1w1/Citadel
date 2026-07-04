# Per-Relic Export Design + Plan

Status: approved direction via 2026-07-04 feature scouting (queue item 6); built same session.

Selected single relics with a source file get an Export button on the action strip: save dialog (extension-filtered, defaults to the source basename) then `assets:exportCopy` IPC (main-side `copyFileSync`, refuses missing sources). Success raises the 'Relic copied out' inscription toast. `file:saveDialog` gained an optional `filters` argument (backwards-compatible).

- [x] IPC: `assets:exportCopy` + `file:saveDialog` filters; CLAUDE.md table updated.
- [x] Strip: export button (single selection with src only), toast on success.
- [x] Verified (260 tests, typecheck; CDP: exportCopy copies byte-identical file, refuses missing source).
