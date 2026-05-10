# HyperType Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add arcade-style keystroke animations and chiptune sounds to Citadel, adapted from HyperType by Thanh-Huy1104 (MIT), toggleable via Fun Settings.

**Architecture:** A singleton `HyperTypeEngine` handles Web Audio + DOM particle injection. A `HyperTypeOverlay` component mounts a fixed full-screen div for particles and injects CSS animations. `App.tsx` and `CanvasStage.tsx` call into the engine at the right moments. Everything is gated on `uiStore.hyperTypeEnabled`.

**Tech Stack:** Web Audio API, React, TypeScript, Vite static asset imports, Zustand

---

## File Map

| File | Change |
|---|---|
| `src/renderer/assets/sounds/ht-type.mp3` | New — bundled from HyperType `multhit1.mp3` |
| `src/renderer/assets/sounds/ht-enter.mp3` | New — bundled from HyperType `gold_seal.mp3` |
| `src/renderer/assets/sounds/ht-slice.mp3` | New — bundled from HyperType `slice1.mp3` |
| `src/renderer/index.html` | Add Press Start 2P to Google Fonts import |
| `src/renderer/store/uiStore.ts` | Add `hyperTypeEnabled`, `setHyperTypeEnabled` |
| `src/renderer/arcade/HyperTypeEngine.ts` | New — singleton engine |
| `src/renderer/arcade/HyperTypeOverlay.tsx` | New — overlay component |
| `src/renderer/App.tsx` | Mount overlay, wire keydown + action triggers, load setting |
| `src/renderer/canvas/CanvasStage.tsx` | Call `engine.burst` on item placement |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add HyperType toggle row |

---

### Task 1: Download audio assets + add font

**Files:**
- Create: `src/renderer/assets/sounds/ht-type.mp3`
- Create: `src/renderer/assets/sounds/ht-enter.mp3`
- Create: `src/renderer/assets/sounds/ht-slice.mp3`
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Create the sounds directory and download the three MP3 files from HyperType**

```bash
mkdir -p "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\sounds"

gh api repos/Thanh-Huy1104/hypertype/contents/media/sounds/multhit1.mp3 --jq '.content' \
  | base64 -d > "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\sounds\ht-type.mp3"

gh api repos/Thanh-Huy1104/hypertype/contents/media/sounds/gold_seal.mp3 --jq '.content' \
  | base64 -d > "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\sounds\ht-enter.mp3"

gh api repos/Thanh-Huy1104/hypertype/contents/media/sounds/slice1.mp3 --jq '.content' \
  | base64 -d > "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\sounds\ht-slice.mp3"
```

Verify all three files exist and are non-zero:
```bash
ls -lh "C:\Users\kanni\Documents\Citadel Build\src\renderer\assets\sounds"
```
Expected: three `.mp3` files, each at least 10KB.

- [ ] **Step 2: Add Press Start 2P to the Google Fonts import in `src/renderer/index.html`**

Find line 9:
```html
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Replace it with:
```html
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`.

- [ ] **Step 4: Commit**

```
git add src/renderer/assets/sounds/ src/renderer/index.html
git commit -m "feat: bundle HyperType audio assets + add Press Start 2P font"
```

---

### Task 2: Add hyperTypeEnabled to uiStore

**Files:**
- Modify: `src/renderer/store/uiStore.ts`

- [ ] **Step 1: Read `src/renderer/store/uiStore.ts`**

Read the file in full before editing.

- [ ] **Step 2: Add to the UIState type**

After the `youSavedEnabled`/`youSavedVisible` block in the type, add:

```ts
  // HyperType arcade mode
  hyperTypeEnabled: boolean
  setHyperTypeEnabled: (enabled: boolean) => void
```

- [ ] **Step 3: Add implementations to the create call**

After the `setYouSavedEnabled` implementation, add:

```ts
  hyperTypeEnabled: false,
  setHyperTypeEnabled: (enabled) => {
    set({ hyperTypeEnabled: enabled })
    const ipc = (window as unknown as { ipc: { invoke: (ch: string, args: unknown) => Promise<unknown> } }).ipc
    ipc.invoke('settings:set', { key: 'ui.hyperTypeEnabled', value: enabled }).catch(console.error)
  },
```

- [ ] **Step 4: Verify build**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 5: Commit**

```
git add src/renderer/store/uiStore.ts
git commit -m "feat: add hyperTypeEnabled to uiStore"
```

---

### Task 3: Create HyperTypeEngine.ts

**Files:**
- Create: `src/renderer/arcade/HyperTypeEngine.ts`

- [ ] **Step 1: Create `src/renderer/arcade/HyperTypeEngine.ts`**

```
mkdir -p "C:\Users\kanni\Documents\Citadel Build\src\renderer\arcade"
```

Write exactly this to `src/renderer/arcade/HyperTypeEngine.ts`:

```ts
/*
 * HyperType Integration
 *
 * Adapted from HyperType by Thanh-huy1104
 * https://github.com/Thanh-Huy1104/hypertype
 *
 * MIT License — Copyright (c) 2025 Thanh-huy1104
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

import typeSoundUrl from '../assets/sounds/ht-type.mp3'
import enterSoundUrl from '../assets/sounds/ht-enter.mp3'
import sliceSoundUrl from '../assets/sounds/ht-slice.mp3'

// Shared mouse position — read by CanvasStage for burst positioning
export const lastMouse = { x: 0, y: 0 }

const SPECIAL_LABELS: Record<string, string> = {
  Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB', ' ': 'SPC',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Delete: 'DEL', Escape: 'ESC',
}

class HyperTypeEngine {
  private _enabled = false
  private _overlay: HTMLDivElement | null = null
  private _container: HTMLDivElement | null = null

  private _ctx: AudioContext | null = null
  private _typeBuffer: AudioBuffer | null = null
  private _enterBuffer: AudioBuffer | null = null
  private _sliceBuffer: AudioBuffer | null = null
  private _audioLoaded = false

  private _pitchLevel = 0
  private _pitchTimer: ReturnType<typeof setTimeout> | null = null

  setOverlay(el: HTMLDivElement): void { this._overlay = el }
  setCanvasContainer(el: HTMLDivElement): void { this._container = el }

  setEnabled(v: boolean): void {
    this._enabled = v
    if (v && !this._audioLoaded) this._loadAudio().catch(console.error)
  }

  private async _loadAudio(): Promise<void> {
    this._ctx = new AudioContext()
    const load = async (url: string): Promise<AudioBuffer> => {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      return this._ctx!.decodeAudioData(buf)
    }
    const [t, e, s] = await Promise.all([
      load(typeSoundUrl),
      load(enterSoundUrl),
      load(sliceSoundUrl),
    ])
    this._typeBuffer = t
    this._enterBuffer = e
    this._sliceBuffer = s
    this._audioLoaded = true
  }

  private _play(buffer: AudioBuffer | null, pitch: number): void {
    if (!this._ctx || !buffer) return
    const src = this._ctx.createBufferSource()
    src.buffer = buffer
    src.detune.value = 1200 * Math.log2(pitch)
    const gain = this._ctx.createGain()
    gain.gain.value = 0.5
    src.connect(gain)
    gain.connect(this._ctx.destination)
    src.start(0)
  }

  private _escalatePitch(): number {
    this._pitchLevel++
    if (this._pitchTimer) clearTimeout(this._pitchTimer)
    this._pitchTimer = setTimeout(() => { this._pitchLevel = 0 }, 300)
    return Math.min(1.3, Math.max(0.95, 1.0 + this._pitchLevel * 0.01))
  }

  private _spawnLabel(label: string, x: number, y: number): void {
    if (!this._overlay) return
    const span = document.createElement('span')
    span.textContent = label
    const hue = (Date.now() / 20) % 360
    span.style.cssText = [
      `position:absolute`,
      `left:${x}px`,
      `top:${y - 10}px`,
      `font-family:'Press Start 2P',monospace`,
      `font-size:13px`,
      `color:hsl(${hue},90%,65%)`,
      `pointer-events:none`,
      `white-space:nowrap`,
      `animation:htFloat 600ms ease-out forwards`,
    ].join(';')
    span.addEventListener('animationend', () => span.remove(), { once: true })
    this._overlay.appendChild(span)
  }

  private _shake(cls: 'ht-shake-light' | 'ht-shake-medium', ms: number): void {
    const el = this._container
    if (!el) return
    el.classList.remove('ht-shake-light', 'ht-shake-medium')
    void el.offsetWidth // force reflow to restart animation
    el.classList.add(cls)
    setTimeout(() => el.classList.remove(cls), ms)
  }

  keyStroke(key: string, screenX: number, screenY: number): void {
    if (!this._enabled) return
    const pitch = this._escalatePitch()
    const isEnter = key === 'Enter'
    this._play(isEnter ? this._enterBuffer : this._typeBuffer, pitch)
    const label = SPECIAL_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key.slice(0, 3).toUpperCase())
    this._spawnLabel(label, screenX, screenY)
    this._shake('ht-shake-light', 80)
  }

  burst(icon: string, screenX: number, screenY: number, soundType: 'normal' | 'enter' | 'slice' = 'normal'): void {
    if (!this._enabled) return
    const pitch = this._escalatePitch()
    const buffer = soundType === 'slice' ? this._sliceBuffer
      : soundType === 'enter' ? this._enterBuffer
      : this._typeBuffer
    this._play(buffer, pitch)
    this._spawnLabel(icon, screenX, screenY)
    this._shake('ht-shake-medium', 120)
  }
}

export const engine = new HyperTypeEngine()
```

- [ ] **Step 2: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

If you get a TypeScript error about importing `.mp3` files, add this declaration to `src/renderer/env.d.ts`:
```ts
declare module '*.mp3' {
  const src: string
  export default src
}
```

- [ ] **Step 3: Commit**

```
git add src/renderer/arcade/HyperTypeEngine.ts src/renderer/env.d.ts
git commit -m "feat: add HyperTypeEngine singleton (adapted from HyperType MIT)"
```

---

### Task 4: Create HyperTypeOverlay.tsx

**Files:**
- Create: `src/renderer/arcade/HyperTypeOverlay.tsx`

- [ ] **Step 1: Create `src/renderer/arcade/HyperTypeOverlay.tsx`**

Write exactly this:

```tsx
import React, { useRef, useEffect } from 'react'
import { engine } from './HyperTypeEngine'

const STYLES = `
@keyframes htFloat {
  0%   { transform: translateY(0);     opacity: 1; }
  100% { transform: translateY(-40px); opacity: 0; }
}
.ht-shake-light {
  animation: htShakeLight 80ms ease both;
}
.ht-shake-medium {
  animation: htShakeMedium 120ms ease both;
}
@keyframes htShakeLight {
  0%,100% { transform: translate(0,0); }
  25%     { transform: translate(-2px,1px); }
  75%     { transform: translate(2px,-1px); }
}
@keyframes htShakeMedium {
  0%,100% { transform: translate(0,0); }
  25%     { transform: translate(-4px,2px); }
  75%     { transform: translate(4px,-2px); }
}
`

type Props = { canvasContainerRef: React.RefObject<HTMLDivElement> }

export function HyperTypeOverlay({ canvasContainerRef }: Props): React.ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (overlayRef.current) engine.setOverlay(overlayRef.current)
  }, [])

  useEffect(() => {
    if (canvasContainerRef.current) engine.setCanvasContainer(canvasContainerRef.current)
  }, [canvasContainerRef])

  return (
    <>
      <style>{STYLES}</style>
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          overflow: 'hidden',
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```
git add src/renderer/arcade/HyperTypeOverlay.tsx
git commit -m "feat: add HyperTypeOverlay component"
```

---

### Task 5: Wire App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Read `src/renderer/App.tsx` in full**

- [ ] **Step 2: Add imports**

After the `import { YouSavedBanner }` line, add:

```tsx
import { HyperTypeOverlay } from './arcade/HyperTypeOverlay'
import { engine, lastMouse } from './arcade/HyperTypeEngine'
```

- [ ] **Step 3: Add `canvasContainerRef` inside the `App` function**

After the existing `const [recoveryData, ...] = React.useState(...)` line, add:

```tsx
  const canvasContainerRef = React.useRef<HTMLDivElement>(null)
```

- [ ] **Step 4: Add mousemove tracker + HyperType keydown handler**

In the existing global keydown `useEffect` (the one with `window.addEventListener('keydown', onKeyDown)`), extend it to also track mouse position and fire HyperType effects. Replace the entire `useEffect` block with:

```tsx
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      resolver.resolve(e)
      engine.keyStroke(e.key, lastMouse.x, lastMouse.y)
    }
    const onMouseMove = (e: MouseEvent) => {
      lastMouse.x = e.clientX
      lastMouse.y = e.clientY
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])
```

- [ ] **Step 5: Extend DELETE, UNDO, REDO action handlers**

Find the DELETE action handler:
```tsx
    resolver.register(Actions.DELETE, () => {
```
After `triggerEffect('crumble')`, add:
```tsx
      engine.burst('✕', lastMouse.x, lastMouse.y, 'slice')
```

Find the UNDO action handler. After `triggerEffect('rewind-swirl')`, add:
```tsx
      engine.burst('↩', lastMouse.x, lastMouse.y)
```

Find the REDO action handler. After `triggerEffect('forward-surge')`, add:
```tsx
      engine.burst('↪', lastMouse.x, lastMouse.y)
```

- [ ] **Step 6: Load persisted hyperType setting on startup**

In the first `useEffect` (the one with `initBoard()` and `rise-from-fog`), after the `youSavedEnabled` settings load block, add:

```tsx
    ipc.invoke('settings:get', { key: 'ui.hyperTypeEnabled' }).then((res) => {
      const { value } = res as { value: unknown }
      if (value === true) {
        useUIStore.getState().setHyperTypeEnabled(true)
        engine.setEnabled(true)
      }
    }).catch(() => {})
```

Also wire `setHyperTypeEnabled` so it calls `engine.setEnabled`. The simplest way: subscribe to the store in a `useEffect`:

```tsx
  useEffect(() => {
    return useUIStore.subscribe(
      (s) => s.hyperTypeEnabled,
      (enabled) => engine.setEnabled(enabled)
    )
  }, [])
```

Add this after the `canvasContainerRef` declaration.

- [ ] **Step 7: Add ref to canvas container div + mount HyperTypeOverlay**

Find:
```tsx
      {/* Canvas viewport — inset from the right sidebar */}
      <div style={{ position: 'absolute', inset: 0, right: 'var(--sidebar-right-w)' }}>
```

Replace with:
```tsx
      {/* Canvas viewport — inset from the right sidebar */}
      <div ref={canvasContainerRef} style={{ position: 'absolute', inset: 0, right: 'var(--sidebar-right-w)' }}>
```

Then find `<YouSavedBanner />` and add after it:
```tsx
      <HyperTypeOverlay canvasContainerRef={canvasContainerRef} />
```

- [ ] **Step 8: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 9: Commit**

```
git add src/renderer/App.tsx
git commit -m "feat: wire HyperType keydown, mouse tracking, and action bursts in App.tsx"
```

---

### Task 6: Wire CanvasStage.tsx — burst on item placement

**Files:**
- Modify: `src/renderer/canvas/CanvasStage.tsx`

- [ ] **Step 1: Read `src/renderer/canvas/CanvasStage.tsx` in full**

- [ ] **Step 2: Add imports**

At the top of the file, add after the existing imports:

```ts
import { engine, lastMouse } from '../arcade/HyperTypeEngine'
```

- [ ] **Step 3: Add burst calls after each item placement in `handleStageClick`**

`handleStageClick` computes `cx` and `cy` (canvas coords). After each `addItem` call, convert to screen coords and burst. The screen position is: `screenX = cx * viewport.scale + viewport.x`, `screenY = cy * viewport.scale + viewport.y`.

Find the sticky placement block. After `useCanvasStore.getState().setSelection([item.id])` and before `return`, add:
```ts
      engine.burst('📌', cx * viewport.scale + viewport.x, cy * viewport.scale + viewport.y)
```

Find the text placement block. After `useUIStore.getState().setToolMode('select')` and before `return`, add:
```ts
      engine.burst('T', cx * viewport.scale + viewport.x, cy * viewport.scale + viewport.y)
```

Find the swatch placement block. After `useUIStore.getState().setToolMode('select')` and before `return`, add:
```ts
      engine.burst('★', cx * viewport.scale + viewport.x, cy * viewport.scale + viewport.y)
```

Find the comparison placement block. After `useUIStore.getState().setToolMode('select')` and before `return`, add:
```ts
      engine.burst('⟺', cx * viewport.scale + viewport.x, cy * viewport.scale + viewport.y)
```

- [ ] **Step 4: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 5: Commit**

```
git add src/renderer/canvas/CanvasStage.tsx
git commit -m "feat: burst HyperType effect on canvas item placement"
```

---

### Task 7: Add HyperType toggle to KeybindSettings

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx`

- [ ] **Step 1: Read `src/renderer/ui/panels/KeybindSettings.tsx` in full**

- [ ] **Step 2: Add store subscriptions**

Inside the component, after the `youSavedEnabled` / `setYouSavedEnabled` lines, add:

```tsx
  const hyperTypeEnabled = useUIStore((s) => s.hyperTypeEnabled)
  const setHyperTypeEnabled = useUIStore((s) => s.setHyperTypeEnabled)
```

- [ ] **Step 3: Add the HyperType toggle row in Fun Settings**

Find the YOU SAVED label block in the Fun Settings section. After its closing `</label>`, add:

```tsx
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={hyperTypeEnabled}
            onChange={(e) => setHyperTypeEnabled(e.target.checked)}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
            HyperType mode
          </span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto', textAlign: 'right' }}>
            by Thanh-Huy1104<br />MIT
          </span>
        </label>
```

- [ ] **Step 4: Verify it compiles**

```
cd "C:\Users\kanni\Documents\Citadel Build" && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 5: Commit**

```
git add src/renderer/ui/panels/KeybindSettings.tsx
git commit -m "feat: add HyperType mode toggle to Fun Settings (attribution: Thanh-Huy1104 MIT)"
```
