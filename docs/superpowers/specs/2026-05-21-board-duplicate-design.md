# Board Duplicate Design

## Goal

Let users clone the active board as a fast starting point for alternate layouts or reference variants.

## Behavior

- Duplicate Board creates a new board after the current board.
- The new board copies viewport, items, and connections.
- Copied items receive new ids.
- Copied connections receive new ids and point at the copied item ids.
- The duplicated board becomes active and is named `<original> copy`.
- The action is available from the Board menu, right sidebar, and `Ctrl+Shift+D`.

## Architecture

`canvasStore` owns `duplicateBoard(id)` because it needs direct access to board contents. `App.tsx` wires the action into the keybind resolver. The right sidebar provides a visible Clone board button.

## Acceptance Checks

- Duplicate board remaps item and connection ids.
- Original board is unchanged.
- New board becomes active.
- Build, typecheck, and tests pass.

