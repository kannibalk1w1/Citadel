# Tint UI + Lasso Fix — Design Spec

**Date:** 2026-05-10

---

## Feature 1: Tint UI in ItemProperties

**Context:** `ItemRenderer.tsx` already renders `item.tint` as a `Rect` overlay. No UI exists to set it.

**UI:** A "Tint" section in `ItemProperties.tsx`, visible for all non-DOM item types (`image`, `gif`, `sticky`, `text`, `swatch`, `comparison`). Not shown for `video`, `youtube`, `audio`, `model3d`.

**Controls:**
- Checkbox — enables/disables tint. When unchecked: `updateItem({ tint: undefined })`. When checked: sets a default `{ color: '#c8a96e', opacity: 0.25 }`.
- When enabled: a `<input type="color">` for the tint colour.
- When enabled: a `<input type="range" min={0} max={1} step={0.01}>` for opacity (shown as 0–100%).
- All changes push `ITEM_STYLE` history events.

**Placement:** After the Opacity field, before the type-specific sections.

**Files:** Only `src/renderer/ui/panels/ItemProperties.tsx`.

---

## Feature 2: Lasso stroke fix

**Context:** `LassoOverlay.tsx` uses `stroke="var(--accent)"` — Konva doesn't resolve CSS variables, so the lasso outline is invisible.

**Fix:** Replace `stroke="var(--accent)"` with `stroke="#c8a96e"` in `src/renderer/canvas/overlays/LassoOverlay.tsx`.

**Files:** Only `src/renderer/canvas/overlays/LassoOverlay.tsx`.
