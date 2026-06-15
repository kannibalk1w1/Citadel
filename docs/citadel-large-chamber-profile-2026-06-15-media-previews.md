# Citadel Large-Chamber Profile - Media Preview Gates - 2026-06-15

## Purpose

This note captures the fixture-level profile after thumbnail-first rendering was extended beyond images to GIF, video, and 3D relics.

The goal is to verify that heavier media can degrade to cached static previews without changing viewport virtualization, waking dormant offscreen relics, or creating new persistent ornamentation.

## Fixture Scope

This profile uses the existing deterministic large-chamber test harness:

- `createLargeBoardFixture({ itemCount: 1000, columns: 50 })`
- viewport: `{ x: 0, y: 0, scale: 1 }`
- screen: `540 x 280`
- overscan: `240px`
- protected selected relics where relevant

The current harness does not import real local GIF, video, or 3D files, so this profile is not a cold/warm wall-clock cache timing sweep. It verifies the render gates and fixture-level load discipline. A real-media sweep remains the next profiling task.

## Chamber Load

The media preview work does not change which relics mount. It changes what mounted media chooses to wake.

| Metric | Binding Reveal Profile | Media Preview Gates | Change |
|---|---:|---:|---:|
| Total relics | 1003 | 1003 | 0 |
| Mounted relics | 23 | 23 | 0 |
| Awake DOM media | 2 | 2 | 0 |
| Sleeping animated relics | 1 | 1 | 0 |

## Preview Gates

Verified by focused component tests:

| Relic type | Small, unselected, cached preview | Selected or large |
|---|---|---|
| GIF | renders cached first-frame image and does not wake gifler playback | wakes gifler playback |
| Video | renders cached poster image and does not mount a `<video>` element or frame controls | mounts full `<video>` controls |
| 3D model | renders cached static preview and does not create a Three.js renderer | creates the Three.js renderer |

## Decision

The preview path is stable enough to keep using the existing `assetMetadata` and `preview-cache` contract for heavier media. GIF, video, and 3D previews should remain lazy and failure-tolerant: if generation fails, `thumbnailPath: null` keeps the relic on its full-media fallback without retrying forever.

## Next

Run an app-level cold/warm preview-cache sweep with real local media:

- fresh chamber containing repeated local GIF, video, and `.glb` / `.obj` relics
- first far-zoom pan across the chamber with empty preview cache
- second far-zoom pan with warm preview cache
- record Chamber Load, visible responsiveness, and any preview generation failures
