# Filename Inscriptions Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-filename-inscriptions-design.md`. Branch: `codex/filename-inscriptions`.

- [x] Task 1: `filenameLabel.ts` + tests (basename, hidden/no-src/far-zoom nulls).
- [x] Task 2: `uiStore.filenameLabelsVisible` + `view:filenameLabels` action (`shift+f`) + toast.
- [x] Task 3: labels under ImageItem/GifItem (Konva Text) and DOMItem (DOM label); Mark-section sidebar button.
- [x] Task 4: verified (260 tests, typecheck, CDP: sample.gif label renders under GIF relic, toggle on/off works).
