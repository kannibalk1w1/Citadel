# Citadel

**A private, local-first infinite canvas for collecting references, notes, code, media, and ideas.**

Citadel helps you place the things you are working with next to the thoughts
they create. Arrange items freely, connect related material, search across
boards, and save the result as a portable project.

> Status: active early release (`0.1.0`), heading for itch.io at name-your-price.
> Windows and Linux are both packaged release targets. The app is usable today;
> a manual packaged-app pass on each platform is the remaining step.

## Why Citadel

Most research and reference tools force everything into folders or linear
documents. Citadel is for work that needs spatial context: visual development,
creative research, game and product work, study, personal archives, writing
notes, and any project where connections are easier to see than to describe.

- Keep files, notes, code, and media on one board.
- Use multiple boards inside one project without losing the wider archive.
- Connect items, label relationships, and find them later through the Index.
- Work offline with files you control. No account, telemetry, or cloud is
  required.

## What it can do

### Canvas and organisation

- Infinite pan-and-zoom canvas with multi-select, lasso, smart snapping,
  alignment guides, grouping, locking, ordering, flip controls, and resize
  handles immediately after import.
- Multiple boards, board bookmarks, board duplication, templates, a minimap,
  automatic grid arrangement, and a presentation mode with an optional pen.
- Connections between items with straight, bezier, or elbow paths, labels,
  meanings, arrows, dots, diamonds, and undo/redo support.
- Tags, attached comments, image waymarks, filename labels, comparison items,
  colour swatches, and a media-review workspace for uncategorised or missing
  assets.

### Notes, text, and code

| Format | What Citadel does today |
| --- | --- |
| Text blocks | Create and edit plain text directly on the canvas; resize, rotate, style, tag, search, and connect it. |
| Notes | Create editable sticky notes or attach a comment note to an item. Notes are searchable across every board. |
| Code cards | Create copyable, syntax-coloured snippets; double-click to edit; choose TypeScript, JavaScript, Python, JSON, HTML, CSS, Bash, SQL, YAML, or plain text. Code content and language are searchable and export correctly. |
| PDFs | Drop a PDF to add a cached preview of its first page. It is a visual reference, not a full PDF reader or text extractor. |
| Word documents (`.docx`) | Drop a `.docx` to import its text as a normal canvas text block: editable, searchable, taggable, connectable, and included in exports. The path to the original document is kept on the item, and the file itself is never modified. |
| Markdown (`.md`, `.markdown`) | Imported the same way, as its **source text**. Citadel does not render Markdown: headings, lists, and links arrive as the characters the file holds, and the item says so when it lands. |
| Plain text (`.txt`) | Imported the same way. UTF-8 and UTF-16 files are both read, so a file saved from Notepad as "Unicode" arrives as text rather than as gibberish. |
| Legacy Word (`.doc`) | Not supported. Dropping one shows a message asking you to save it as `.docx` in Word and drop it again; nothing is imported and nothing is silently dropped. |
| RTF, ODT | Not imported. Paste their content into a text block, note, or code card instead. |

Citadel currently stores plain text and code inside the project; it does not
interpret Markdown, offer rich-text editing, or round-trip office documents.

**What document import does and does not do.** Import produces plain text only.
From a `.docx`, headings, bold, italics, tables, images, footnotes, comments,
and tracked changes are not carried across; table cells and list items arrive
as ordinary paragraphs. From a `.md` or `.txt`, the file arrives as written —
only line endings are normalised, so Markdown's own hard line breaks and blank
lines survive. Citadel never writes back to any of them.

Documents are read locally by the app's main process — nothing is uploaded and
no network request is made. Two bounds apply to every format: files over 25 MB
are refused, and documents longer than 200,000 characters are imported up to
that point with a visible line on the item saying so. Password-protected Word
documents cannot be opened; Citadel says so and asks for an unprotected copy. A
file that is not really text behind a `.txt` name is refused rather than pasted
onto the canvas as noise. Any other document that cannot be read is reported in
the app with the reason rather than skipped in silence.

### Media and references

- Drag in images, GIFs, video, audio, 3D models, and PDFs.
- Add YouTube URLs as embedded references.
- Image, GIF, video, and 3D previews use a local thumbnail pipeline so large
  boards stay responsive.
- Pull a colour palette straight out of a reference image. The swatch appears
  connected back to the image it came from, so the relationship stays visible.
- Keep a capture beside the thing it came from: a note can record a URL or file
  reference, an excerpt, and a region drawn directly on the image. Regions can
  be moved and resized later, an image lists the captures taken from it, and
  Open source recentres the board on the original.
- Video, audio, YouTube, 3D, and code cards are supported in board exports:
  static previews are used where a live frame cannot be captured safely.

Supported drag-and-drop extensions include:

- Images: `jpg`, `jpeg`, `png`, `webp`, `bmp`, `tiff`, `tif`, `svg`, `gif`
- Video: `mp4`, `webm`, `mov`, `mkv`, `avi`
- Audio: `mp3`, `wav`, `ogg`, `flac`, `aac`, `m4a`
- 3D: `glb`, `gltf`, `obj`, `fbx`
- Documents: `pdf` (first-page preview), `docx`, `md`, `markdown`, `txt`
  (text imported as a text block)

### Find and move quickly

- The **Index** searches items, notes, comments, tags, connections, code-card
  contents, code languages, and every board in the current project.
- Filter by item type, tag, board, visibility, lock state, source file, and
  connection meaning.
- Use the keyboard-first **Command palette** (`Ctrl/Cmd+K`) for available
  actions and board navigation.
- Customise shortcuts in Settings. Overrides are stored locally and update both
  the app and the native menu.

### Reviewing and studying

- **Vision checks** (`Y` cycles, `Shift+Y` clears) redraw the whole board to
  test a picture rather than describe it: Value for greyscale, Squint for a
  blurred read of the composition, and deuteranopia, protanopia, and
  tritanopia simulations. `Shift+M` mirrors the board, which surfaces drawing
  errors the eye has stopped seeing.
- **Study sessions** (`Shift+D`) run timed reference practice over a queue of
  items, with pause, skip, and a chosen interval.
- The **Time machine** (`Shift+T`) scrubs the board through its own history.
  Undo and recording were built as one event log, so the whole session is
  already there — drag and the board assembles and disassembles itself. Name a
  moment to come back to it, and every manual save leaves a thumbnail in the
  filmstrip so the states you chose to keep are visible without travelling to
  each one.
- **Recording** (`Ctrl/Cmd+R`) captures a session from that same log and plays
  it back from the recording bar.

### Making it yours

- Three theme presets (Citadel, Graphite, Parchment light), each tunable by
  colour. Save a palette locally, or export one as a `.citadel-theme.json` to
  share.
- Optional flourishes under **Fun Settings**, all off by default: a save
  banner and HyperType mode.
- **Cursor packs.** Citadel ships with the system pointers and no cursor art of
  its own. A pack is a small `.citadel-cursors.json` file holding one image per
  cursor slot, imported from Fun Settings and published separately from the
  app. Packs are data, never code: images must be `data:` URIs of a real image
  type, are size-bounded, and every custom cursor keeps the standard one as its
  fallback, so a pack can neither reach the network nor leave you without a
  pointer.
- Adjustable UI scale, and a canvas background that can be the default dot
  grid, flat, your own image, or nothing at all.

### Overlay, export, and projects

- Keep Citadel above other windows, change opacity, or enable click-through
  mode. Click-through retains a small interactive Stop panel and a fixed
  `Ctrl+Alt+C` escape hatch.
- Export the viewport, selection, or active board as PNG/JPG or PDF.
- Save normal `.citadel` projects with relative asset paths, or make a portable
  `.citadelz` archive that bundles project assets.
- Automatic recovery snapshots, recent projects, preview-cache maintenance,
  missing-asset relinking, and archive import/export progress are built in.

## Privacy and network use

Citadel is local-first. Projects, archives, settings, keybindings, previews,
and recovery files stay on your device. There is no account, telemetry, or
analytics.

Network access happens only when you explicitly use a remote source or add a
YouTube reference. Citadel makes no outbound request on launch: there is no
update check, no telemetry, and interface fonts are bundled, so a launch with
the network disconnected behaves identically to one without. Updates are manual
downloads for now.

## Getting started

### Use a release build

On Windows, an NSIS installer or a portable `.exe`. On Linux, an AppImage that
runs without installing, or a tar.gz to unpack yourself. Builds are unsigned, so
Windows SmartScreen will warn on first run. Open a `.citadel` project directly,
or start a new board and drag in references.

On first run, Citadel offers a guided tour — `examples/showcase.citadel`, five
boards carrying every kind of item, connection and review tool with notes
explaining each. It opens without taking its own path, so saving asks where to
put your copy and the shipped original stays intact. Regenerate it with
`node scripts/buildShowcase.mjs`; its media is synthesised by ffmpeg and rides
inside the file as data URIs, so there are no assets to lose.

Citadel also shows a small, skippable Getting started guide covering
the spine of the app — boards, importing, notes and code, connecting items
together, the Index, reviewing work, and overlay mode. It never blocks opening
an existing project.

### Build from source

Prerequisites: Node.js 20+ and npm.

```bash
git clone https://github.com/kannibalk1w1/Citadel.git
cd Citadel
npm install
npm run dev
```

Useful commands:

```bash
npm run typecheck   # TypeScript project check
npx vitest run      # Full non-watch test run
npm run build       # Production build
npm run e2e         # Build, then run isolated Electron smoke tests
npm run a11y        # Build, then run accessibility checks in Electron
npm run analyze     # Write reports/bundle-stats.html; never opens a browser
npm run package     # Windows installer and portable artifacts
```

See [testing.md](docs/testing.md) for the portable test setup. The Electron
tests use Citadel's locally installed Electron binary and an isolated temporary
profile, so they need no system browser, global package, personal settings, or
machine-specific path.

Packaged targets are Windows x64 (NSIS installer and portable `.exe`) and Linux
x64 (AppImage and tar.gz). Build Linux artifacts with `npx electron-builder
--linux`. macOS may run from source but is not a release target — it needs an
Apple Developer account and notarisation.

Application icons are generated from `resources/icon.svg` by
`node scripts/buildIcons.mjs`.

## Project format

- `.citadel` — JSON project file. Local assets are referenced relative to the
  project where possible.
- `.citadelz` — portable zip archive containing the project and bundled assets.

Project data is designed to remain readable and portable. Preview thumbnails,
recovery data, and custom keybindings are derived local data rather than content
you need to share with a project.

## Technology

Electron, React, TypeScript, Konva, Zustand, Three.js, pdf.js, Mammoth, jsPDF,
html2canvas, JSZip, Vitest, Playwright, axe-core, and Rollup Visualizer.

## Development notes

- Renderer code never reads the filesystem directly; file operations use the
  Electron IPC bridge.
- Undo/redo and recording share one event log.
- Keyboard actions are named and routed through one resolver.
- The visual language is clean and high-contrast. Motion is short, purposeful,
  and reduced-motion safe—never decorative or theme-driven.
- The plugin scaffolding in `src/renderer/plugins` is not wired up: nothing
  calls `loadPlugin`, no hooks are emitted, and there is no loader that reads a
  plugin from disk. Treat it as a sketch rather than an API. Features that need
  to ship separately use data files instead — see cursor packs and
  `.citadel-theme.json` palettes.

## Contributing

Issues and focused pull requests are welcome. Before opening a change, run
`npm run typecheck`, `npx vitest run`, and `npm run build`. Keep filesystem work
in the main process, route keyboard behavior through the action system, and add
tests for behaviour changes.

## License

[MIT](LICENSE). Third-party attribution is collected in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
