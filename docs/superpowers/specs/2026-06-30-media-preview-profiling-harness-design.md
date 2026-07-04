# Media Preview Profiling Harness Design

## Purpose

Add a development-only harness that makes the real-media cold/warm preview-cache sweep repeatable. The harness exists only to verify GIF first-frame previews, video poster previews, and 3D static previews with local files.

## Activation

The harness is inactive unless both conditions are true:

- the renderer is running in dev mode
- the URL contains `profile=media-preview` or the hash contains `profile-media-preview`

Normal production builds and normal development sessions do not expose or run the harness.

## Interface

When active, the renderer exposes:

```ts
window.__citadelMediaPreviewProfile.run({
  gifPath: string
  videoPath: string
  modelPath: string
  timeoutMs?: number
})
```

The run method clears unused previews through existing IPC, creates a temporary profiling chamber with one GIF, one video, and one 3D relic, sets a far-zoom viewport, waits for preview-cache activity, records cold and warm cache stats, and stores the latest result on `window.__citadelProfileResult`.

## Data Shape

The result includes:

- `startedAt` and `finishedAt`
- local asset paths used
- cache stats before, after cold pass, and after warm pass
- chamber-load-style stats for the profiling board
- mounted heavy media counts from `measureMediaPreviewLoad`
- timeout/failure notes when preview files do not appear in time

## Constraints

- Use existing IPC channels: `cache:previewStats` and `cache:clearUnusedPreviews`.
- Do not add persistent UI or product-facing controls.
- Do not add dependencies.
- Do not persist generated profiling boards to `.citadel` files.
- Keep colors, animations, and mascot behavior untouched.

## Testing

Tests cover the pure activation logic, profiling board construction, result summarization, and inactive harness behavior. Component media preview tests continue to verify GIF, video, and 3D render gates.
