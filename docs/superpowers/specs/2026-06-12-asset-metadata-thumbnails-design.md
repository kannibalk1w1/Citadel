# Asset Metadata And Thumbnails Design (Phase 3 Groundwork)

## Goal

Begin Phase 3 of the performance roadmap: give every local image relic a lightweight cached
thumbnail, surface asset metadata (existence, size, modified time) in renderer memory, render
thumbnails at far/mid zoom, show a clear placeholder for missing assets, and unify the PDF
preview cache with a broader preview cache.

## Why Now

Phase 2 virtualization means only viewport-near relics mount, but each mounted image still
decodes its full-resolution source even when it occupies 40 screen pixels at far zoom. A large
chamber sweep at far zoom decodes hundreds of full images. Thumbnail-first rendering is the
next biggest lever and the roadmap's designated Phase 3 entry point.

## User Experience

- No new UI surface. Far/mid zoom silently renders cached thumbnails; close zoom and selected
  relics render the full image. The chamber "reveals itself as the user descends".
- An image whose source file is missing shows a quiet dark placeholder with the filename
  instead of disappearing, so relink can be done without losing the relic's place.
- The settings maintenance section's "PDF preview cache" becomes "Preview cache" and covers
  both PDF page previews and generated thumbnails. Clear-unused preserves previews referenced
  by open chambers and thumbnails belonging to current local assets.

## Architecture

### Main process: unified preview cache (`src/main/previewCache.ts`)

All preview filesystem work moves out of `ipc.ts` into a dedicated module.

- Two cache directories under `userData`: legacy `pdf-cache` (read/clean only) and new
  `preview-cache` (all new writes — PDF page images and thumbnails).
- Thumbnail files are content-addressed by source identity:
  `thumb-<sha1(normalized path)>-<size>-<mtimeMs>.png`. A changed file gets a new name; stale
  thumbnails become unused and are reaped by clear-unused.
- IPC channels:
  - `assets:getThumbnail` `{ path }` → `{ exists, size, mtimeMs, thumbnailPath | null }` —
    stats the source and returns the cached thumbnail path if present.
  - `assets:cacheThumbnail` `{ path, imageData }` → `{ thumbnailPath }` — writes the PNG data
    URL under the computed thumbnail name.
  - `cache:previewStats` → `{ count, bytes }` across both directories (replaces
    `cache:pdfStats`).
  - `cache:clearUnusedPreviews` `{ preservePaths, assetPaths }` — preserves any cache file
    whose absolute path is referenced by an open item `src` (PDF previews) plus the current
    thumbnail name of every live local asset path (replaces `cache:clearUnusedPdfPreviews`).
  - `pdf:cachePageImage` keeps its contract but writes into `preview-cache`.
- The old `cache:pdfStats` / `cache:clearUnusedPdfPreviews` handlers are removed; the settings
  panel is the only consumer and is updated in the same change.

### Renderer: asset metadata records (`src/renderer/assets/assetMetadata.ts`)

A module-level map (not a new Zustand slice — the four-slice rule stands), with a
`useSyncExternalStore` hook:

```ts
type AssetMetadataRecord = {
  src: string
  exists: boolean
  size?: number
  mtimeMs?: number
  thumbnailPath?: string | null   // undefined = not yet checked, null = checked and absent
}
```

`recordAssetMetadata` merges records and notifies subscribers; `useAssetMetadata(src)`
subscribes a component to one record. URL-like srcs (`https?:`, `data:`, `blob:`, `local:`,
`file:`) are never recorded — they have no local metadata.

This is the first slice of the roadmap's archive-index metadata; later phases extend the
record (dimensions, hash, kind) and move population into a worker.

### Renderer: thumbnail pipeline (`src/renderer/assets/thumbnailPipeline.ts`)

`ensureThumbnail(src)`:

1. Skip URL-like srcs and dedupe in-flight requests.
2. `assets:getThumbnail` — records existence metadata; done if a thumbnail path came back or
   the source is missing.
3. Otherwise generate: load the image, downscale to max side 256 on a canvas, PNG data URL,
   `assets:cacheThumbnail`, record the returned path.

Generation runs through a small concurrency-limited queue (2 at a time) so a far-zoom sweep
over a fresh chamber doesn't decode hundreds of images at once. The generator is injectable
for tests. Failures record `thumbnailPath: null` so the relic permanently falls back to the
full source rather than retrying forever.

`ImageItem` calls `ensureThumbnail(item.src)` on mount. Virtualization already limits mounts
to viewport-near relics, so the pipeline is naturally lazy — no whole-project sweep.

### Renderer: preview policy (`src/renderer/assets/previewPolicy.ts`)

Pure decisions, unit tested:

- `THUMBNAIL_MAX_SIDE = 256`.
- `preferThumbnail(screenWidth, screenHeight, isSelected)` — use the thumbnail when the
  relic's largest on-screen side fits within the thumbnail resolution and the relic is not
  selected. Resolution-aware: a small relic at mid zoom uses its thumbnail; a large relic
  only at far zoom. Selection always wakes the full image.
- `thumbnailDimensions(w, h, maxSide)` — aspect-preserving downscale, never upscales.

### `ImageItem` integration

- `useStableImage(url)` wraps `use-image` and keeps returning the previous loaded image while
  a new URL loads, so swapping thumbnail ↔ full never blanks the relic.
- Display source: thumbnail path when `preferThumbnail(...)` and the record has one, else
  `item.src`.
- Missing placeholder: when the record says `exists: false`, render a dark panel rect with
  the source basename in muted gold instead of returning `null`. The group keeps all its
  handlers so the relic stays selectable, movable, and relinkable.

### What this slice does not do

- No video posters, 3D captures, or GIF thumbnails (GIFs already sleep offscreen).
- No persisted metadata in the project file — records are derived cache, keyed by path, so
  relinking simply produces fresh records for the new path. Save format is untouched.
- No worker; generation stays on the renderer with a small queue. Worker migration is a
  later Phase 3 step.

## Error Handling

- Source missing on stat → `exists: false`, placeholder rendering, no generation attempt.
- Generation or cache write failure → log, record `thumbnailPath: null`, full image fallback.
- Cache directories unreadable → stats return zeros, clear-unused deletes nothing (existing
  behavior, now covering both directories).

## Acceptance Checks

- Far zoom renders cached thumbnails for unselected images; selecting an image renders the
  full source (verified by `previewPolicy` unit tests and `ImageItem` component tests).
- Thumbnail cache filenames change when source size or mtime changes (unit test).
- Missing assets render the placeholder and keep working after relink (component test).
- Settings panel shows unified preview-cache stats; clear-unused preserves referenced PDF
  previews and thumbnails of live assets.
- `npm run typecheck`, `npm run test`, and `npm run build` pass.
