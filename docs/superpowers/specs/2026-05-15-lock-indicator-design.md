# Lock Indicator Design

## Goal

Make `CanvasItem.locked` visible and trustworthy. Locked items remain selectable for inspection and unlocking, but they cannot be moved, resized, edited, duplicated, cut, deleted, or reordered by normal UI actions.

## Existing State

- `CanvasItem.locked` already exists.
- Most Konva items already set `draggable={toolMode === 'select' && !item.locked}`.
- `ItemProperties` already exposes a Locked checkbox.
- There is no visible canvas indicator.
- Global actions and context menu currently operate on locked selected items.

## UX

Locked items show a small aged-gold padlock marker near the item’s top-right corner. The marker is non-interactive and scales with the canvas overlay so it remains visible while panning and zooming.

Locked items can still be clicked and selected. Selecting a locked item opens its properties normally, so the user can uncheck Locked.

Context menu:

- Shows `Lock` when any selected item is unlocked.
- Shows `Unlock` when any selected item is locked.
- Delete, Duplicate, ordering, Group/Ungroup remain available only for selected unlocked items where appropriate.

Keyboard:

- `Ctrl+L` toggles lock for the current selection.
- If any selected item is unlocked, `Ctrl+L` locks all selected items.
- If all selected items are locked, `Ctrl+L` unlocks all selected items.

## Protection Rules

Locked items must not be affected by:

- Dragging
- Transformer resize/rotate
- Double-click text/sticky editing
- Delete
- Cut
- Duplicate
- Reorder actions

Undo/redo still applies historical events exactly as recorded. This is intentional: undo/redo should restore previous state even if an item is currently locked.

## Architecture

- Add `Actions.TOGGLE_LOCK` and default keybind `ctrl+l`.
- Register a handler in `App.tsx`.
- Filter locked items out of destructive/editing actions in `App.tsx` and `ContextMenu.tsx`.
- Hide Transformers for locked items in item components.
- Add a reusable padlock overlay in `ItemRenderer.tsx`.

## Files

- `src/renderer/keybinds/actions.ts`
- `src/renderer/keybinds/defaultKeybinds.ts`
- `src/renderer/App.tsx`
- `src/renderer/ui/ContextMenu.tsx`
- `src/renderer/canvas/ItemRenderer.tsx`
- `src/renderer/canvas/items/ImageItem.tsx`
- `src/renderer/canvas/items/GifItem.tsx`
- `src/renderer/canvas/items/TextItem.tsx`
- `src/renderer/canvas/items/StickyItem.tsx`
- `src/renderer/canvas/items/SwatchItem.tsx`
- `src/renderer/canvas/items/ComparisonItem.tsx`

## Acceptance Criteria

- Locked items show a padlock marker on the canvas.
- Locked items are selectable.
- Locked image/gif/text/sticky/swatch/comparison items do not show Transformers.
- Locked text and sticky items do not enter text edit mode on double-click.
- Delete/Cut/Duplicate/Reorder ignore locked items.
- Context menu can lock and unlock selected items.
- `Ctrl+L` toggles selected items between locked and unlocked.
- Build passes.
