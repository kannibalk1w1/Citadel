# CLAUDE.md — Citadel Project Context

> Read this at the start of every session. This is a living document — update it when decisions change.

---

## Project Identity

- **Name:** Citadel
- **Type:** Electron desktop app (Windows)
- **Purpose:** Infinite canvas creative reference tool — spiritual clone of Ref Flow with major extensions
- **Theme:** Dark fantasy. Stone tones, aged gold text, arcane details. Never generic/material/flat.
- **File extensions:** `.citadel` (JSON project), `.citadelz` (zip archive with bundled assets)
- **License:** MIT. Open source from day one.

---

## Stack — Use These. Don't Substitute.

| Concern | Library |
|---|---|
| Desktop shell | Electron |
| UI | React + TypeScript |
| Canvas | Konva.js + react-konva |
| Arrows/overlays | React SVG (not Konva) |
| 3D viewer | Three.js (DOM layer canvas) |
| GIF playback | gifler |
| State | Zustand (4 slices — see below) |
| Undo/Recording | Custom event log (shared system) |
| PDF export | jsPDF + html2canvas |
| Zip | JSZip |
| Styling | CSS Variables + Tailwind |
| Build | electron-vite + Vite |
| Package | electron-builder (NSIS + portable .exe) |
| Tests | Vitest + Playwright |

---

## Folder Structure

```
src/
  main/
    index.ts              ← Electron bootstrap
    ipc.ts                ← All IPC handlers (file, export, settings)
    menu.ts               ← Native app menu
    autoUpdater.ts
    crashRecovery.ts
  renderer/
    App.tsx
    store/
      canvasStore.ts      ← items, boards, connections, selection
      historyStore.ts     ← event log, undo/redo, recording sessions
      uiStore.ts          ← toolMode, theme, panels, search
      mascotStore.ts      ← effect queue, persistent effects, position
    canvas/
      CanvasStage.tsx     ← Konva Stage, pan/zoom
      ItemRenderer.tsx    ← routes item.type → component
      items/
        ImageItem.tsx
        GifItem.tsx
        VideoItem.tsx
        YouTubeItem.tsx   ← Electron <webview>
        AudioItem.tsx     ← waveform + controls
        Model3DItem.tsx   ← Three.js DOM canvas
        StickyItem.tsx
        TextItem.tsx
        SwatchItem.tsx
        ComparisonItem.tsx
      overlays/
        ConnectionLayer.tsx   ← SVG bezier arrows
        SnapGuides.tsx
        SelectionBox.tsx
        LassoOverlay.tsx
      snapping/
        snapEngine.ts
        spatialIndex.ts       ← grid bucketing for perf
        alignmentGuides.ts
    ui/
      Toolbar.tsx
      ContextMenu.tsx
      BoardTabs.tsx
      Minimap.tsx
      RecordingBar.tsx
      TagSearch.tsx
      MascotWidget.tsx
      panels/
        ItemProperties.tsx
        ConnectionProperties.tsx
        KeybindSettings.tsx
    export/
      pdfExport.ts
      imageExport.ts
      zipExport.ts
    plugins/
      pluginRegistry.ts
      pluginAPI.ts
      hooks.ts
    keybinds/
      actions.ts            ← all named ActionName strings
      defaultKeybinds.ts
      keybindResolver.ts    ← keydown → ActionName → handler
    theme/
      ThemeProvider.tsx
      dark.css
      light.css
    mascot/
      MascotWidget.tsx
      effects/              ← one file per effect animation
```

---

## Core Data Types

### CanvasItem
```ts
type ItemType = 'image' | 'gif' | 'video' | 'youtube' | 'audio' | 'model3d' | 'text' | 'sticky' | 'comparison' | 'swatch'

type CanvasItem = {
  id: string
  type: ItemType
  x: number; y: number; width: number; height: number
  rotation: number        // degrees
  zIndex: number
  groupId?: string
  locked: boolean
  visible: boolean
  opacity: number
  tint?: { color: string; opacity: number }
  link?: string           // opens in system browser on click
  tags: string[]
  src?: string            // file path or YouTube URL
  meta?: Record<string, unknown>
}
```

### Connection
```ts
type Connection = {
  id: string
  fromId: string; toId: string
  fromAnchor: 'top' | 'right' | 'bottom' | 'left' | 'auto'
  toAnchor: 'top' | 'right' | 'bottom' | 'left' | 'auto'
  style: 'straight' | 'bezier' | 'elbow'
  color: string; width: number
  arrowHead: 'none' | 'arrow' | 'dot' | 'diamond'
  label?: string
  dashed: boolean
}
```

### ProjectFile
```ts
type ProjectFile = {
  version: string
  createdAt: number; updatedAt: number
  boards: CanvasBoard[]
  activeBoardId: string
  recordings?: RecordingSession[]
  keybindOverrides?: Partial<KeybindMap>
}
```

### CanvasEvent (undo + recording — same system)
```ts
type CanvasEvent = {
  id: string
  timestamp: number       // ms since recording epoch
  boardId: string
  type: 'ITEM_ADD' | 'ITEM_DELETE' | 'ITEM_MOVE' | 'ITEM_RESIZE' | 'ITEM_STYLE' | 'CONNECTION_ADD' | 'CONNECTION_DELETE' | 'CONNECTION_STYLE' | 'VIEWPORT_CHANGE' | ...
  before: unknown
  after: unknown
}
```

---

## Key Architectural Rules

### Renderer never touches `fs` directly
All file I/O goes through IPC. The full IPC channel list is in `src/main/ipc.ts`. Channels follow the pattern `namespace:action` (e.g. `file:save`, `export:pdf`, `import:zip`).

### Keybinds are never hardcoded
All interactions go through:
```
KeyboardEvent → keybindResolver → ActionName → actionHandlers[name]()
```
Actions are named strings defined in `keybinds/actions.ts`. Default bindings in `defaultKeybinds.ts`. User overrides persisted to `%APPDATA%/Citadel/keybinds.json`.

### Undo/redo and recording are the same event log
`historyStore` maintains a timestamped `CanvasEvent[]`. Undo/redo uses a cursor. Recording just keeps those events with timestamps and plays them back. Do not build separate systems.

### Tool modes gate all canvas interactions
Active tool mode lives in `uiStore.toolMode`. Never let interactions bleed between modes.
```ts
type ToolMode = 'select' | 'connect' | 'pan' | 'lasso' | 'text' | 'sticky' | 'link' | 'tag' | 'record'
```

### Video, YouTube, 3D, and Audio are DOM layer — not Konva
These item types render as absolutely-positioned DOM elements synced to canvas coordinates:
```ts
function canvasToScreen(item: CanvasItem, viewport: Viewport): DOMRect {
  return {
    left: item.x * viewport.scale + viewport.x,
    top: item.y * viewport.scale + viewport.y,
    width: item.width * viewport.scale,
    height: item.height * viewport.scale,
  }
}
```
Recompute on every viewport change.

### Snapping uses a spatial index
Don't test every item against every other item on drag. Use a grid-bucket spatial index (`snapEngine/spatialIndex.ts`). Snap threshold is 8px in screen space (divide by scale for canvas space).

### Save format uses relative paths — never base64
Assets are referenced as paths relative to the `.citadel` file. On save, prompt to copy-in any assets outside the project folder. `.citadelz` zip bundles resolve all paths to `assets/<filename>`.

---

## Mascot System

The mascot is a chess-rook tower SVG in the UI corner. It reacts to app events with animations.

**Strict colour palette — no exceptions except the two marked:**
- Tower body: `#0a0a0a`
- Effect primary (lightning, runes, beams): `#ffffff`
- Effect mid (secondary particles): `#c8c8c8`
- Effect dim (afterglow): `#505050`
- Background bloom: `#2a2a2a`
- Recording eye: `#8b0000` ← only intentional colour
- Error fracture: `#5a0000` ← only intentional colour

**Trigger effects via `mascotStore.triggerEffect(name)`** — never animate the mascot directly from feature code. Decoupling is mandatory.

**Effect triggers (key ones):**
| Action | Effect name |
|---|---|
| Export | `lightning-out` |
| Import / file open | `lightning-in` |
| Save | `rune-seal` |
| Auto-save | `base-pulse` |
| Undo | `rewind-swirl` |
| Redo | `forward-surge` |
| Delete | `crumble` |
| Recording start | `eye-open` (persistent) |
| Recording stop | `eye-close` |
| Playback | `lighthouse-beam` |
| Long operation | `progress-fill` (takes 0–1 progress value) |
| Error/crash recovery | `fracture` |
| App startup | `rise-from-fog` |
| Idle 15s+ | `ember-drift` (persistent) |
| Plugin loaded | `banner-raise` |

All effects fade through `#c8c8c8` → `#505050` → transparent. Never blend into colour.
Respect `prefers-reduced-motion` — replace all effects with a single brightness pulse.

---

## Theme

Primary theme is dark fantasy. CSS variables are the source of truth — never hardcode colours.

Key tokens:
```css
--bg-canvas: #0f0d0b
--bg-ui: #1a1612
--bg-panel: #221d18
--text-primary: #e8ddd0      /* warm parchment */
--text-accent: #c8a96e       /* aged gold — for labels, not UI chrome */
--accent: #c8a96e
--accent-danger: #8b2020
--border: #2e2820
--effect-primary: #ffffff
--effect-mid: #c8c8c8
--effect-dim: #505050
```

**Fonts:**
- Display/headers: `Cinzel` (Google Fonts)
- UI body: `Inter` or `DM Sans`
- Mono (hex values, keybinds): `JetBrains Mono`

---

## IPC Channels (summary)

| Channel | Direction | Notes |
|---|---|---|
| `file:save` | r→m | `{ path, data }` |
| `file:load` | r→m | `{ path }` → `{ data }` |
| `file:saveDialog` | r→m | → `{ path \| null }` |
| `file:openDialog` | r→m | → `{ path \| null }` |
| `file:saveRecovery` | r→m | `{ data }` |
| `export:pdf` | r→m | `{ imageData, filename }` |
| `export:image` | r→m | `{ imageData, filename, format, quality }` |
| `export:zip` | r→m | `{ projectJson, assetPaths, filename }` |
| `import:zip` | r→m | `{ zipPath }` → `{ projectJson, assetDir }` |
| `shell:openURL` | r→m | `{ url }` |
| `settings:get` | r→m | `{ key }` → `{ value }` |
| `settings:set` | r→m | `{ key, value }` |
| `zoom:set` | r→m | `{ factor: number }` — clamps to [0.75, 1.5], applies `setZoomFactor`, persists `ui.zoomFactor` |

---

## Build Commands

```bash
npm run dev       # Vite + Electron with HMR
npm run build     # Production build
npm run test      # Vitest
npm run e2e       # Playwright
```

Release: push a semver tag (`v1.x.x`) → GitHub Actions builds NSIS installer + portable `.exe` and publishes to GitHub Releases.

---

## Session Checklist

Before writing any new feature, confirm:
- [ ] Does it use the correct layer? (Konva vs DOM vs SVG overlay)
- [ ] Does it go through the IPC bridge if it touches the filesystem?
- [ ] Does it dispatch a `CanvasEvent` so undo/redo and recording work?
- [ ] Does it use `ActionName` if it's keyboard-triggerable?
- [ ] Does it trigger a mascot effect via `mascotStore`?
- [ ] Does it use CSS variables for any colours?
- [ ] Is the effect palette strictly black/white/grey?
