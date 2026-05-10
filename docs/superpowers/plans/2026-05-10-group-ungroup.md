# Group / Ungroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group canvas items so clicking one auto-selects all members; ungroup to dissolve.

**Architecture:** `canvasStore` gains `groupItems`/`ungroupItems` actions and group-aware selection expansion. `Actions` and keybinds get GROUP/UNGROUP entries, wired in `App.tsx`. `ContextMenu` gets conditional Group/Ungroup items. A new `GroupLayer` SVG component renders dashed group outlines, mounted in `CanvasStage`.

**Tech Stack:** React, Zustand, TypeScript, nanoid, SVG

---

## File Map

| File | Change |
|---|---|
| `src/renderer/store/canvasStore.ts` | Add `groupItems`, `ungroupItems`; expand groups in `setSelection`/`addToSelection` |
| `src/renderer/keybinds/actions.ts` | Add `GROUP`, `UNGROUP` |
| `src/renderer/keybinds/defaultKeybinds.ts` | Bind `ctrl+g`, `ctrl+u` |
| `src/renderer/App.tsx` | Register GROUP/UNGROUP handlers |
| `src/renderer/canvas/overlays/GroupLayer.tsx` | New — dashed group bounding box overlay |
| `src/renderer/canvas/CanvasStage.tsx` | Import + mount `GroupLayer` |
| `src/renderer/ui/ContextMenu.tsx` | Add Group/Ungroup menu items |

---

### Task 1: canvasStore — groupItems, ungroupItems, group-aware selection

**Files:**
- Modify: `src/renderer/store/canvasStore.ts`

- [ ] **Step 1: Read the file in full**

- [ ] **Step 2: Add `groupItems` and `ungroupItems` to the CanvasState type**

In the type block, after the `removeItems` / `moveItems` / `reorderItem` lines, add:

```ts
  groupItems: (boardId: string, ids: string[]) => void
  ungroupItems: (boardId: string, groupId: string) => void
```

- [ ] **Step 3: Add the implementations**

After the `reorderItem` implementation, add:

```ts
  groupItems: (boardId, ids) => {
    const gid = nanoid()
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id !== boardId ? b : {
          ...b,
          items: b.items.map((i) => ids.includes(i.id) ? { ...i, groupId: gid } : i),
        }
      ),
    }))
  },

  ungroupItems: (boardId, groupId) => {
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id !== boardId ? b : {
          ...b,
          items: b.items.map((i) => i.groupId === groupId ? { ...i, groupId: undefined } : i),
        }
      ),
    }))
  },
```

- [ ] **Step 4: Replace setSelection and addToSelection with group-aware versions**

Find these two lines near the bottom of the create call:
```ts
  setSelection: (ids) => set({ selectedIds: ids }),
  addToSelection: (id) => set((s) => ({ selectedIds: [...new Set([...s.selectedIds, id])] })),
```

Replace them with:

```ts
  setSelection: (ids) => {
    const allItems = get().items()
    const groupIds = new Set(
      ids.flatMap((id) => {
        const item = allItems.find((i) => i.id === id)
        return item?.groupId ? [item.groupId] : []
      })
    )
    const expanded = Array.from(new Set([
      ...ids,
      ...allItems.filter((i) => i.groupId && groupIds.has(i.groupId)).map((i) => i.id),
    ]))
    set({ selectedIds: expanded })
  },
  addToSelection: (id) => {
    const allItems = get().items()
    const item = allItems.find((i) => i.id === id)
    const toAdd = item?.groupId
      ? allItems.filter((i) => i.groupId === item.groupId).map((i) => i.id)
      : [id]
    set((s) => ({ selectedIds: Array.from(new Set([...s.selectedIds, ...toAdd])) }))
  },
```

- [ ] **Step 5: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 6: Commit**

```
git add src/renderer/store/canvasStore.ts
git commit -m "feat: groupItems/ungroupItems + group-aware selection in canvasStore"
```

---

### Task 2: Actions + keybinds + App.tsx handlers

**Files:**
- Modify: `src/renderer/keybinds/actions.ts`
- Modify: `src/renderer/keybinds/defaultKeybinds.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Add GROUP and UNGROUP to actions.ts**

Read `src/renderer/keybinds/actions.ts`. In the `// ── Snap / align` section, after `TOGGLE_SNAP`, add:

```ts
  // ── Grouping ──────────────────────────────────────────────────────────────
  GROUP:   'group:create',
  UNGROUP: 'group:dissolve',
```

- [ ] **Step 2: Add keybinds to defaultKeybinds.ts**

Read `src/renderer/keybinds/defaultKeybinds.ts`. After the `TOGGLE_SNAP` binding, add:

```ts
  [Actions.GROUP]:   ['ctrl+g'],
  [Actions.UNGROUP]: ['ctrl+u'],
```

- [ ] **Step 3: Register handlers in App.tsx**

Read `src/renderer/App.tsx`. In the keybind wiring `useEffect`, after the `TOGGLE_SNAP` handler, add:

```tsx
    resolver.register(Actions.GROUP, () => {
      const { selectedIds, activeBoardId, items } = useCanvasStore.getState()
      if (!activeBoardId || selectedIds.length < 2) return
      const selectedItems = items().filter((i) => selectedIds.includes(i.id))
      if (selectedItems.every((i) => i.groupId)) return
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

- [ ] **Step 4: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 5: Commit**

```
git add src/renderer/keybinds/actions.ts src/renderer/keybinds/defaultKeybinds.ts src/renderer/App.tsx
git commit -m "feat: GROUP/UNGROUP actions, keybinds ctrl+g/ctrl+u, App.tsx handlers"
```

---

### Task 3: GroupLayer.tsx — dashed group outlines

**Files:**
- Create: `src/renderer/canvas/overlays/GroupLayer.tsx`

- [ ] **Step 1: Create the file**

Write exactly this to `src/renderer/canvas/overlays/GroupLayer.tsx`:

```tsx
import React from 'react'
import type { Viewport } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'

type Props = { viewport: Viewport }

export function GroupLayer({ viewport }: Props): React.ReactElement {
  const items = useCanvasStore((s) => s.items())

  const groups = new Map<string, typeof items>()
  for (const item of items) {
    if (!item.groupId) continue
    if (!groups.has(item.groupId)) groups.set(item.groupId, [])
    groups.get(item.groupId)!.push(item)
  }

  if (groups.size === 0) return <></>

  const PAD = 6

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      {Array.from(groups.entries()).map(([gid, members]) => {
        const minX = Math.min(...members.map((i) => i.x))
        const minY = Math.min(...members.map((i) => i.y))
        const maxX = Math.max(...members.map((i) => i.x + i.width))
        const maxY = Math.max(...members.map((i) => i.y + i.height))
        const sx = (minX - PAD) * viewport.scale + viewport.x
        const sy = (minY - PAD) * viewport.scale + viewport.y
        const sw = (maxX - minX + PAD * 2) * viewport.scale
        const sh = (maxY - minY + PAD * 2) * viewport.scale
        return (
          <rect
            key={gid}
            x={sx} y={sy}
            width={sw} height={sh}
            fill="none"
            stroke="#c8a96e"
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.4}
            rx={3}
          />
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```
git add src/renderer/canvas/overlays/GroupLayer.tsx
git commit -m "feat: GroupLayer SVG overlay — dashed group bounding boxes"
```

---

### Task 4: Mount GroupLayer in CanvasStage + add to ContextMenu

**Files:**
- Modify: `src/renderer/canvas/CanvasStage.tsx`
- Modify: `src/renderer/ui/ContextMenu.tsx`

- [ ] **Step 1: Mount GroupLayer in CanvasStage**

Read `src/renderer/canvas/CanvasStage.tsx`.

Add import after the existing overlay imports:
```ts
import { GroupLayer } from './overlays/GroupLayer'
```

In the JSX return, find where `<ConnectionLayer ... />` is rendered. Add `<GroupLayer>` directly after it:
```tsx
<GroupLayer viewport={viewport} />
```

- [ ] **Step 2: Add Group/Ungroup to ContextMenu**

Read `src/renderer/ui/ContextMenu.tsx`.

After the `hasSelection` constant, add:
```tsx
  const allItems = useCanvasStore((s) => s.items())
  const selectedItems = allItems.filter((i) => selectedIds.includes(i.id))
  const canGroup = selectedIds.length >= 2 && selectedItems.some((i) => !i.groupId)
  const canUngroup = selectedItems.some((i) => !!i.groupId)
```

In the `items` array, after the existing divider + ordering buttons block, add a second divider and the Group/Ungroup entries:

```tsx
    ...(canGroup || canUngroup ? [
      { divider: true, label: '', action: () => {} },
      ...(canGroup ? [{
        label: 'Group  (Ctrl+G)',
        action: () => {
          useCanvasStore.getState().groupItems(activeBoardId!, selectedIds)
          closeContextMenu()
        },
      }] : []),
      ...(canUngroup ? [{
        label: 'Ungroup  (Ctrl+U)',
        action: () => {
          const groupIds = new Set(
            selectedItems.filter((i) => i.groupId).map((i) => i.groupId!)
          )
          groupIds.forEach((gid) => useCanvasStore.getState().ungroupItems(activeBoardId!, gid))
          closeContextMenu()
        },
      }] : []),
    ] : []),
```

- [ ] **Step 3: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 4: Commit**

```
git add src/renderer/canvas/CanvasStage.tsx src/renderer/ui/ContextMenu.tsx
git commit -m "feat: mount GroupLayer in canvas, add Group/Ungroup to context menu"
```
