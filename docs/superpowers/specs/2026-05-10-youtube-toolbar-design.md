# YouTube Toolbar Button — Design Spec

**Date:** 2026-05-10
**Feature:** Inline toolbar URL prompt for placing YouTube embed items on the canvas.

---

## Overview

A YouTube button in the toolbar expands an inline URL input when clicked. The user pastes or types a YouTube URL and presses Enter — a `YouTubeItem` is placed at the centre of the current viewport and selected. No new tool mode is required; the expansion is managed as local React state within `Toolbar.tsx`.

---

## Interaction Flow

1. User clicks the YouTube toolbar button (▶ icon).
2. A URL input slides open directly beneath the button, inside the toolbar panel. It receives focus automatically.
3. User pastes or types a YouTube URL.
4. **Enter:** validates URL, places item, closes input, returns to select mode.
5. **Escape or second click on button:** closes input without placing anything, clears the field.
6. **Invalid URL:** input shakes (CSS animation), clears, stays open for retry.

---

## Visual Design

- Input sits inside the existing toolbar panel, beneath the YouTube button.
- Width: 180px (enough for a full URL without wrapping).
- Styled inline: `background: var(--bg-ui)`, `border: 1px solid var(--border)`, gold focus ring (`outline: 1px solid var(--accent)`), `color: var(--text-primary)`, `font-family: var(--font-mono)`, `font-size: 10px`.
- Placeholder text: `youtube.com/watch?v=…`
- On invalid submit: `@keyframes ytShake` — rapid horizontal oscillation (~300ms), then field clears.
- No label, no submit button — Enter to confirm, Escape to cancel.

---

## Architecture

### State

Single `boolean` local state in `Toolbar.tsx`:

```ts
const [youtubeOpen, setYoutubeOpen] = useState(false)
const [youtubeUrl, setYoutubeUrl] = useState('')
```

No store changes. No new ToolMode. No new files.

### URL validation

A URL is valid if it contains `youtube.com` or `youtu.be`:

```ts
const isValidYouTubeUrl = (url: string): boolean =>
  url.includes('youtube.com') || url.includes('youtu.be')
```

### Item placement

On valid submit, compute canvas centre from current viewport:

```ts
const vp = useCanvasStore.getState().viewport()
const sidebarW = 164  // --sidebar-right-w
const canvasW = window.innerWidth - sidebarW
const cx = (canvasW / 2 - vp.x) / vp.scale
const cy = (window.innerHeight / 2 - vp.y) / vp.scale
```

Create the item:

```ts
const item = {
  id: nanoid(),
  type: 'youtube' as const,
  x: cx - 240, y: cy - 135,   // centred: 480×270 / 2
  width: 480, height: 270,     // 16:9
  rotation: 0, zIndex: Date.now(),
  locked: false, visible: true, opacity: 1,
  tags: [], src: url.trim(), meta: {},
}
```

Then: `addItem`, push `ITEM_ADD` history event, `setSelection([item.id])`, close input, `setToolMode('select')`.

### Files changed

| File | Change |
|---|---|
| `src/renderer/ui/Toolbar.tsx` | Add YouTube button + inline URL input + placement logic |

`YouTubeItem.tsx`, `CanvasStage.tsx`, `uiStore.ts`, `types/index.ts` — all untouched.

---

## Error Handling

- Invalid URL: shake animation + clear field. Input stays open.
- Empty submit (Enter on blank field): no-op.
- User closes input mid-type: `youtubeUrl` resets to `''` immediately on close (toggle sets both `youtubeOpen = false` and `youtubeUrl = ''`).

---

## Out of Scope

- URL normalisation (e.g. converting `youtu.be/xxx` to embed format) — `YouTubeItem` handles its own embed URL derivation.
- Playlist or channel URLs.
- Preview thumbnail before placing.
- Keyboard shortcut to open the YouTube tool directly (no `ToolMode` means no keybind resolver hook).
