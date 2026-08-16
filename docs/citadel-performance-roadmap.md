# Citadel Performance And Roadmap Strategy

Citadel must let a user build a large, emotionally dense archive without the archive becoming slow, fragile, or visually noisy.

This document turns the defining movement into engineering priorities.

## Scale Target

Citadel should eventually support:

- thousands of relics per project
- hundreds of visible relics per chamber
- large media boards with images, PDFs, GIFs, videos, audio, and 3D models
- searchable sigils, inscriptions, thread labels, filenames, and metadata
- archive health checks across many local file paths
- portable `.citadelz` archives with bundled assets
- atmospheric overlays without damaging interaction latency

The target interaction budget is:

- pan and zoom remain responsive on large chambers
- search feedback appears quickly and progressively
- heavy media wakes only when useful
- save, export, and archive operations show progress and avoid blocking the renderer where possible

## Current Decisions From Recent Sessions

These are the active implementation decisions that future sessions should preserve.

Completed direction:

- Citadel is a clean, static canvas for memory, research, reference, introspection, and nonlinear thought, not primarily a worldbuilding app.
- Product language follows `docs/citadel-ui-vocabulary.md`, which is the authority for anything a user reads: controls get the plain word (Board, Item, Connection, Tag, Note, Bookmark, Index), while identifiers, filenames and `ActionName` strings keep the archival vocabulary. The archival wording in this document describes internals, not labels.
- Default first-class concepts like Character, Place, Event, Faction, and Clue should not drive the base UX; they can be user-created tags or templates later.
- Performance work should preserve clarity and responsiveness. Do not add decorative animation, ornamental chrome, fantasy/gothic framing, or themed cursors.

Implemented performance decisions:

- `CanvasStage` uses viewport virtualization with overscan and protected IDs for selected, highlighted, and active connection-source relics.
- DOM-layer media (`video`, `youtube`, `audio`, `model3d`) only mounts from the rendered viewport slice, with selected/protected media kept awake.
- GIF relics stop playback on unmount and ignore late gifler frames after sleep.
- Connection and group overlays are visibility-aware; visible, active, and pulsing Binding context is preserved while dormant offscreen overlays sleep.
- `Chamber Load` gives a lightweight runtime readout for total relics, mounted relics, awake DOM media, and sleeping animated relics.
- Binding endpoint sigils are allowed for active and pulsing visible-context threads, but must remain tied to the existing overlay visibility path.
- Binding creation is centralized through `handleConnectRelicClick`, so new item types should use that helper rather than duplicating connection creation.
- Binding reveal now uses the existing `bindingPulse` path, includes path-progress reveal data, and supports reduced motion with a static shortened pulse.
- Living Index canvas sigil marks are capped and filtered through the current viewport visibility context, so search can scan the chamber without drawing marks for dormant offscreen relics.
- Living Index result rows now use archive-native context: tagged relics surface Sigils, thread rows surface Binding inscriptions, meanings, endpoints, and shape.
- Living Index relic focus activates one directly related Binding through the existing active-thread visibility path, revealing nearby context without waking every dormant offscreen thread.
- Index search now sweeps every chamber via `getArchiveIndexResults`: active-chamber results lead, dormant-chamber results carry chamber identity in the row detail, and focusing one travels there through `setActiveBoard` before the existing focus/highlight path. Canvas sigil marks remain active-chamber only, so the visibility discipline is unchanged.
- Index search supports `chamber:<id-or-name>` as an archive-level filter; with additional terms it searches inside matching chambers, and by itself it lists the matching chamber's indexed relics and threads.
- Asset metadata records live in renderer memory (`src/renderer/assets/assetMetadata.ts`), keyed by item src — derived cache, never persisted into the project file, so relinking simply produces fresh records for the new path.
- Image relics render thumbnail-first: a cached 256px thumbnail when the relic's largest on-screen side fits within thumbnail resolution, the full source when selected or larger on screen (`previewPolicy.preferThumbnail`). `useStableImage` keeps the previous bitmap while the swap loads so relics never blank.
- Thumbnails are content-addressed (`thumb-<hash>-<size>-<mtime>.png`) in `userData/preview-cache`; the legacy `pdf-cache` is read/cleaned only and new PDF page previews also land in `preview-cache`. Settings maintenance shows one unified "Preview cache".
- Thumbnail generation is lazy (it runs on relic mount, which viewport virtualization already limits) through a concurrency-2 queue in `thumbnailPipeline.ensureThumbnail`; failures record `thumbnailPath: null` and fall back to the full source without retrying.
- Missing image sources render a dark placeholder with the filename instead of disappearing, so relink keeps the relic's place in the chamber.
- GIF relics now request first-frame thumbnails through the same preview pipeline; small unselected GIFs render cached static previews instead of waking gifler playback.
- Video relics now request poster-frame thumbnails; small unselected videos render cached poster images instead of mounting a `<video>` element and its frame controls.
- 3D relics now request static preview captures; small unselected models render cached preview images instead of creating an active Three.js renderer loop.
- Text and sticky relics silhouette at far zoom: below a 5px on-screen font size (`textDetailPolicy.preferTextSilhouette`), unselected/unedited text relics render a dim rect and stickies skip glyph layout while keeping their chrome. Selection and editing always restore full text.
- Chamber identity lives in `board.meta` and is normalized by `resolveChamberIdentity` (`src/renderer/canvas/chamberIdentity.ts`). Six persisted IDs remain compatible with existing projects, while their UI labels are neutral colour presets. Accent overrides and optional custom floor textures remain supported; legacy ambience fields are inert and no longer exposed in the UI. Identity edits push `BOARD_STYLE` events, so they undo/redo/record like any canvas mutation.
- Chamber accent tones are exposed as `--chamber-accent`, `--chamber-accent-dim`, `--chamber-accent-glow` CSS variables scoped on the canvas stage container. Use them only for clear state and selection feedback—not decoration.
- Code snippet cards follow the same far-zoom discipline through `textDetailPolicy.preferCodeSilhouette`, which delegates to `preferTextSilhouette` at the card's 12px font so there is one threshold across item types. The mechanism differs from Konva text and the comment there says so: `DOMItem` sizes the card in screen pixels with no CSS scale transform, so its glyphs never shrink — the box collapses around 12px text instead, and the user sees a few clipped characters rather than small ones. Below the threshold the card renders a constant-size silhouette (header strip plus five ragged bars) inside the same `DOMItem`, so selection chrome, dragging and resizing are untouched, and the tokenizer is skipped entirely rather than merely hidden. Measured on a 400-line snippet: 3210 rendered DOM nodes drop to 9, and the count no longer tracks snippet length. Selection and editing always wake the full card, which is what keeps Copy and double-click editing reachable at any zoom.
- Code cards are indexed by the normal search path (`itemSearchModel`), not a separate system: `meta.code` and the selected language join the existing haystack, so free text, `type:code`, `tag:`, and `board:`/`chamber:` filters all work unchanged, on every board. Rows read `Code · TypeScript  |  12 lines  |  <excerpt>`; the excerpt is the line the query matched when there is one, otherwise the first non-blank line. Display names come from `CODE_LANGUAGE_LABELS` in `codeSnippet.ts`, shared with the language picker. Snippets are their own `code` result group — the search panel renders groups only, so before this a matched code card was found and then never drawn. Search-size limits: the haystack takes the first 20,000 characters of a snippet (a match past that is not found; nothing is truncated on the canvas or in the file) and a row's excerpt is capped at 120 characters with whitespace collapsed, so a result row can never become a code dump. Labels use the snippet's first line, never the item id.
- Code snippet colouring is language-aware through a dependency-free scanner in `codeSnippet.ts`. `tokenizeSnippet(code, language)` is the single entry: the live card and `codeCardExport` both call it, so a card and its exported still can never colour the same snippet differently — a parity test pins them together across all ten languages. It tokenizes the whole snippet rather than each line alone because block comments, template literals and Python docstrings need state carried between lines. Grammars are declarative specs (line/block comments, string rules with escape and multiline flags, keyword sets, key-colon handling, markup mode) rather than per-language code. Intentional lexical limits: it is a scanner, not a parser — no nesting, no regex-literal or JSX awareness, no string interpolation highlighting, and no heredocs; the palette stays at five kinds (plain/keyword/string/number/comment), so HTML tags and JSON/YAML/CSS keys reuse `keyword` rather than adding colours; a `:` promotes what precedes it on that line, so a CSS pseudo-selector reads as a key. Work is bounded by `TOKENIZE_LIMITS` — past 5000 lines or a 2000-character line the text still arrives, as one plain token, so line counts and the export's gutter maths stay exact while the cost stops growing. Unknown languages and `plaintext` fall through to no highlighting.
- Image and PDF export captures the Konva stage canvas, which by construction cannot see the DOM overlay, so every DOM-layer item is absent from exports. Code cards are now repainted onto a copy of the captured bitmap by `export/codeCardExport.ts` — background, header, terminal dots, language, gutter, and syntax-coloured lines, using `--code-*` resolved through `canvasColors` because a 2D context cannot read CSS variables. Layout constants and the tokenizer are shared with the live card via `CODE_CARD_LAYOUT` and `tokensForLine`, so the still cannot drift from the card it represents. Deliberate limits: the Copy button is a control and is not drawn; lines are clipped rather than wrapped, matching the card's `white-space: pre`, with a `…` on any cut line; overflow past the card height becomes a `… +N more lines` marker that is given its own row. Content is scale-invariant — the whole card scales together, so the same lines export at any board zoom. Video, YouTube, audio and 3D items are now covered too, through the same composition pass (`export/domLayerExport.ts`).
- DOM-media export takes the still the preview pipeline already cached where one exists: `video` and `model3d` draw their poster/preview frame from `assetMetadata.thumbnailPath`, letterboxed, with a corner type badge so a still frame is never mistaken for a plain image. Everything else draws a neutral placeholder carrying its type and identity (filename, or the YouTube video id) so a gap is never silent. Nothing live is captured — no `<video>`, no `<webview>`, no Three renderer, no playback controls. Two types have no safe static source at all and always place-hold: YouTube, because the only still is a network fetch and Citadel renders offline; and audio, because the waveform is an AnalyserNode reading live playback and is flat whenever nothing is playing. A poster that fails to decode degrades to the placeholder rather than failing the export. Boards with no DOM-layer items skip the copy and the poster decode entirely and keep the exact capture they always had.
- Filename inscriptions (`view:filenameLabels`, `shift+f`, Mark-section toggle) render the source basename under media relics via `filenameLabel.filenameInscription`; they follow the far-zoom discipline (hidden below the 5px screen-font threshold) and default off.
- The Archive Workbench panel reviews uncategorized relics (suggested sigils from filenames, one-click apply) and missing assets, and ingests folders via `assets:scanFolder` + `workbenchIngest` grids — all mutations ride the normal event log.
- The Ledger panel (`indexLedgerModel`) is the sortable/filterable table lens over every relic and thread in the archive with click-to-travel.
- Waymarks: labeled pins at normalized coords inside image relics (`item.meta.waymarks`, cap 16); Alt+click plants, dot-click edits/removes, ITEM_STYLE undo; rendered only while the relic is selected.
- Inscription references: `[[phrase]]` tokens in sticky/text content are parsed by `inscriptionRefs.ts`, indexed into search haystacks, and surfaced as chase-chips in the Codex panel that open the Living Index pre-filled — phrase-based on purpose (no id coupling, nothing breaks on rename).
- Relic templates: any selection can be sealed as a reusable template (`relicTemplates.ts`, stored in user settings `templates.relics`, cap 24, cross-project) and stamped into any chamber from the board navigator; stamping pushes ITEM_ADD/CONNECTION_ADD events so it undoes cleanly.
- `window.prompt` throws in Electron ("prompt() is and will not be supported") — every text ask goes through `askInscription` + the `InscriptionPrompt` modal. Board rename and thread-label editing were silently broken by this and are now fixed; never reintroduce `window.prompt`.
- UNDO/REDO now handle `CONNECTION_ADD` (previously pushed but ignored, so binding creation was not undoable).
- Waystones: per-chamber named viewport anchors in `board.meta.waystones` (cap 12, `chamberWaystones.ts`), planted/renamed/removed through `BOARD_STYLE` events; `alt+w` plants, `alt+]` cycles, navigator lists them under Chamber Rite.
- The presentation quill (`presentation:quillToggle`, `q` while presenting) draws ephemeral screen-space strokes on an SVG overlay via `quillStore` — deliberately outside `historyStore` so presenter scribbles never enter undo or recordings; everything resets when presentation mode exits.
- Verbal confirmations go through `inscribe(text)` (`src/renderer/ui/toasts/inscriptionToastStore.ts`) — max 3 stacked, 2.6s lifetime, archival phrasing ("Chamber raised", "The eye opens"). Saves keep the bespoke YouSaved banner; the toast fires on save only when that banner is disabled.
- The mascot and canvas-effect subsystem is gone (2026-08-16), not merely disabled: `mascotStore`, `canvas/effects/*`, the RightSidebar effect overlay and every `triggerEffect` call site are removed, along with `PluginAPI.triggerMascotEffect`. No mascot state was ever persisted, so project files are unaffected. Feedback that only existed as an effect is now an `inscribe` toast. Do not reintroduce an effect queue.
- The interface draws its icons from one source: `ui/icons/ToolIcon.tsx`, a 24-unit grid at stroke 1.8. `LOCK_PATH_D` is exported from it so the Konva lock badge and the DOM lock badge stay the same mark. New secondary controls take a ToolIcon rather than a text glyph or an emoji.
- `ToolIcon` is `aria-hidden`, so an icon-only control must carry its own `aria-label` — `title` alone is not an accessible name. Toggles carry `aria-pressed`, disclosures `aria-expanded`. A Toolbar test fails on any unnamed button.
- The code snippet card reads its palette from `--code-*` tokens in `dark.css`. It keeps a dark terminal scheme in both themes on purpose, the way an editor keeps its colour scheme; that is a deliberate exception, not an oversight.
- `SelectedActionStrip` supports multi-selection (positioned over the gutter-padded selection union via `selectedActionStripPositionForSelection`); single-target buttons (properties/connect/link/tag) stay single-only. Flip lives in `meta.flipX`/`meta.flipY` via `item:flipH`/`item:flipV` (`shift+h`/`shift+v`), rendered with `flipTransform.flipProps` on image relics only — GIF/video nodes are their own interactive Konva nodes where a base -1 scale would break transformer math.

Profiling notes:

- Baseline profile: `docs/citadel-large-chamber-profile-2026-05-25.md`.
- Binding endpoint profile: `docs/citadel-large-chamber-profile-2026-05-25-binding-endpoints.md`.
- Binding reveal profile: `docs/citadel-large-chamber-profile-2026-05-27-binding-reveal.md`.
- Media preview gate profile: `docs/citadel-large-chamber-profile-2026-06-15-media-previews.md`.
- Real-media sweep attempt: `docs/citadel-large-chamber-profile-2026-06-30-real-media-sweep-attempt.md`.
- Real-media preview sweep (completed): `docs/citadel-large-chamber-profile-2026-07-04-real-media.md`.
- Chamber ambience profile: `docs/citadel-large-chamber-profile-2026-07-04-ambience.md`.

Active next-step queue:

1. Keep Index marks capped and visibility-aware; consider saved trails only after multi-chamber archives are in real use.
2. Add an interactive floating control surface for click-through mode. The panel itself must remain interactive while the rest of the window passes clicks through, and it must provide a clear exit from click-through.
3. Add a keyboard-first command palette for actions, navigation, and common creation commands. It must use the existing ActionName/keybind system rather than a parallel command layer.
4. Add a clean first-run onboarding flow that explains the board, importing, creating notes/code cards, search, and the window overlay controls. It must be skippable and never block opening an existing project.

Deferred validation:

- Manual packaged-desktop QA for overlay opacity, immediate resize handles on import, and code snippet copy/editing is intentionally deferred; it is not a release blocker.

Closed in the clean-interface pass (2026-08-16):

- Fantasy/gothic terminology, images, and dormant effect code are removed; UI feedback is static and direct. The remaining archival words are identifiers only.
- Code snippets are a first-class item: language picker, tokenized highlighting, double-click editing, and a keyboard copy action.
- Secondary icons across context menus, panels, and empty states run through `ToolIcon` with accessible names.
- Code cards now honour progressive detail at far zoom, so every text-bearing item type shares one threshold.

## Rendering Strategy

### 1. Viewport Visibility

Move from "render every item on the active board" to "render every relevant item near the current viewport."

Required pieces:

- a reusable viewport bounds helper
- item bounds indexing by chamber
- overscan margin so items appear before entering view
- separate visibility rules for canvas primitives, DOM media, search marks, threads, and minimap

Near-term first slice:

- compute visible item IDs in `CanvasStage`
- keep selected, dragged, highlighted, and connected-nearby items rendered even if just outside viewport
- cap active Living Index marks to a reasonable number while the full index is still local

### 2. Progressive Detail

Citadel should reveal detail as the user zooms in.

Suggested levels:

- far zoom: silhouettes, sigils, thread structures, simplified labels
- mid zoom: thumbnails, note blocks, connection labels
- close zoom: full images, editable text, media controls, detailed inscriptions
- focused or selected: full DOM media, active 3D renderers, audio waveform interaction

This supports performance and strengthens the archive fantasy: the chamber reveals itself as the user descends into it.

### 3. Thumbnail-First Media

Every imported file should eventually have a lightweight preview.

Pipeline:

- asset ingestion records source path, type, size, modified time, dimensions, and hash when available
- image thumbnails generated in a background path
- video poster frames generated where Electron and Chromium support it
- PDF first-page previews reused from the existing PDF cache
- 3D models get static preview captures where possible
- missing assets retain metadata and a clear placeholder

Canvas rendering should prefer thumbnails by default. Full media wakes on selection, hover, close zoom, playback, or explicit open.

### 4. Media Scheduling

Animated and heavy media need a shared scheduler.

Rules:

- GIFs pause when offscreen or far zoomed
- videos do not autoplay unless explicitly requested
- audio waveform work is cached and paused offscreen
- 3D items do not each own an always-running render loop
- selected media gets priority
- inactive media degrades to poster or thumbnail

For 3D, the medium-term goal is a shared render scheduler rather than one independent `requestAnimationFrame` loop per item.

## Data Strategy

### Archive Index

Build an archive index that backs both performance and the Living Index.

Indexed fields:

- item ID
- chamber ID
- item bounds
- type
- source path
- basename
- tags and sigils
- inscription text
- thread labels
- link URL
- metadata
- missing asset state
- generated thumbnail path

Later indexed fields:

- PDF text
- OCR text
- audio transcript
- embedded file metadata
- file hash
- import source history

The first implementation can stay in renderer memory. The long-term implementation should move heavy indexing into a worker and persist derived metadata alongside project or user cache data.

### Normalize State

The current board-owned item arrays are simple and useful, but large archives will benefit from normalized structures.

Target shape:

- `boardsById`
- `itemIdsByBoardId`
- `itemsById`
- `connectionsById`
- `connectionIdsByBoardId`
- memoized selectors for active chamber, visible items, selected items, search hits, and connected thread neighborhoods

Do this after the first virtualization pass, not before. The first pass will reveal which selectors matter.

## Worker Strategy

Move expensive work out of the renderer thread.

Worker candidates:

- thumbnail generation
- image dimension probing
- PDF preview and text extraction
- archive import validation
- archive export manifest generation
- asset hashing
- missing asset scans
- OCR
- Living Index rebuilds

IPC and worker messages should be typed and cancellable for long operations.

## Archive Import And Export

`.citadelz` handling should become more robust before archives get large.

Needed improvements:

- validate zip paths before extraction
- reject absolute paths and `..` traversal
- enforce max entry count and size limits
- validate project schema before applying it
- stream or chunk large archive operations
- show progress through the mascot/progress effect and a real progress UI
- preserve original source metadata separately from portable bundled paths

## Medium-Term Roadmap

### Phase 1: Living Index First Slice

Status: complete.

Goals:

- search panel becomes the Index
- matching current-chamber relics receive subtle sigil marks
- clicked result still focuses strongly
- search remains powered by existing `itemSearchModel`
- search sweeps all chambers; dormant-chamber results travel on focus (see `docs/superpowers/specs/2026-06-12-cross-chamber-index-design.md`)
- `chamber:<id-or-name>` filters archive results to matching chambers and can list a chamber by itself

Next:

- keep any new search marks visibility-aware and capped before adding richer ornamentation
- consider saved trails after multi-chamber archives are in real use

### Phase 2: Viewport Virtualization

Goals:

- render only visible and nearby canvas items
- keep selected, editing, highlighted, connected, and dragged items mounted
- pause offscreen DOM media
- avoid changing save and export behavior

Verification:

- use the generated large-board fixture to measure search, mark, pan, and zoom responsiveness with 1,000+ simple items
- measure GIF, video, and 3D offscreen behavior

### Phase 3: Asset Metadata And Thumbnails

Status: second slice complete (images, GIF first frames, video posters, and 3D static previews). Spec: `docs/superpowers/specs/2026-06-12-asset-metadata-thumbnails-design.md`.

Goals:

- introduce asset metadata records — done (renderer-memory records keyed by src)
- generate and cache thumbnails — done for images (content-addressed `preview-cache`, lazy concurrency-2 generation)
- use thumbnails for far and mid zoom — done for image relics (resolution-aware `preferThumbnail`)
- unify PDF preview cache with broader asset preview cache — done (`cache:previewStats` / `cache:clearUnusedPreviews` span both dirs)
- extend previews to heavier media — done for GIF first frames, video poster frames, and 3D static captures through the existing `assetMetadata` / `preview-cache` path
- keep heavy media asleep when previewed — done for small unselected GIFs, videos, and 3D models

Remaining:

- real-media cold/warm cache profiling — done 2026-07-04 (`docs/citadel-large-chamber-profile-2026-07-04-real-media.md`); worker gate judged not met
- move generation into a worker once volume justifies it (gate not met as of the 2026-07-04 profile)
- progressive text/label detail at far zoom — done 2026-07-04 (`textDetailPolicy` silhouettes for text and sticky relics)

Verification:

- import mixed media
- save and load portable archives
- relink missing assets without losing metadata (missing relics now keep a placeholder)

### Phase 4: Thread Binding

Goals:

- rename connection UX toward threads where user-facing
- add lightweight thread meanings
- add searchable thread labels
- add binding feedback when a thread is created

Suggested meanings:

- reference
- memory
- source
- echo
- contradiction
- question
- proof
- inspiration
- warning
- sequence

### Phase 5: Chamber Appearance

Status: reset for the clean-interface direction (2026-08-16). Accent presets and optional user-selected textures remain; decorative ambience, animation, stone defaults, and gothic framing are retired. The follow-through then deleted the assets themselves — the bundled stone tile, the tower PNG, the themed `.cur` cursors, the arcade sounds, and the Cinzel and Press Start typefaces — so nothing dormant remains to be switched back on.

Goals:

- preserve compatible chamber identity IDs while presenting neutral colour presets — done (`resolveChamberIdentity` over `board.meta`, `BOARD_STYLE` undo)
- keep canvas presentation static — done (no ambient effects or motion controls)
- retain optional user-selected floor textures without a bundled themed default — done
- use chamber accents for clear state and selection feedback only; richer cosmetic theming is out of scope

## Long-Term Signature Features

### The Living Index

A searchable catalogue that wakes the archive:

- searches across all chambers
- reveals matching relics with fading sigil marks
- shows related threads and nearby concepts
- supports OCR and PDF text
- supports saved searches and sigil collections
- can follow trails through the archive spatially

### Thread Binding

A connection system where visual lines carry meaning:

- thread type
- directionality
- label
- strength
- visual style
- searchable metadata
- ritual creation feedback

### Archive Workbench

A focused mode for ingesting a folder, clipping references, reviewing uncategorized relics, assigning sigils, writing inscriptions, and placing selected relics into chambers.

### Deep Media Archive

Support broad file ingestion without turning Citadel into an editor for every format:

- `.kra`, `.psd`, `.svg`
- `.blend`, `.glb`, `.gltf`, `.obj`, `.fbx`
- PDFs and documents
- audio and video
- Godot, Unity, and Blender metadata where practical
- Obsidian and Markdown import and export

The principle: Citadel preserves, previews, annotates, searches, and connects files. It does not need to replace specialist creation tools.
