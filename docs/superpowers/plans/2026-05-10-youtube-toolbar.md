# YouTube Toolbar Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline YouTube URL input to the toolbar so users can place YouTube embed items on the canvas without dragging a file.

**Architecture:** Single file change — `Toolbar.tsx` gains two local state values (`youtubeOpen`, `youtubeUrl`), a URL validator, a placement handler, and a YouTube button with an inline expanding input. No new ToolMode, no store changes, no new files. The button lives outside the `TOOLS` array (like the recording and theme buttons) since it has custom click behaviour.

**Tech Stack:** React (useState), nanoid, Zustand (canvasStore read via getState), TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/renderer/ui/Toolbar.tsx` | Add YouTube button + inline URL input + placement logic |

---

### Task 1: Add YouTube button with inline URL input to Toolbar.tsx

**Files:**
- Modify: `src/renderer/ui/Toolbar.tsx`

- [ ] **Step 1: Read the current file**

Read `src/renderer/ui/Toolbar.tsx` in full before making any changes. You need to know the exact structure.

- [ ] **Step 2: Add imports**

At the top of `Toolbar.tsx`, add these imports after the existing ones:

```tsx
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
```

Note: `useUIStore`, `useMascotStore`, `useHistoryStore` may already be imported — only add what is missing.

- [ ] **Step 3: Add local state and helpers inside the `Toolbar` component**

Inside the `Toolbar` function, after the existing store subscriptions, add:

```tsx
  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeShake, setYoutubeShake] = useState(false)

  const isValidYouTubeUrl = (url: string): boolean =>
    url.includes('youtube.com') || url.includes('youtu.be')

  const closeYouTube = () => {
    setYoutubeOpen(false)
    setYoutubeUrl('')
  }

  const placeYouTube = () => {
    const url = youtubeUrl.trim()
    if (!url) return
    if (!isValidYouTubeUrl(url)) {
      setYoutubeShake(true)
      setTimeout(() => { setYoutubeShake(false); setYoutubeUrl('') }, 350)
      return
    }
    const vp = useCanvasStore.getState().viewport()
    const sidebarW = 164
    const canvasW = window.innerWidth - sidebarW
    const cx = (canvasW / 2 - vp.x) / vp.scale
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale
    const boardId = useCanvasStore.getState().activeBoardId
    if (!boardId) return
    const item = {
      id: nanoid(),
      type: 'youtube' as const,
      x: cx - 240, y: cy - 135,
      width: 480, height: 270,
      rotation: 0, zIndex: Date.now(),
      locked: false, visible: true, opacity: 1,
      tags: [], src: url, meta: {},
    }
    useCanvasStore.getState().addItem(boardId, item)
    useHistoryStore.getState().push('ITEM_ADD', boardId, null, item)
    useCanvasStore.getState().setSelection([item.id])
    useUIStore.getState().setToolMode('select')
    closeYouTube()
  }
```

- [ ] **Step 4: Add the shake keyframe style and YouTube button + input to the JSX**

In the toolbar's JSX `return`, find the first `<div style={{ height: 1, background: 'var(--border)'...` divider (the one before the Recording button). Just before that divider, add:

```tsx
      {/* ── YouTube ── */}
      <style>{`
        @keyframes ytShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-4px); }
          40%      { transform: translateX(4px); }
          60%      { transform: translateX(-3px); }
          80%      { transform: translateX(3px); }
        }
      `}</style>

      <button
        title="YouTube Embed (paste URL)"
        onClick={() => youtubeOpen ? closeYouTube() : setYoutubeOpen(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: youtubeOpen ? 'var(--accent)' : 'transparent',
          color: youtubeOpen ? 'var(--bg-ui)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2zm4.5 1.5 4 2.5-4 2.5V5.5z" />
        </svg>
      </button>

      {youtubeOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 2px 4px' }}>
          <input
            autoFocus
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') placeYouTube()
              if (e.key === 'Escape') closeYouTube()
            }}
            placeholder="youtube.com/watch?v=…"
            style={{
              width: 148,
              background: 'var(--bg-ui)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '4px 6px',
              outline: 'none',
              boxSizing: 'border-box',
              animation: youtubeShake ? 'ytShake 0.35s ease' : 'none',
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
            Enter to place · Esc to cancel
          </span>
        </div>
      )}
```

- [ ] **Step 5: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built` with no TypeScript errors.

- [ ] **Step 6: Commit**

```
git add src/renderer/ui/Toolbar.tsx
git commit -m "feat: add YouTube toolbar button with inline URL input"
```
