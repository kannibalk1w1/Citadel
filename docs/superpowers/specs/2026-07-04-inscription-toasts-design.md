# Inscription Toasts Design

Status: approved direction via 2026-07-04 feature scouting (queue item 2); built same session.

## Problem

Citadel's feedback is atmospheric (mascot + canvas effects) but non-verbal. Nothing tells the user in words that an archive opened, an export finished, or a recording started. Ref Flow's quiet bottom-center toasts close that gap; Citadel only has the bespoke `YouSavedBanner` (saves) and the crash-recovery banner.

## Goals

- A small "inscription" toast system: short archival phrases, bottom-center, auto-fading, max 3 stacked.
- Wire the uncovered confirmations: open, new archive, PDF/image/zip export, board create/duplicate/delete, recording start/stop.
- Reduced motion: opacity fade only, no translate animation.

## Non-Goals

- No replacement of `YouSavedBanner` (saves keep their bespoke celebration; a toast fires on save only when that banner is disabled).
- No error toasts in this pass (errors already fracture the mascot; verbal error surfaces deserve their own design).
- No queue persistence or toast history.

## Approach

- `src/renderer/ui/toasts/inscriptionToastStore.ts` (+test): zustand store — `inscribe(text)` appends `{ id, text }`, caps the stack at 3 (oldest dropped), auto-dismisses after `TOAST_LIFETIME_MS` (2600ms; injectable timer for tests), `dismiss(id)`.
- `src/renderer/ui/toasts/InscriptionToasts.tsx`: fixed bottom-center column, `citadel-floating-panel` tones — `--bg-panel` strip, `--border`, `--text-primary` body with `--text-accent` first glyph, `--font-body`. CSS rise+fade keyframe, `@media (prefers-reduced-motion: reduce)` drops the rise.
- Wiring in `App.tsx` handlers next to the existing `triggerEffect` calls. Phrases stay archival: "Archive opened", "New archive founded", "Chamber raised", "Chamber cloned", "Chamber sealed away", "Export inscribed (PDF)", "The eye opens" / "The eye closes".

Constraints honoured: colours via CSS variables; reduced-motion fallback; store-decoupled trigger (feature code calls `inscribe`, never renders toasts directly); no save-format or IPC changes.
