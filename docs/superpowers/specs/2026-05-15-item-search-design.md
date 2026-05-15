# Item Search Design

## Goal

Upgrade the existing tag search panel into a global item search for the active board. `Ctrl+F` should help users find and jump to canvas items by type, tags, source path, link, sticky/text content, comparison slots, and swatch colours.

## Non-Goals

- Do not add a separate command palette yet.
- Do not rename the existing `tagSearch` panel state in `uiStore`; keep the internal key to avoid unnecessary churn.
- Do not search across inactive boards in this version.
- Do not add filesystem indexing or OCR.

## UX

`Ctrl+F` opens the existing search panel near the right sidebar. The panel is visually similar to the current `TagSearch`, but the placeholder becomes `Search items...`.

Each result row shows:

- A primary label: best available item name/content/source.
- A small type badge.
- A secondary line: matching tags, source path, link, or other searchable metadata.

When a user selects a result:

1. Select the item with `canvasStore.setSelection([item.id])`.
2. Center the viewport on the item.
3. Close the search panel and clear the query.
4. Trigger a brief search highlight pulse around the item.

The existing group-aware selection behavior means selecting one grouped item will select the whole group automatically.

## Search Index

Search is active-board only and computed from `useCanvasStore((s) => s.items())`.

For every item, searchable fields include:

- `item.type`
- `item.tags`
- `item.src`
- `item.link`
- `item.meta.content`
- `item.meta.srcA`
- `item.meta.srcB`
- `item.meta.colors`

All matching is case-insensitive substring matching.

## Result Label Rules

The primary label should use the first useful value in this order:

1. `item.meta.content` trimmed and collapsed to one line.
2. Filename or final URL segment from `item.src`.
3. For comparison items, filename from `meta.srcA` or `meta.srcB`.
4. Swatch colour list preview from `meta.colors`.
5. Item type plus short ID fallback, for example `image abc123`.

The label should be capped visually with CSS truncation rather than mutating stored data.

## Viewport Jump

When selecting a result, the viewport should center the item in the visible canvas area, accounting for the right sidebar:

```ts
const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
const canvasW = window.innerWidth - sidebarW
const cx = item.x + item.width / 2
const cy = item.y + item.height / 2
updateViewport({
  x: canvasW / 2 - cx * viewport.scale,
  y: window.innerHeight / 2 - cy * viewport.scale,
})
```

The current zoom level is preserved.

## Search Highlight

Add a small search highlight state to `uiStore`:

```ts
searchHighlightId: string | null
setSearchHighlight: (id: string | null) => void
```

When a result is selected, set the highlight ID to the item ID, then clear it after about 900ms.

Add a new Konva overlay component:

```txt
src/renderer/canvas/overlays/SearchHighlight.tsx
```

It reads `searchHighlightId`, finds the matching item, and renders a non-interactive gold rectangle around the item using canvas coordinates. It should be mounted in the main canvas layer with other Konva overlays so it tracks pan and zoom naturally.

Visual style:

- stroke `#c8a96e`
- stroke width scaled by viewport, around `2 / viewport.scale`
- no fill
- shadow glow in aged gold
- `listening={false}`

## Files

- Modify `src/renderer/ui/TagSearch.tsx`
- Modify `src/renderer/store/uiStore.ts`
- Add `src/renderer/canvas/overlays/SearchHighlight.tsx`
- Modify `src/renderer/canvas/CanvasStage.tsx`

## Acceptance Criteria

- `Ctrl+F` opens the panel.
- Searching by tag still works.
- Searching by item type works.
- Searching by sticky/text content works.
- Searching by filename or URL works.
- Selecting a result centers the viewport on the item.
- Selecting a result selects the item and expands grouped selection through existing store behavior.
- Selecting a result shows a brief gold highlight.
- Build passes.
