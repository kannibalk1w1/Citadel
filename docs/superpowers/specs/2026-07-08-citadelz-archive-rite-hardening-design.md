# Archive Rite: Hardened, Observable `.citadelz` Import/Export

Date: 2026-07-08
Status: approved

## Context

Most of the roadmap's `.citadelz` hardening already shipped: zip path safety
(`assertSafeZipPath`, `resolveSafeAssetOutputPath`), entry/size limits
(`inspectCitadelZip`: 5,000 entries, 512MB/entry, 2GB total, entry allowlist),
and schema validation on every load path (`parseProjectFile`). This design
covers the four remaining gaps:

1. No progress feedback — import reads the whole zip with `readFileSync` and
   extracts with sync writes on the main process; large archives freeze the app
   silently.
2. Size limits trust zip headers — `entrySize()` reads JSZip's private
   `_data.uncompressedSize` and falls back to `0`, so a zip with missing or
   lying headers bypasses the byte caps (zip-bomb gap).
3. Silent failure — `openProject()` / `openRecentProject()` catch all errors
   and return `false`; the user never learns why an archive refused to open.
4. Sync, unbounded extraction — asset writes use `Promise.all` over
   `writeFileSync` on the main thread.

Approach chosen: keep JSZip (sanctioned stack), make extraction incremental
with IPC progress events. Worker threads (gate judged not met in the 2026-07-04
profile) and streaming libraries (new dependency, dual zip stacks) were
rejected; the progress-event protocol designed here carries over unchanged if a
worker is ever justified.

## 1. Main process — honest extraction

Files: `src/main/archiveZip.ts`, `src/main/ipc.ts`.

`inspectCitadelZip` remains the fast header-based pre-check (unchanged
behavior). New:

```ts
type ExtractProgress = { done: number; total: number; bytes: number }

async function extractCitadelZip(
  manifest: ArchiveZipManifest,
  assetDir: string,
  options: { limits?: ArchiveZipLimits; onProgress?: (p: ExtractProgress) => void },
): Promise<void>
```

- Extracts `manifest.assets` through a concurrency pool of 4.
- Each entry decompresses via `file.async('nodebuffer')`; the resulting
  `buf.length` (actual decompressed bytes, not header claims) is checked
  against `maxEntryBytes`, and a running total against `maxTotalBytes`. Breach
  throws immediately.
- Writes use `fs/promises` (`mkdir` recursive once per target dir, then
  `writeFile`). Output paths still go through `resolveSafeAssetOutputPath`.
- On any failure, best-effort cleanup deletes the files this extraction has
  already written (track written paths; ignore individual unlink errors), so a
  poisoned archive leaves no partial `_citadel_assets` residue from this run.
- `onProgress` fires after each completed entry.

`import:zip` handler changes:

- `readFileSync` → `await readFile` from `fs/promises`.
- Forwards extraction progress to the renderer via
  `event.sender.send('archive:progress', …)`, throttled to at most one event
  per 50ms (always sending the final 100% event).
- Returns structured results instead of throwing across IPC:
  `{ ok: true, projectJson, assetDir }` or `{ ok: false, reason: string }`.
  `reason` is the thrown error's message — already human-readable
  ("Archive entry too large: …", "Unsafe zip path: …").

Export side: `writeZipProject` gains JSZip's `generateAsync(options, onUpdate)`
callback; `export:zip` forwards `onUpdate.percent` to the same
`archive:progress` channel (same throttle) and returns `{ ok: false, reason }`
on failure.

## 2. IPC surface

One new push channel (main → renderer), no new invoke channels:

| Channel | Direction | Payload |
|---|---|---|
| `archive:progress` | m→r | `{ op: 'import' \| 'export', percent: number, label?: string }` |

`percent` is 0–100. For import, percent maps entry completion
(`done / total`); for export it is JSZip's `onUpdate.percent`. The preload
bridge already exposes `ipc.on` — no preload changes. CLAUDE.md's IPC table
gets the new row.

## 3. Renderer — progress modal

New files: `src/renderer/ui/ArchiveRiteOverlay.tsx`,
`src/renderer/ui/archiveProgressStore.ts`.

Store (zustand):

```ts
type ArchiveRite = { op: 'import' | 'export'; percent: number; label?: string }
type ArchiveProgressState = {
  rite: ArchiveRite | null
  beginRite: (op: ArchiveRite['op']) => void
  updateRite: (percent: number, label?: string) => void
  endRite: () => void
}
```

- App startup registers one `ipc.on('archive:progress')` subscription that
  calls `updateRite` (ignored when no rite is active).
- `loadProjectFromPath` (`.citadelz` branch) and the zip-export flow call
  `beginRite` before the IPC invoke and `endRite` in a `finally`.
- Mascot: each `updateRite` drives `mascotStore.triggerEffect('progress-fill')`
  with the 0–1 value; completion and failure use the effects the flows already
  trigger (`lightning-in` / `lightning-out` / `fracture`).

Overlay (`ArchiveRiteOverlay`, mounted once in `App.tsx`):

- Renders only while `rite` is non-null: full-screen veil over everything,
  blocking all pointer/keyboard interaction beneath it.
- Cinzel header — "Unsealing the archive…" (import) / "Sealing the
  archive…" (export) — over a thin progress bar. Colours exclusively via CSS
  variables (`--bg-panel`, `--border`, `--text-primary`, `--text-accent`).
- Bar has a subtle shimmer; `prefers-reduced-motion` replaces it with a static
  fill. No new keybinds; the overlay is not cancellable in this slice.

File operations stay out of the undo event log, as today.

## 4. Error surfacing

- `inscribe()` (`inscriptionToastStore`) gains an options argument:
  `inscribe(text, { tone?: 'default' | 'danger', lifetimeMs?: number })`.
  Danger tone renders with an `--accent-danger` border and defaults to a 6s
  lifetime. Existing call sites are unchanged.
- `openProject` / `openRecentProject` stop swallowing errors: on
  `{ ok: false, reason }` results or validation throws they show
  `inscribe('The archive resisted: <reason>', { tone: 'danger' })` and trigger
  the mascot `fracture` effect, then return `false` as before.

## 5. Testing

Unit (`archiveZip.test.ts` extensions):

- Extraction rejects an entry whose real decompressed bytes exceed
  `maxEntryBytes` / `maxTotalBytes` even when its header claims a smaller size
  (stub the entry's `_data` and `async()` to disagree).
- Progress callbacks are monotonic in `done` and finish at `done === total`.
- Failed extraction unlinks the files it already wrote.

Renderer:

- `archiveProgressStore` transitions: begin → update → end; updates ignored
  with no active rite.
- `ArchiveRiteOverlay` renders header/bar from store state and respects
  reduced motion.
- `inscribe` danger tone renders the danger styling and extended lifetime.

Manual verification:

- Import the 1,003-relic fixture archive: overlay appears, bar and mascot fill
  advance, app stays responsive enough to paint progress.
- Import a hand-broken archive (traversal path, oversized entry, corrupt
  project JSON): danger toast states the reason, mascot fractures, no partial
  assets remain.
- Export the fixture as `.citadelz`: sealing overlay with progress.

## Known limitation: decompression-bomb residual risk

The per-entry and total byte caps are enforced on the *actual* decompressed
`buf.length`, which closes the lying-header bypass for the caps themselves.
But JSZip's `file.async('nodebuffer')` materializes the entire decompressed
buffer in memory *before* our size check can run — it exposes no streaming
size limit. So an entry whose header under-reports its size can still allocate
a very large buffer (and potentially OOM the main process) during that single
`async()` call, before extraction rejects it. `inspectCitadelZip`'s
header-based pre-check still catches *honest* oversized entries before
decompression; only the deliberately-lying case reaches allocation. Fully
closing this requires a streaming zip reader (yauzl) — rejected here to stay on
the sanctioned stack. Treat the byte caps as integrity/quota enforcement, not
as complete decompression-bomb protection.

## Out of scope

- Cancellable import/export (protocol allows adding it later).
- Worker-thread extraction (revisit if profiling gates are met).
- Streaming zip parsing (yauzl et al.) — see the decompression-bomb note above.
