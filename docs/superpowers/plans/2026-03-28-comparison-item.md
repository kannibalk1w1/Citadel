# ComparisonItem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ComparisonItem skeleton with a fully-working A/B image comparison widget — Transformer resize, selection glow, snapping, history, a draggable divider with a visible handle, file-picker assignment, and OS drag-onto support.

**Architecture:** Three surgical file changes. `ComparisonItem.tsx` is a full replacement that follows the `StickyItem`/`GifItem` pattern (Group + Transformer). `ItemProperties.tsx` gets a new comparison section. `useFileDrop.ts` gets a pre-loop intercept that routes OS file drops landing on a comparison item directly to slot A or B.

**Tech Stack:** React, react-konva, Zustand, TypeScript, use-image, nanoid

---

## File Map

| File | Change |
|---|---|
| `src/renderer/canvas/items/ComparisonItem.tsx` | Full replacement |
| `src/renderer/ui/panels/ItemProperties.tsx` | Add comparison section (Set A / Set B buttons) |
| `src/renderer/canvas/useFileDrop.ts` | Add intercept before new-item creation loop |

---

### Task 1: Replace ComparisonItem.tsx

**Files:**
- Modify: `src/renderer/canvas/items/ComparisonItem.tsx`

- [ ] **Step 1: Replace the entire file with the implementation below**

Replace `src/renderer/canvas/items/ComparisonItem.tsx` with:

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { Group, Rect, Image as KonvaImage, Line, Circle, Text, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import useImage from 'use-image'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type Props = { item: CanvasItem }

const HANDLE_HIT_W = 24

export function ComparisonItem({ item }: Props): React.ReactElement {
  const [splitX, setSplitX] = useState(0.5)
  const dividerDragging = useRef(false)

  const groupRef = useRef<import('konva/lib/shapes/Group').Group>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)

  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const srcA = (item.meta?.srcA as string) ?? ''
  const srcB = (item.meta?.srcB as string) ?? ''
  const [imageA] = useImage(pathToUrl(srcA))
  const [imageB] = useImage(pathToUrl(srcB))

  const splitPx = item.width * splitX

  // ── Divider drag ────────────────────────────────────────────────────────────

  const startDividerDrag = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    dividerDragging.current = true
    const stage = e.target.getStage()
    const container = stage?.container()
    if (!container || !stage) return

    const savedCursor = container.style.cursor
    container.style.cursor = 'ew-resize'

    const onMove = (ev: MouseEvent) => {
      if (!dividerDragging.current) return
      const stageBox = container.getBoundingClientRect()
      const stageX = ev.clientX - stageBox.left
      const stagePos = stage.position()
      const stageScale = stage.scaleX()
      const canvasX = (stageX - stagePos.x) / stageScale - item.x
      setSplitX(Math.max(0, Math.min(1, canvasX / item.width)))
    }

    const onUp = () => {
      dividerDragging.current = false
      container.style.cursor = savedCursor
      container.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    container.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleDragStart = () => {
    dragStart.current = { x: item.x, y: item.y }
    spatialIndex.rebuild(useCanvasStore.getState().items())
  }

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dragged = { ...item, x: node.x(), y: node.y() }
    const viewport = useCanvasStore.getState().viewport()
    const snapped = snapItem(dragged, useCanvasStore.getState().items(), viewport)
    node.x(snapped.x)
    node.y(snapped.y)
    useUIStore.getState().bumpSnap()
  }

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    snapLines.length = 0
    useUIStore.getState().bumpSnap()
    const newX = e.target.x()
    const newY = e.target.y()
    updateItem(activeBoardId, item.id, { x: newX, y: newY })
    if (dragStart.current) {
      useHistoryStore.getState().push('ITEM_MOVE', activeBoardId,
        { id: item.id, x: dragStart.current.x, y: dragStart.current.y },
        { id: item.id, x: newX, y: newY }
      )
      dragStart.current = null
    }
  }

  const handleTransformStart = () => {
    transformStart.current = {
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      rotation: item.rotation,
    }
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(100, Math.abs(node.width() * node.scaleX())),
      height: Math.max(60, Math.abs(node.height() * node.scaleY())),
      rotation: node.rotation(),
    }
    node.scaleX(1)
    node.scaleY(1)
    updateItem(activeBoardId, item.id, after)
    if (transformStart.current) {
      useHistoryStore.getState().push('ITEM_STYLE', activeBoardId,
        { id: item.id, ...transformStart.current },
        { id: item.id, ...after }
      )
      transformStart.current = null
    }
  }

  return (
    <>
      <Group
        ref={groupRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable={toolMode === 'select' && !item.locked}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          if (toolMode !== 'select') return
          if (e.evt.shiftKey) {
            useCanvasStore.getState().addToSelection(item.id)
          } else {
            setSelection([item.id])
          }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          e.cancelBubble = true
          if (!isSelected) setSelection([item.id])
          openContextMenu(e.evt.clientX, e.evt.clientY)
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      >
        {/* ── Slot B — right / background ── */}
        {imageB ? (
          <KonvaImage
            image={imageB}
            x={0} y={0}
            width={item.width} height={item.height}
            opacity={item.opacity}
            listening={false}
          />
        ) : (
          <>
            <Rect
              x={0} y={0}
              width={item.width} height={item.height}
              fill="#1a1612"
              listening={false}
            />
            <Text
              x={item.width * 0.75}
              y={item.height / 2 - 8}
              offsetX={60}
              width={120}
              align="center"
              text="B — set image"
              fontSize={11}
              fill="#5c5040"
              fontFamily="Inter, DM Sans, sans-serif"
              listening={false}
            />
          </>
        )}

        {/* ── Slot A — left / clipped foreground ── */}
        {imageA ? (
          <KonvaImage
            image={imageA}
            x={0} y={0}
            width={item.width} height={item.height}
            opacity={item.opacity}
            clipX={0} clipY={0}
            clipWidth={splitPx} clipHeight={item.height}
            listening={false}
          />
        ) : (
          <>
            <Rect
              x={0} y={0}
              width={splitPx} height={item.height}
              fill="#221d18"
              listening={false}
            />
            <Text
              x={splitPx * 0.5}
              y={item.height / 2 - 8}
              offsetX={60}
              width={120}
              align="center"
              text="A — set image"
              fontSize={11}
              fill="#5c5040"
              fontFamily="Inter, DM Sans, sans-serif"
              listening={false}
            />
          </>
        )}

        {/* ── Divider line ── */}
        <Line
          points={[splitPx, 0, splitPx, item.height]}
          stroke="#c8a96e"
          strokeWidth={2}
          listening={false}
        />

        {/* ── Grab handle widget ── */}
        <Circle
          x={splitPx}
          y={item.height / 2}
          radius={10}
          fill="#c8a96e"
          listening={false}
        />
        <Text
          x={splitPx - 8}
          y={item.height / 2 - 6}
          text="‹ ›"
          fontSize={10}
          fill="#ffffff"
          fontFamily="JetBrains Mono, monospace"
          listening={false}
        />

        {/* ── Hit rect — transparent, catches divider drag ── */}
        <Rect
          x={splitPx}
          y={0}
          offsetX={HANDLE_HIT_W / 2}
          width={HANDLE_HIT_W}
          height={item.height}
          fill="transparent"
          onMouseDown={startDividerDrag}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'ew-resize'
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container()
            if (container && !dividerDragging.current) container.style.cursor = ''
          }}
        />

        {/* ── Selection glow ── */}
        {isSelected && (
          <Rect
            x={0} y={0}
            width={item.width} height={item.height}
            fill={undefined}
            stroke="#c8a96e"
            strokeWidth={2}
            shadowEnabled
            shadowColor="rgba(200,169,110,0.7)"
            shadowBlur={20}
            shadowOpacity={0.8}
            listening={false}
          />
        )}
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio={false}
          rotateEnabled
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run build 2>&1 | head -40
```
Expected: build completes with no TypeScript errors in `ComparisonItem.tsx`.

- [ ] **Step 3: Verify visually in dev**

Run `npm run dev`. Place a comparison item on the canvas (it's not yet toolbar-accessible by default — use the browser console: `window.__citadel?.addComparison()` if wired, or temporarily add `comparison` to the `swatch` click handler in `CanvasStage.tsx` to test).

Alternative quick test: open DevTools console and run:
```js
const store = window.__zustand_canvasStore?.getState?.()
// If not exposed, check App.tsx for a debug handle, or proceed to Task 2 first and use the file-picker to trigger the widget
```

If the store isn't exposed via a debug handle, skip the visual check for now — Task 2 will make the widget fully accessible via the properties panel after dropping a comparison item via the toolbar.

Actually, to verify: check the Toolbar for a 'comparison' tool mode or check if the `ItemRenderer` renders `ComparisonItem` for `type === 'comparison'`. Since `ItemRenderer` already routes to `ComparisonItem`, you can drop a comparison-typed item via any existing path.

The simplest verification: `npm run build` passes cleanly.

---

### Task 2: Add comparison section to ItemProperties

**Files:**
- Modify: `src/renderer/ui/panels/ItemProperties.tsx`

- [ ] **Step 1: Add the comparison-specific section**

In `src/renderer/ui/panels/ItemProperties.tsx`, find this block (just before the `<Divider label="Meta" />` line at the bottom of the return):

```tsx
      {/* ── Text-specific ── */}
      {item.type === 'text' && (
```

After the closing `)}` of that `text` block (around line 413), add:

```tsx
      {/* ── Comparison-specific ── */}
      {item.type === 'comparison' && (
        <>
          <Divider label="Comparison" />
          <ComparisonSlotRow
            label="A"
            src={(item.meta?.srcA as string) ?? ''}
            onSet={(path) => updateMeta({ srcA: path })}
            onClear={() => updateMeta({ srcA: '' })}
          />
          <ComparisonSlotRow
            label="B"
            src={(item.meta?.srcB as string) ?? ''}
            onSet={(path) => updateMeta({ srcB: path })}
            onClear={() => updateMeta({ srcB: '' })}
          />
        </>
      )}
```

- [ ] **Step 2: Add the ComparisonSlotRow helper component**

In `src/renderer/ui/panels/ItemProperties.tsx`, after the `AlignPanel` component definition (around line 224, just before `// ── Main export ──`), add:

```tsx
type IpcApi = { invoke: (channel: string, args: unknown) => Promise<unknown> }

function ComparisonSlotRow({
  label,
  src,
  onSet,
  onClear,
}: {
  label: string
  src: string
  onSet: (path: string) => void
  onClear: () => void
}): React.ReactElement {
  const filename = src ? src.split(/[\\/]/).pop() ?? src : null

  const pickFile = async () => {
    const ipc = (window as unknown as { ipc: IpcApi }).ipc
    const result = await ipc.invoke('file:openDialog', {}) as { path: string | null } | null
    if (result?.path) onSet(result.path)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 12, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {label}
      </span>

      {/* Thumbnail */}
      {src ? (
        <img
          src={'local:///' + src.replace(/\\/g, '/')}
          style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 2, flexShrink: 0, border: '1px solid var(--border)' }}
          alt=""
        />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)', flexShrink: 0 }} />
      )}

      {/* Path label */}
      <span style={{
        flex: 1,
        fontSize: 10,
        color: filename ? 'var(--text-secondary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {filename ?? 'None'}
      </span>

      {/* Set button */}
      <button
        onClick={pickFile}
        style={{
          background: 'var(--bg-ui)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 10,
          padding: '2px 6px',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}
      >
        Set…
      </button>

      {/* Clear button — only shown when src is set */}
      {src && (
        <button
          onClick={onClear}
          title="Clear"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-danger)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: '0 2px',
            flexShrink: 0,
          }}
        >×</button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build 2>&1 | head -40
```
Expected: no TypeScript errors in `ItemProperties.tsx`.

- [ ] **Step 4: Add comparison to the Toolbar so the widget can be placed**

The comparison item has no toolbar button yet. Add a temporary route so you can test it. In `src/renderer/canvas/CanvasStage.tsx`, inside `handleStageClick`, find the `swatch` block:

```tsx
    if (toolMode === 'swatch') {
```

After the closing `return` of the swatch block, add:

```tsx
    if (toolMode === 'comparison') {
      const item = {
        id: nanoid(), type: 'comparison' as const,
        x: cx - 200, y: cy - 150, width: 400, height: 300,
        rotation: 0, zIndex: Date.now(), locked: false, visible: true, opacity: 1,
        tags: [], meta: { srcA: '', srcB: '' },
      }
      useCanvasStore.getState().addItem(activeBoardId, item)
      useHistoryStore.getState().push('ITEM_ADD', activeBoardId, null, item)
      useCanvasStore.getState().setSelection([item.id])
      useUIStore.getState().setToolMode('select')
      return
    }
```

Then in `src/renderer/ui/Toolbar.tsx`, find the `TOOLS` array. After the `swatch` entry, add:

```tsx
  {
    mode: 'comparison' as ToolMode, label: 'Comparison', key: 'K',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="2" y="4" width="14" height="10" rx="1" />
        <line x1="9" y1="4" x2="9" y2="14" />
        <line x1="6" y1="7" x2="6" y2="11" />
        <line x1="12" y1="7" x2="12" y2="11" />
      </svg>
    ),
  },
```

Also add `'comparison'` to the `ToolMode` type if it isn't there already. Check `src/types/index.ts`:

```bash
grep -n "ToolMode" src/types/index.ts
```

If `ToolMode` is defined there, add `'comparison'` to the union. If it's in `uiStore.ts`, add it there.

- [ ] **Step 5: Verify visually in dev**

Run `npm run dev`. Press `K` (or click the comparison icon in the toolbar). Click on the canvas — a 400×300 comparison widget should appear with dark placeholder backgrounds and the labels "A — set image" and "B — set image".

Select it — the right sidebar panel should show a "Comparison" section with two rows (A and B), each showing a grey placeholder thumbnail, "None" label, and "Set…" button. Click "Set…" on row A — a native file picker dialog should open. Select an image — the thumbnail updates and the left half of the widget shows the image. Repeat for B.

Drag the divider — it should slide smoothly, updating the clip in real time. The gold circle handle should be visible on the divider.

---

### Task 3: Intercept OS file drops onto comparison items

**Files:**
- Modify: `src/renderer/canvas/useFileDrop.ts`

- [ ] **Step 1: Add the comparison drop intercept**

In `src/renderer/canvas/useFileDrop.ts`, find the `handleDrop` function. After the existing lines:

```ts
    const dropX = (e.clientX - viewport.x) / viewport.scale
    const dropY = (e.clientY - viewport.y) / viewport.scale
```

Add the intercept block immediately after (before `let offsetIndex = 0`):

```ts
    // ── Comparison drop intercept ──────────────────────────────────────────────
    // If the drop lands inside a comparison item, assign the first image file
    // to slot A (left half) or slot B (right half) instead of creating a new item.
    const allItems = useCanvasStore.getState().items()
    const hitComparison = allItems.find(
      (it) =>
        it.type === 'comparison' &&
        dropX >= it.x &&
        dropX <= it.x + it.width &&
        dropY >= it.y &&
        dropY <= it.y + it.height
    )

    if (hitComparison) {
      const firstFile = files[0] as ElectronFile
      const ext = firstFile?.name.split('.').pop()?.toLowerCase() ?? ''
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'svg'].includes(ext)
      if (isImage) {
        const boardId = useCanvasStore.getState().activeBoardId
        if (!boardId) return
        const slot = dropX < hitComparison.x + hitComparison.width / 2 ? 'srcA' : 'srcB'
        const newMeta = { ...hitComparison.meta, [slot]: firstFile.path }
        useCanvasStore.getState().updateItem(boardId, hitComparison.id, { meta: newMeta })
        useHistoryStore.getState().push(
          'ITEM_STYLE',
          boardId,
          hitComparison,
          { ...hitComparison, meta: newMeta }
        )
        triggerEffect('lightning-in')
        return
      }
    }
    // ── End comparison intercept ───────────────────────────────────────────────
```

Note: `useHistoryStore` is not currently imported in `useFileDrop.ts`. Add the import at the top of the file:

```ts
import { useHistoryStore } from '../store/historyStore'
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | head -40
```
Expected: no TypeScript errors in `useFileDrop.ts`.

- [ ] **Step 3: Verify visually in dev**

Run `npm run dev`. Place a comparison item (K + click). Then drag an image file from Windows Explorer and drop it onto the **left half** of the comparison widget — the A slot should fill with the image without a new canvas item being created. Drop another image onto the **right half** — the B slot fills. Drop a non-image file (e.g. `.mp3`) onto the widget — it should create a new audio item as normal (falls through to existing logic).

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Divider drag: native mousemove/mouseup on container, `splitX` local state, resets to 0.5 on load
- ✅ Divider visuals: `Line` + `Circle` + `Text` handle, all `listening={false}`
- ✅ Hit rect: transparent `Rect`, `onMouseDown` → `startDividerDrag`
- ✅ Cursor: set to `ew-resize` during divider drag, restored on mouseup
- ✅ Transformer + selection glow: Group ref + `trRef.current.nodes([groupRef.current])` in `useEffect`
- ✅ Snapping: `snapItem` + `spatialIndex.rebuild` + `snapLines.length = 0`
- ✅ History: `ITEM_MOVE` on drag end, `ITEM_STYLE` on transform end
- ✅ Empty slot placeholders: dark `Rect` + `Text` for each unset slot
- ✅ `pathToUrl` used for image loading
- ✅ ItemProperties: `ComparisonSlotRow` with thumbnail, filename, Set…, clear
- ✅ `file:openDialog` IPC channel used
- ✅ OS drag-onto: intercept in `useFileDrop.ts`, first image only, A/B by midpoint
- ✅ `lightning-in` mascot effect triggered on drag-onto assignment
- ✅ History pushed on drag-onto (`ITEM_STYLE`)
- ✅ Multi-file drag-onto: only first file used, remaining ignored (function returns early)

**Type check:** `ToolMode` union may not include `'comparison'` — Task 2 Step 4 includes a grep to verify and add it if missing.

**`useHistoryStore` import in `useFileDrop.ts`:** not present in the original file — Task 3 Step 1 explicitly adds it.
