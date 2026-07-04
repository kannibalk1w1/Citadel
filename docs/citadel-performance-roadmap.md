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

- Citadel remains an atmospheric archive for memory, research, reference, introspection, and nonlinear thought, not primarily a worldbuilding app.
- Product language should stay broad and archival: Relic, Inscription, Thread, Sigil, Chamber, Index, Binding, and Rite.
- Default first-class concepts like Character, Place, Event, Faction, and Clue should not drive the base UX; they can be user-created sigils or templates later.
- Performance work should preserve atmosphere rather than flatten the app into a generic productivity canvas.

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
- Chamber identity lives in `board.meta` and is normalized by `resolveChamberIdentity` (`src/renderer/canvas/chamberIdentity.ts`): mood preset (six ids; the original four are persisted in real projects and must not be renamed), accent override, ambience kind/intensity, vignette, glow, and optional floor-texture override. Identity edits push `BOARD_STYLE` events, so they undo/redo/record like any canvas mutation.
- Chamber ambience is a fixed-budget DOM/CSS layer (`ChamberAmbience`, ≤14 motes or 2 fog bands plus static vignette/glow gradients) mounted between the canvas floor and the Konva stage. It never touches relics or viewport slices; reduced motion degrades it to a single static wash. Profiled at zero measurable cost on the 1,003-relic fixture (2026-07-04 ambience profile).
- Chamber accent tones are exposed as `--chamber-accent`, `--chamber-accent-dim`, `--chamber-accent-glow` CSS variables scoped on the canvas stage container; new canvas-side ornament colours should consume these rather than hardcoding.
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

1. Phase 5 (Atmospheric Chambers) first slice landed 2026-07-04 (identity model, ambience/lighting layer, per-chamber floor texture, Chamber Rite controls, ambience profile clean). Candidate follow-ups: feature-gap scouting doc, chamber ambience variants only with a fixed budget + profile check.
2. Keep new Index marks capped and visibility-aware, following the Binding overlay discipline.
3. Preserve reduced-motion support for any future atmospheric animation.
4. Do not add more persistent SVG ornamentation without a profile check against the large-chamber fixture.
5. Consider saved trails only after multi-chamber archives are in real use.

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

### Phase 5: Atmospheric Chambers

Status: first slice complete (2026-07-04). Spec: `docs/superpowers/specs/2026-07-04-atmospheric-chambers-design.md`.

Goals:

- evolve board moods into chamber identity — done (`resolveChamberIdentity` over `board.meta`, six mood presets, `BOARD_STYLE` undo)
- add optional chamber ambience — done (motes/fog, fixed budget, reduced-motion static wash, profiled clean)
- add lighting and texture controls — done (vignette + glow dials, per-chamber floor texture override; Chamber Rite section in the board navigator)
- allow chamber-specific sigil palettes while keeping the core dark fantasy theme — done for accents (`--chamber-*` variables); richer per-chamber sigil palettes remain future work

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
