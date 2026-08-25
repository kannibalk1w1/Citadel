# CLAUDE.md — Citadel Project Context

> Read this at the start of every session. This is a living document — update it when decisions change.

---

## Project Identity

- **Name:** Citadel
- **Type:** Electron desktop app (Windows)
- **Purpose:** Infinite canvas creative reference tool — spiritual clone of Ref Flow with major extensions
- **Look:** Dark, quiet, and neutral. Warm parchment text on near-black, one cool
  blue accent, no ornament. The fantasy styling was deliberately removed — the
  canvas is the subject, the interface stays out of its way. Never generic
  material/flat either: it is restrained, not styleless.
- **Words:** Plain names for controls (`docs/citadel-ui-vocabulary.md` is the
  authority). Archival terms survive only as identifiers in code.
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
| State | Zustand (3 slices: canvas, history, ui) |
| Undo/Recording | Custom event log (shared system) |
| PDF preview | pdf.js (`pdfjs-dist`) — first page only |
| Word/Markdown/text import | Mammoth (`.docx`), plain read (`.md`, `.txt`) |
| Speech to text | whisper.cpp as a child process; weights downloaded on request, never bundled |
| PDF export | jsPDF + html2canvas |
| Zip | JSZip |
| Styling | CSS Variables + Tailwind |
| Build | electron-vite + Vite |
| Package | electron-builder (NSIS + portable .exe) |
| Tests | Vitest + Playwright |

---

## Folder Structure

Directories only, with what each is for. The files inside change; this list is
here so new code lands in the right place, not to be an inventory.

```
src/
  types/
    index.ts              ← CanvasItem, Connection, boards, events, ITEM_TYPES
    documents.ts          ← document:extractText contract, compiled by BOTH projects
    appearance.ts         ← styles:*/fonts:* contract + font roles, BOTH projects
    transcription.ts      ← audio:transcribe contract + model catalogue, BOTH projects
  main/
    index.ts              ← Electron bootstrap
    ipc.ts                ← all IPC handlers
    menu.ts, autoUpdater.ts, crashRecovery.ts
    projectPersistence.ts ← .citadel / .citadelz read + write
    archiveZip.ts         ← zip extraction, with path-traversal guards
    documentText.ts       ← .docx / .md / .txt → plain text (Mammoth)
    userStyles.ts         ← the person's own CSS snippets and font files
    transcription.ts      ← decoded samples → transcript, via whisper.cpp
    transcriptionModels.ts ← model download, digest check, and which one is in use
    previewCache.ts, settingsStore.ts, windowModes.ts, clickThroughRegion.ts
    stopWindow.ts         ← the click-through Stop control, its own BrowserWindow
  preload/
    index.ts              ← the only bridge; exposes window.ipc
  renderer/
    App.tsx, main.tsx
    store/                ← canvasStore, historyStore, uiStore (three, not four)
    canvas/
      CanvasStage.tsx     ← Konva Stage, pan/zoom, tool-mode click handling
      ItemRenderer.tsx    ← routes item.type → component
      useFileDrop.ts      ← every drag-and-drop import path
      items/              ← one file per ItemType, plus DOMItem for the DOM layer
      overlays/           ← SVG connections, snap guides, selection, action strips
      connections/, annotations/, arrange/, snapping/, visibility/
    ui/
      Toolbar.tsx, ContextMenu.tsx, BoardTabs.tsx, Minimap.tsx, IndexLedger.tsx
      panels/             ← ItemProperties, ConnectionProperties, KeybindSettings
      toasts/             ← inscriptionToastStore + InscriptionToasts (all feedback)
      palette/, shell/, icons/, onboarding/, prompt/
    archive/              ← media-review workbench for uncategorised assets
    assets/               ← thumbnail pipeline, asset health, preview scheduling
    export/, presentation/, performance/, plugins/, keybinds/
    theme/
      ThemeProvider.tsx
      canvasColors.ts     ← REQUIRED for any colour or font Konva will paint
      userStyles.ts       ← applies user snippets + fonts over the theme
      dark.css, light.css, graphite.css, terminal.css, cleanArchive.css, fonts.css
    utils/                ← projectFile, projectSchema, pathToUrl, pdfPreview
```

Tests sit beside what they test (`foo.ts` → `foo.test.ts`). Playwright cases use
`.e2e.ts` so `vitest run` never picks them up.

---

## Core Data Types

### CanvasItem
```ts
// Derived from the ITEM_TYPES array in src/types/index.ts — add to that list,
// never to a union, or the project-file validator will drop the new type on load.
type ItemType = 'image' | 'gif' | 'video' | 'youtube' | 'audio' | 'model3d' | 'text' | 'sticky' | 'comparison' | 'swatch' | 'code'

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
  meaning?: ThreadMeaning   // reference | memory | source | echo | contradiction
  dashed: boolean           // | question | proof | inspiration | warning | sequence
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
  type: 'ITEM_ADD' | 'ITEM_DELETE' | 'ITEM_MOVE' | 'ITEM_RESIZE' | 'ITEM_STYLE'
      | 'CONNECTION_ADD' | 'CONNECTION_DELETE' | 'CONNECTION_STYLE'
      | 'VIEWPORT_CHANGE' | 'BOARD_ADD' | 'BOARD_DELETE' | 'BOARD_RENAME'
      | 'BOARD_STYLE' | 'SELECTION_CHANGE' | 'COMPARE_MERGE'
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
type ToolMode = 'select' | 'connect' | 'pan' | 'lasso' | 'text' | 'sticky' | 'link' | 'tag' | 'swatch' | 'comparison' | 'code'
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

### Exactly one code path may reach the network

Citadel is offline-first, and the Settings pane says so in words. Downloading a
transcription model is the only outbound request the app makes, it lives in
`transcriptionModels.ts`, and a person has to press a button to reach it. The
auto-updater stays dormant, the recogniser never sees a URL, and the packaged
CSP has no `http`/`https` in `connect-src`, so a renderer fetch to an address
fails rather than succeeding quietly.

Anything that reads a user's file checks the source is a local path *before*
reading it: `pathToUrl` passes a URL straight through, so a check afterwards is
a check after the call out. `offlinePromise.test.ts` fails if a second path
appears.

### Save format uses relative paths — never base64
Assets are referenced as paths relative to the `.citadel` file. On save, prompt to copy-in any assets outside the project folder. `.citadelz` zip bundles resolve all paths to `assets/<filename>`.

---

## User Feedback

The canvas-effect subsystem stays gone. There is no `mascotStore`, no
`triggerEffect`, no `--effect-*` palette, and no `src/renderer/mascot/`. **Do not
reintroduce them** — it was a queue threaded through twenty files feeding a store
nothing drained.

The mascot itself came back as a *choice* (2026-08-25, at the user's request):
`ui/mascot/Mascot.tsx` offers the original pixel-art tower
(`assets/CitadelTower.png`, restored from the first build), the drawn rook that
replaced it, any image the person picks, or none. Each reads the two booleans
`historyStore` already keeps, so no call site knows a mascot exists. Removing it
outright was a decision made on everyone's behalf; the fix was to hand it back,
not to argue.

The tower is black line art on transparency, so `dark.css` inverts it for every
theme but the light one. It is also the asset the release audit flagged as
having no provenance on record — that question is still open, and it is a
licensing one, not a technical one.

Feedback is static and direct. A completed or refused action says so in words:

```ts
import { inscribe } from '@ui/toasts/inscriptionToastStore'

inscribe('Board exported')                                   // confirmation
inscribe('report.doc is a legacy Word file…', { tone: 'danger' })  // refusal
```

Only `InscriptionToasts.tsx` renders the stack; feature code just calls
`inscribe()`. Danger-toned messages live longer than ordinary ones. Say what
happened and, where there is one, the step that fixes it — never a bare
"something went wrong".

---

## Theme

Dark, restrained, and neutral. CSS variables are the source of truth — never
hardcode colours. `src/renderer/theme/dark.css` is the authority; the values
below are copied from it and a test fails if they drift.

Key tokens:
```css
--bg-canvas: #0f0d0b
--bg-panel: #1d1813
--bg-sunken: #0a0907
--text-primary: #e8ddd0      /* warm parchment */
--text-secondary: #b9ad9f
--text-muted: #81766a
--text-accent: #9fc3e6
--accent: #73a8db
--accent-soft: rgba(115, 168, 219, 0.16)
--accent-danger: #d36472
--border: #3a3025
--border-muted: #292117
```

The code card keeps its own dark editor palette (`--code-*`) in both themes.
The Terminal preset is the exception: it is a green-phosphor palette taken from
the Alien Obsidian theme, and it aligns the code card with the interface.

Presets are declared in two places that have to agree — the `[data-theme]` block
in a stylesheet and the swatch in `themePresetColors` — and
`themePresets.test.ts` fails if they drift. A new preset must also be imported in
`main.tsx`, or its swatch paints nothing.

**Users can restyle everything.** Because the interface is CSS variables all the
way down, customisation needs no plugin API: `%APPDATA%/Citadel/snippets/*.css`
is loaded after the theme (last in `<head>`, so it wins without `!important`),
and `%APPDATA%/Citadel/fonts/` supplies faces for the three type roles. A snippet
that moves a token must reach Konva too, which is why `userStyles.ts` calls
`refreshCanvasColors()` after applying one.

**Fonts** — only two ship, subset locally in `theme/fonts/`. There is no
Cinzel, no display face, and no Google Fonts request:
- UI and display: `Inter` (falls back to `DM Sans`, `sans-serif`)
- Mono (hex values, keybinds, code): `JetBrains Mono`

### Konva cannot read CSS variables

A 2D canvas context silently ignores `ctx.fillStyle = 'var(--accent)'` and keeps
the colour the *previously drawn shape* set, so the wrong colour shifts with
draw order. `ctx.font = '16px var(--font-body)'` is dropped whole, size and all.

Anything painted by Konva must resolve tokens first, via
`src/renderer/theme/canvasColors.ts`:

```ts
import { canvasColor, canvasFont, resolveCanvasColor, resolveCanvasFontSize } from '@theme/canvasColors'

<Text fill={canvasColor('textPrimary')} fontFamily={canvasFont('body')} />

// Values out of item meta may be a legacy `var(--…)` string from an old project.
const color = resolveCanvasColor(item.meta?.color, 'textPrimary')
const size  = resolveCanvasFontSize(item.meta?.fontSize, 16)   // Konva needs a number
```

DOM `style={{}}` and SVG attributes take `var(--…)` normally — this rule is
only for Konva props. `konvaPaint.test.tsx` scans every react-konva component
and fails if a `var()` string reaches a paint attribute.

---

## IPC Channels (summary)

| Channel | Direction | Notes |
|---|---|---|
| `file:save` | r→m | `{ path, data }` |
| `file:load` | r→m | `{ path }` → `{ data }` |
| `file:saveDialog` | r→m | `{ defaultName?, filters? }` → `{ path \| null }` |
| `file:openDialog` | r→m | `{ filters? }` → `{ path \| null }` |
| `file:saveRecovery` | r→m | `{ data }` |
| `export:pdf` | r→m | `{ imageData, filename }` |
| `export:image` | r→m | `{ imageData, filename, format, quality }` |
| `export:zip` | r→m | `{ projectJson, assetPaths, filename }` → `{ ok, path? \| reason? }` |
| `import:zip` | r→m | `{ zipPath }` → `{ ok, projectJson?, assetDir? \| reason? }` |
| `archive:progress` | m→r | `{ op: 'import' \| 'export', percent }` — throttled push during zip rites |
| `document:extractText` | r→m | `{ path }` → `{ ok, format, sourcePath, sourceName, text, characters, words, truncated } \| { ok: false, code, reason }` — local `.docx`/`.md`/`.txt` plain text only, never rendered; contract and extension table in `src/types/documents.ts` |
| `audio:transcribe` | r→m | `TranscriptionRequest` → `TranscriptionResult` — 16 kHz mono PCM in, transcript or a named reason out; local and offline, contract in `src/types/transcription.ts` |
| `audio:cancelTranscribe` | r→m | kills the run in flight for this window |
| `transcribe:progress` | m→r | `{ phase, percent }` — throttled on percent, immediate on a phase change |
| `transcription:models` | r→m | → `{ states, choice, engine }` for the Settings pane |
| `transcription:downloadModel` | r→m | `{ id }` → `{ ok, bytes? \| reason? }` — verified against a pinned SHA-256, installed only on a match |
| `transcribe:downloadProgress` | m→r | `{ id, receivedBytes, totalBytes, percent }` |
| `transcription:cancelDownload` / `removeModel` / `useModel` | r→m | `{ id }` |
| `transcription:chooseModelFile` / `clearCustomModel` / `chooseEngine` | r→m | file pickers for a model or binary the person already has |
| `styles:list` | r→m | → `{ folder, snippets, truncated? }` — the person's own `.css` files from `%APPDATA%/Citadel/snippets`, read and flagged with which are on |
| `styles:setEnabled` | r→m | `{ name, enabled }` — order of enabling is order of application |
| `styles:openFolder` / `fonts:openFolder` | r→m | creates the folder, then opens it |
| `fonts:list` | r→m | → `{ folder, fonts, choices }` from `%APPDATA%/Citadel/fonts` |
| `fonts:read` | r→m | `{ file }` → `{ ok, family, data }` — bytes for `FontFace`, so the policy still needs no font host |
| `fonts:setChoice` | r→m | `{ role, family }` — role is `display` \| `body` \| `mono` |
| `shell:openURL` | r→m | `{ url }` |
| `settings:get` | r→m | `{ key }` → `{ value }` |
| `settings:set` | r→m | `{ key, value }` |
| `assets:getThumbnail` | r→m | `{ path }` → `{ exists, size?, mtimeMs?, thumbnailPath \| null }` |
| `assets:cacheThumbnail` | r→m | `{ path, imageData }` → `{ thumbnailPath }` |
| `assets:exportCopy` | r→m | `{ sourcePath, targetPath }` → `{ ok }` — copies a relic source out |
| `assets:scanFolder` | r→m | → `{ folder \| null, files }` — directory picker + recursive media scan (depth 3, cap 500) |
| `cache:previewStats` | r→m | → `{ count, bytes }` across `preview-cache` + legacy `pdf-cache` |
| `cache:clearUnusedPreviews` | r→m | `{ preservePaths, assetPaths }` — keeps referenced previews + live-asset thumbnails |
| `zoom:set` | r→m | `{ factor: number }` — clamps to [0.75, 1.5], applies `setZoomFactor`, persists `ui.zoomFactor` |
| `window:setMode` | r→m | `{ alwaysOnTop?, opacity?, clickThrough? }` → `{ ok, mode }` — click-through implies always-on-top; opacity floors at 0.3; only the first two persist. Click-through opens the Stop control as a separate always-on-top window (`stopWindow.ts`); the main window is simply fully click-through |

---

## Build Commands

```bash
npm run dev       # Vite + Electron with HMR
npm run build     # Production build
npm run test      # Vitest
npm run e2e       # Playwright
npm run engine    # fetch whisper.cpp into resources/whisper (npm run package does this first)
```

The transcription engine is fetched from a pinned upstream release rather than
committed: platform specific, a set of shared libraries rather than one file,
and a locally built copy is compiled for the CPU that built it. See
`resources/whisper/README.md`. Models are never bundled either; Settings
downloads one on request against a pinned digest.

Release: push a semver tag (`v1.x.x`) → GitHub Actions builds NSIS installer + portable `.exe` and publishes to GitHub Releases.

---

## Session Checklist

Before writing any new feature, confirm:
- [ ] Does it use the correct layer? (Konva vs DOM vs SVG overlay)
- [ ] Does it go through the IPC bridge if it touches the filesystem? The
      renderer has no `fs`, ever.
- [ ] Does it dispatch a `CanvasEvent` so undo/redo and recording work?
- [ ] Does it use `ActionName` if it's keyboard-triggerable?
- [ ] Does it use CSS variables for DOM colours, and `canvasColor()` /
      `resolveCanvasColor()` for anything Konva paints?
- [ ] Does it say something with `inscribe()` when it succeeds or refuses,
      rather than failing silently?
- [ ] Does a new item type go in the `ITEM_TYPES` array, not a bare union?
- [ ] Does an icon-only control have its own `aria-label`? `ToolIcon` is
      `aria-hidden`, so `title` is not an accessible name.
