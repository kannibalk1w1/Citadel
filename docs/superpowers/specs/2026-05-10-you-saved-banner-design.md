# "YOU SAVED" Banner — Design Spec

**Date:** 2026-05-10
**Feature:** Dark Souls-style full-screen overlay that appears on manual save, toggleable via settings.

---

## Overview

When the user manually saves their project (Ctrl+S or File → Save), a full-window dimmed overlay fades in with the text "YOU SAVED" centred in large Cinzel Black gold type — identical in feel to the Dark Souls "YOU DIED" screen. The feature is opt-in via a toggle in the settings panel.

Auto-save never triggers the banner.

---

## Visual Design

### Overlay
- Position: `fixed`, `inset: 0`, `z-index: 9999`, `pointer-events: none`
- Background: `rgba(0, 0, 0, 0.70)`

### Text
- Content: `YOU SAVED` (all caps, static)
- Font: `Cinzel`, weight 900
- Size: `52px`
- Colour: `#c8a96e` (project accent — aged gold)
- Text shadow: `0 0 40px rgba(200,169,110,0.55), 0 0 80px rgba(200,169,110,0.25)` (soft bloom)
- Layout: absolutely centred (`top: 50%; left: 50%; transform: translate(-50%, -50%)`)
- No border, no box, no subtitle

### Animation
CSS keyframe `youSavedAnim`:
```
0%   { opacity: 0 }
20%  { opacity: 1 }        /* fade in: 0.5s */
80%  { opacity: 1 }        /* hold:    1.5s */
100% { opacity: 0 }        /* fade out: 0.5s */
```
Total duration: **2.5s**, `animation-fill-mode: forwards`, `animation-timing-function: ease-in-out`.

After the animation completes (`onAnimationEnd`), the component calls `uiStore.hideYouSaved()` to reset state.

---

## Architecture

### New files
None. All changes are additions to existing files.

### State — `uiStore`

Add two fields:

```ts
youSavedEnabled: boolean   // persisted — user preference
youSavedVisible: boolean   // transient — drives render
```

Add two actions:

```ts
showYouSaved(): void       // sets youSavedVisible = true
hideYouSaved(): void       // sets youSavedVisible = false
setYouSavedEnabled(v: boolean): void  // toggles pref + persists via settings:set IPC
```

`youSavedEnabled` is loaded from `settings:get` on app start (default: `false`).

### Component — `YouSavedBanner`

Location: `src/renderer/ui/YouSavedBanner.tsx`

A single functional component. Renders `null` when `youSavedVisible` is false. When visible, renders the overlay div with the CSS animation. Calls `hideYouSaved()` on `onAnimationEnd`.

Mounted once in `App.tsx`, outside the canvas stack.

### Trigger — save action

In whichever function handles the manual save IPC call (`file:save`), after a successful response:

```ts
if (uiStore.getState().youSavedEnabled) {
  uiStore.getState().showYouSaved()
}
```

Manual save is the only trigger. The auto-save path (if it exists) does not call `showYouSaved()`.

### Settings toggle

In `src/renderer/ui/panels/KeybindSettings.tsx`, add a labelled checkbox row in an appropriate section:

- Label: `YOU SAVED banner on manual save`
- Binds to `uiStore.youSavedEnabled`
- On change calls `setYouSavedEnabled(checked)`

---

## Persistence

`youSavedEnabled` is persisted via the existing `settings:set` / `settings:get` IPC channels with key `ui.youSavedEnabled`. Loaded at app startup alongside other settings.

---

## Out of Scope

- Auto-save trigger
- Custom text or subtitle
- Sound effect
- Animation duration setting
- Mascot interaction (rune-seal already fires on save independently)
