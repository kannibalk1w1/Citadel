# Board Thumbnails Design

## Goal

Make board tabs easier to scan by adding tiny item-layout previews beside each board name.

## UX

Each board tab shows a 52×28 thumbnail canvas before the board name. The thumbnail is a simplified overview:

- background uses `--bg-panel`
- items render as small rectangles
- item colours match the minimap type palette
- sticky notes use their stored `meta.color`
- empty boards show a small `empty` label

The active board thumbnail gets a subtle aged-gold border. Inactive thumbnails stay muted.

The thumbnail itself does not introduce new interactions:

- clicking the tab still switches board
- double-clicking the tab still renames
- the close `x` still removes the board

## Architecture

Implement a small `BoardThumbnail` helper component inside `BoardTabs.tsx`. It renders to a `<canvas>` from `board.items` using the same scene-bounds fit logic as `Minimap`, but without viewport rectangle or drag behavior.

No screenshots or DOM capture are used.

## Acceptance Criteria

- Every board tab displays a thumbnail.
- Empty boards display `empty`.
- Non-empty boards render item rectangles.
- Active board thumbnail is visually distinct.
- Existing tab switch, rename, delete, and add-board behavior still works.
- Build passes.
