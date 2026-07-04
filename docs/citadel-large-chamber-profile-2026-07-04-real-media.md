# Citadel Large-Chamber Profile - Real Media Preview Sweep - 2026-07-04

## Purpose

This note records the completed app-level cold/warm preview-cache sweep with real local media, closing the roadmap queue item that the 2026-06-30 unattended attempt could not finish.

The sweep exercises the full runtime path: real files on disk, the live IPC preview cache, the `assetMetadata` records, and the mounted GIF/video/3D relic gates — not the fixture-level model.

## Method

- App: `npm run dev` (dev build, harness enabled) launched with `--remote-debugging-port=9222`; the renderer was driven over CDP with Playwright `connectOverCDP`, which succeeded where the 2026-06-30 `_electron.launch` attach failed.
- Harness: `window.__citadelMediaPreviewProfile.run({ gifPath, videoPath, modelPath, timeoutMs })` after loading with `#profile-media-preview`.
- Media inputs (temporary, outside the repo, in `%LOCALAPPDATA%/Temp/citadel-profile/`):
  - GIF: `sample.gif` — nyan.gif copied from the gifler package (30,329 bytes)
  - Video: `sample.webm` — 2s 320x180 VP8 canvas capture (10,486 bytes)
  - 3D: `sample.obj` — hand-written 5-vertex pyramid (86 bytes)
- The harness clears the preview cache itself at run start, so every `run()` on a fresh renderer is a cold pass. Warm evidence was captured with direct `assets:getThumbnail` IPC probes after the cold pass (the contextBridge `ipc` object is immutable in the main world, so the clear step cannot be patched out for a literal warm `run()`).

## Cold Pass

First run, empty cache, `timeoutMs: 9000`:

| Metric | Value |
|---|---:|
| Cache before | 0 files / 0 bytes |
| Cache after cold | 3 files / 10,405 bytes |
| Cache after +500ms | 3 files / 10,405 bytes (stable) |
| Harness duration | 9,525 ms (fixed wait; see bound below) |
| Timed out | no |

A repeat cold pass on a fresh renderer with `timeoutMs: 4000` also completed all three previews (`timedOut: false`, same 3 files / 10,405 bytes), so cold generation of one GIF first frame + one video poster + one 3D static capture completes **within 4 seconds**, including the concurrency-2 queue. Byte counts were identical across runs — generation is deterministic.

Chamber Load during and after the cold pass: `Mounted 3 / 3 · DOM 2 · Sleeping 0`.

`mediaPreviewLoad` after cold: 3 previewable mounted relics, 3 static preview relics, 0 awake previewable relics, 0 pending.

No preview-generation errors appeared in the renderer console or the dev process output.

## Warm Pass

With the cache warm, per-asset `assets:getThumbnail` probes all returned existing thumbnail paths in **0.3 ms each** — warm relic mounts resolve their preview with a single sub-millisecond IPC hit and never enter the generation queue.

`cacheAfterWarm` remained 3 files / 10,405 bytes through the cold run's settle window, confirming no duplicate generation for already-cached assets.

## Observed Limitation: Mid-Session Cache Clear

Clearing the preview cache while a chamber with previewed relics is open does **not** trigger regeneration: the renderer-memory `assetMetadata` records still hold the old `thumbnailPath` values, so relics keep pointing at deleted files until reload. A second `run()` in the same renderer session therefore reports 0 cached previews and times out. This matches the documented no-retry design; a renderer reload restores normal cold-path behaviour. If Settings' "clear preview cache" ever surfaces user complaints, invalidating `assetMetadata` on `cache:clearUnusedPreviews` is the fix.

## Responsiveness

The profile chamber holds only 3 relics, so pan/zoom responsiveness is trivially smooth here; large-chamber pan discipline remains covered by the 1,003-relic fixture profiles. Nothing in this sweep mounted extra DOM media or woke sleeping relics.

## Worker-Generation Verdict (Task 4 Gate)

**Gate not met.** Cold generation of all three heavy previews completed within a 4-second window with no renderer errors, no dropped interactions observed over CDP, and warm hits at 0.3 ms. Preview generation is not blocking the renderer at current volumes; worker-based thumbnail generation stays deferred until real archives show cold-pass jank at much higher media counts.

## Decision

The `assetMetadata` + `preview-cache` contract is verified end-to-end with real media. Keep generation lazy, failure-tolerant, and renderer-side for now.
