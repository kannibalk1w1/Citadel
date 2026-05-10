# Tag System — Design Spec

**Date:** 2026-05-10
**Feature:** Add/remove tags on canvas items via the ItemProperties panel, with autocomplete from existing canvas tags.

---

## Overview

`CanvasItem.tags: string[]` and `TagSearch` already exist. The missing piece is UI to assign tags. A Tags section is added to `ItemProperties.tsx` with: chip badges for existing tags (removable), a text input to add new ones, and a dropdown autocomplete sourced from all tags used anywhere on the canvas.

**Files changed:** Only `src/renderer/ui/panels/ItemProperties.tsx`. No store changes, no new files.

---

## Tag Chips

Each tag in `item.tags` renders as a small pill:

- Font: `var(--font-mono)`, 10px
- Background: `var(--bg-hover)`
- Border: `1px solid var(--border)`
- Border-radius: 10px (pill shape)
- A `×` button on the right removes the tag

**Remove action:**
```ts
const newTags = item.tags.filter((t) => t !== tag)
updateItem(boardId, id, { tags: newTags })
useHistoryStore.getState().push('ITEM_STYLE', boardId,
  { id, tags: item.tags },
  { id, tags: newTags }
)
```

---

## Add Input

A text `<input>` below the chips row. As the user types:

1. Filter all unique tags on the canvas (excluding tags already on this item).
2. Show up to 6 matches that `startsWith(input.toLowerCase())`, sorted alphabetically, as a dropdown beneath the input.
3. **Enter** or **clicking a suggestion**: adds the tag if non-empty and not already present, clears the input, closes dropdown.
4. **Escape**: clears the input, closes dropdown without adding.

**Add action:**
```ts
const tag = input.trim().toLowerCase()
if (!tag || item.tags.includes(tag)) return
const newTags = [...item.tags, tag]
updateItem(boardId, id, { tags: newTags })
useHistoryStore.getState().push('ITEM_STYLE', boardId,
  { id, tags: item.tags },
  { id, tags: newTags }
)
setInput('')
```

---

## Suggestions Source

```ts
const allTags = Array.from(
  new Set(allItems.flatMap((i) => i.tags))
).filter((t) => !item.tags.includes(t) && t.startsWith(input.toLowerCase()))
 .sort()
 .slice(0, 6)
```

`allItems` comes from `useCanvasStore((s) => s.items())` — already subscribed in `ItemProperties`.

---

## Component Structure

A `TagsSection` helper component defined in `ItemProperties.tsx` (same file, before the main export):

```tsx
function TagsSection({ item }: { item: CanvasItem }): React.ReactElement
```

It manages `input: string` and `open: boolean` (dropdown visible) as local state. Reads `allItems` from the store. Renders:
1. Chip row (wrapping flex)
2. Input + dropdown container (relative positioning)

Mounted in the main panel return after the type-specific sections and before the Meta divider:
```tsx
<Divider label="Tags" />
<TagsSection item={item} />
```

---

## Styling

- Chips: `display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px`
- Dropdown: `position: absolute`, full width of input, `z-index: 10`, `background: var(--bg-panel)`, `border: 1px solid var(--border)`, `border-radius: 3px`
- Suggestion rows: hover state `background: var(--bg-hover)`, 11px mono font, `cursor: pointer`, `padding: 3px 8px`

---

## Out of Scope

- Renaming tags globally across all items.
- Tag colour coding.
- Multi-word tags with spaces (spaces are allowed but trimmed at edges).
- Tag count badges in TagSearch results.
