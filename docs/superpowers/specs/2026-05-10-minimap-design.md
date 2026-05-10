# Minimap — Design Spec

**Date:** 2026-05-10
**Feature:** Fix broken click navigation, add drag-to-pan, and add item type colour coding to the existing Minimap component.

---

## Overview

The Minimap already renders canvas items and a viewport indicator. Three gaps need fixing:

1. Click navigation is broken — the click handler can't access the minimap's rendering transform.
2. No drag support — only click-to-jump, no drag-to-scrub.
3. All items look identical — no visual distinction by type.

All changes are in `src/renderer/ui/Minimap.tsx`. No new files, no store changes.

---

## Root Cause Fix — Shared Transform Ref

The `useEffect` that renders the minimap computes `scale`, `ox`, `oy` locally. These are not accessible to mouse event handlers, causing incorrect navigation math.

**Fix:** Add a `mapTransformRef` that the render effect writes and handlers read:

```ts
const mapTransformRef = useRef({ scale: 1, ox: 0, oy: 0 })
```

At the end of the render `useEffect`, write the computed values:
```ts
mapTransformRef.current = { scale, ox, oy }
```

---

## Navigation Math

To convert a minimap pixel coordinate `(mx, my)` to a canvas world position:

```ts
const canvasX = (mx - ox) / scale
const canvasY = (my - oy) / scale
```

To centre the viewport on that canvas position:

```ts
const sidebarW = 164
const canvasW = window.innerWidth - sidebarW
updateViewport({
  x: canvasW / 2 - canvasX * viewport.scale,
  y: window.innerHeight / 2 - canvasY * viewport.scale,
})
```

This replaces the broken calculation in the existing `handleClick`.

---

## Drag Behaviour

`mousedown` on the minimap canvas:
- Immediately navigates to the clicked position (same math as click).
- Sets a `isDragging` ref to `true`.
- Attaches `mousemove` and `mouseup` listeners to `window`.

`mousemove` on window (while dragging):
- Converts the cursor position to minimap-local coordinates by subtracting the minimap's `getBoundingClientRect()` origin.
- Applies the same navigation math.
- Updates the viewport on every move (real-time scrubbing).

`mouseup` on window:
- Sets `isDragging` to `false`.
- Removes the `mousemove` and `mouseup` listeners.

Cleanup on unmount: a `useEffect` return removes any in-flight listeners.

No distinction between dragging the viewport rect vs clicking elsewhere — mousedown anywhere jumps + starts drag.

---

## Item Type Colour Coding

Each item type gets a distinct tint for at-a-glance recognition:

| Type(s) | Fill colour | Notes |
|---|---|---|
| `image`, `gif`, `video`, `youtube` | `#2a3540` | Blue-grey |
| `sticky` | `meta.color ?? '#2a2820'` | Uses the sticky's own colour |
| `text` | `#1e2a1e` | Green |
| `swatch` | `#3a2a1a` | Warm amber |
| `comparison` | `#2e2420` | Warm dark |
| `audio`, `model3d` | `#2a2035` | Purple |
| fallback | `#2e2820` | Existing default |

All items also get a 1px slightly lighter stroke (`rgba(255,255,255,0.06)`) to separate adjacent items visually.

---

## Files Changed

| File | Change |
|---|---|
| `src/renderer/ui/Minimap.tsx` | Add `mapTransformRef`, fix navigation math, add drag handlers, add type colour coding |

---

## Out of Scope

- Showing connections as lines on the minimap.
- Zooming the minimap itself.
- Toggling minimap visibility.
- Displaying item thumbnails (images, GIF frames).
