# Inscription Toasts Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-inscription-toasts-design.md`. Branch: `codex/inscription-toasts`.

- [x] Task 1: `inscriptionToastStore` + tests (cap 3, 2600ms auto-dismiss, dismiss by id).
- [x] Task 2: `InscriptionToasts.tsx` bottom-center stack, rise+fade keyframe, reduced-motion opacity-only.
- [x] Task 3: wire open/new/save-fallback/exports/board ops/recording in App.tsx; mount beside YouSavedBanner.
- [x] Task 4: verified (256 tests, typecheck, CDP: toast renders '❧Chamber raised' bottom-center with themed styles, expires after lifetime).
