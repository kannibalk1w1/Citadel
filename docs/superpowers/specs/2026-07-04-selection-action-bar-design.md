# Selection Action Bar Design

Status: approved direction via 2026-07-04 feature scouting (queue item 1); built same session.

## Problem

Citadel's most common item actions (duplicate, delete, lock, comment, flip) live in the right-click menu, keybinds, or the properties panel. Ref Flow surfaces them as a floating bar directly above the selection — one click, zero travel. Citadel also has no flip at all.

## Goals

- A floating DOM action bar above the current selection in select mode: Duplicate, Flip H, Flip V, Bind, Comment, Lock/Unlock, Delete.
- New `item:flipH` / `item:flipV` actions (keybindable, context-menu-able later) storing `meta.flipX` / `meta.flipY`, applied as Konva mirror transforms on image and GIF relics, undoable via `ITEM_STYLE`.
- Bar hides while the mouse is down over the canvas (drags, lasso, panning) and in any non-select tool mode.

## Non-Goals

- No per-item export in this pass (scouting queue item 6).
- No flip rendering for text/sticky/swatch/3D relics (flip is meaningless or misleading there); the actions still record meta so media types added later can honour it.
- No rotation-aware bar placement (axis-aligned selection bounds only).

## Approach

- `selectionActionBar.ts`: pure placement — `selectionBounds(items)` (axis-aligned union) and `selectionActionBarPlacement(bounds, viewport, screen)` → screen coords above the bounds, clamped to the viewport, flipping below the selection when clipped at top.
- `flipTransform.ts`: pure `flipProps(flipX, flipY, width, height)` → Konva `{ scaleX, scaleY, offsetX, offsetY }` mirror props; consumed by `ImageItem`/`GifItem` content nodes only (chrome/placeholder unaffected).
- `SelectionActionBar.tsx`: DOM overlay in `CanvasStage` (above Konva, sibling of panels), `citadel-floating-panel` styling, buttons dispatch existing `ActionName`s (`DUPLICATE`, `COMMENT_PIN_ADD`, `TOGGLE_LOCK`, `DELETE`) plus the two new flip actions; Bind sets `toolMode: 'connect'` and seeds `connectFromId` with the first selected relic. Window-level mousedown/mouseup hides the bar mid-gesture.
- Flip handlers in `App.tsx` mirror `TOGGLE_LOCK`'s shape: per selected unlocked item, push `ITEM_STYLE` with full before/after meta, `updateItem`. Default keybinds: `shift+h` / `shift+j` (`shift+v` conflicts with paste-style conventions? no — `v` is select tool; plain `shift+v` is safe, use it).

Constraints honoured: keybinds via resolver/ActionName; undo via the shared event log; CSS variables for colours; DOM overlay (not Konva chrome); no mascot change (selection actions already have effects where relevant).
