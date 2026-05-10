# HyperType Integration — Design Spec

**Date:** 2026-05-10
**Feature:** Arcade-style keystroke animations and chiptune sounds on the Citadel canvas, inspired by and adapted from HyperType by Thanh-Huy1104.

---

## Attribution

This feature adapts concepts and audio assets from the HyperType VS Code extension:

> MIT License — Copyright (c) 2025 Thanh-huy1104
> https://github.com/Thanh-Huy1104/hypertype

The full MIT copyright notice must appear at the top of `HyperTypeEngine.ts`. The Fun Settings toggle must include an attribution subtitle.

---

## Overview

When enabled, every keydown on the canvas (and specific canvas actions) spawns a floating pixel-font label at the mouse cursor and plays a pitch-shifted chiptune sound. The effect escalates pitch with consecutive rapid keypresses, exactly as in the original HyperType. All effects are opt-in via a Fun Settings toggle.

---

## Sound System

**Source:** Three MP3 files downloaded from the HyperType repository and bundled as Citadel static assets:
- `src/renderer/assets/sounds/ht-type.mp3` (from `media/sounds/multhit1.mp3`)
- `src/renderer/assets/sounds/ht-enter.mp3` (from `media/sounds/gold_seal.mp3`)
- `src/renderer/assets/sounds/ht-slice.mp3` (from `media/sounds/slice1.mp3`)

**Web Audio API:**
- `AudioContext` created lazily on first keypress (satisfies browser autoplay policy).
- Each file loaded once via `fetch()` + `decodeAudioData`, stored in `AudioBuffer` slots.
- Playback: `AudioBufferSourceNode` → `GainNode (0.5)` → `destination`.
- Pitch shift via `source.detune.value = 1200 * Math.log2(pitch)` (cents).

**Pitch escalation (identical to HyperType):**
- `pitchLevel` counter increments on every keystroke.
- Resets to 0 after 300ms of no activity.
- `pitch = Math.min(1.3, Math.max(0.95, 1.0 + pitchLevel * 0.01))`.

**Sound mapping:**
- `keyStroke()` → `ht-type.mp3` (all regular keys)
- `burst('↩', ...)` (UNDO) → `ht-type.mp3`
- `burst('↪', ...)` (REDO) → `ht-type.mp3`
- `burst('✕', ...)` (DELETE) → `ht-slice.mp3`
- `burst(icon, ...)` (item place, connection) → `ht-type.mp3`
- Enter key specifically → `ht-enter.mp3`

---

## Visual Effects

**Floating label:**
- A `<span>` injected into the overlay div, absolutely positioned at `(screenX, screenY)`.
- Font: Press Start 2P (added to `src/renderer/index.html` Google Fonts import).
- Font size: 13px.
- Color: cycling through HyperType's 74 gradient steps — simplified to a `hsl(hue, 90%, 65%)` cycle where `hue = (Date.now() / 20) % 360`.
- `@keyframes htFloat`: `transform: translateY(0)` → `transform: translateY(-40px)`, `opacity: 1` → `opacity: 0`, over 600ms, `ease-out`.
- Each `<span>` is removed from the DOM in its `animationend` handler.

**Screen shake:**
- On `keyStroke`: light shake — `transform: translate(±2px)` on the canvas container, 80ms duration.
- On `burst`: medium shake — `±4px`, 120ms.
- Implemented by toggling a CSS class on the container ref (not inline style, to avoid React conflicts).

**Shake keyframes (injected in HyperTypeOverlay):**
```css
@keyframes htShakeLight {
  0%,100% { transform: translate(0,0); }
  25% { transform: translate(-2px,1px); }
  75% { transform: translate(2px,-1px); }
}
@keyframes htShakeMedium {
  0%,100% { transform: translate(0,0); }
  25% { transform: translate(-4px,2px); }
  75% { transform: translate(4px,-2px); }
}
```

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/renderer/arcade/HyperTypeEngine.ts` | Singleton: audio context, pitch, particle spawn, shake |
| `src/renderer/arcade/HyperTypeOverlay.tsx` | React component: overlay div + style injection |
| `src/renderer/assets/sounds/ht-type.mp3` | Bundled audio |
| `src/renderer/assets/sounds/ht-enter.mp3` | Bundled audio |
| `src/renderer/assets/sounds/ht-slice.mp3` | Bundled audio |

### Modified files

| File | Change |
|---|---|
| `src/renderer/store/uiStore.ts` | Add `hyperTypeEnabled`, `setHyperTypeEnabled` |
| `src/renderer/App.tsx` | Mount overlay, wire keydown + action triggers, load setting |
| `src/renderer/canvas/CanvasStage.tsx` | Call `engine.burst` on item placement |
| `src/renderer/ui/panels/KeybindSettings.tsx` | Add HyperType toggle row |
| `src/renderer/index.html` | Add Press Start 2P to Google Fonts import |

### HyperTypeEngine API

```ts
class HyperTypeEngine {
  setOverlay(el: HTMLDivElement): void
  setCanvasContainer(el: HTMLDivElement): void
  setEnabled(v: boolean): void
  keyStroke(key: string, screenX: number, screenY: number): void
  burst(icon: string, screenX: number, screenY: number, soundType?: 'normal' | 'enter' | 'slice'): void
}
export const engine = new HyperTypeEngine()
```

### Event trigger mapping

| Event | Call |
|---|---|
| Keydown on canvas (not in input) | `engine.keyStroke(e.key, lastMouse.x, lastMouse.y)` |
| Enter key | `engine.keyStroke('ENTER', x, y)` with enter sound |
| Item placed (CanvasStage) | `engine.burst('★', screenX, screenY)` |
| Item deleted (App.tsx DELETE action) | `engine.burst('✕', lastMouse.x, lastMouse.y, 'slice')` |
| Undo | `engine.burst('↩', lastMouse.x, lastMouse.y)` |
| Redo | `engine.burst('↪', lastMouse.x, lastMouse.y)` |
| Connection drawn | `engine.burst('⟶', screenX, screenY)` |

### Mouse tracking

A module-level object `lastMouse = { x: 0, y: 0 }` updated by a `mousemove` listener on `window` in `App.tsx`. Exported from `src/renderer/arcade/HyperTypeEngine.ts` as `export const lastMouse` so `CanvasStage.tsx` can import and read it without going through the store.

---

## uiStore additions

```ts
hyperTypeEnabled: boolean        // default false, persisted via settings:set 'ui.hyperTypeEnabled'
setHyperTypeEnabled: (v: boolean) => void
```

---

## Settings Panel

In `KeybindSettings.tsx`, after the YOU SAVED row in the Fun Settings section:

```
☐ HyperType mode
    inspired by Thanh-Huy1104/hypertype (MIT)
```

Checkbox wired to `hyperTypeEnabled` / `setHyperTypeEnabled`. The attribution line is a required part of MIT compliance.

---

## Out of Scope

- Floating corner bracket expansion (VS Code Decoration API, no clean DOM equivalent in Citadel's canvas layer).
- Per-key directional drift (left for normal keys, right for backspace) — all labels float straight up.
- Gutter markers (`>>>` on Enter) — no gutter in Citadel.
- The original HyperType pixel canvas draw loop (the `draw(buffer)` function) — not relevant to Citadel.
- Sounds for text editing inside text/sticky items (only canvas-level events trigger effects).
