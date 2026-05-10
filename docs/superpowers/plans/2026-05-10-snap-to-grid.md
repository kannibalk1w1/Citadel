# Snap to Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the grid visible only when snap is enabled, and add a toolbar toggle button.

**Architecture:** Two surgical edits. `CanvasBackground.tsx` returns null when `snapToGrid` is false. `Toolbar.tsx` gets a grid toggle button that calls `toggleSnapToGrid()`.

**Tech Stack:** React, Zustand, TypeScript

---

### Task 1: Hide grid when snap is off (CanvasBackground.tsx)

**Files:**
- Modify: `src/renderer/canvas/CanvasBackground.tsx`

- [ ] **Step 1: Read the file, then add snapToGrid subscription**

Read `src/renderer/canvas/CanvasBackground.tsx`. After the `const gridSize = useUIStore((s) => s.gridSize)` line, add:

```tsx
  const snapToGrid = useUIStore((s) => s.snapToGrid)
```

Then add an early return before the `return (` JSX:

```tsx
  if (!snapToGrid) return null
```

- [ ] **Step 2: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```
git add src/renderer/canvas/CanvasBackground.tsx
git commit -m "feat: hide grid when snapToGrid is off"
```

---

### Task 2: Add snap toggle button to Toolbar.tsx

**Files:**
- Modify: `src/renderer/ui/Toolbar.tsx`

- [ ] **Step 1: Read the file, add store subscriptions**

Read `src/renderer/ui/Toolbar.tsx`. Inside the `Toolbar` component, after the existing store subscriptions, add:

```tsx
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)
```

- [ ] **Step 2: Add the snap toggle button**

Find the YouTube button + inline input block (the one before the first `<div style={{ height: 1, background: 'var(--border)'` divider). Just before that divider, add the snap button:

```tsx
      <button
        title={`Snap to Grid (Ctrl+Shift+G) — ${snapToGrid ? 'On' : 'Off'}`}
        onClick={toggleSnapToGrid}
        style={{
          width: 36,
          height: 36,
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          background: snapToGrid ? 'var(--accent)' : 'transparent',
          color: snapToGrid ? 'var(--bg-ui)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-fast)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <line x1="5" y1="1" x2="5" y2="15" />
          <line x1="11" y1="1" x2="11" y2="15" />
          <line x1="1" y1="5" x2="15" y2="5" />
          <line x1="1" y1="11" x2="15" y2="11" />
        </svg>
      </button>
```

- [ ] **Step 3: Verify**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 4: Commit**

```
git add src/renderer/ui/Toolbar.tsx
git commit -m "feat: snap to grid toolbar toggle button"
```
