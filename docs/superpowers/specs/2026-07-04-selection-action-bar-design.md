# Selection Action Bar Design

Status: approved direction via 2026-07-04 feature scouting (queue item 1); built same session.

## Problem

**Correction discovered during implementation:** Citadel already ships a floating `SelectedActionStrip` (properties, connect, link, tag, lock, duplicate, bring-front, delete) — the 2026-07-04 scouting doc overstated this gap. The real gaps: the strip only appears for single selection, and Citadel has no flip anywhere. This pass extends the existing strip instead of adding a second bar.

## Goals

- Extend `SelectedActionStrip` to multi-selection (positioned over the selection union; single-target buttons hidden for multi).
- Add Flip H / Flip V buttons to the strip for image/GIF selections.
- New `item:flipH` / `item:flipV` actions (keybindable, context-menu-able later) storing `meta.flipX` / `meta.flipY`, applied as Konva mirror transforms on image relics (GIF relics record the meta but render unflipped for now — their Konva node is the interactive node, where a base -1 scale breaks transformer math), undoable via `ITEM_STYLE`.

## Non-Goals

- No per-item export in this pass (scouting queue item 6).
- No flip rendering for text/sticky/swatch/3D relics (flip is meaningless or misleading there); the actions still record meta so media types added later can honour it.
- No rotation-aware bar placement (axis-aligned selection bounds only).

## Approach

- `boardChromeViewModel.selectedActionStripPositionForSelection(items, viewport)`: strip placement over the gutter-padded union bounds (reuses `selectionBounds`).
- `flipTransform.ts`: pure `flipProps(flipX, flipY, width, height)` → Konva mirror props; consumed by `ImageItem`'s content node only (chrome/placeholder unaffected).
- `SelectedActionStrip`: renders for ≥1 selected relic; properties/connect/link/tag stay single-only; flip buttons appear when any selected relic is image/GIF.
- Flip handlers in `App.tsx`: per selected unlocked item, push `ITEM_STYLE` with full before/after meta, `updateItem`. Default keybinds `shift+h` / `shift+v`.

Constraints honoured: keybinds via resolver/ActionName; undo via the shared event log; CSS variables for colours; DOM overlay (not Konva chrome); no mascot change (selection actions already have effects where relevant).
