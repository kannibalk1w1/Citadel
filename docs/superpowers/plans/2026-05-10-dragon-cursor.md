# Dragon Scimitar Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OSRS dragon scimitar + abyssal whip cursor set as a toggleable Fun Setting, replacing neutral canvas cursors while preserving functional ones.

**Architecture:** Four cursor files downloaded and bundled as Vite static assets. `dragonCursor.ts` exports the CSS cursor strings. `CanvasStage.tsx` conditionally swaps its `CURSOR` map based on `uiStore.dragonCursorEnabled`. Toggle in Fun Settings with full attribution.

**Tech Stack:** TypeScript, Vite static asset imports, CSS cursor, Zustand

---

## File Map

| File | Change |
|---|---|
| `src/renderer/assets/cursors/ds-normal.cur` | New — downloaded |
| `src/renderer/assets/cursors/ds-cross.cur` | New — downloaded |
| `src/renderer/assets/cursors/ds-hand.cur` | New — downloaded |
| `src/renderer/assets/cursors/abyssal-whip.cur` | New — downloaded |
| `electron.vite.config.ts` | Add `assetsInclude: ['**/*.cur']` to renderer |
| `src/renderer/env.d.ts` | Add `declare module '*.cur'` |
| `src/renderer/arcade/dragonCursor.ts` | New — exports cursor CSS strings |
| `src/renderer/store/uiStore.ts` | Add `dragonCursorEnabled`, `setDragonCursorEnabled` |
| `src/renderer/canvas/CanvasStage.tsx` | Reactive CURSOR map, dragon cursor imports |
| `src/renderer/App.tsx` | Load persisted setting on startup |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add toggle row with attribution |

---

### Task 1: Download cursor assets + configure Vite

**Files:**
- Create: `src/renderer/assets/cursors/ds-normal.cur`
- Create: `src/renderer/assets/cursors/ds-cross.cur`
- Create: `src/renderer/assets/cursors/ds-hand.cur`
- Create: `src/renderer/assets/cursors/abyssal-whip.cur`
- Modify: `electron.vite.config.ts`
- Modify: `src/renderer/env.d.ts`

- [ ] **Step 1: Create the cursors directory and download all four files**

On Windows PowerShell:
```powershell
New-Item -ItemType Directory -Force "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors"

Invoke-WebRequest -Uri "https://www.rw-designer.com/cursor-download/20373/Dragon%20Scimitar.cur" -OutFile "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors\ds-normal.cur"

Invoke-WebRequest -Uri "https://www.rw-designer.com/cursor-download/20387/Dragon%20Scimitar%20cross.cur" -OutFile "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors\ds-cross.cur"

Invoke-WebRequest -Uri "https://www.rw-designer.com/cursor-download/20388/Dragon%20Scimitar%20hand.cur" -OutFile "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors\ds-hand.cur"

Invoke-WebRequest -Uri "https://www.rw-designer.com/cursor-download/31818/Abyssal%20Whip.cur" -OutFile "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors\abyssal-whip.cur"
```

Verify all four files exist and are non-zero:
```powershell
Get-Item "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\cursors\*.cur" | Select-Object Name, Length
```
Expected: four `.cur` files, each at least 1,000 bytes.

- [ ] **Step 2: Add `assetsInclude` to the renderer config in `electron.vite.config.ts`**

Find the `renderer:` block. Add `assetsInclude` so Vite treats `.cur` files as static assets:

```ts
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    assetsInclude: ['**/*.cur'],
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@store': resolve('src/renderer/store'),
        '@canvas': resolve('src/renderer/canvas'),
        '@ui': resolve('src/renderer/ui'),
        '@keybinds': resolve('src/renderer/keybinds'),
        '@theme': resolve('src/renderer/theme'),
        '@mascot': resolve('src/renderer/mascot'),
        '@export': resolve('src/renderer/export'),
        '@plugins': resolve('src/renderer/plugins'),
        '@types': resolve('src/types'),
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
  },
```

- [ ] **Step 3: Add `.cur` type declaration to `src/renderer/env.d.ts`**

Read `src/renderer/env.d.ts`. Add at the end:
```ts
declare module '*.cur' {
  const src: string
  export default src
}
```

- [ ] **Step 4: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`.

- [ ] **Step 5: Commit**

```
git add src/renderer/assets/cursors/ electron.vite.config.ts src/renderer/env.d.ts
git commit -m "feat: bundle dragon scimitar + abyssal whip cursors, configure Vite .cur assets"
```

---

### Task 2: Create dragonCursor.ts

**Files:**
- Create: `src/renderer/arcade/dragonCursor.ts`

- [ ] **Step 1: Create the file**

Write exactly this to `src/renderer/arcade/dragonCursor.ts`:

```ts
/*
 * Dragon Scimitar cursor set
 * Source: https://www.rw-designer.com/cursor-set/dragon-scimitar
 * License: Creative Commons Attribution
 * Published: November 20, 2010
 *
 * Abyssal Whip cursor
 * Source: https://www.rw-designer.com/cursor-detail/31818
 * License: Public Domain
 * Author: RWCEditor For RuneScape2006
 * Published: December 26, 2011
 */

import dsNormalUrl from '../assets/cursors/ds-normal.cur'
import dsCrossUrl from '../assets/cursors/ds-cross.cur'
import dsHandUrl from '../assets/cursors/ds-hand.cur'
import whipUrl from '../assets/cursors/abyssal-whip.cur'

export const DS_NORMAL = `url("${dsNormalUrl}"), auto`
export const DS_CROSS  = `url("${dsCrossUrl}"), crosshair`
export const DS_HAND   = `url("${dsHandUrl}"), pointer`
export const DS_WHIP   = `url("${whipUrl}"), crosshair`
```

- [ ] **Step 2: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```
git add src/renderer/arcade/dragonCursor.ts
git commit -m "feat: dragonCursor.ts — CSS cursor strings with attribution"
```

---

### Task 3: Add dragonCursorEnabled to uiStore

**Files:**
- Modify: `src/renderer/store/uiStore.ts`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Add to `UIState` type**

After the `hyperTypeEnabled` / `setHyperTypeEnabled` block, add:

```ts
  // Dragon cursor
  dragonCursorEnabled: boolean
  setDragonCursorEnabled: (enabled: boolean) => void
```

- [ ] **Step 3: Add implementations to the create call**

After the `setHyperTypeEnabled` implementation, add:

```ts
  dragonCursorEnabled: false,
  setDragonCursorEnabled: (enabled) => {
    set({ dragonCursorEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.dragonCursorEnabled', value: enabled }).catch(console.error)
  },
```

- [ ] **Step 4: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 5: Commit**

```
git add src/renderer/store/uiStore.ts
git commit -m "feat: add dragonCursorEnabled to uiStore"
```

---

### Task 4: Wire CanvasStage.tsx

**Files:**
- Modify: `src/renderer/canvas/CanvasStage.tsx`

- [ ] **Step 1: Read the file in full**

- [ ] **Step 2: Add imports**

At the top of the file, after existing imports, add:

```ts
import { DS_NORMAL, DS_CROSS, DS_HAND, DS_WHIP } from '../arcade/dragonCursor'
```

- [ ] **Step 3: Add `dragonCursorEnabled` store subscription**

Inside the `CanvasStage` function, after the existing store subscriptions (after `const activeBoardId = ...`), add:

```ts
  const dragonCursorEnabled = useUIStore((s) => s.dragonCursorEnabled)
```

- [ ] **Step 4: Replace the module-level CURSOR constant with a reactive in-component map**

Find the module-level `const CURSOR` constant (near the top of the file, before the component):

```ts
const CURSOR: Record<string, string> = {
  pan: 'grab',
  connect: 'crosshair',
  text: 'text',
  sticky: 'cell',
  swatch: 'cell',
  comparison: 'cell',
  lasso: 'crosshair',
  default: 'default',
}
```

Remove it entirely. Inside the `CanvasStage` function, after the `dragonCursorEnabled` subscription line, add:

```ts
  const CURSOR: Record<string, string> = dragonCursorEnabled
    ? {
        select:     DS_NORMAL,
        pan:        'grab',
        lasso:      DS_WHIP,
        connect:    DS_CROSS,
        text:       DS_NORMAL,
        sticky:     DS_NORMAL,
        link:       DS_HAND,
        tag:        DS_NORMAL,
        swatch:     DS_NORMAL,
        comparison: DS_NORMAL,
        record:     DS_NORMAL,
        default:    DS_NORMAL,
      }
    : {
        pan:        'grab',
        connect:    'crosshair',
        text:       'text',
        sticky:     'cell',
        swatch:     'cell',
        comparison: 'cell',
        lasso:      'crosshair',
        default:    'default',
      }
```

- [ ] **Step 5: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 6: Commit**

```
git add src/renderer/canvas/CanvasStage.tsx
git commit -m "feat: reactive cursor map — dragon scimitar when dragonCursorEnabled"
```

---

### Task 5: Wire App.tsx + KeybindSettings.tsx

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] **Step 1: Load persisted setting in App.tsx**

Read `src/renderer/App.tsx`. In the first `useEffect` (the one with `initBoard()` and `rise-from-fog`), after the `hyperTypeEnabled` settings block, add:

```tsx
    ipc.invoke('settings:get', { key: 'ui.dragonCursorEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) useUIStore.getState().setDragonCursorEnabled(true)
    }).catch(() => {})
```

- [ ] **Step 2: Add toggle to KeybindSettings.tsx**

Read `src/renderer/ui/panels/KeybindSettings.tsx`. Inside the component, after the `hyperTypeEnabled` / `setHyperTypeEnabled` subscriptions, add:

```tsx
  const dragonCursorEnabled = useUIStore((s) => s.dragonCursorEnabled)
  const setDragonCursorEnabled = useUIStore((s) => s.setDragonCursorEnabled)
```

In the Fun Settings JSX, after the HyperType `</label>`, add:

```tsx
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={dragonCursorEnabled}
            onChange={(e) => setDragonCursorEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            Dragon Scimitar cursor
          </span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto', textAlign: 'right' }}>
            rw-designer.com<br />CC Attribution / PD
          </span>
        </label>
```

- [ ] **Step 3: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 4: Commit**

```
git add src/renderer/App.tsx src/renderer/ui/panels/KeybindSettings.tsx
git commit -m "feat: load dragon cursor setting on startup + Fun Settings toggle"
```
