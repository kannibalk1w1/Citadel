# Citadel Large-Chamber Profile - 2026-05-25

## Purpose

This note captures the first reproducible large-chamber baseline after Citadel's viewport virtualization, DOM media sleep/wake, GIF sleep guard, overlay visibility filtering, and Chamber Load readout.

The goal is not to chase abstract benchmark numbers. The goal is to keep Citadel feeling like a responsive archive as chambers grow into thousands of relics, while preserving the atmospheric Binding, Index, and media experience.

## Fixture

Source:

- `createLargeBoardFixture({ itemCount: 1000, columns: 50 })`
- plus three media relics used by the stage integration scenario:
  - one visible video relic
  - one selected offscreen audio relic
  - one offscreen 3D relic

Stage assumptions:

- viewport: `{ x: 0, y: 0, scale: 1 }`
- screen area after right sidebar: `540 x 280`
- overscan: `240px`
- protected relics: selected far relic and selected offscreen audio relic

## Chamber Load Baseline

Measured with `measureChamberLoad`, which composes the same viewport visibility and runtime stat models used by `CanvasStage`.

| Metric | Count | Meaning |
|---|---:|---|
| Total relics | 1003 | All relics in the chamber fixture |
| Mounted relics | 23 | Relics rendered in or near the current viewport, plus protected selected relics |
| Awake DOM media | 2 | Visible video plus selected offscreen audio |
| Sleeping animated relics | 1 | Offscreen 3D relic not currently mounted |

Interpretation:

- The current viewport path mounts roughly 2.3% of this 1,003-relic chamber.
- Selected offscreen relics stay awake, which protects user intent during inspection and Binding work.
- Offscreen animated media sleeps unless selected or otherwise protected.
- The numbers support continuing with the current virtualization strategy before introducing deeper chunking.

## Living Index Baseline

The deterministic Index probe remains:

- query: `tag:index-probe`
- expected matches: `200` in the default 1,000-relic fixture
- visible sigil mark cap: `24`

The test fixture avoids wall-clock assertions, but the model gives a stable way to compare result counts and marked relic counts as the Index becomes more visual.

## Current Risk

The next likely pressure point is not basic item mounting. It is richer visible ornamentation:

- Binding endpoint animation
- label plaques and thread glow
- group frames around large clusters
- future runic/sigil search marks
- minimap and Index overlays

These layers can quietly become expensive because they feel small individually but multiply across thousands of relics and threads.

## Decision

Proceed with richer Binding endpoint animation, but keep it visibility-aware from the first implementation. The animation should only wake for visible, active, pulsing, or selected-context threads.

Do not start deeper chunk caching yet. The current mounted relic ratio is low enough that the next higher-value move is making the signature Citadel interaction more memorable while preserving the performance rules already in place.

## Next Measurement

After endpoint animation lands, capture:

- mounted relic count
- rendered connection count
- pulsing/active Binding count
- frame responsiveness while panning across the 1,000-relic fixture

Recommended next step: build the richer visual Binding endpoint animation around visible and active threads, then record the second large-chamber profile against this note.
