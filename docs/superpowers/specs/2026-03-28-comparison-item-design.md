# ComparisonItem — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Complete the `ComparisonItem` canvas widget: a side-by-side A/B image comparison with a draggable divider. The existing skeleton in `src/renderer/canvas/items/ComparisonItem.tsx` has the core clip logic but is missing resize, history, snapping, selection glow, a robust divider interaction, image assignment UI, and OS drag-onto support.

---

## Scope

Three files change:

| File | What changes |
|---|---|
| `src/renderer/canvas/items/ComparisonItem.tsx` | Full replacement — robust divider, Transformer, selection glow, snapping, history |
| `src/renderer/ui/panels/ItemProperties.tsx` | Add `comparison` section with Set A / Set B file pickers |
| `src/renderer/canvas/CanvasStage.tsx` | Intercept OS file drops that land on a comparison item |

No new files. No type changes (`ComparisonItem` is already in `ItemType`).

---

## Section 1: ComparisonItem Component

### Divider drag

The current `draggable Line` approach is replaced. A transparent `Rect` hit-area positioned at the divider listens for `onMouseDown`. On mousedown, native `mousemove` / `mouseup` listeners attach to the Konva stage container element for the duration of the drag (same pattern as middle-mouse pan in `CanvasStage`). On `mousemove`, clamp the new X to `[0, item.width]` and update `splitX` local state. On `mouseup`, detach listeners.

`splitX` is local React state, initialized to `0.5`. It is **not** persisted to `item.meta` — the divider always resets to 50/50 on load.

### Divider visuals

- A `Line` from `(splitPx, 0)` to `(splitPx, item.height)` — accent gold (`#c8a96e`), 2px stroke, `listening={false}`
- A `Circle` centered at `(splitPx, item.height / 2)` — 10px radius, accent gold fill, `listening={false}`
- A `Text` node at the circle center with `‹ ›` — white, 10px, centered, `listening={false}`

Only the hit-rect receives pointer events.

### Transformer + selection glow

Identical to `ImageItem`:
- A `Rect` with `stroke="#c8a96e"`, `shadowEnabled`, `shadowColor="rgba(200,169,110,0.7)"`, `shadowBlur={20}`, rendered when `isSelected`
- A `Transformer` ref wired in `useEffect([isSelected])` via `trRef.current.nodes([groupRef.current])`
- `keepRatio={false}`, `rotateEnabled`

### Snapping + history

- `onDragStart` → store `dragStart` ref, rebuild `spatialIndex`
- `onDragMove` → call `snapItem`, apply snapped position, `bumpSnap()`
- `onDragEnd` → clear snap lines, `updateItem`, push `ITEM_MOVE` to `historyStore`
- `onTransformStart` → store `transformStart` ref
- `onTransformEnd` → read node scale, reset to 1, `updateItem`, push `ITEM_STYLE`

### Empty slot rendering

If `srcA` or `srcB` is unset, render a dark placeholder `Rect` (`fill="var(--bg-hover)"`) with a centered `Text` label:
- Left half: `"A — drag or set image"`
- Right half: `"B — drag or set image"`

Text style: `fontSize=11`, `fill="var(--text-muted)"`, `fontFamily="var(--font-body)"`.

### Images

Load via `useImage(pathToUrl(src))`. `pathToUrl` is the existing utility at `src/renderer/utils/pathToUrl.ts`. If the image is loading, the placeholder renders until it resolves.

### Click / context menu / shift-select

Follow `ImageItem` exactly: `onClick` dispatches selection (shift = addToSelection), `onContextMenu` opens the context menu and selects the item if not already selected.

---

## Section 2: ItemProperties Panel

Add a `comparison`-typed block inside `ItemProperties.tsx`, after the existing `text` block and before the `<Divider label="Meta" />`.

```
<Divider label="Comparison" />
[Row A]  [26×26 thumb]  [truncated path or "None"]  [Set… button]
[Row B]  [26×26 thumb]  [truncated path or "None"]  [Set… button]
```

**Thumbnail** — `<img>` at 26×26px, `object-fit: cover`, `src={pathToUrl(srcA)}`. If no src, render a `var(--bg-hover)` div of the same size.

**"Set…" button** — calls `window.ipc.invoke('file:openDialog', {})`. On a non-null path result, calls `updateMeta({ srcA: path })` (or `srcB`). History is automatically recorded via the existing `updateMeta` wrapper in `ItemProperties`.

**Path label** — show only the filename (last segment of the path), truncated with CSS `text-overflow: ellipsis`. Max width fills remaining space after the thumbnail and button.

---

## Section 3: OS File Drag-onto

**Location:** `CanvasStage.tsx`, at the top of the existing `handleDrop` handler, before the "create new item" logic.

**Algorithm:**

1. Convert drop screen coordinates to canvas space:
   ```
   canvasX = (screenX - viewport.x) / viewport.scale
   canvasY = (screenY - viewport.y) / viewport.scale
   ```
2. Find the first `comparison`-type item whose bounding box contains `(canvasX, canvasY)`.
3. If found:
   - Determine slot: `canvasX < item.x + item.width / 2` → `srcA`, else → `srcB`
   - Call `updateItem(activeBoardId, item.id, { meta: { ...item.meta, [slot]: droppedFilePath } })`
   - Push `ITEM_STYLE` history event
   - Trigger `mascotStore.triggerEffect('lightning-in')`
   - Return early — do **not** create a new canvas item
4. If not found — fall through to existing drop logic unchanged.

**Multi-file drops onto a comparison item** — only the first file in the drop is used. Subsequent files are ignored (not created as new items either).

---

## Out of Scope

- Persisting `splitX` to `item.meta` — divider always resets to 50/50
- Dragging an existing *canvas* image onto a comparison slot — only OS file drops are intercepted
- Label overlays (A / B badges) on the canvas widget — the placeholder text in empty slots is sufficient
- Vertical split orientation

