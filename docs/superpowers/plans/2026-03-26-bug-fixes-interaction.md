# Bug Fixes — Interaction & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six reported bugs: middle-mouse pan, background not tracking pan, text resize broken, no theme toggle UI, swatch hex text colour wrong, and no selection glow on items.

**Architecture:** All fixes are surgical edits to existing files. No new files needed. No TypeScript types change. Items use Konva's `shadowEnabled`/`stroke` props for selection glow. Middle-mouse pan uses native DOM event listeners attached in a `useEffect` to avoid Konva event interception. Background tracking is fixed by adding `onDragMove` to the Konva Stage.

**Tech Stack:** React, Konva / react-konva, Zustand, TypeScript

---

## File Map

| File | Bugs fixed |
|---|---|
| `src/renderer/canvas/CanvasStage.tsx` | Middle-mouse pan (Bug 1), Background tracks pan (Bug 2) |
| `src/renderer/canvas/items/TextItem.tsx` | Text resize (Bug 3), Text selection glow (Bug 6) |
| `src/renderer/ui/Toolbar.tsx` | Theme toggle (Bug 4) |
| `src/renderer/canvas/items/SwatchItem.tsx` | Swatch hex text (Bug 5), Swatch selection glow (Bug 6) |
| `src/renderer/canvas/items/ImageItem.tsx` | Image selection glow (Bug 6) |
| `src/renderer/canvas/items/GifItem.tsx` | Gif selection glow + add missing Transformer (Bug 6) |
| `src/renderer/canvas/items/StickyItem.tsx` | Sticky selection glow (Bug 6) |

---

### Task 1: CanvasStage — Middle-mouse pan + background tracking

**Files:**
- Modify: `src/renderer/canvas/CanvasStage.tsx`

**Root causes:**
- Bug 1: No `mousedown` handler checks for `button === 1`. Middle click is never intercepted.
- Bug 2: `onDragEnd` updates the store — but `CanvasBackground` reads store viewport on every render. During drag, the store doesn't update so the background stays frozen. Fix: add `onDragMove` to continuously update the store.

- [ ] **Step 1: Add `containerRef`, `isPanning`, and `panStart` refs after the existing refs**

In `src/renderer/canvas/CanvasStage.tsx`, after the existing `const stageRef = useRef<Konva.Stage>(null)` line, add:

```tsx
const containerRef = useRef<HTMLDivElement>(null)
const isPanning = useRef(false)
const panStart = useRef<{ mouseX: number; mouseY: number; vpX: number; vpY: number } | null>(null)
```

- [ ] **Step 2: Add the middle-mouse native event listener useEffect**

After the existing `handleMouseMove` callback, add this `useEffect` (before the `SIDEBAR_W` constant):

```tsx
// ── Middle-mouse pan ────────────────────────────────────────────────────────
useEffect(() => {
  const el = containerRef.current
  if (!el) return

  const onDown = (e: MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    const vp = useCanvasStore.getState().viewport()
    isPanning.current = true
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, vpX: vp.x, vpY: vp.y }
  }

  const onMove = (e: MouseEvent) => {
    if (!isPanning.current || !panStart.current) return
    const dx = e.clientX - panStart.current.mouseX
    const dy = e.clientY - panStart.current.mouseY
    useCanvasStore.getState().updateViewport({
      x: panStart.current.vpX + dx,
      y: panStart.current.vpY + dy,
    })
  }

  const onUp = (e: MouseEvent) => {
    if (e.button !== 1) return
    isPanning.current = false
    panStart.current = null
  }

  el.addEventListener('mousedown', onDown)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  return () => {
    el.removeEventListener('mousedown', onDown)
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
}, [])
```

- [ ] **Step 3: Add `onDragMove` to the Konva Stage**

Find the `<Stage` element. After the existing `onDragEnd` handler, add:

```tsx
onDragMove={(e) => {
  if (e.target === stageRef.current) {
    updateViewport({ x: stageRef.current.x(), y: stageRef.current.y() })
  }
}}
```

- [ ] **Step 4: Add `ref={containerRef}` to the wrapper div**

Find the outer `<div` (the one with `position: 'absolute', inset: 0, cursor: ...`). Change it to:

```tsx
<div
  ref={containerRef}
  style={{
    position: 'absolute',
    inset: 0,
    cursor: CURSOR[toolMode] ?? CURSOR.default,
    zIndex: 0,
  }}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
```

- [ ] **Step 5: Verify**

Run `npm run dev`. Pan with the pan tool (H) — the background pattern should move in sync with the canvas items. Hold middle mouse button anywhere on the canvas and drag — the view should pan regardless of the active tool.

---

### Task 2: TextItem — Transformer + resize + selection glow

**Files:**
- Modify: `src/renderer/canvas/items/TextItem.tsx`

**Root cause:** `TextItem` renders a bare Konva `<Text>` with no `Transformer`, no resize handlers, no `height` prop, and no selection feedback.

- [ ] **Step 1: Replace the entire file contents**

Replace `src/renderer/canvas/items/TextItem.tsx` with:

```tsx
import React, { useEffect, useRef } from 'react'
import { Text, Rect, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { snapItem } from '../snapping/snapEngine'
import { spatialIndex } from '../snapping/spatialIndex'
import { snapLines } from '../overlays/SnapGuides'

type Props = { item: CanvasItem }

export function TextItem({ item }: Props): React.ReactElement {
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const setEditingItemId = useUIStore((s) => s.setEditingItemId)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  const textRef = useRef<import('konva/lib/shapes/Text').Text>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const content = (item.meta?.content as string) ?? ''
  const fontSize = (item.meta?.fontSize as number) ?? 16
  const fontStyle = (item.meta?.fontStyle as string) ?? 'normal'
  const align = (item.meta?.align as string) ?? 'left'
  const color = (item.meta?.color as string) ?? 'var(--text-primary)'

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (toolMode !== 'select') return
    if (e.evt.shiftKey) {
      useCanvasStore.getState().addToSelection(item.id)
    } else {
      setSelection([item.id])
    }
  }

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
    const node = textRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(60, node.width() * node.scaleX()),
      height: Math.max(20, node.height() * node.scaleY()),
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
      {isSelected && (
        <Rect
          x={item.x - 4} y={item.y - 4}
          width={item.width + 8} height={item.height + 8}
          fill={undefined}
          stroke="#c8a96e"
          strokeWidth={1.5}
          shadowEnabled
          shadowColor="rgba(200,169,110,0.7)"
          shadowBlur={16}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Text
        ref={textRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        text={content || 'Double-click to edit…'}
        fontSize={fontSize}
        fontFamily="var(--font-body)"
        fontStyle={content ? fontStyle : 'normal'}
        align={align}
        fill={content ? color : '#5c5040'}
        wrap="word"
        draggable={toolMode === 'select' && !item.locked}
        onClick={handleClick}
        onDblClick={(e) => {
          e.cancelBubble = true
          setSelection([item.id])
          setEditingItemId(item.id)
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
      />
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

- [ ] **Step 2: Verify**

Run `npm run dev`. Place a text item (T + click). Select it — a gold glow border should appear around it. Drag a resize handle — the text box should resize and text should reflow to fill the new width.

---

### Task 3: Toolbar — Theme toggle button

**Files:**
- Modify: `src/renderer/ui/Toolbar.tsx`

**Root cause:** `uiStore` has `theme` and `setTheme` but no UI button calls them.

- [ ] **Step 1: Add `theme` and `setTheme` to the destructured store values**

In `src/renderer/ui/Toolbar.tsx`, find:
```tsx
const clearEffect = useMascotStore((s) => s.clearEffect)
```
After it, add:
```tsx
const theme = useUIStore((s) => s.theme)
const setTheme = useUIStore((s) => s.setTheme)
```

- [ ] **Step 2: Add the theme toggle button at the bottom of the toolbar**

Find the final `</div>` that closes the toolbar. Just before it, add:

```tsx
      <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px' }} />

      <button
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="3" />
            <line x1="8" y1="1" x2="8" y2="2.5" />
            <line x1="8" y1="13.5" x2="8" y2="15" />
            <line x1="1" y1="8" x2="2.5" y2="8" />
            <line x1="13.5" y1="8" x2="15" y2="8" />
            <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
            <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
            <line x1="12.95" y1="3.05" x2="11.9" y2="4.1" />
            <line x1="4.1" y1="11.9" x2="3.05" y2="12.95" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" />
          </svg>
        )}
      </button>
```

- [ ] **Step 3: Verify**

Run `npm run dev`. The toolbar should have a sun icon at the bottom. Clicking it should toggle the `data-theme` attribute on `<html>` between `"dark"` and `"light"` (visible in DevTools → Elements). Since `light.css` is currently a stub, the visual appearance won't change — but the attribute flip confirms the wiring works.

---

### Task 4: SwatchItem — Swatch-coloured hex text + semi-transparent backdrop + selection glow

**Files:**
- Modify: `src/renderer/canvas/items/SwatchItem.tsx`

**Root cause:** Hex text uses `fill="var(--text-secondary)"` (always grey) instead of the swatch colour. No backdrop rect exists under the text. No selection glow.

- [ ] **Step 1: Replace the colour swatch rendering block inside the `<Group>`**

In `src/renderer/canvas/items/SwatchItem.tsx`, find and replace the entire `{colors.map(...)}` block:

```tsx
        {colors.map((color, i) => (
          <React.Fragment key={i}>
            <Rect
              x={swatchX(i)} y={0}
              width={swatchW(i)} height={item.height - 20}
              fill={color} opacity={item.opacity}
            />
            {/* Semi-transparent backdrop for hex label */}
            <Rect
              x={swatchX(i)} y={item.height - 20}
              width={swatchW(i)} height={20}
              fill="rgba(0,0,0,0.45)"
              listening={false}
            />
            <Text
              x={swatchX(i) + 2}
              y={item.height - 16}
              width={swatchW(i) - 4}
              text={color.toUpperCase()}
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill={color}
              align="center"
              listening={false}
            />
          </React.Fragment>
        ))}
        {/* Selection glow overlay */}
        {isSelected && (
          <Rect
            x={0} y={0}
            width={item.width} height={item.height}
            fill={undefined}
            stroke="#c8a96e"
            strokeWidth={1.5}
            shadowEnabled
            shadowColor="rgba(200,169,110,0.7)"
            shadowBlur={16}
            listening={false}
          />
        )}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Create a colour swatch (W + click). The hex labels at the bottom should now be coloured to match their respective swatch, with a dark semi-transparent strip behind them for readability. Selecting the swatch should show a gold glow border.

---

### Task 5: ImageItem — Selection glow

**Files:**
- Modify: `src/renderer/canvas/items/ImageItem.tsx`

**Root cause:** `KonvaImage` has no `shadow*` props. The Transformer provides resize handles but no visual highlight.

- [ ] **Step 1: Replace the stroke/shadow props on the `<KonvaImage>` node**

In `src/renderer/canvas/items/ImageItem.tsx`, find the `<KonvaImage` element. Replace the existing:

```tsx
        stroke={isConnectSource ? '#c8a96e' : undefined}
        strokeWidth={isConnectSource ? 2 : 0}
```

With:

```tsx
        stroke={isConnectSource || isSelected ? '#c8a96e' : undefined}
        strokeWidth={isConnectSource || isSelected ? 2 : 0}
        shadowEnabled={isSelected}
        shadowColor="rgba(200,169,110,0.7)"
        shadowBlur={20}
        shadowOpacity={0.8}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Drop an image on the canvas. Click it — it should gain a gold border and a soft gold glow. The glow should disappear when you click elsewhere.

---

### Task 6: GifItem — Transformer + selection glow

**Files:**
- Modify: `src/renderer/canvas/items/GifItem.tsx`

**Root cause:** `GifItem` has `isSelected` state but no Transformer and no selection glow. Resize handles never appear.

- [ ] **Step 1: Replace the entire file contents**

Replace `src/renderer/canvas/items/GifItem.tsx` with:

```tsx
import React, { useEffect, useRef } from 'react'
import { Image as KonvaImage, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
// gifler is a browserify bundle — it has no ESM default export.
// It does set window.gifler itself, so we use a side-effect import + window access.
import 'gifler'
import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../../types'

type GiflerFn = (src: string) => {
  frames(canvas: HTMLCanvasElement, fn: (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => void): void
  stop(): void
}
const getGifler = (): GiflerFn => (window as unknown as { gifler: GiflerFn }).gifler
import { useCanvasStore } from '../../store/canvasStore'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'

type Props = { item: CanvasItem }

export function GifItem({ item }: Props): React.ReactElement | null {
  const imageRef = useRef<Konva.Image>(null)
  const trRef = useRef<import('konva/lib/shapes/Transformer').Transformer>(null)
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const transformStart = useRef<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const toolMode = useUIStore((s) => s.toolMode)
  const openContextMenu = useUIStore((s) => s.openContextMenu)

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  useEffect(() => {
    if (!item.src) return
    const anim = getGifler()(pathToUrl(item.src))
    anim.frames(canvasRef.current, (ctx: CanvasRenderingContext2D, frame: { buffer: HTMLCanvasElement }) => {
      canvasRef.current.width = frame.buffer.width
      canvasRef.current.height = frame.buffer.height
      ctx.drawImage(frame.buffer, 0, 0)
      imageRef.current?.getLayer()?.batchDraw()
    })
    return () => anim.stop?.()
  }, [item.src])

  const handleTransformStart = () => {
    transformStart.current = {
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      rotation: item.rotation,
    }
  }

  const handleTransformEnd = () => {
    const node = imageRef.current
    if (!node) return
    const after = {
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * node.scaleX()),
      height: Math.max(10, node.height() * node.scaleY()),
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
      <KonvaImage
        ref={imageRef}
        image={canvasRef.current}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        opacity={item.opacity}
        stroke={isSelected ? '#c8a96e' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        shadowEnabled={isSelected}
        shadowColor="rgba(200,169,110,0.7)"
        shadowBlur={20}
        shadowOpacity={0.8}
        draggable={toolMode === 'select' && !item.locked}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true
          if (toolMode === 'connect') {
            const ui = useUIStore.getState()
            const canvas = useCanvasStore.getState()
            if (!ui.connectFromId) {
              ui.setConnectFromId(item.id)
            } else if (ui.connectFromId !== item.id) {
              const conn: Connection = {
                id: nanoid(), fromId: ui.connectFromId, toId: item.id,
                fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier',
                color: '#c8a96e', width: 1.5, arrowHead: 'arrow', dashed: false,
              }
              canvas.addConnection(activeBoardId, conn)
              useHistoryStore.getState().push('CONNECTION_ADD', activeBoardId, null, conn)
              ui.setConnectFromId(null)
              ui.setToolMode('select')
            }
            return
          }
          if (toolMode === 'select') {
            if (e.evt.shiftKey) {
              useCanvasStore.getState().addToSelection(item.id)
            } else {
              setSelection([item.id])
            }
          }
        }}
        onContextMenu={(e: KonvaEventObject<PointerEvent>) => {
          e.evt.preventDefault()
          e.cancelBubble = true
          if (!isSelected) setSelection([item.id])
          openContextMenu(e.evt.clientX, e.evt.clientY)
        }}
        onDragStart={() => { dragStart.current = { x: item.x, y: item.y } }}
        onDragEnd={(e) => {
          const newX = e.target.x(), newY = e.target.y()
          updateItem(activeBoardId, item.id, { x: newX, y: newY })
          if (dragStart.current) {
            useHistoryStore.getState().push('ITEM_MOVE', activeBoardId,
              { id: item.id, x: dragStart.current.x, y: dragStart.current.y },
              { id: item.id, x: newX, y: newY }
            )
            dragStart.current = null
          }
        }}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer ref={trRef} keepRatio={false} rotateEnabled />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Drop a GIF on the canvas. Click it — a gold border glow should appear and resize handles should show. Drag a handle — the GIF should resize.

---

### Task 7: StickyItem — Selection glow

**Files:**
- Modify: `src/renderer/canvas/items/StickyItem.tsx`

**Root cause:** The background `<Rect>` in `StickyItem` has no shadow or stroke for selection feedback. The Transformer provides handles but no visual highlight.

- [ ] **Step 1: Add shadow and stroke to the background Rect when selected**

In `src/renderer/canvas/items/StickyItem.tsx`, find the `<Rect` that renders the sticky background:

```tsx
        <Rect
          width={item.width}
          height={item.height}
          fill={bg}
          cornerRadius={4}
          opacity={item.opacity}
        />
```

Replace it with:

```tsx
        <Rect
          width={item.width}
          height={item.height}
          fill={bg}
          cornerRadius={4}
          opacity={item.opacity}
          stroke={isSelected ? '#c8a96e' : undefined}
          strokeWidth={isSelected ? 2 : 0}
          shadowEnabled={isSelected}
          shadowColor="rgba(200,169,110,0.7)"
          shadowBlur={20}
          shadowOpacity={0.8}
        />
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Place a sticky note (N + click). Click it — it should gain a gold border glow. The glow should disappear when clicking elsewhere.
