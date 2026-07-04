# Atmospheric Chambers Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-atmospheric-chambers-design.md` (approved 2026-07-04).

Branch: `codex/atmospheric-chambers`. Each task: failing test → implement → pass → commit. `npm test -- --run` + `npm run typecheck` before every commit.

**Deviation from spec, agreed rationale:** the app already ships mood ids `gothic | ember | verdant | frost` (BoardNavigator presets, persisted in `board.meta.mood`). The identity model keeps those four and adds `umbral` and `aurum` to reach six presets, instead of the spec's invented id list — saved projects keep their moods without migration.

### Task 1: Chamber identity model
- [ ] Create `src/renderer/canvas/chamberIdentity.ts` + `.test.ts`: `ChamberMoodId`, `CHAMBER_MOOD_PRESETS` (6 presets, each `{ id, label, accent, accentDim, accentGlow }`), `resolveChamberIdentity(board)` normalizing `board.meta` (mood default `'gothic'`, accent override honoured, `ambience: 'none' | 'motes' | 'fog'` default `'none'`, `ambienceIntensity`/`vignette`/`glow` clamped 0..1 with defaults 0.5/0/0, optional `texture` `{ assetPath, opacity, scale, repeat }` clamped like `normalizeCanvasBackground`), and `chamberAccentVariables(identity)` returning the three `--chamber-*` CSS variables.
- [ ] Rewrite `src/renderer/ui/boardMood.ts` as thin wrappers over `resolveChamberIdentity` (keep exports; BoardTabs untouched).

### Task 2: BOARD_STYLE event + undo/redo
- [ ] Add `'BOARD_STYLE'` to `CanvasEventType` in `src/types/index.ts`.
- [ ] Add `chamberIdentityEvent(board, patch)` helper in `chamberIdentity.ts` (+tests): builds `{ before, after }` meta patches containing only the touched keys, reading current values from `board.meta` (missing key → explicit default so undo restores the pre-edit look).
- [ ] In `src/renderer/App.tsx` UNDO/REDO handlers, add `BOARD_STYLE` branches applying `event.before` / `event.after` via `canvas.updateBoardMeta(event.boardId, patch)`.

### Task 3: Ambience model + layer
- [ ] Create `src/renderer/canvas/chamberAmbienceModel.ts` + `.test.ts`: `ambienceElements(kind, intensity, reducedMotion)` → deterministic descriptor array; motes capped at 14 (scaled by intensity, min 4 when on), fog = 2 bands, reduced motion → single `static-wash` descriptor, `'none'` → empty.
- [ ] Create `src/renderer/canvas/ChamberAmbience.tsx`: one `pointer-events:none` absolute div below the Konva stage, inline `<style>` like `CanvasEffectLayer`, CSS keyframe drift for motes / slow fog pan, `@media (prefers-reduced-motion: reduce)` static fallback, plus vignette and accent-glow gradient divs driven by the two dials. Colours only via `--chamber-*` / theme variables.
- [ ] Mount in `CanvasStage.tsx` between `<CanvasBackground />` and `<CanvasEffectLayer />`; set `chamberAccentVariables` on the stage container div style.

### Task 4: Per-chamber texture in CanvasBackground
- [ ] Extend `CanvasBackground.tsx`: resolve active board identity; if `identity.texture` present, render it (same math as custom mode) instead of the global setting. Extend `CanvasBackground.test.ts` for the override-wins-over-global rule (exported resolver helper).

### Task 5: Chamber Rite controls
- [ ] In `BoardNavigator.tsx`: replace inline `BOARD_MOOD_PRESETS` with `CHAMBER_MOOD_PRESETS`; mood click pushes `BOARD_STYLE` via `chamberIdentityEvent` + `updateBoardMeta` + `markDirty` + `triggerEffect('rune-seal')`.
- [ ] Add a "Chamber Rite" section for the active chamber: ambience select (None/Motes/Fog), intensity / vignette / glow sliders, texture override pick (reuse `file:openDialog` IPC) and clear. Every commit pushes `BOARD_STYLE`.

### Task 6: Verification + profile + docs
- [ ] Full suite + typecheck.
- [ ] CDP app check: switch moods, ambience on/off, undo a mood change, per-chamber texture, reduced-motion sanity.
- [ ] Ambience-on profile against a large chamber (dev harness mounts `createLargeBoardFixture` board; record Chamber Load + pan feel) → `docs/citadel-large-chamber-profile-2026-07-04-ambience.md`.
- [ ] Roadmap: Phase 5 status, decisions list appended; merge to master.
