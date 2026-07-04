# Citadel Large-Chamber Profile - Real Media Sweep Attempt - 2026-06-30

## Purpose

This note records the first unattended attempt to run the roadmap's real-media cold/warm preview-cache sweep after GIF, video, and 3D static previews landed.

The target sweep remains:

- fresh chamber with local GIF, video, and 3D relics
- empty `preview-cache` cold pass
- repeated warm pass with the same assets
- wall-clock timing, Chamber Load observations, visible responsiveness, and preview-generation failures

## What Was Verified

Focused preview-gate tests still pass:

```text
npm test -- --run src/renderer/performance/largeBoardFixture.test.ts src/renderer/assets/thumbnailPipeline.test.ts src/renderer/canvas/items/GifItem.test.tsx src/renderer/canvas/items/VideoItem.test.tsx src/renderer/canvas/items/Model3DItem.test.tsx
```

Result:

- 5 test files passed
- 22 tests passed

Production build also passed:

```text
npm run build
```

Result:

- main, preload, and renderer bundles built successfully
- Vite reported the existing Three.js dynamic/static import chunking warnings only

The built Electron app was launched directly with:

```text
node_modules\.bin\electron.cmd out\main\index.js
```

The command stayed alive until the 15 second command timeout, which indicates the built app starts rather than crashing immediately.

## Real-Media Fixture Preparation

The unattended run prepared temporary local media inputs in the workspace:

- GIF: copied from `node_modules/gifler/site/assets/gif/nyan.gif`
- 3D: generated a tiny local `.obj` pyramid
- Video: generated a tiny local `.webm` in the renderer using `MediaRecorder`

These files were temporary profiling inputs, not product fixtures.

## Automation Blocker

Playwright's Electron launcher was available, but could not attach to the built app in this environment. Both launch forms failed before a first window was available:

```text
_electron.launch({ executablePath: electron.exe, args: ['.'] })
_electron.launch({ executablePath: electron.exe, args: ['out/main/index.js'] })
```

Observed failure shape:

- Electron process launched
- Node debugger WebSocket accepted the connection
- WebSocket disconnected with code `1006`
- Playwright attempted process cleanup
- `taskkill` reported `ERROR: Access denied`
- Electron exited with code `1`

Because of this, no trustworthy app-level cold/warm wall-clock numbers or Chamber Load readings were captured in this pass.

## Current Interpretation

The renderer preview policy and component gates remain verified by tests, and the production app starts. The missing evidence is specifically the interactive app-level sweep with local media mounted in a chamber and the Chamber Load sigil observed during cold and warm passes.

Do not mark the real-media profiling queue item complete until a run captures:

- cold preview-cache count/bytes before and after first pass
- warm preview-cache count/bytes after the repeated pass
- Chamber Load text for cold and warm passes
- visible responsiveness notes during far-zoom pan
- any renderer console preview-generation failures

## Next Attempt

Use one of these paths:

- run the dedicated dev-only profiling harness with local GIF, WebM/MP4, and OBJ/GLB files
- run Playwright Electron in an environment where it can attach to and clean up the Electron process

## Dev Harness

The renderer now exposes a dev-only harness when the app URL contains `profile=media-preview` or `#profile-media-preview`. In a dev session, open the app with the profile trigger, then run this in devtools:

```js
await window.__citadelMediaPreviewProfile.run({
  gifPath: 'C:/path/to/sample.gif',
  videoPath: 'C:/path/to/sample.webm',
  modelPath: 'C:/path/to/sample.obj',
  timeoutMs: 9000,
})
```

The latest result is also stored at:

```js
window.__citadelProfileResult
```

Record `cacheBefore`, `cacheAfterCold`, `cacheAfterWarm`, `chamberLoad`, `mediaPreviewLoad`, `durationMs`, and any `notes` in the next completed real-media profile.
