# Selection Action Bar Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-selection-action-bar-design.md`. Branch: `codex/selection-action-bar`. TDD per task; full suite + typecheck before each commit.

- [x] Task 1: `selectedActionStripPositionForSelection` in `boardChromeViewModel.ts` + tests (union-bounds strip placement; discovered existing `SelectedActionStrip` — extended it instead of adding a new bar).
- [x] Task 2: `src/renderer/canvas/items/flipTransform.ts` + test — `flipProps(flipX, flipY, w, h)` Konva mirror props; wire into `ImageItem` content node (GIF deferred; see spec).
- [x] Task 3: Flip actions — `item:flipH`/`item:flipV` in `actions.ts`, `shift+h`/`shift+v` defaults, App.tsx handlers pushing `ITEM_STYLE` (full meta before/after) for selected unlocked image/gif-flippable relics.
- [x] Task 4: extend `SelectedActionStrip` — multi-select support, flip buttons for image/GIF selections, single-only buttons gated.
- [x] Task 5: verified (suite 252 tests, typecheck, CDP: strip shows flip buttons, flip mirrors image content, undo restores; multi-select strip verified via probe); merged to master.
