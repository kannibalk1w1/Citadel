# Feature Scouting — Ref Flow Comparison and Gap Review — 2026-07-04

## Method

Ref Flow (installed at `%LOCALAPPDATA%/Programs/Ref Flow`, an Electron app) was launched with a CDP port and explored read-only: toolbar/button inventory, drag-drop image import, selection chrome, context behaviour, and its presentation "Focus Mode". No user projects were opened or saved. Citadel's action registry, context menu, and panels were audited against the findings.

## What Ref Flow Does Better Today (polish gaps)

1. **Floating selection action bar.** Selecting an item shows six large buttons directly above it: duplicate, annotate/edit, export-this-item, flip, rotate-reset, delete. (Correction: Citadel already has `SelectedActionStrip` for single selection — the real gaps were multi-select support and flip, both closed the same day.)
2. **Status toasts.** Quiet bottom-center confirmations ("New project created", "1 sub-items selected"). Citadel's mascot/canvas effects are atmospheric but non-verbal; nothing tells the user *what* just happened in words. A themed "inscription toast" (parchment text, fades like the effect palette) would close this without breaking theme.
3. **Presentation Focus Mode with live pen annotation.** In presentation mode Ref Flow offers a pen (colour, size), stroke undo, clear-all, and hold-to-record voice — presenter tools drawn *over* the canvas. Citadel has presentation mode and voice memos but no freehand annotation layer at all.
4. **Filename labels toggle.** One button shows/hides filenames under every media item. Citadel only reveals a filename when an asset is missing.
5. **Flip horizontal/vertical.** Ref Flow has flip on the selection bar. Citadel has no flip anywhere (only rotation via transformer).
6. **Per-item export.** "Download" on the selection bar saves that one item's media out. Citadel exports whole canvases only.
7. **Project framerate control.** Global FPS (24/25/30/60) governing video/GIF playback — a video-reference workflow feature. Lower priority for Citadel's archive framing.
8. **i18n.** Ref Flow ships multi-language UI. Citadel is English-only; fine for now, but hardcoded strings will make this expensive later — worth keeping strings centralized as the UI grows.

## Where Citadel Is Already Ahead

Multi-chamber archives with per-chamber identity/ambience, cross-chamber Living Index search with `chamber:` filters, thread Bindings with meanings and searchable labels, event-log recording/playback, comment pins, tags/sigils, swatches, comparison items, keybind remapping, crash recovery, PDF export, viewport virtualization + thumbnail-first media at 1,000+ relics, and the entire atmosphere layer. Ref Flow is a single flat canvas per project by comparison.

## Proposed Queue (priority order)

1. **Selection action bar** — floating bar above selection: Duplicate, Flip H, Flip V, Bind (connect mode seeded from item), Comment, Lock, Delete. Reuses existing actions; add `ITEM_STYLE`-based flip (`meta.flipX/flipY` → Konva `scaleX/scaleY`). Konva-adjacent DOM overlay, hidden while dragging, capped to viewport. Undo-safe by construction.
2. **Inscription toasts** — small store + one DOM component; verbal confirmations for save/export/import/board ops/recording, styled like an inked strip that burns out through the effect greys. Respects reduced motion (fade only).
3. **Presentation quill (annotation layer)** — presentation-mode-only freehand pen on an SVG overlay: colour from chamber accent + white/grey, stroke undo, clear, auto-cleared on exit (ephemeral by default; persisting strokes would need a spec for save-format impact). Pairs with existing voice memo.
4. **Filename inscriptions toggle** — per-board or global toggle rendering the basename as a small Konva label under media relics; far-zoom silhouette discipline applies (hide below the same 5px screen-font threshold).
5. **Flip H/V actions** — `item:flipH` / `item:flipV` ActionNames + context menu + (1)'s bar.
6. **Per-relic export** — "export relic" IPC reusing the image-export path for a single item's source/render.
7. **Archive Workbench UI** — the model (`archiveWorkbenchModel.ts`) exists and is tested; the UI was never built. This is Citadel's own roadmap item, bigger than any Ref Flow gap — folder ingestion, uncategorized relic review, sigil assignment. Needs its own spec-first pass.

Items 1–2 are small and high-leverage; 3 is medium (spec-first recommended because of save-format questions); 7 is the flagship follow-on phase.

## Non-Goals From This Review

- Project framerate control (video-editor framing, not archive framing) — revisit only if video relics become central.
- i18n extraction — premature; note the string-hygiene concern and move on.
- Cloning Ref Flow's minimal single-toolbar chrome — Citadel's shell identity is deliberate.
