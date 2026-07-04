# Selection Action Bar Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-selection-action-bar-design.md`. Branch: `codex/selection-action-bar`. TDD per task; full suite + typecheck before each commit.

- [ ] Task 1: `src/renderer/canvas/overlays/selectionActionBar.ts` + test — `selectionBounds(items)`, `selectionActionBarPlacement(bounds, viewport, screen)` (above selection, clamped, flips below when clipped).
- [ ] Task 2: `src/renderer/canvas/items/flipTransform.ts` + test — `flipProps(flipX, flipY, w, h)` Konva mirror props; wire into `ImageItem` and `GifItem` content nodes.
- [ ] Task 3: Flip actions — `item:flipH`/`item:flipV` in `actions.ts`, `shift+h`/`shift+v` defaults, App.tsx handlers pushing `ITEM_STYLE` (full meta before/after) for selected unlocked image/gif-flippable relics.
- [ ] Task 4: `SelectionActionBar.tsx` overlay in `CanvasStage` — visibility rules (select mode, selection, mouse up), buttons dispatching actions; Bind seeds connect mode.
- [ ] Task 5: Verify (suite, typecheck, CDP app check with screenshots), roadmap decision note, merge to master.
