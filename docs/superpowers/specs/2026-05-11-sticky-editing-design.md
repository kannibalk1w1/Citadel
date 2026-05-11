# Sticky Inline Editing — Design Spec

**Date:** 2026-05-11
**Feature:** Inline text editing for StickyItem with floating toolbar (colour, font size, alignment, bold)

---

## Overview

Double-clicking a sticky note opens an HTML `<textarea>` overlay positioned exactly over the Konva item. A compact floating toolbar sits above the textarea and exposes four controls: background colour, font size, text alignment, and bold. All changes apply live for instant preview and are committed as a single undoable `ITEM_STYLE` history event when the overlay closes.

---

## What Already Exists

- `StickyItem.tsx` — `onDblClick` already calls `setEditingItemId(item.id)`
- `TextEditOverlay.tsx` — already handles `item.type === 'sticky'` with matching background, padding, and Enter-as-newline behaviour
- `App.tsx` — already mounts `<TextEditOverlay>` when `editingItemId` is set
- `uiStore` — `editingItemId` / `setEditingItemId` already wired

The only production gap is that `TextEditOverlay.commit()` never pushes to `historyStore`, making text edits non-undoable for both sticky and text items.

---

## Data Model

All four properties live in `item.meta`. Three are already used by `TextItem`; `color` is already used by `StickyItem`.

| Property | Type | Default | Notes |
|---|---|---|---|
| `meta.color` | `string` | `#2a2820` | Sticky background fill |
| `meta.fontSize` | `number` | `14` | Pixels — sticky uses 14, same field as TextItem |
| `meta.align` | `string` | `'left'` | `'left' \| 'center' \| 'right'` |
| `meta.fontStyle` | `string` | `'normal'` | `'normal' \| 'bold'` |

No store or type changes needed — `meta` is `Record<string, unknown>`.

---

## Components

### TextEditOverlay.tsx (modified)

**History fix (applies to text items too):**
- Capture `item.meta?.content` as `beforeMeta` ref at mount time (full `item.meta` snapshot)
- On `commit`, if any meta field changed, push one `ITEM_STYLE` event: `before = { id, meta: beforeMeta }`, `after = { id, meta: updatedMeta }`

**Sticky toolbar:**
- Rendered only when `item.type === 'sticky'`
- Positioned in a `<div>` fragment alongside the `<textarea>` — fixed positioning, placed 4px above the textarea (`top: sy - toolbarHeight - 4`)
- If sticky is within 52px of the top of the viewport (`sy < 52`), toolbar drops below instead (`top: sy + sh + 4`)
- Toolbar tracks `pendingMeta` in `useState`, initialised from `item.meta`
- Each control calls `updateItem` immediately for live preview and updates `pendingMeta`
- `commit` uses `pendingMeta` (not `item.meta`) as the `after` value

**Toolbar controls (left to right):**

1. **Colour swatches** — 6 preset swatches + a native `<input type="color">` as custom picker
   - Presets: `#2a2820` · `#1a1f2a` · `#1f2a1a` · `#2a1a1a` · `#2a2a1a` · `#1a2a27`
   - Active swatch has a 1.5px `var(--accent)` ring
   - Swatch size: 16×16px, border-radius 3px, gap 4px

2. **Font size** — three pill buttons: `S` (12) `M` (14) `L` (18)
   - Active button: `background: var(--accent)`, `color: #0f0d0b`
   - Inactive: `background: var(--bg-canvas)`, `color: var(--text-primary)`

3. **Alignment** — three icon buttons using Unicode: `⫷` / `≡` / `⫸` — no, use text labels `L` `C` `R` in `JetBrains Mono` to avoid Unicode rendering variance
   - Same active/inactive treatment as font size buttons

4. **Bold** — single button `B` in `JetBrains Mono`, font-weight 700
   - Active when `pendingMeta.fontStyle === 'bold'`

**Toolbar container style:**
```
position: fixed
background: var(--bg-panel)
border: 1px solid var(--border)
border-radius: 6px
padding: 5px 8px
display: flex; align-items: center; gap: 10px
box-shadow: var(--shadow-lg)
z-index: 201  (one above the textarea's 200)
```

Clicks on the toolbar must not blur the textarea. Each button uses `onMouseDown={(e) => e.preventDefault()}` to prevent focus theft.

### StickyItem.tsx (modified)

The Konva `<Text>` must read the same four meta fields so the canvas reflects saved styles:

```ts
const fontSize = (item.meta?.fontSize as number) ?? 14
const align = (item.meta?.align as string) ?? 'left'
const fontStyle = (item.meta?.fontStyle as string) ?? 'normal'
```

Pass these to the `<Text>` node: `fontSize={fontSize}`, `align={align}`, `fontStyle={fontStyle}`.

---

## Commit Flow

```
onDblClick → setEditingItemId(id)
  → TextEditOverlay mounts
    → beforeMeta = snapshot of item.meta
    → pendingMeta = { ...item.meta }
    → toolbar renders (sticky only)
      → user changes colour/size/align/bold
        → updateItem(live preview) + pendingMeta update
      → user types in textarea
    → commit() on blur or Escape
      → updateItem(activeBoardId, id, { meta: { ...pendingMeta, content: val } })
      → historyStore.push('ITEM_STYLE', boardId,
          { id, meta: beforeMeta },
          { id, meta: { ...pendingMeta, content: val } })
      → setEditingItemId(null)
```

Escape reverts all changes — calls `updateItem` with `beforeMeta` (undoing any live toolbar previews) then `setEditingItemId(null)`. No history event is pushed on escape.

---

## Files Changed

| File | Change |
|---|---|
| `src/renderer/canvas/TextEditOverlay.tsx` | Add `beforeMeta` ref, `pendingMeta` state, sticky toolbar, history push on commit |
| `src/renderer/canvas/items/StickyItem.tsx` | Read `fontSize`, `align`, `fontStyle` from `item.meta` in Konva `<Text>` |

No new files. No store changes. No type changes.

---

## Out of Scope

- Italic, font family, text colour (diminishing returns for sticky notes)
- Live auto-resize of the sticky height as text grows
- Sticky creation with a default colour from a palette
