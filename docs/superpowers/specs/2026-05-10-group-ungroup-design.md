# Group / Ungroup — Design Spec

**Date:** 2026-05-10
**Feature:** Group canvas items so clicking one selects all members. Ungroup to dissolve.

---

## Core Behaviour

Grouping assigns a shared `groupId` (nanoid) to a set of items. When any grouped item is clicked, all members are auto-selected. From there, existing multi-select drag/resize/delete works for free — no changes to individual item drag handlers.

---

## Store Changes (`canvasStore.ts`)

### New actions

**`groupItems(boardId: string, ids: string[]): void`**
- Generates a new `nanoid()` as `groupId`
- Updates all items in `ids` to have that `groupId`
- Pushes one `ITEM_STYLE` history event per item (before: `{ id, groupId: undefined }`, after: `{ id, groupId: newGid }`)

**`ungroupItems(boardId: string, groupId: string): void`**
- Sets `groupId = undefined` on all items with matching `groupId`
- Pushes one `ITEM_STYLE` history event per item (before: `{ id, groupId }`, after: `{ id, groupId: undefined }`)

### Modified selection actions

Both `setSelection(ids)` and `addToSelection(id)` auto-expand to include all group members:

```ts
// Group expansion helper (used in both setSelection and addToSelection)
function expandGroups(ids: string[], allItems: CanvasItem[]): string[] {
  const groupIds = new Set(
    ids.flatMap((id) => {
      const item = allItems.find((i) => i.id === id)
      return item?.groupId ? [item.groupId] : []
    })
  )
  return Array.from(new Set([
    ...ids,
    ...allItems.filter((i) => i.groupId && groupIds.has(i.groupId)).map((i) => i.id),
  ]))
}
```

`setSelection`: calls `expandGroups` before setting `selectedIds`.
`addToSelection`: adds the id, then expands groups on the resulting set.

---

## Actions + Keybinds

In `src/renderer/keybinds/actions.ts`:
```ts
GROUP:   'group:create',
UNGROUP: 'group:dissolve',
```

In `src/renderer/keybinds/defaultKeybinds.ts`:
```ts
[Actions.GROUP]:   ['ctrl+g'],
[Actions.UNGROUP]: ['ctrl+u'],
```

In `App.tsx` keybind wiring:
```ts
resolver.register(Actions.GROUP, () => {
  const { selectedIds, activeBoardId, items } = useCanvasStore.getState()
  if (!activeBoardId || selectedIds.length < 2) return
  const allGrouped = items().filter((i) => selectedIds.includes(i.id)).every((i) => i.groupId)
  if (allGrouped) return
  useCanvasStore.getState().groupItems(activeBoardId, selectedIds)
})

resolver.register(Actions.UNGROUP, () => {
  const { selectedIds, activeBoardId, items } = useCanvasStore.getState()
  if (!activeBoardId) return
  const groupIds = new Set(
    items()
      .filter((i) => selectedIds.includes(i.id) && i.groupId)
      .map((i) => i.groupId!)
  )
  groupIds.forEach((gid) => useCanvasStore.getState().ungroupItems(activeBoardId, gid))
})
```

---

## Context Menu

In `ContextMenu.tsx`, add two new conditional items after the existing divider + ordering buttons:

**Group** — shown when: `selectedIds.length >= 2` AND at least one selected item has no `groupId`:
```
Group  (Ctrl+G)
```

**Ungroup** — shown when: any selected item has a `groupId`:
```
Ungroup  (Ctrl+U)
```

Both close the menu after executing.

---

## Visual Indicator (`GroupLayer.tsx`)

New component mounted in `CanvasStage` alongside `ConnectionLayer`. Renders a dashed gold bounding rectangle around each group's combined bounds, converted to screen coordinates.

```
Padding: 6px outside the tightest bounding box
Stroke: #c8a96e, opacity 0.4, width 1, dash 5 4
Fill: none
Corner radius: 3
```

Only drawn when `groups.size > 0` (returns `<></>` otherwise). Positioned as `position: absolute; inset: 0; pointer-events: none; z-index: 1` — same layer as `ConnectionLayer`.

Bounding box computation ignores rotation (AABB — acceptable, consistent with snapping and lasso).

---

## Files Changed

| File | Change |
|---|---|
| `src/renderer/store/canvasStore.ts` | Add `groupItems`, `ungroupItems`, expand groups in `setSelection`/`addToSelection` |
| `src/renderer/keybinds/actions.ts` | Add `GROUP`, `UNGROUP` |
| `src/renderer/keybinds/defaultKeybinds.ts` | Bind `ctrl+g`, `ctrl+u` |
| `src/renderer/App.tsx` | Register GROUP and UNGROUP action handlers |
| `src/renderer/ui/ContextMenu.tsx` | Add Group/Ungroup menu items |
| `src/renderer/canvas/overlays/GroupLayer.tsx` | New — group bounding box overlay |
| `src/renderer/canvas/CanvasStage.tsx` | Import + mount `GroupLayer` |

---

## Out of Scope

- Drag-together (moving one item drags all group members simultaneously)
- Resize-together
- Nested groups
- Group naming
- Batch undo for group/ungroup (each item pushes its own ITEM_STYLE event)
