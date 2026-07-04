# Waystones Design (Saved Viewport Anchors)

Status: approved and built 2026-07-04.

## Problem

Large chambers make navigation expensive: the minimap helps orientation but there is no way to name a region ("the skull studies", "palette wall") and jump back to it. Alkemion's named workspace shortcuts prove the pattern.

## Goals

- Per-chamber named viewport anchors — **Waystones** — storing `{ name, x, y, scale }` in `board.meta.waystones` (array, capped at 12 per chamber).
- Place a waystone at the current viewport from the board navigator ("Plant waystone"); jump by clicking its row; cycle with keybinds (`ctrl+1..9` jump-by-index is tempting but collides with browser conventions — proposal: `alt+1..9`).
- Planting/removing/renaming a waystone pushes `BOARD_STYLE` events (undoable, recordable, same path as chamber identity).
- Jumping animates the viewport with the existing viewport travel used by Index focus (respects reduced motion by snapping).

## Non-Goals

- No cross-chamber waystones (the Living Index already travels across chambers).
- No thumbnails per waystone in v1 (name + optional accent dot only).
- No saved trails/tours — the roadmap defers those until multi-chamber archives are in real use.

## Approach

- `chamberWaystones.ts` model (+tests): normalize/validate meta array, cap, add/remove/rename patch builders reusing `chamberIdentityEvent`'s before/after discipline.
- Board navigator: a "Waystones" list under Chamber Rite for the active chamber (plant / jump / rename / remove).
- Keybinds: `waystone:plant` (`alt+w`), `waystone:next` (`alt+]` or similar) via the resolver; jump-by-index deferred until wanted.
- Save format: `board.meta` only — old projects unaffected; portable archives carry waystones for free.
