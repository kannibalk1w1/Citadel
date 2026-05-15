# Item Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing tag search panel into a global item search that selects, centers, and briefly highlights matching canvas items.

**Architecture:** Keep the existing `tagSearch` panel key and `Actions.PANEL_SEARCH` wiring. Add a lightweight highlight ID to `uiStore`, a Konva `SearchHighlight` overlay, and replace `TagSearch.tsx` internals with active-board item indexing and viewport-jump behavior.

**Tech Stack:** React, TypeScript, Zustand, Konva/react-konva.

---

## File Map

| File | Change |
|---|---|
| `src/renderer/store/uiStore.ts` | Add `searchHighlightId` and `setSearchHighlight` |
| `src/renderer/canvas/overlays/SearchHighlight.tsx` | New Konva overlay around the highlighted item |
| `src/renderer/canvas/CanvasStage.tsx` | Mount `SearchHighlight` in a non-listening Layer |
| `src/renderer/ui/TagSearch.tsx` | Replace tag-only search with global item search |

---

### Task 1: Add Search Highlight State

**Files:**
- Modify: `src/renderer/store/uiStore.ts`

- [ ] **Step 1: Add fields to `UIState` after search query**

```ts
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchHighlightId: string | null
  setSearchHighlight: (id: string | null) => void
```

- [ ] **Step 2: Add store implementation after `setSearchQuery`**

```ts
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchHighlightId: null,
  setSearchHighlight: (id) => set({ searchHighlightId: id }),
```

- [ ] **Step 3: Verify TypeScript**

Run:

```bash
npm run build
```

Expected: production build completes with no TypeScript errors.

---

### Task 2: Create `SearchHighlight`

**Files:**
- Create: `src/renderer/canvas/overlays/SearchHighlight.tsx`

- [ ] **Step 1: Create the overlay component**

```tsx
import React from 'react'
import { Rect } from 'react-konva'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'

export function SearchHighlight(): React.ReactElement | null {
  const highlightId = useUIStore((s) => s.searchHighlightId)
  const viewport = useCanvasStore((s) => s.viewport())
  const item = useCanvasStore((s) => s.items().find((i) => i.id === highlightId))

  if (!highlightId || !item) return null

  const pad = 8 / viewport.scale

  return (
    <Rect
      x={item.x - pad}
      y={item.y - pad}
      width={item.width + pad * 2}
      height={item.height + pad * 2}
      rotation={item.rotation}
      stroke="#c8a96e"
      strokeWidth={2 / viewport.scale}
      dash={[8 / viewport.scale, 5 / viewport.scale]}
      shadowEnabled
      shadowColor="rgba(200,169,110,0.85)"
      shadowBlur={16 / viewport.scale}
      shadowOpacity={0.9}
      listening={false}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run:

```bash
npm run build
```

Expected: production build completes with no TypeScript errors.

---

### Task 3: Mount Search Highlight Overlay

**Files:**
- Modify: `src/renderer/canvas/CanvasStage.tsx`

- [ ] **Step 1: Add import near other overlays**

```ts
import { SearchHighlight } from './overlays/SearchHighlight'
```

- [ ] **Step 2: Add non-listening layer after `SelectionBox`**

```tsx
        <Layer listening={false}>
          <SelectionBox />
        </Layer>
        <Layer listening={false}>
          <SearchHighlight />
        </Layer>
        <Layer>
          <LassoOverlay />
        </Layer>
```

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: production build completes with no TypeScript errors.

---

### Task 4: Upgrade `TagSearch.tsx` To Item Search

**Files:**
- Modify: `src/renderer/ui/TagSearch.tsx`

- [ ] **Step 1: Replace entire file with item-search implementation**

```tsx
import React from 'react'
import type { CanvasItem } from '../../types'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'

type SearchResult = {
  item: CanvasItem
  label: string
  detail: string
  haystack: string
}

function basename(value: string | undefined): string {
  if (!value) return ''
  const clean = value.split('?')[0].replace(/\\/g, '/')
  return clean.split('/').filter(Boolean).at(-1) ?? value
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function arrayText(value: unknown): string {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join(', ') : ''
}

function buildResult(item: CanvasItem): SearchResult {
  const content = textValue(item.meta?.content)
  const srcName = basename(item.src)
  const srcAName = basename(textValue(item.meta?.srcA))
  const srcBName = basename(textValue(item.meta?.srcB))
  const swatches = arrayText(item.meta?.colors)

  const label =
    content ||
    srcName ||
    srcAName ||
    srcBName ||
    swatches ||
    `${item.type} ${item.id.slice(0, 6)}`

  const detailParts = [
    item.type,
    item.tags.length ? `tags: ${item.tags.join(', ')}` : '',
    item.src ? `src: ${item.src}` : '',
    item.link ? `link: ${item.link}` : '',
    srcAName ? `A: ${srcAName}` : '',
    srcBName ? `B: ${srcBName}` : '',
    swatches ? `colors: ${swatches}` : '',
  ].filter(Boolean)

  const detail = detailParts.join('  |  ')
  const haystack = [
    item.type,
    item.id,
    item.tags.join(' '),
    item.src ?? '',
    item.link ?? '',
    content,
    textValue(item.meta?.srcA),
    textValue(item.meta?.srcB),
    swatches,
  ].join(' ').toLowerCase()

  return { item, label, detail, haystack }
}

export function TagSearch(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.tagSearch)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const setSearchHighlight = useUIStore((s) => s.setSearchHighlight)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateViewport = useCanvasStore((s) => s.updateViewport)
  const viewport = useCanvasStore((s) => s.viewport())
  const items = useCanvasStore((s) => s.items())

  if (!isOpen) return null

  const query = searchQuery.trim().toLowerCase()
  const results = query
    ? items.map(buildResult).filter((r) => r.haystack.includes(query)).slice(0, 30)
    : []

  const close = () => {
    setSearchQuery('')
    useUIStore.getState().closePanel('tagSearch')
  }

  const selectResult = (item: CanvasItem) => {
    const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
    const canvasW = window.innerWidth - sidebarW
    const cx = item.x + item.width / 2
    const cy = item.y + item.height / 2

    setSelection([item.id])
    updateViewport({
      x: canvasW / 2 - cx * viewport.scale,
      y: window.innerHeight / 2 - cy * viewport.scale,
    })
    setSearchHighlight(item.id)
    window.setTimeout(() => {
      if (useUIStore.getState().searchHighlightId === item.id) {
        useUIStore.getState().setSearchHighlight(null)
      }
    }, 900)
    close()
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 320,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: results.length > 0 || query ? 8 : 0 }}>
        <input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') close() }}
          placeholder="Search items..."
          style={{
            flex: 1,
            background: 'var(--bg-ui)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '5px 8px',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />
        <button
          onClick={close}
          title="Close (Escape)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 3,
          }}
        >
          x
        </button>
      </div>

      {query && results.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)', padding: '4px 2px' }}>
          No items found
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto' }}>
          {results.map(({ item, label, detail }) => (
            <button
              key={item.id}
              onClick={() => selectResult(item)}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                textAlign: 'left',
                color: 'var(--text-primary)',
                fontSize: 11,
                padding: '5px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
                <span style={{
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 4px',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {item.type}
                </span>
              </div>
              <div style={{
                color: 'var(--text-muted)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}>
                {detail}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: production build completes with no TypeScript errors.

---

### Task 5: Manual Verification

**Files:**
- No code changes.

- [ ] **Step 1: Start the app**

Run:

```bash
npm start
```

Expected: Electron app launches.

- [ ] **Step 2: Verify search behavior**

Manual checks:

- `Ctrl+F` opens the search panel.
- Searching `sticky` returns sticky notes.
- Searching an existing tag returns tagged items.
- Searching sticky/text content returns matching items.
- Selecting a result centers the viewport on the item.
- Selecting a result shows a brief dashed gold highlight.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/store/uiStore.ts src/renderer/canvas/overlays/SearchHighlight.tsx src/renderer/canvas/CanvasStage.tsx src/renderer/ui/TagSearch.tsx
git commit -m "feat: global item search with viewport jump and highlight"
```
