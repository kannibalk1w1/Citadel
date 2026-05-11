# Sticky Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline text editing to sticky notes with a floating toolbar for background colour, font size, alignment, and bold — all backed by a single undoable `ITEM_STYLE` history event.

**Architecture:** Two files only. `StickyItem.tsx` gains `fontSize`/`align`/`fontStyle` meta reads so the Konva canvas reflects saved styles. `TextEditOverlay.tsx` gains a `beforeMeta` snapshot ref, a `pendingMeta` live-preview state, an `applyMeta` helper, a `revert()` that restores `beforeMeta` on Escape, a history push on commit, and a sticky-only floating toolbar with colour/size/align/bold controls. All toolbar changes apply immediately as live previews; one `ITEM_STYLE` event is pushed only on blur/commit.

**Tech Stack:** React, Zustand (canvasStore, historyStore, uiStore), Konva/react-konva, Vitest, @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `src/renderer/canvas/items/StickyItem.tsx` | Read `fontSize`, `align`, `fontStyle` from `item.meta`; pass to Konva `<Text>` |
| `src/renderer/canvas/TextEditOverlay.tsx` | Add `beforeMeta`, `pendingMeta`, `applyMeta`, `revert`, history push, sticky toolbar |
| `src/renderer/canvas/TextEditOverlay.test.tsx` | New — unit tests for commit history push and Escape revert |

---

### Task 1: Update StickyItem to render fontSize, align, fontStyle from meta

**Files:**
- Modify: `src/renderer/canvas/items/StickyItem.tsx`

- [ ] **Step 1: Read the file**

Read `src/renderer/canvas/items/StickyItem.tsx`. Find the `const bg` and `const content` lines near the top of the component, then find the `<Text>` node in the JSX — it currently has `fontSize={14}` hardcoded and no `align` or `fontStyle` props.

- [ ] **Step 2: Add the three meta reads after `const content`**

After the line `const content = (item.meta?.content as string) ?? ''`, add:
```ts
const fontSize = (item.meta?.fontSize as number) ?? 14
const align = (item.meta?.align as string) ?? 'left'
const fontStyle = (item.meta?.fontStyle as string) ?? 'normal'
```

- [ ] **Step 3: Update the Konva Text node**

Replace the existing `<Text ... />` block (the one with `fontSize={14}`) with:
```tsx
<Text
  x={8} y={8}
  width={item.width - 16}
  height={item.height - 16}
  text={content || 'Double-click to edit…'}
  fill={content ? 'var(--text-primary)' : '#5c5040'}
  fontSize={fontSize}
  fontStyle={fontStyle}
  fontFamily="var(--font-body)"
  align={align}
  wrap="word"
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/canvas/items/StickyItem.tsx
git commit -m "feat: sticky renders fontSize/align/fontStyle from item.meta"
```

---

### Task 2: Add history tracking to TextEditOverlay.commit()

**Files:**
- Modify: `src/renderer/canvas/TextEditOverlay.tsx`
- Create: `src/renderer/canvas/TextEditOverlay.test.tsx`

- [ ] **Step 1: Check @testing-library/react is installed**

```bash
npm list @testing-library/react
```

If not listed, install it:
```bash
npm install --save-dev @testing-library/react @testing-library/user-event
```

- [ ] **Step 2: Write the failing test**

Create `src/renderer/canvas/TextEditOverlay.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import { TextEditOverlay } from './TextEditOverlay'

const mockUpdateItem = vi.fn()
const mockSetEditingItemId = vi.fn()
const mockPush = vi.fn()

vi.mock('../store/canvasStore', () => ({
  useCanvasStore: (sel: (s: unknown) => unknown) =>
    sel({
      viewport: () => ({ scale: 1, x: 0, y: 0 }),
      updateItem: mockUpdateItem,
      activeBoardId: 'board-1',
    }),
}))

vi.mock('../store/historyStore', () => ({
  useHistoryStore: Object.assign(
    (sel: (s: unknown) => unknown) => sel({ push: mockPush }),
    { getState: () => ({ push: mockPush }) },
  ),
}))

vi.mock('../store/uiStore', () => ({
  useUIStore: (sel: (s: unknown) => unknown) =>
    sel({ setEditingItemId: mockSetEditingItemId }),
}))

const item = {
  id: 'item-1',
  type: 'sticky' as const,
  x: 0, y: 0, width: 200, height: 150,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1,
  tags: [],
  meta: { content: 'hello', color: '#2a2820', fontSize: 14, align: 'left', fontStyle: 'normal' },
}

beforeEach(() => {
  mockUpdateItem.mockClear()
  mockPush.mockClear()
  mockSetEditingItemId.mockClear()
})

describe('TextEditOverlay — commit', () => {
  it('pushes ITEM_STYLE to historyStore on blur', () => {
    const { getByRole } = render(<TextEditOverlay item={item} />)
    const ta = getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'world' } })
    fireEvent.blur(ta)
    expect(mockPush).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith(
      'ITEM_STYLE',
      'board-1',
      { id: 'item-1', meta: item.meta },
      expect.objectContaining({
        id: 'item-1',
        meta: expect.objectContaining({ content: 'world' }),
      }),
    )
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
npm run test -- --reporter=verbose TextEditOverlay
```

Expected output: FAIL — `expect(mockPush).toHaveBeenCalledOnce()` — received 0 calls.

- [ ] **Step 4: Read the current TextEditOverlay**

Read `src/renderer/canvas/TextEditOverlay.tsx` in full to see the current imports and `commit` function.

- [ ] **Step 5: Add the historyStore import**

In `TextEditOverlay.tsx`, add after the `useUIStore` import line:
```ts
import { useHistoryStore } from '../store/historyStore'
```

- [ ] **Step 6: Add the beforeMeta ref and update commit**

After the line `const committed = useRef(false)`, add:
```ts
const beforeMeta = useRef<Record<string, unknown>>({ ...(item.meta ?? {}) })
```

Replace the existing `commit` function with:
```ts
const commit = () => {
  if (committed.current) return
  committed.current = true
  const val = ref.current?.value ?? ''
  const afterMeta = { ...(item.meta ?? {}), content: val }
  updateItem(activeBoardId, item.id, { meta: afterMeta })
  useHistoryStore.getState().push(
    'ITEM_STYLE',
    activeBoardId,
    { id: item.id, meta: beforeMeta.current },
    { id: item.id, meta: afterMeta },
  )
  close()
}
```

- [ ] **Step 7: Run the test to confirm it passes**

```bash
npm run test -- --reporter=verbose TextEditOverlay
```

Expected output: PASS

- [ ] **Step 8: Commit**

```bash
git add src/renderer/canvas/TextEditOverlay.tsx src/renderer/canvas/TextEditOverlay.test.tsx
git commit -m "feat: history push on TextEditOverlay commit (sticky + text items)"
```

---

### Task 3: Add pendingMeta state and Escape revert

**Files:**
- Modify: `src/renderer/canvas/TextEditOverlay.tsx`
- Modify: `src/renderer/canvas/TextEditOverlay.test.tsx`

- [ ] **Step 1: Write the failing Escape test**

Append to the `describe` blocks in `TextEditOverlay.test.tsx`:

```ts
describe('TextEditOverlay — escape', () => {
  it('restores beforeMeta via updateItem and does not push history', () => {
    const { getByRole } = render(<TextEditOverlay item={item} />)
    const ta = getByRole('textbox')
    fireEvent.keyDown(ta, { key: 'Escape' })
    expect(mockUpdateItem).toHaveBeenCalledWith('board-1', 'item-1', { meta: item.meta })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockSetEditingItemId).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm run test -- --reporter=verbose TextEditOverlay
```

Expected output: FAIL — `expect(mockUpdateItem).toHaveBeenCalledWith(...)` — current Escape only calls `close()`.

- [ ] **Step 3: Add useState to the React import**

In `TextEditOverlay.tsx`, change:
```ts
import React, { useEffect, useRef } from 'react'
```
to:
```ts
import React, { useEffect, useRef, useState } from 'react'
```

- [ ] **Step 4: Add pendingMeta state and applyMeta after beforeMeta**

After the `const beforeMeta = useRef(...)` line, add:
```ts
const [pendingMeta, setPendingMeta] = useState<Record<string, unknown>>({ ...(item.meta ?? {}) })

const applyMeta = (patch: Record<string, unknown>) => {
  const next = { ...pendingMeta, ...patch }
  setPendingMeta(next)
  updateItem(activeBoardId, item.id, { meta: { ...(item.meta ?? {}), ...next } })
}
```

- [ ] **Step 5: Add revert function after the existing commit function**

```ts
const revert = () => {
  if (committed.current) return
  committed.current = true
  updateItem(activeBoardId, item.id, { meta: beforeMeta.current })
  close()
}
```

- [ ] **Step 6: Update commit to use pendingMeta**

Replace the `commit` function added in Task 2 with:
```ts
const commit = () => {
  if (committed.current) return
  committed.current = true
  const val = ref.current?.value ?? ''
  const afterMeta = { ...pendingMeta, content: val }
  updateItem(activeBoardId, item.id, { meta: afterMeta })
  useHistoryStore.getState().push(
    'ITEM_STYLE',
    activeBoardId,
    { id: item.id, meta: beforeMeta.current },
    { id: item.id, meta: afterMeta },
  )
  close()
}
```

- [ ] **Step 7: Fix the isSicky typo and update the Escape handler**

Find and replace every occurrence of `isSicky` with `isSticky` in the file (there are ~7 occurrences across variable declaration and JSX).

In `onKeyDown`, replace:
```ts
if (e.key === 'Escape') { close() }
```
with:
```ts
if (e.key === 'Escape') { revert(); return }
```

Remove the dead-code line `if (e.key === 'Enter' && isSicky && !e.shiftKey) { /* allow newlines */ }` entirely.

- [ ] **Step 8: Run all tests to confirm they pass**

```bash
npm run test -- --reporter=verbose TextEditOverlay
```

Expected output: both describe blocks PASS (2 tests total).

- [ ] **Step 9: Commit**

```bash
git add src/renderer/canvas/TextEditOverlay.tsx src/renderer/canvas/TextEditOverlay.test.tsx
git commit -m "feat: pendingMeta state + Escape reverts live preview in TextEditOverlay"
```

---

### Task 4: Add the sticky floating toolbar

**Files:**
- Modify: `src/renderer/canvas/TextEditOverlay.tsx`

- [ ] **Step 1: Add module-level constants at the top of the file**

After the import block, before `type Props`, add:
```ts
const STICKY_COLORS = ['#2a2820', '#1a1f2a', '#1f2a1a', '#2a1a1a', '#2a2a1a', '#1a2a27'] as const
const FONT_SIZES = [
  { label: 'S', value: 12 },
  { label: 'M', value: 14 },
  { label: 'L', value: 18 },
] as const
const ALIGNS = [
  { label: 'L', value: 'left' },
  { label: 'C', value: 'center' },
  { label: 'R', value: 'right' },
] as const
const TOOLBAR_H = 38
```

- [ ] **Step 2: Replace the screen-space size variables**

In the component body, replace:
```ts
const fontSize = ((item.meta?.fontSize as number) ?? (item.type === 'sticky' ? 14 : 18)) * viewport.scale
const isSticky = item.type === 'sticky'
```
with:
```ts
const isSticky = item.type === 'sticky'
const displayFontSize = ((pendingMeta.fontSize as number) ?? (isSticky ? 14 : 18)) * viewport.scale
const toolbarTop = sy < TOOLBAR_H + 8 ? sy + sh + 4 : sy - TOOLBAR_H - 4
```

- [ ] **Step 3: Update the textarea style to reflect pendingMeta live**

In the `<textarea style={...}>` object, make these replacements:

| Old | New |
|---|---|
| `height: isSticky ? sh : Math.max(sh, fontSize * 1.6)` | `height: isSticky ? sh : Math.max(sh, displayFontSize * 1.6)` |
| `fontSize,` (the style prop) | `fontSize: displayFontSize,` |
| `background: isSticky ? (item.meta?.color as string ?? '#2a2820') : ...` | `background: isSticky ? ((pendingMeta.color as string) ?? '#2a2820') : 'rgba(15,13,11,0.85)',` |

Add these two new style props inside the textarea style object:
```ts
fontWeight: isSticky ? (pendingMeta.fontStyle === 'bold' ? 700 : 400) : 400,
textAlign: isSticky
  ? ((pendingMeta.align as string) ?? 'left') as React.CSSProperties['textAlign']
  : 'left',
```

- [ ] **Step 4: Change the return to a fragment and add the toolbar**

Replace the current `return (<textarea ... />)` with the full fragment below. The `<textarea>` content is identical to what was there after Step 3 above — only the wrapper and toolbar are new.

```tsx
return (
  <>
    {isSticky && (
      <div
        style={{
          position: 'fixed',
          left: sx,
          top: toolbarTop,
          height: TOOLBAR_H,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '5px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 201,
        }}
      >
        {/* Colour swatches */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STICKY_COLORS.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => { e.preventDefault(); applyMeta({ color: c }) }}
              style={{
                width: 16, height: 16,
                background: c,
                border: ((pendingMeta.color ?? '#2a2820') === c)
                  ? '1.5px solid var(--accent)'
                  : '1.5px solid var(--border)',
                borderRadius: 3,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            />
          ))}
          <input
            type="color"
            value={(pendingMeta.color as string) ?? '#2a2820'}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => applyMeta({ color: e.target.value })}
            style={{
              width: 16, height: 16,
              padding: 0, border: 'none', background: 'none', cursor: 'pointer',
            }}
            title="Custom colour"
          />
        </div>
        {/* Font size */}
        <div style={{ display: 'flex', gap: 2 }}>
          {FONT_SIZES.map(({ label, value }) => {
            const active = (pendingMeta.fontSize ?? 14) === value
            return (
              <button
                key={value}
                onMouseDown={(e) => { e.preventDefault(); applyMeta({ fontSize: value }) }}
                style={{
                  width: 22, height: 22,
                  background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                  color: active ? '#0f0d0b' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {/* Alignment */}
        <div style={{ display: 'flex', gap: 2 }}>
          {ALIGNS.map(({ label, value }) => {
            const active = (pendingMeta.align ?? 'left') === value
            return (
              <button
                key={value}
                onMouseDown={(e) => { e.preventDefault(); applyMeta({ align: value }) }}
                style={{
                  width: 22, height: 22,
                  background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                  color: active ? '#0f0d0b' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {/* Bold */}
        {(() => {
          const active = pendingMeta.fontStyle === 'bold'
          return (
            <button
              onMouseDown={(e) => { e.preventDefault(); applyMeta({ fontStyle: active ? 'normal' : 'bold' }) }}
              style={{
                width: 22, height: 22,
                background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                color: active ? '#0f0d0b' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: 0,
              }}
            >
              B
            </button>
          )
        })()}
      </div>
    )}
    <textarea
      ref={ref}
      defaultValue={(item.meta?.content as string) ?? ''}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') { revert(); return }
        if (e.key === 'Enter' && !isSticky) { e.preventDefault(); commit() }
      }}
      style={{
        position: 'fixed',
        left: sx,
        top: sy,
        width: sw,
        height: isSticky ? sh : Math.max(sh, displayFontSize * 1.6),
        fontSize: displayFontSize,
        fontFamily: isSticky
          ? 'var(--font-body)'
          : ((item.meta?.fontFamily as string) ?? 'var(--font-body)'),
        fontWeight: isSticky ? (pendingMeta.fontStyle === 'bold' ? 700 : 400) : 400,
        textAlign: isSticky
          ? ((pendingMeta.align as string) ?? 'left') as React.CSSProperties['textAlign']
          : 'left',
        color: isSticky
          ? 'var(--text-primary)'
          : ((item.meta?.color as string) ?? 'var(--text-primary)'),
        background: isSticky
          ? ((pendingMeta.color as string) ?? '#2a2820')
          : 'rgba(15,13,11,0.85)',
        border: '1.5px solid var(--accent)',
        borderRadius: isSticky ? 4 : 2,
        padding: isSticky ? 8 : '2px 4px',
        resize: 'none',
        outline: 'none',
        overflow: 'hidden',
        zIndex: 200,
        lineHeight: 1.4,
        boxSizing: 'border-box',
      }}
    />
  </>
)
```

- [ ] **Step 5: Run all tests**

```bash
npm run test -- --reporter=verbose TextEditOverlay
```

Expected output: 2 tests PASS (toolbar adds no new unit-testable behaviour).

- [ ] **Step 6: Start the dev server and verify manually**

```bash
npm run dev
```

Verify all of the following:

1. Double-click a sticky → textarea overlay appears with toolbar above it
2. Change colour swatch → sticky background updates live, active swatch gets accent ring
3. Click the `<input type="color">` → native picker opens, custom colour applies live
4. Click S / M / L → textarea font size changes live
5. Click L / C / R → textarea text alignment changes live
6. Click B → textarea text becomes bold live; clicking again unbolds
7. Blur the textarea → Konva sticky reflects all committed changes
8. Press Ctrl+Z → sticky reverts to state before editing opened
9. Open sticky near top edge of screen (within 46px of top) → toolbar appears below sticky
10. Press Escape mid-edit → all changes (text + toolbar) revert; nothing pushed to history
11. Double-click a text item → no toolbar, editing still works, commit still pushes history

- [ ] **Step 7: Commit**

```bash
git add src/renderer/canvas/TextEditOverlay.tsx
git commit -m "feat: sticky editing toolbar — colour, font size, alignment, bold"
```
