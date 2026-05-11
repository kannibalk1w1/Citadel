# UI Scale — Design Spec

**Date:** 2026-05-11
**Feature:** Global UI scale via Electron `webContents.setZoomFactor()`, toggled from Fun Settings

---

## Overview

A `−` / `+` control in the Fun Settings section of the Keybindings panel lets the user scale the entire app window (UI chrome + canvas together) across four fixed stops: 75%, 100%, 125%, 150%. The chosen value is persisted across restarts via the existing settings store.

---

## Approach

`webContents.setZoomFactor(factor)` in the Electron main process scales the entire BrowserWindow renderer uniformly. This includes both UI chrome and the canvas. Canvas zoom is unaffected as a separate concern — the two scales are independent (canvas zoom changes `viewport.scale` in canvasStore; UI scale changes the Electron zoom factor).

---

## Data Model

`ui.zoomFactor` — a `number` persisted via the existing `settings:get` / `settings:set` IPC channels. Default `1.0`. Valid range `[0.75, 1.5]` in steps of `0.25`.

No new store slice needed — `uiStore` gains two fields:
```ts
uiScale: number          // default 1.0
setUiScale: (v: number) => void
```

`setUiScale` calls `ipc.invoke('zoom:set', { factor: v })` and persists via the new IPC handler.

---

## IPC

**New channel: `zoom:set`**

| Channel | Direction | Payload | Notes |
|---|---|---|---|
| `zoom:set` | r→m | `{ factor: number }` | Clamps to [0.75, 1.5], applies to sender webContents, persists to settings |

Handler in `src/main/ipc.ts` — follow the same settings-store access pattern already used by the `settings:set` handler directly above it in that file:
```ts
ipcMain.handle('zoom:set', async (e, { factor }: { factor: number }) => {
  const clamped = Math.min(1.5, Math.max(0.75, factor))
  e.sender.setZoomFactor(clamped)
  // persist using the same store instance as settings:set
  store.set('ui.zoomFactor', clamped)
})
```

---

## Components

### uiStore.ts (modified)

Add after existing fields:
```ts
uiScale: number
setUiScale: (v: number) => void
```

Implementation:
```ts
uiScale: 1.0,
setUiScale: (v) => {
  set({ uiScale: v })
  ipc.invoke('zoom:set', { factor: v }).catch(console.error)
},
```

### App.tsx (modified)

In the startup `useEffect` (alongside `hyperTypeEnabled`, `dragonCursorEnabled` loads), add:
```ts
ipc.invoke('settings:get', { key: 'ui.zoomFactor' }).then((res) => {
  const { value } = res as { value: unknown }
  if (typeof value === 'number') useUIStore.getState().setUiScale(value)
}).catch(() => {})
```

### KeybindSettings.tsx (modified)

Add to Fun Settings section — after the Dragon Scimitar cursor row:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
  <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
    UI Scale
  </span>
  <button
    onClick={() => setUiScale(Math.max(0.75, uiScale - 0.25))}
    disabled={uiScale <= 0.75}
    style={btnStyle}
  >−</button>
  <span style={{ width: 36, textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
    {Math.round(uiScale * 100)}%
  </span>
  <button
    onClick={() => setUiScale(Math.min(1.5, uiScale + 0.25))}
    disabled={uiScale >= 1.5}
    style={btnStyle}
  >+</button>
</div>
```

`btnStyle` is a local const:
```ts
const btnStyle: React.CSSProperties = {
  width: 22, height: 22,
  background: 'var(--bg-canvas)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'var(--font-mono)',
  padding: 0,
  lineHeight: 1,
}
```

Subscriptions added at the top of the component:
```ts
const uiScale = useUIStore((s) => s.uiScale)
const setUiScale = useUIStore((s) => s.setUiScale)
```

---

## Files Changed

| File | Change |
|---|---|
| `src/main/ipc.ts` | Add `zoom:set` handler |
| `src/renderer/store/uiStore.ts` | Add `uiScale`, `setUiScale` |
| `src/renderer/App.tsx` | Load `ui.zoomFactor` on startup |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add UI Scale row in Fun Settings |

No new files. No type changes.

---

## Out of Scope

- Smooth animated zoom transition
- Per-monitor DPI awareness (Electron handles this automatically)
- CSS variable approach for chrome-only scaling (deferred for a future revisit)
