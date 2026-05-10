# YOU SAVED Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable Dark Souls-style "YOU SAVED" full-screen overlay that fires on manual save.

**Architecture:** Three surgical file changes plus one new component. `uiStore` gets two new fields (`youSavedEnabled`, `youSavedVisible`) and three actions. `YouSavedBanner.tsx` is a self-contained overlay component mounted once in `App.tsx`. The SAVE action handler in `App.tsx` is extended to call `showYouSaved()` after a successful save when the feature is enabled. A toggle row is added to `KeybindSettings.tsx`. Persistence uses the existing `settings:get` / `settings:set` IPC channels.

**Tech Stack:** React, Zustand, TypeScript, CSS keyframe animation (injected via `<style>` tag), Electron IPC

---

## File Map

| File | Change |
|---|---|
| `src/renderer/store/uiStore.ts` | Add `youSavedEnabled`, `youSavedVisible`, `showYouSaved`, `hideYouSaved`, `setYouSavedEnabled` |
| `src/renderer/ui/YouSavedBanner.tsx` | New component — overlay with animation |
| `src/renderer/App.tsx` | Mount banner, extend SAVE action, load setting on startup |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add toggle row |

---

### Task 1: Extend uiStore with YOU SAVED state

**Files:**
- Modify: `src/renderer/store/uiStore.ts`

- [ ] **Step 1: Add the two new fields and three actions to `UIState`**

In `src/renderer/store/uiStore.ts`, in the `UIState` type block, add after the `_snapTick` / `bumpSnap` lines:

```ts
  // YOU SAVED banner
  youSavedEnabled: boolean
  youSavedVisible: boolean
  showYouSaved: () => void
  hideYouSaved: () => void
  setYouSavedEnabled: (enabled: boolean) => void
```

- [ ] **Step 2: Add the implementations to the `create` call**

In the `create<UIState>((set) => ({` block, after the `bumpSnap` implementation, add:

```ts
  youSavedEnabled: false,
  youSavedVisible: false,
  showYouSaved: () => set({ youSavedVisible: true }),
  hideYouSaved: () => set({ youSavedVisible: false }),
  setYouSavedEnabled: (enabled) => {
    set({ youSavedEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.youSavedEnabled', value: enabled }).catch(console.error)
  },
```

- [ ] **Step 3: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error|warning|✓"
```

Expected: `✓ built` with no TypeScript errors in `uiStore.ts`.

- [ ] **Step 4: Commit**

```
git add src/renderer/store/uiStore.ts
git commit -m "feat: add youSaved state to uiStore"
```

---

### Task 2: Create YouSavedBanner component

**Files:**
- Create: `src/renderer/ui/YouSavedBanner.tsx`

- [ ] **Step 1: Create the file**

Create `src/renderer/ui/YouSavedBanner.tsx` with exactly this content:

```tsx
import React from 'react'
import { useUIStore } from '../store/uiStore'

const STYLE = `
@keyframes youSavedAnim {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
`

export function YouSavedBanner(): React.ReactElement | null {
  const visible = useUIStore((s) => s.youSavedVisible)
  const hideYouSaved = useUIStore((s) => s.hideYouSaved)

  if (!visible) return null

  return (
    <>
      <style>{STYLE}</style>
      <div
        onAnimationEnd={hideYouSaved}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.70)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'youSavedAnim 2.5s ease-in-out forwards',
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: 52,
            color: '#c8a96e',
            letterSpacing: '0.18em',
            textShadow: '0 0 40px rgba(200,169,110,0.55), 0 0 80px rgba(200,169,110,0.25)',
            userSelect: 'none',
          }}
        >
          YOU SAVED
        </span>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error|warning|✓"
```

Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```
git add src/renderer/ui/YouSavedBanner.tsx
git commit -m "feat: add YouSavedBanner overlay component"
```

---

### Task 3: Wire banner into App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

Three changes in this file: import the component, mount it in JSX, extend the SAVE action, and load the persisted setting on startup.

- [ ] **Step 1: Add the import**

At the top of `App.tsx`, after the existing UI component imports (around line 17), add:

```tsx
import { YouSavedBanner } from './ui/YouSavedBanner'
```

- [ ] **Step 2: Mount the component in JSX**

In the `return` block of `App`, just before the closing `</div>`, add:

```tsx
      <YouSavedBanner />
```

The full closing of the return should look like:

```tsx
      <KeybindSettings />
      {editingItem && <TextEditOverlay key={editingItem.id} item={editingItem} />}
      <YouSavedBanner />
    </div>
  )
```

- [ ] **Step 3: Extend the SAVE action to trigger the banner**

Find this line in the keybind wiring `useEffect` (around line 265):

```tsx
    resolver.register(Actions.SAVE,    () => { saveCurrentOrAs().then((ok) => { if (ok) triggerEffect('rune-seal') }) })
```

Replace it with:

```tsx
    resolver.register(Actions.SAVE, () => {
      saveCurrentOrAs().then((ok) => {
        if (!ok) return
        triggerEffect('rune-seal')
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
      })
    })
```

Do the same for `Actions.SAVE_AS`. Find:

```tsx
    resolver.register(Actions.SAVE_AS, () => { saveProjectAs().then((p) => { if (p) triggerEffect('rune-seal') }) })
```

Replace with:

```tsx
    resolver.register(Actions.SAVE_AS, () => {
      saveProjectAs().then((p) => {
        if (!p) return
        triggerEffect('rune-seal')
        if (useUIStore.getState().youSavedEnabled) useUIStore.getState().showYouSaved()
      })
    })
```

- [ ] **Step 4: Load the persisted setting on startup**

In the first `useEffect` (the one with `initBoard()` and `rise-from-fog`, around line 43), add after the crash-recovery block:

```tsx
    ipc.invoke('settings:get', { key: 'ui.youSavedEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) useUIStore.getState().setYouSavedEnabled(true)
    }).catch(() => {})
```

Note: `ipc` is already defined earlier in that same `useEffect` block — do not re-declare it.

- [ ] **Step 5: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error|warning|✓"
```

Expected: `✓ built` with no TypeScript errors in `App.tsx`.

- [ ] **Step 6: Commit**

```
git add src/renderer/App.tsx
git commit -m "feat: mount YouSavedBanner, wire SAVE action, load setting on startup"
```

---

### Task 4: Add toggle to KeybindSettings panel

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] **Step 1: Subscribe to the you-saved state**

In `KeybindSettings.tsx`, after the existing `useUIStore` import, add the store subscriptions inside the component function, after the `filter` state:

```tsx
  const youSavedEnabled = useUIStore((s) => s.youSavedEnabled)
  const setYouSavedEnabled = useUIStore((s) => s.setYouSavedEnabled)
```

- [ ] **Step 2: Add the toggle section above the keybind table**

In the JSX, after the `<h2>Keybindings</h2>` heading and before the filter `<input>`, add:

```tsx
      <div style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Fun Settings
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={youSavedEnabled}
            onChange={(e) => setYouSavedEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            YOU SAVED banner on manual save
          </span>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            dark souls
          </span>
        </label>
      </div>
```

- [ ] **Step 3: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error|warning|✓"
```

Expected: `✓ built` with no TypeScript errors.

- [ ] **Step 4: Commit**

```
git add src/renderer/ui/panels/KeybindSettings.tsx
git commit -m "feat: add YOU SAVED toggle to settings panel"
```
