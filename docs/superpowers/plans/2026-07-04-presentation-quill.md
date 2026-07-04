# Presentation Quill Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-presentation-quill-design.md` (approved, screen-space). Branch: `codex/presentation-quill`. TDD; suite + typecheck before each commit.

- [ ] Task 1: `src/renderer/presentation/quillStore.ts` + test — active/color/width, begin/extend/end stroke, undo, clear, reset; QUILL_COLORS (chamber accent, effect-primary, effect-mid), QUILL_WIDTHS (2.5, 5).
- [ ] Task 2: `src/renderer/presentation/PresentationQuill.tsx` — SVG overlay inside the canvas container, pointer capture only while quill active, polyline strokes in screen space.
- [ ] Task 3: `QuillControls` in the presentation bar (toggle, 3 swatches, 2 widths, undo, clear); `quill:toggle` action on `q` gated to presentation mode; Escape deactivates quill before exiting presentation; reset on presentation exit.
- [ ] Task 4: verify (suite, typecheck, CDP draw + screenshot), roadmap note, merge.
